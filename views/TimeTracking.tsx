
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DB } from '../db';
import { Project, TimeEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const TimeTracking: React.FC = () => {
  const allProjects = useMemo(() => DB.getProjects(), []);
  const onGoingProjects = useMemo(() => allProjects.filter(p => p.status === 'On-going'), [allProjects]);
  
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv'));
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date()); 
  const calendarRef = useRef<HTMLDivElement>(null);

  const [dailyMemo, setDailyMemo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [hours, setHours] = useState(1.0);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(DB.getTimeEntries());
    setDailyMemo(localStorage.getItem(`daily_memo_${selectedDate}`) || '');
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) setShowCalendar(false);
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
    if (window.confirm("Delete this log?")) {
      DB.deleteTimeEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

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
        <button key={d} type="button" onClick={() => { setSelectedDate(dStr); setShowCalendar(false); }}
          className={`h-9 w-9 rounded-full text-[11px] font-bold ${selectedDate === dStr ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-50 text-slate-700'}`}>
          {d}
        </button>
      );
    }
    return (
      <div className="p-5 w-72 bg-white border border-slate-100 shadow-2xl rounded-3xl animate-fadeIn scale-100 origin-top-right">
        <div className="flex items-center justify-between mb-4">
          <span className="font-black text-slate-900">{new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setCalendarViewDate(new Date(year, month - 1, 1))} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
            <button type="button" onClick={() => setCalendarViewDate(new Date(year, month + 1, 1))} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[9px] font-black text-slate-300 mb-2 uppercase">{d}</div>)}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-none animate-fadeIn pb-16 md:pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Time Capture</h2>
          <p className="text-sm text-slate-500 font-medium">Record daily progress and deliverables.</p>
        </div>
        <div className="relative mx-auto md:mx-0">
          <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toLocaleDateString('sv')); }} className="p-1 text-slate-400 hover:text-blue-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
            <div className="mx-4 flex items-center space-x-2 cursor-pointer" onClick={() => setShowCalendar(!showCalendar)}>
              <span className="font-black text-slate-900 tracking-tight text-base">{selectedDate}</span>
            </div>
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toLocaleDateString('sv')); }} className="p-1 text-slate-400 hover:text-blue-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></button>
          </div>
          {showCalendar && <div ref={calendarRef} className="absolute right-0 top-full mt-2 z-50">{renderCalendar()}</div>}
        </div>
      </header>

      {/* Capture Form */}
      <div className={`p-6 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}>
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">{editingId ? 'Edit Record' : 'Log Daily Progress'}</h3>
        <form onSubmit={handleRecord} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Asset</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold">
                <option value="">Select Project</option>
                {onGoingProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Activity Detail</label>
              <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Completed feature X..." className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold"/>
            </div>
            <div className="md:col-span-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Link / Deliverable</label>
              <input type="text" value={deliverable} onChange={e => setDeliverable(e.target.value)} placeholder="PR #123 / URL" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold"/>
            </div>
            <div className="md:col-span-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Hours</label>
              <input type="number" step="0.5" value={hours} onChange={e => setHours(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border-none rounded-xl px-3 py-3 text-sm font-black text-center"/>
            </div>
            <button type="submit" className={`md:col-span-1 text-white font-black py-3 rounded-xl transition-all shadow-xl ${editingId ? 'bg-emerald-600' : 'bg-blue-600'}`}>
              <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={editingId ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} /></svg>
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8">
        <div className="xl:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm p-4 md:p-8 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-4">Activity Log</h3>
          {dayEntries.length === 0 && <p className="text-slate-300 text-center py-10 font-medium">No records for this date.</p>}
          {dayEntries.map(e => (
            <div key={e.id} className="p-4 bg-slate-50/50 border border-slate-50 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center group">
              <div className="flex-1 mb-4 md:mb-0">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">{allProjects.find(p => p.id === e.projectId)?.name}</p>
                <h4 className="font-bold text-slate-900 leading-tight">{e.taskName}</h4>
                {e.deliverable && <p className="text-[10px] text-slate-400 mt-1 font-bold truncate">REF: {e.deliverable}</p>}
              </div>
              <div className="flex items-center space-x-6 w-full md:w-auto justify-between border-t md:border-t-0 pt-3 md:pt-0">
                <span className="text-2xl font-black text-slate-900 tracking-tighter">{e.hours}h</span>
                <div className="flex space-x-1">
                  <button onClick={() => startEdit(e)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                  <button onClick={(ev) => handleDelete(e.id, ev)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Daily Capacity</p>
            <p className="text-5xl font-black text-slate-900 tracking-tighter">{dayTotal}<span className="text-xl text-slate-300 ml-1">h</span></p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Daily Notes</h3>
             <textarea value={dailyMemo} onChange={(e) => handleSaveMemo(e.target.value)} placeholder="Blockers / Key updates..."
               className="w-full h-32 bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none resize-none"
             />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeTracking;
