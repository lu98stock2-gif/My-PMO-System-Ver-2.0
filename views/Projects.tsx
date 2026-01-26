
import React, { useState, useEffect, useRef } from 'react';
import { DB } from '../db';
import { Project, ProjectStatus } from '../types';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const getTodayStr = () => new Date().toLocaleDateString('sv');

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [status, setStatus] = useState<ProjectStatus>('On-going');
  const [estimatedHours, setEstimatedHours] = useState<string>(''); 

  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProjects(DB.getProjects());
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setActivePicker(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setName('');
    setDesc('');
    const today = getTodayStr();
    setStartDate(today);
    setEndDate(today);
    setStatus('On-going');
    setEstimatedHours('');
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const estHoursValue = estimatedHours === '' ? undefined : parseFloat(estimatedHours);

    if (editingId) {
      const updatedProject: Project = {
        id: editingId,
        name,
        description: desc,
        startDate,
        endDate,
        status,
        estimatedHours: estHoursValue,
        createdAt: projects.find(p => p.id === editingId)?.createdAt || new Date().toISOString(),
      };
      DB.updateProject(updatedProject);
      setProjects(prev => prev.map(p => p.id === editingId ? updatedProject : p));
    } else {
      const newProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        description: desc,
        startDate,
        endDate,
        status,
        estimatedHours: estHoursValue,
        createdAt: new Date().toISOString(),
      };
      DB.saveProject(newProject);
      setProjects(prev => [...prev, newProject]);
    }
    resetForm();
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEdit = (p: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(p.id);
    setName(p.name);
    setDesc(p.description || '');
    setStartDate(p.startDate);
    setEndDate(p.endDate);
    setStatus(p.status);
    setEstimatedHours(p.estimatedHours?.toString() || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this project? All associated logs will be removed.')) {
      DB.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (editingId === id) resetForm();
    }
  };

  const renderCalendar = (type: 'start' | 'end') => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    const currentVal = type === 'start' ? startDate : endDate;

    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(
        <button
          key={d}
          type="button"
          onClick={() => {
            if (type === 'start') setStartDate(dStr); else setEndDate(dStr);
            setActivePicker(null);
          }}
          className={`h-9 w-9 rounded-full text-[11px] font-bold transition-all ${
            currentVal === dStr ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-blue-50 text-slate-700'
          }`}
        >
          {d}
        </button>
      );
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    return (
      <div className="absolute left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 top-full mt-2 z-50 p-4 w-64 bg-white border border-slate-100 shadow-2xl rounded-2xl animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-slate-800 text-sm">{monthNames[month]} {year}</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[9px] font-black text-slate-300 uppercase mb-1">{d}</div>)}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-none animate-fadeIn pb-16 md:pb-20">
      <header className="text-center md:text-left">
        <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Project Portfolio</h2>
        <p className="text-sm md:text-base text-slate-500 font-medium">Strategic asset management and deadline tracking.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8">
        {/* Form Container */}
        <div className="xl:col-span-1 bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm md:sticky md:top-8 h-fit">
          <h3 className="text-lg md:text-xl font-black text-slate-900 mb-6 md:mb-8">{editingId ? 'Edit Asset' : 'Register New Asset'}</h3>
          <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
            <div>
              <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Asset Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project Title"
                className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Budgeted Hours</label>
              <input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="e.g. 150"
                className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
              <div className="relative" ref={activePicker === 'start' ? pickerRef : null}>
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Start</label>
                <div 
                  onClick={() => { setActivePicker('start'); setViewDate(new Date(startDate)); }}
                  className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-between cursor-pointer font-bold text-slate-900"
                >
                  <span className="text-sm">{startDate}</span>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                </div>
                {activePicker === 'start' && renderCalendar('start')}
              </div>
              <div className="relative" ref={activePicker === 'end' ? pickerRef : null}>
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">End</label>
                <div 
                  onClick={() => { setActivePicker('end'); setViewDate(new Date(endDate)); }}
                  className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-between cursor-pointer font-bold text-slate-900"
                >
                  <span className="text-sm">{endDate}</span>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                </div>
                {activePicker === 'end' && renderCalendar('end')}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-black py-4 rounded-xl md:rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 tracking-widest text-xs uppercase"
              >
                {editingId ? 'Save Changes' : 'Initialize Asset'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full bg-slate-100 text-slate-500 font-black py-3 rounded-xl md:rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List Container */}
        <div className="xl:col-span-3 bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-sm min-h-[400px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-4 md:mb-0">Portfolio Breakdown</h3>
            <div className="flex items-center space-x-4">
               <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Active</div>
               <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Done</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {projects.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-200 border-4 border-dashed border-slate-50 rounded-3xl">
                 <p className="font-black text-lg uppercase tracking-widest">No assets recorded</p>
              </div>
            )}
            {projects.map(p => (
              <div key={p.id} className="p-5 rounded-2xl border border-slate-50 bg-slate-50/20 hover:bg-white hover:border-blue-200 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-50/50 group">
                <div className="flex items-start justify-between mb-4">
                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                    p.status === 'Done' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}>{p.status}</span>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleEdit(p, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={(e) => handleDelete(p.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg mb-2 line-clamp-1">{p.name}</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-[10px] font-bold text-slate-400">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                    {p.startDate} — {p.endDate}
                  </div>
                  {p.estimatedHours && (
                    <div className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black">
                      CAP: {p.estimatedHours}h
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;
