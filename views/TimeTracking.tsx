
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DB } from '../db';
import { Project, TimeEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const TimeTracking: React.FC = () => {
  const allProjects = useMemo(() => DB.getProjects(), []);
  const onGoingProjects = useMemo(() => allProjects.filter(p => p.status === 'On-going'), [allProjects]);
  
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  // Use local ISO-like date string (YYYY-MM-DD) for initial state
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv'));
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date()); 
  const calendarRef = useRef<HTMLDivElement>(null);

  const [dailyMemo, setDailyMemo] = useState('');

  // Input fields for record/edit
  const [projectId, setProjectId] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [hours, setHours] = useState(1.0);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(DB.getTimeEntries());
    const savedMemo = localStorage.getItem(`daily_memo_${selectedDate}`);
    setDailyMemo(savedMemo || '');
    setCalendarViewDate(new Date(selectedDate));

    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedDate]);

  const handleSaveMemo = (val: string) => {
    setDailyMemo(val);
    localStorage.setItem(`daily_memo_${selectedDate}`, val);
  };

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !taskName || hours <= 0) return;

    if (editingId) {
      const updated: TimeEntry = {
        id: editingId,
        projectId,
        taskName,
        taskType,
        deliverable,
        date: selectedDate,
        hours,
        createdAt: entries.find(e => e.id === editingId)?.createdAt || new Date().toISOString(),
      };
      DB.updateTimeEntry(updated);
      setEntries(prev => prev.map(e => e.id === editingId ? updated : e));
      setEditingId(null);
    } else {
      const newEntry: TimeEntry = {
        id: Math.random().toString(36).substr(2, 9),
        projectId,
        taskName,
        taskType,
        deliverable,
        date: selectedDate,
        hours,
        createdAt: new Date().toISOString(),
      };
      DB.saveTimeEntry(newEntry);
      setEntries(prev => [...prev, newEntry]);
    }
    setTaskName('');
    setTaskType('');
    setDeliverable('');
    setHours(1.0);
    setProjectId('');
  };

  const startEdit = (e: TimeEntry, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    setEditingId(e.id);
    setProjectId(e.projectId);
    setTaskName(e.taskName);
    setTaskType(e.taskType);
    setDeliverable(e.deliverable || '');
    setHours(e.hours);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const dayEntries = useMemo(() => entries.filter(e => e.date === selectedDate), [entries, selectedDate]);
  const dayTotal = useMemo(() => dayEntries.reduce((sum, e) => sum + e.hours, 0), [dayEntries]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("このログを削除しますか？")) {
      DB.deleteTimeEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setTaskName('');
        setProjectId('');
      }
    }
  };

  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    dayEntries.forEach(e => {
      const type = e.taskType || 'Other';
      map[type] = (map[type] || 0) + e.hours;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [dayEntries]);

  const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

  const renderCalendar = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(
        <button
          key={d}
          type="button"
          onClick={() => {
            setSelectedDate(dStr);
            setShowCalendar(false);
          }}
          className={`h-9 w-9 rounded-full text-[11px] font-bold transition-all ${
            selectedDate === dStr ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-50 text-slate-700'
          }`}
        >
          {d}
        </button>
      );
    }
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return (
      <div className="p-5 w-72 bg-white border border-slate-100 shadow-sm rounded-3xl animate-fadeIn scale-100 origin-top-right">
        <div className="flex items-center justify-between mb-6">
          <span className="font-black text-slate-900 tracking-tight">{monthNames[month]} {year}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setCalendarViewDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button type="button" onClick={() => setCalendarViewDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[10px] font-black text-slate-300 mb-2 uppercase">{d}</div>)}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-none px-0 md:px-4 pb-10 md:pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Time Tracking</h2>
          <p className="text-xs md:text-base text-slate-500 font-medium">Capture deliverables and daily duration.</p>
        </div>
        <div className="relative">
          <div className="flex items-center justify-between bg-white px-4 md:px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
            <button 
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toLocaleDateString('sv'));
              }}
              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="mx-4 md:mx-6 flex items-center space-x-2 md:space-x-3 group cursor-pointer" onClick={() => setShowCalendar(!showCalendar)}>
              <div className="p-1.5 md:p-2 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
              </div>
              <span className="font-black text-slate-900 tracking-tight text-base md:text-lg">{selectedDate}</span>
            </div>
            <button 
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toLocaleDateString('sv'));
              }}
              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          {showCalendar && (
            <div ref={calendarRef} className="absolute right-0 top-full mt-4 z-50">
              {renderCalendar()}
            </div>
          )}
        </div>
      </header>

      {/* NEW/EDIT ACTIVITY ENTRY */}
      <div className={`p-6 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border transition-all duration-500 relative overflow-hidden ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}>
        <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 md:-mr-32 md:-mt-32"></div>
        <div className="flex items-center justify-between mb-6 md:mb-8 relative z-10">
          <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center">
            <span className={`w-4 md:w-8 h-[1px] mr-2 md:mr-3 ${editingId ? 'bg-blue-600' : 'bg-slate-300'}`}></span>
            {editingId ? 'EDIT ACTIVITY' : 'NEW ACTIVITY'}
          </h3>
          {editingId && (
             <button onClick={() => { setEditingId(null); setTaskName(''); setProjectId(''); }} className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest">
                Cancel
             </button>
          )}
        </div>
        <form onSubmit={handleRecord} className="flex flex-col gap-4 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Project</label>
              <select 
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full bg-white border border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 text-sm"
              >
                <option value="">Select Project</option>
                {onGoingProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Task Type</label>
              <input 
                type="text"
                value={taskType}
                onChange={e => setTaskType(e.target.value)}
                placeholder="Design/Code"
                className="w-full bg-white border border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold placeholder-slate-400 text-slate-900 text-sm"
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Description</label>
              <input 
                type="text"
                value={taskName}
                onChange={e => setTaskName(e.target.value)}
                placeholder="What did you achieve?"
                className="w-full bg-white border border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold placeholder-slate-400 text-slate-900 text-sm"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Deliverable</label>
              <input 
                type="text"
                value={deliverable}
                onChange={e => setDeliverable(e.target.value)}
                placeholder="PR/URL/File"
                className="w-full bg-white border border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold placeholder-slate-400 text-slate-900 text-sm"
              />
            </div>
            <div className="md:col-span-1 space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Hours</label>
              <input 
                type="number"
                step="0.5"
                value={hours}
                onChange={e => setHours(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-100 rounded-xl md:rounded-2xl px-2 md:px-5 py-3 md:py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black text-blue-600 text-center text-sm"
              />
            </div>
            <button 
              type="submit"
              className={`md:col-span-1 text-white font-black py-3 md:py-4 rounded-xl md:rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center ${editingId ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
            >
              {editingId ? (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8 pb-10">
        <div className="xl:col-span-3 bg-white rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col min-h-[400px] md:min-h-[550px] overflow-hidden">
           <div className="p-5 md:p-8 border-b border-slate-50 flex items-center justify-between">
             <h3 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center">
                <span className="w-1.5 h-5 md:h-6 bg-blue-600 rounded-full mr-3"></span>
                WORK LOG
             </h3>
             <span className="bg-slate-100 text-slate-500 px-3 md:px-4 py-1 rounded-full text-[8px] md:text-[10px] font-black tracking-widest uppercase">{dayEntries.length} Records</span>
           </div>
           <div className="flex-1 p-4 md:p-8 space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar">
             {dayEntries.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-slate-300">
                 <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                   <svg className="w-10 h-10 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <p className="text-sm font-semibold text-slate-400">Empty for today.</p>
               </div>
             )}
             {dayEntries.map(e => (
               <div key={e.id} className="group p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-50 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between hover:bg-white hover:border-blue-200 transition-all duration-300 hover:shadow-xl hover:shadow-blue-50/50">
                 <div className="flex-1 min-w-0 mb-4 md:mb-0">
                   <div className="flex items-center space-x-3 mb-2">
                    <span className="text-[10px] md:text-[11px] font-black text-blue-600 tracking-tighter uppercase px-2 py-0.5 bg-blue-50 rounded-lg truncate max-w-[120px] md:max-w-none">{allProjects.find(p => p.id === e.projectId)?.name}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[10px] md:text-[11px] text-slate-400 font-black uppercase tracking-widest truncate">{e.taskType}</span>
                   </div>
                   <h4 className="font-bold text-slate-900 text-lg md:text-2xl leading-tight mb-2 truncate group-hover:text-blue-700 transition-colors">{e.taskName}</h4>
                   {e.deliverable && (
                     <div className="flex items-center text-xs md:text-sm text-slate-500 font-semibold bg-white w-fit px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl shadow-sm border border-slate-100">
                        <svg className="w-3 h-3 md:w-4 md:h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-slate-400 mr-2 uppercase text-[8px] md:text-[10px] whitespace-nowrap">Deliverable:</span> 
                        <span className="truncate max-w-[150px] md:max-w-none">{e.deliverable}</span>
                     </div>
                   )}
                 </div>
                 <div className="flex items-center justify-between md:justify-end space-x-4 md:space-x-6 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                   <div className="text-left md:text-right">
                     <p className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">{e.hours}<span className="text-base md:text-lg text-slate-300 font-black ml-1 md:ml-2">h</span></p>
                   </div>
                   <div className="flex items-center space-x-1 md:space-x-2">
                      <button 
                        onClick={(ev) => startEdit(e, ev)}
                        className="p-2 md:p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button 
                        onClick={(ev) => handleDelete(e.id, ev)}
                        className="p-2 md:p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>

        <div className="xl:col-span-1 space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-sm text-center">
            <div className="w-12 h-12 md:w-20 md:h-20 bg-blue-50 rounded-xl md:rounded-[2rem] flex items-center justify-center text-blue-600 mx-auto mb-4 md:mb-6 shadow-sm">
              <svg className="w-6 h-6 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-[9px] md:text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-1">Total Duration</p>
            <p className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">
              {dayTotal}
              <span className="text-xl md:text-2xl text-slate-300 font-black ml-2 md:ml-4 tracking-normal">h</span>
            </p>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-4 md:mb-6 flex items-center">
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Progress Note
            </h3>
            <textarea
              value={dailyMemo}
              onChange={(e) => handleSaveMemo(e.target.value)}
              placeholder="Highlights or blockers..."
              className="w-full h-32 md:h-48 px-4 md:px-6 py-4 md:py-5 rounded-xl md:rounded-3xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-xs md:text-sm text-slate-900 resize-none font-medium custom-scrollbar"
            />
          </div>

          <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center">
            <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-4 md:mb-6 flex items-center">
               <span className="w-1.5 h-4 bg-purple-500 rounded-full mr-2"></span>
               Distribution
            </h3>
            <div className="w-full h-64 md:h-80 -mx-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest italic">No Data</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeTracking;
