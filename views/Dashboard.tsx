
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DB } from '../db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const Dashboard: React.FC = () => {
  // Use local time for the current month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleDateString('sv').slice(0, 7));
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const projects = useMemo(() => DB.getProjects(), []);
  const estimates = useMemo(() => DB.getEstimates(), []);
  const timeEntries = useMemo(() => DB.getTimeEntries(), []);

  // Filter data by selected month
  const filteredEntries = useMemo(() => {
    return timeEntries.filter(e => e.date.startsWith(selectedMonth));
  }, [timeEntries, selectedMonth]);

  const monthTotalHours = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + e.hours, 0);
  }, [filteredEntries]);

  const deliverablesThisMonth = useMemo(() => {
    return filteredEntries.filter(e => e.deliverable && e.deliverable.trim() !== "");
  }, [filteredEntries]);

  const totalEstimatedInMonth = useMemo(() => {
    const activeProjectsThisMonth = projects.filter(p => {
      return p.startDate.startsWith(selectedMonth) || p.endDate.startsWith(selectedMonth) || (p.startDate < selectedMonth && p.endDate > selectedMonth);
    });

    const projectLevelSum = activeProjectsThisMonth.reduce((sum, p) => sum + (p.estimatedHours || 0), 0);
    
    const wbsSum = estimates
      .filter(est => est.createdAt.startsWith(selectedMonth))
      .reduce((sum, e) => sum + (e.totalHours * (1 + e.bufferPercent / 100)), 0);

    return projectLevelSum > 0 ? projectLevelSum : wbsSum;
  }, [projects, estimates, selectedMonth]);

  const mainChartData = useMemo(() => {
    return projects.map(p => {
      const actual = filteredEntries.filter(e => e.projectId === p.id).reduce((s, e) => s + e.hours, 0);
      
      let est = p.estimatedHours || 0;
      if (est === 0) {
        est = estimates
          .filter(e => e.projectId === p.id && e.createdAt.startsWith(selectedMonth))
          .reduce((s, e) => s + e.totalHours, 0);
      }

      return {
        name: p.name,
        actual,
        estimated: est || 0,
      };
    }).filter(d => d.actual > 0 || d.estimated > 0).slice(0, 10);
  }, [projects, filteredEntries, estimates, selectedMonth]);

  const projectHoursData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEntries.forEach(e => {
      const p = projects.find(proj => proj.id === e.projectId)?.name || 'Unknown';
      map[p] = (map[p] || 0) + e.hours;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredEntries, projects]);

  const taskTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEntries.forEach(e => {
      const type = e.taskType || 'Other';
      map[type] = (map[type] || 0) + e.hours;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);

  const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#ec4899', '#6366f1'];

  const inProgressProjects = useMemo(() => {
    return projects.filter(p => p.status === 'On-going');
  }, [projects]);

  const adjustMonth = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const adjustYear = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newY = year + delta;
    const newM = String(month).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-8 animate-fadeIn w-full max-w-none px-4 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 font-medium">Monthly performance and project insights.</p>
        </div>
        
        <div className="relative">
          <div className="flex items-center bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-1 border-r border-slate-100 pr-3 mr-3">
              <button onClick={() => adjustYear(-1)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Previous Year">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => adjustMonth(-1)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Previous Month">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
            </div>
            
            <div 
              className="flex items-center space-x-3 group cursor-pointer" 
              onClick={() => setShowPicker(!showPicker)}
            >
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
              </div>
              <span className="font-black text-slate-900 tracking-tight text-lg min-w-[140px] text-center">{getMonthName(selectedMonth)}</span>
            </div>

            <div className="flex items-center space-x-1 border-l border-slate-100 pl-3 ml-3">
              <button onClick={() => adjustMonth(1)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Next Month">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button onClick={() => adjustYear(1)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Next Year">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
          
          {showPicker && (
            <div ref={pickerRef} className="absolute right-0 top-full mt-4 z-50 bg-white border border-slate-100 shadow-2xl rounded-3xl p-4 w-64 animate-fadeIn">
               <div className="grid grid-cols-3 gap-2">
                 {Array.from({length: 12}).map((_, i) => {
                   const m = String(i + 1).padStart(2, '0');
                   const [year] = selectedMonth.split('-');
                   const currentM = `${year}-${m}`;
                   return (
                     <button
                       key={i}
                       onClick={() => {
                         setSelectedMonth(currentM);
                         setShowPicker(false);
                       }}
                       className={`py-2 rounded-xl text-xs font-bold transition-all ${
                         selectedMonth === currentM ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-50 text-slate-700'
                       }`}
                     >
                       {new Date(2000, i).toLocaleString('default', { month: 'short' })}
                     </button>
                   );
                 })}
               </div>
            </div>
          )}
        </div>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'ACTUAL HOURS (MONTH)', value: monthTotalHours, unit: 'h', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'blue' },
          { label: 'ESTIMATED (THIS MONTH)', value: Math.round(totalEstimatedInMonth), unit: 'h', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', color: 'emerald' },
          { label: 'DELIVERABLES PRODUCED', value: deliverablesThisMonth.length, unit: '', icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'purple' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className={`w-12 h-12 rounded-2xl bg-${item.color}-50 flex items-center justify-center text-${item.color}-600 mb-6`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
            </div>
            <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">{item.label}</p>
            <p className="text-4xl font-black text-slate-900">
              {item.value}
              <span className="text-xl text-slate-300 font-black ml-4">{item.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></span>
            Actual vs Estimated
          </h3>
          <div className="h-[450px]">
            {mainChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mainChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px' }} />
                  <Bar name="Actual Hours" dataKey="actual" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
                  <Bar name="Estimated Hours" dataKey="estimated" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium italic">No comparison data for this month.</div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xl font-bold text-slate-900 mb-8">On-going Project</h3>
          <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
            {inProgressProjects.length === 0 && <p className="text-slate-400 text-sm">No on-going projects found.</p>}
            {inProgressProjects.map(p => (
              <div key={p.id} className="p-5 rounded-2xl border border-slate-100 hover:border-blue-300 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-xs font-black text-blue-600 uppercase tracking-tighter">PROJECT</p>
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <p className="text-sm font-bold text-slate-900 truncate mb-1">{p.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{p.startDate} - {p.endDate}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full mr-3"></span>
            Hours By Project
          </h3>
          <div className="h-96">
            {projectHoursData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20 }}>
                  <Pie
                    data={projectHoursData}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={130}
                    paddingAngle={8}
                    dataKey="value"
                    label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {projectHoursData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300">No activity this month.</div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center">
            <span className="w-1.5 h-6 bg-purple-500 rounded-full mr-3"></span>
            Task Type Distribution
          </h3>
          <div className="h-96">
            {taskTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20 }}>
                  <Pie
                    data={taskTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={130}
                    paddingAngle={8}
                    dataKey="value"
                    label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {taskTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300">No task types recorded.</div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Deliverables List */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center">
          <span className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></span>
          Deliverables this Month
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deliverablesThisMonth.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
               <p>No deliverables recorded for {getMonthName(selectedMonth)}.</p>
            </div>
          )}
          {deliverablesThisMonth.map((e, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/50 flex flex-col justify-between hover:border-blue-200 transition-all group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{projects.find(p => p.id === e.projectId)?.name}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{e.date}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1 group-hover:text-blue-700 transition-colors">{e.deliverable}</h4>
                <p className="text-xs text-slate-500 line-clamp-1">{e.taskName}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
