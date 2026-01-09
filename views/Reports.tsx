
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DB } from '../db';
import { generateMonthlyReport } from '../services/gemini';
import { MonthlyReport } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';

const Reports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [language, setLanguage] = useState('Japanese');
  const [showPicker, setShowPicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [summary, setSummary] = useState('');
  const [insights, setInsights] = useState('');
  const [nextActions, setNextActions] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all statistical data
  const stats = useMemo(() => {
    const entries = DB.getTimeEntries().filter(e => e.date.startsWith(selectedMonth));
    const projects = DB.getProjects();
    const estimates = DB.getEstimates();

    const totalActual = entries.reduce((s, e) => s + e.hours, 0);
    
    const projectHoursData = entries.reduce((acc, e) => {
      const p = projects.find(proj => proj.id === e.projectId)?.name || 'Unknown';
      acc[p] = (acc[p] || 0) + e.hours;
      return acc;
    }, {} as Record<string, number>);

    const taskTypeDataMap = entries.reduce((acc, e) => {
      const type = e.taskType || 'Other';
      acc[type] = (acc[type] || 0) + e.hours;
      return acc;
    }, {} as Record<string, number>);

    const comparisonData = projects.map(p => {
      const actual = entries.filter(e => e.projectId === p.id).reduce((s, e) => s + e.hours, 0);
      const est = estimates
        .filter(e => e.projectId === p.id && e.createdAt.startsWith(selectedMonth))
        .reduce((s, e) => s + e.totalHours, 0);
      return { name: p.name, actual, estimated: est };
    }).filter(d => d.actual > 0 || d.estimated > 0).slice(0, 8);

    const deliverables = entries.filter(e => e.deliverable && e.deliverable.trim() !== "").map(e => ({
      name: e.deliverable,
      project: projects.find(p => p.id === e.projectId)?.name || 'Unknown',
      date: e.date
    }));

    const notesArr = [];
    const dateParts = selectedMonth.split('-');
    const daysInMonth = new Date(Number(dateParts[0]), Number(dateParts[1]), 0).getDate();
    for(let d=1; d<=daysInMonth; d++) {
      const dStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const note = localStorage.getItem(`daily_memo_${dStr}`);
      if(note) notesArr.push(`${dStr}: ${note}`);
    }

    return { 
      totalActual, 
      comparisonData,
      projectHours: Object.entries(projectHoursData).map(([name, value]) => ({ name, value })),
      taskTypes: Object.entries(taskTypeDataMap).map(([name, value]) => ({ name, value })),
      deliverables,
      dailyNotes: notesArr.join('\n')
    };
  }, [selectedMonth]);

  const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#ec4899', '#6366f1'];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setHasGenerated(false);
    try {
      const statsPayload = {
        totalActual: stats.totalActual,
        projectBreakdown: stats.projectHours,
        taskTypes: stats.taskTypes,
        deliverableCount: stats.deliverables.length
      };
      
      const fullText = await generateMonthlyReport(selectedMonth, JSON.stringify(statsPayload), stats.dailyNotes, language);
      
      // Parse sections based on [TAGS]
      const summaryPart = fullText.split('[INSIGHTS]')[0].replace('[SUMMARY]', '').trim();
      const insightsPart = (fullText.split('[INSIGHTS]')[1] || '').split('[NEXT ACTIONS]')[0].trim();
      const nextActionsPart = (fullText.split('[NEXT ACTIONS]')[1] || '').trim();

      setSummary(summaryPart || fullText.slice(0, 300));
      setInsights(insightsPart || '');
      setNextActions(nextActionsPart || '');
      
      setHasGenerated(true);
    } catch (error) {
      alert("Failed to generate report.");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const adjustMonth = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const SectionHeader = ({ title, colorClass }: { title: string, colorClass: string }) => (
    <h2 className="text-3xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6 mt-12 flex items-center uppercase tracking-tight">
      <span className={`w-2 h-6 ${colorClass} rounded-full mr-3`}></span>
      {title}
    </h2>
  );

  const handleExportPDF = () => {
    const originalTitle = document.title;
    document.title = `Monthly_Report_${selectedMonth}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="space-y-8 animate-fadeIn w-full max-w-none px-4 pb-20">
      <header className="print:hidden">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Monthly Insights Report</h2>
        <p className="text-slate-500 font-medium">Strategic PM performance review and deliverables analysis.</p>
      </header>

      {/* Selector Card (Hidden on Print) */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 print:hidden">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 border-r border-slate-100 pr-4 mr-4">
             <button onClick={() => adjustMonth(-1)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
             </button>
          </div>
          <div className="relative" ref={pickerRef}>
             <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-1">Analysis Period</p>
             <div onClick={() => setShowPicker(!showPicker)} className="flex items-center space-x-4 cursor-pointer group">
                <div className="p-2 bg-slate-50 rounded-xl text-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-2xl font-black text-slate-900 tracking-tight">{getMonthName(selectedMonth)}</span>
             </div>
             {showPicker && (
                <div className="absolute left-0 top-full mt-4 z-50 bg-white border border-slate-100 shadow-2xl rounded-3xl p-5 w-64 animate-fadeIn">
                   <div className="grid grid-cols-3 gap-2">
                      {Array.from({length: 12}).map((_, i) => {
                         const m = String(i + 1).padStart(2, '0');
                         const year = selectedMonth.split('-')[0];
                         const target = `${year}-${m}`;
                         return (
                           <button key={i} onClick={() => { setSelectedMonth(target); setShowPicker(false); }} className={`py-2 rounded-xl text-xs font-bold ${selectedMonth === target ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-600'}`}>
                             {new Date(2000, i).toLocaleString('default', { month: 'short' })}
                           </button>
                         );
                      })}
                   </div>
                </div>
             )}
          </div>
          <div className="flex items-center space-x-1 border-l border-slate-100 pl-4 ml-4">
             <button onClick={() => adjustMonth(1)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
             </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm">
              <option value="Japanese">Japanese</option>
              <option value="English">English</option>
            </select>
          </div>
          <button onClick={handleGenerate} disabled={isGenerating} className={`px-12 py-5 rounded-2xl font-black flex items-center space-x-4 transition-all shadow-xl active:scale-95 ${isGenerating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'}`}>
            {isGenerating ? (
              <><div className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div><span className="uppercase text-xs tracking-widest">Processing...</span></>
            ) : (
              <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><span className="uppercase text-xs tracking-widest">Build Monthly Report</span></>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white min-h-[600px] rounded-[4rem] border border-slate-100 shadow-sm p-16 overflow-hidden relative print:p-0 print:shadow-none print:border-none">
        {/* Print Only Header */}
        <div className="hidden print:block mb-10 text-center">
            <h1 className="text-4xl font-black text-slate-900 mb-2">Monthly Insights Report</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest">{getMonthName(selectedMonth)}</p>
        </div>

        {!hasGenerated && !isGenerating ? (
          <div className="h-[600px] flex flex-col items-center justify-center text-slate-200 border-4 border-dashed border-slate-50 rounded-[3rem]">
             <svg className="w-20 h-20 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
             <p className="font-black uppercase tracking-[0.2em] text-xs">Configure report above and click generate</p>
          </div>
        ) : isGenerating ? (
          <div className="h-[600px] flex flex-col items-center justify-center space-y-12">
             <div className="relative">
                <div className="w-44 h-44 border-[10px] border-slate-50 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] animate-pulse flex items-center justify-center">
                      <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   </div>
                </div>
             </div>
             <div className="text-center">
                <p className="text-3xl font-black text-slate-900 tracking-tight italic">Synthesizing Monthly Analysis...</p>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-4">Reviewing operational data and progress notes</p>
             </div>
          </div>
        ) : (
          <div className="max-w-none animate-fadeIn">
            {/* 1. Operational Analytics Heading & Content */}
            <SectionHeader title="Operational Analytics" colorClass="bg-blue-600" />
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mb-16">
              {/* Actual vs Estimated */}
              <div className="p-10 rounded-[3rem] border border-slate-50 bg-slate-50/20 shadow-sm print:shadow-none">
                <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center"><span className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></span>Actual vs Estimated</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar name="Actual" dataKey="actual" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40}>
                         <LabelList dataKey="actual" position="top" style={{ fontSize: '10px', fontWeight: 700, fill: '#1e40af' }} />
                      </Bar>
                      <Bar name="Estimated" dataKey="estimated" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={40}>
                         <LabelList dataKey="estimated" position="top" style={{ fontSize: '10px', fontWeight: 700, fill: '#64748b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hours By Project - Design Matched to Dashboard */}
              <div className="p-10 rounded-[3rem] border border-slate-50 bg-slate-50/20 shadow-sm print:shadow-none">
                <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center"><span className="w-1.5 h-6 bg-emerald-500 rounded-full mr-3"></span>Hours By Project</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20 }}>
                      <Pie 
                        data={stats.projectHours} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={100} 
                        outerRadius={130} 
                        paddingAngle={8} 
                        dataKey="value"
                        label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {stats.projectHours.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Task Type Distribution - Design Matched to Dashboard */}
              <div className="p-10 rounded-[3rem] border border-slate-50 bg-slate-50/20 shadow-sm print:shadow-none">
                <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center"><span className="w-1.5 h-6 bg-purple-500 rounded-full mr-3"></span>Task Type Distribution</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20 }}>
                      <Pie 
                        data={stats.taskTypes} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={100} 
                        outerRadius={130} 
                        paddingAngle={8} 
                        dataKey="value"
                        label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {stats.taskTypes.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[(index+3) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Deliverables this Month */}
              <div className="p-10 rounded-[3rem] border border-slate-50 bg-slate-50/20 shadow-sm print:shadow-none">
                <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center"><span className="w-1.5 h-6 bg-amber-500 rounded-full mr-3"></span>Deliverables this Month</h3>
                <div className="h-[350px] overflow-y-auto custom-scrollbar pr-2 space-y-3 print:overflow-visible">
                   {stats.deliverables.length === 0 && <p className="text-slate-400 text-sm italic">No recorded deliverables.</p>}
                   {stats.deliverables.map((d, i) => (
                     <div key={i} className="p-4 bg-white rounded-2xl border border-slate-50 shadow-sm print:border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{d.project}</span>
                           <span className="text-[9px] font-black text-slate-400">{d.date}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{d.name}</p>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            {/* Editable AI Sections */}
            <div className="space-y-12">
              <div className="space-y-4">
                <SectionHeader title="Summary" colorClass="bg-blue-400" />
                <textarea 
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full min-h-[120px] p-8 rounded-[2.5rem] bg-slate-50/50 border-2 border-transparent focus:border-blue-500 focus:bg-white text-slate-700 leading-relaxed font-medium text-lg outline-none custom-scrollbar resize-none transition-all print:bg-white print:p-0 print:border-none"
                  placeholder="Summary of the month's core achievements..."
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Insights" colorClass="bg-purple-600" />
                <textarea 
                  value={insights}
                  onChange={(e) => setInsights(e.target.value)}
                  className="w-full min-h-[200px] p-8 rounded-[2.5rem] bg-slate-50/50 border-2 border-transparent focus:border-blue-500 focus:bg-white text-slate-700 leading-relaxed font-medium text-lg outline-none custom-scrollbar resize-none transition-all print:bg-white print:p-0 print:border-none"
                  placeholder="Analyze efficiency, bottlenecks, and variance..."
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Next Actions" colorClass="bg-emerald-600" />
                <textarea 
                  value={nextActions}
                  onChange={(e) => setNextActions(e.target.value)}
                  className="w-full min-h-[200px] p-8 rounded-[2.5rem] bg-slate-50/50 border-2 border-transparent focus:border-blue-500 focus:bg-white text-slate-700 leading-relaxed font-medium text-lg outline-none custom-scrollbar resize-none transition-all print:bg-white print:p-0 print:border-none"
                  placeholder="Strategic focus areas for next month..."
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              </div>
            </div>
            
            <div className="mt-24 flex justify-end gap-6 print:hidden">
               <button onClick={() => setHasGenerated(false)} className="px-10 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs">Reset Report</button>
               <button 
                onClick={handleExportPDF} 
                className="px-14 py-5 bg-slate-900 text-white font-black rounded-2xl flex items-center space-x-4 hover:bg-black transition-all shadow-2xl active:scale-95"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                 <span className="uppercase tracking-widest text-xs">Export to PDF</span>
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
