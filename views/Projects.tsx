
import React, { useState, useEffect, useRef } from 'react';
import { DB } from '../db';
import { Project, ProjectStatus } from '../types';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
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
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date().toISOString().slice(0, 10));
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
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('このプロジェクトを削除しますか？関連する工数記録もすべて削除されます。')) {
      DB.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (editingId === id) {
        resetForm();
      }
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
          className={`h-8 w-8 rounded-full text-[10px] font-bold transition-all ${
            currentVal === dStr ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-700'
          }`}
        >
          {d}
        </button>
      );
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    return (
      <div className="absolute left-0 top-full mt-2 z-50 p-4 w-64 bg-white border border-slate-100 shadow-2xl rounded-2xl animate-fadeIn">
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
    <div className="space-y-8 w-full max-w-none animate-fadeIn pb-20">
      <header>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Projects Portfolio</h2>
        <p className="text-slate-500 font-medium">Manage your projects, set deadlines, and track status.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-8 h-fit">
          <h3 className="text-xl font-black text-slate-900 mb-8">{editingId ? 'Edit Project' : 'Register Project'}</h3>
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-[0.1em]">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project Title"
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-[0.1em]">Estimated Hours (Total)</label>
              <input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="e.g. 150"
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="relative" ref={activePicker === 'start' ? pickerRef : null}>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-[0.1em]">Start Date</label>
                <div 
                  onClick={() => { setActivePicker('start'); setViewDate(new Date(startDate)); }}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 flex items-center justify-between cursor-pointer font-bold text-slate-900"
                >
                  <span>{startDate}</span>
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                </div>
                {activePicker === 'start' && renderCalendar('start')}
              </div>
              <div className="relative" ref={activePicker === 'end' ? pickerRef : null}>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-[0.1em]">End Date</label>
                <div 
                  onClick={() => { setActivePicker('end'); setViewDate(new Date(endDate)); }}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 flex items-center justify-between cursor-pointer font-bold text-slate-900"
                >
                  <span>{endDate}</span>
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                </div>
                {activePicker === 'end' && renderCalendar('end')}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-[0.1em]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold cursor-pointer"
              >
                <option value="On-going">On-going</option>
                <option value="Done">Done</option>
                <option value="Back Log">Back Log</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-[0.1em]">Description</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="High-level objectives..."
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none h-32 text-slate-900 font-medium resize-none custom-scrollbar"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 tracking-widest text-xs uppercase"
              >
                {editingId ? 'Update' : 'Register'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="xl:col-span-3 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm min-h-[700px]">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Portfolio Analysis</h3>
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Active</div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Completed</div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Queue</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 && (
              <div className="col-span-full py-40 flex flex-col items-center justify-center text-slate-200 border-4 border-dashed border-slate-50 rounded-[3rem]">
                 <svg className="w-20 h-20 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                 <p className="font-black text-lg uppercase tracking-widest">Your portfolio is empty</p>
              </div>
            )}
            {projects.map(p => (
              <div key={p.id} className="p-5 rounded-2xl border border-slate-50 bg-slate-50/20 flex flex-col justify-between group hover:border-blue-200 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-50/50">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-4">
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.15em] ${
                      p.status === 'On-going' ? 'bg-blue-50 text-blue-600' :
                      p.status === 'Done' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {p.status}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleEdit(p, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit project">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={(e) => handleDelete(p.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete project">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg mb-2 line-clamp-1">{p.name}</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-[10px] font-bold text-slate-400 bg-white w-fit px-2 py-1 rounded-lg shadow-xs border border-slate-50">
                      <svg className="w-3 h-3 mr-1 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {p.startDate} — {p.endDate}
                    </div>

                    {p.estimatedHours && (
                      <div className="flex items-center text-[10px] font-black text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-lg shadow-xs border border-blue-100">
                        EST: {p.estimatedHours} h
                      </div>
                    )}
                  </div>

                  {p.description && <p className="text-xs text-slate-500 mt-4 line-clamp-2 leading-relaxed font-medium">{p.description}</p>}
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
