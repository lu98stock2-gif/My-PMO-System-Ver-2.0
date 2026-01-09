
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DB } from '../db';
import { generateMonthlyReport } from '../services/gemini';
import { MonthlyReport } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';

const Reports: React.FC = () => {
  // Use local time for initial month state
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleDateString('sv').slice(0, 7));
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
    <h2 className="text-xl md:text-3xl font-black text-slate-900 border-b border-slate-100 pb-3 md:pb-4 mb-4 md:mb-6 mt-8 md:mt-12 flex items-center uppercase tracking-tight">
      <span className={`w-1.5 md:w-2 h-5 md:h-6 ${colorClass} rounded-full mr-3`}></span>
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
    <div className="space-y-6 md:space-y-8 animate-fadeIn w-full max-w-none px-0 md:px-4 pb-10 md:pb-20">
      <header className="print:hidden text-center md:text-left">
        <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Monthly Insights</h2>
        <p className="text-sm md:text-base text-slate-500 font-medium">Strategic performance review & deliverables.</p>
      </header>

      {/* Selector Card */}
      <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0 print:hidden">
        <div className="flex items-center justify-between md:justify-start w-full md:w-auto">
          <div className="flex items-center space-x-1 md:border-r md:border-slate-100 md:pr-4 md:mr-4">
             <button onClick={() => adjustMonth(-1)} className="p-2 text-slate-400 hover:text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
             </button>
          </div>
          <div className="relative text-center md:text-left" ref={pickerRef}>
             <p className="text-[8px] font-black text-slate-400 tracking-[0.2em] uppercase mb-1">Analysis Period</p>
             <div onClick={() => setShowPicker(!showPicker)} className="flex items-center space-x-3 cursor-pointer group">
                <span className="text-lg md:text-2xl font-black text-slate-900 tracking-tight truncate max-w-[140px] md:max-w-none">{getMonthName(selectedMonth)}</span>
                <div className="p-1 md:p-2 bg-slate-50 rounded-lg md:rounded-xl text-black">
                   <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
             </div>
             {showPicker && (
                <div className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 top-full mt-4 z-50 bg-white border border-slate-100 shadow-2xl rounded-2xl md:rounded-3xl p-4 w-60 animate-fadeIn">
                   <div className="grid grid-cols-3 gap-2">
                      {Array.from({length: 12}).map((_, i) => {
                         const m = String(i + 1).padStart(2, '0');
                         const year = selectedMonth.split('-')[0];
                         const target = `${year}-${m}`;
                         return (
                           <button key={i} onClick={() => { setSelectedMonth(target); setShowPicker(false); }} className={`py-2 rounded-xl text-[10px] font-bold ${selectedMonth === target ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-600'}`}>
                             {new Date(2000, i).toLocaleString('default', { month: 'short' })}
                           </button>
                         );
                      })}
                   </div>
                </div>
             )}
          </div>
          <div className="flex items-center space-x-1 md:border-l md:border-slate-100 md:pl-4 md:ml-4">
             <button onClick={() => adjustMonth(1)} className="p-2 text-slate-400 hover:text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
             </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
          <div className="flex-1 md:flex-initial">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none shadow-sm">
              <option value="Japanese">Japanese</option>
              <option value="English">English</option>
            </select>
          </div>
          <button onClick={handleGenerate} disabled={isGenerating} className={`flex-1 md:flex-initial px-6 md:px-12 py-3.5 md:py-5 rounded-xl md:rounded-2xl font-black flex items-center justify-center space-x-3 transition-all shadow-xl active:scale-95 ${isGenerating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'}`}>
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )}
            <span className="uppercase text-[10px] md:text-xs tracking-widest whitespace-nowrap">Build Report</span>
          </button>
        </div>
      </div>

      <div className="bg-white min-h-[400px] md:min-h-[600px] rounded-2xl md:rounded-[4rem] border border-slate-100 shadow-sm p-6 md:p-16 overflow-hidden relative print:p-0 print:shadow-none print:border-none">
        {!hasGenerated && !isGenerating ? (
          <div className="h-[300px] md:h-[600px] flex flex-col items-center justify-center text-slate-200 border-4 border-dashed border-slate-50 rounded-xl md:rounded-[3rem]">
             <p className="font-black uppercase tracking-[0.2em] text-[10px] md:text-xs text-center px-4">Select period and generate insights</p>
          </div>
        ) : isGenerating ? (
          <div className="h-[300px] md:h-[600px] flex flex-col items-center justify-center space-y-6 md:space-y-12">
             <div className="relative">
                <div className="w-24 h-24 md:w-44 md:h-44 border-[6px] md:border-[10px] border-slate-50 border-t-blue-600 rounded-full animate-spin"></div>
             </div>
             <p className="text-lg md:text-3xl font-black text-slate-900 tracking-tight italic text-center">Synthesizing Monthly Data...</p>
          </div>
        ) : (
          <div className="max-w-none animate-fadeIn">
            <SectionHeader title="Operations" colorClass="bg-blue-600" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 mb-10 md:mb-16">
              <div className="p-6 md:p-10 rounded-2xl md:rounded-[3rem] border border-slate-50 bg-slate-50/20">
                <h3 className="text-sm md:text-xl font-black text-slate-800 mb-4 md:mb-8">Actual vs Estimated</h3>
                <div className="h-[250px] md:h-[350px] -mx-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.comparisonData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Bar name="Actual" dataKey="actual" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={30} />
                      <Bar name="Estimated" dataKey="estimated" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 md:p-10 rounded-2xl md:rounded-[3rem] border border-slate-50 bg-slate-50/20">
                <h3 className="text-sm md:text-xl font-black text-slate-800 mb-4 md:mb-8">Hours Allocation</h3>
                <div className="h-[250px] md:h-[350px] -mx-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20 }}>
                      <Pie data={stats.projectHours} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value">
                        {stats.projectHours.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="space-y-8 md:space-y-12">
              <div className="space-y-4">
                <SectionHeader title="Summary" colorClass="bg-blue-400" />
                <textarea 
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full min-h-[120px] p-6 md:p-8 rounded-xl md:rounded-[2.5rem] bg-slate-50/50 border-2 border-transparent focus:border-blue-500 focus:bg-white text-slate-700 leading-relaxed font-medium text-sm md:text-lg outline-none custom-scrollbar resize-none transition-all"
                />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Insights" colorClass="bg-purple-600" />
                <textarea 
                  value={insights}
                  onChange={(e) => setInsights(e.target.value)}
                  className="w-full min-h-[150px] md:min-h-[200px] p-6 md:p-8 rounded-xl md:rounded-[2.5rem] bg-slate-50/50 border-2 border-transparent focus:border-blue-500 focus:bg-white text-slate-700 leading-relaxed font-medium text-sm md:text-lg outline-none custom-scrollbar resize-none transition-all"
                />
              </div>

              <div className="space-y-4">
                <SectionHeader title="Next Actions" colorClass="bg-emerald-600" />
                <textarea 
                  value={nextActions}
                  onChange={(e) => setNextActions(e.target.value)}
                  className="w-full min-h-[150px] md:min-h-[200px] p-6 md:p-8 rounded-xl md:rounded-[2.5rem] bg-slate-50/50 border-2 border-transparent focus:border-blue-500 focus:bg-white text-slate-700 leading-relaxed font-medium text-sm md:text-lg outline-none custom-scrollbar resize-none transition-all"
                />
              </div>
            </div>
            
            <div className="mt-12 md:mt-24 flex flex-col md:flex-row justify-end gap-4 print:hidden">
               <button onClick={() => setHasGenerated(false)} className="w-full md:w-auto px-10 py-4 md:py-5 bg-slate-100 text-slate-500 font-black rounded-xl md:rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]">Reset</button>
               <button 
                onClick={handleExportPDF} 
                className="w-full md:w-auto px-10 py-4 md:px-14 md:py-5 bg-slate-900 text-white font-black rounded-xl md:rounded-2xl flex items-center justify-center space-x-3 hover:bg-black shadow-2xl active:scale-95"
               >
                 <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                 <span className="uppercase tracking-widest text-[10px]">Export PDF</span>
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
