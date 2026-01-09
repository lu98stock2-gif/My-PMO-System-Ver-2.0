
import React, { useState, useMemo, useEffect } from 'react';
import { DB } from '../db';
import { generateEstimate, AIResponseEstimate } from '../services/gemini';
import { Project, Estimate, EstimateItem } from '../types';

const Estimator: React.FC = () => {
  const projects = useMemo(() => DB.getProjects(), []);
  const [savedEstimates, setSavedEstimates] = useState<Estimate[]>([]);
  const [inputText, setInputText] = useState('');
  const [projectType, setProjectType] = useState('Web Development');
  const [targetProjectId, setTargetProjectId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AIResponseEstimate | null>(null);
  const [buffer, setBuffer] = useState(15);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setSavedEstimates(DB.getEstimates());
  }, []);

  const handleGenerate = async () => {
    if (!inputText) return;
    setIsGenerating(true);
    try {
      const data = await generateEstimate(inputText, projectType);
      setResult(data);
    } catch (error) {
      alert("Failed to generate estimate. Check API key or console.");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateItem = (index: number, field: keyof EstimateItem, value: any) => {
    if (!result) return;
    const newItems = [...result.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setResult({ ...result, items: newItems });
  };

  const deleteItem = (index: number) => {
    if (!result) return;
    const newItems = [...result.items];
    newItems.splice(index, 1);
    setResult({ ...result, items: newItems });
  };

  const handleSave = () => {
    if (!result) return;
    
    if (editingId) {
      const updatedEstimate: Estimate = {
        id: editingId,
        projectId: targetProjectId || undefined,
        inputText,
        assumptions: result.assumptions,
        risks: result.risks,
        totalHours: result.totalHours,
        bufferPercent: buffer,
        items: result.items.map(i => (i as any).id ? i as EstimateItem : { ...i, id: Math.random().toString(36).substr(2, 9) } as EstimateItem),
        createdAt: savedEstimates.find(e => e.id === editingId)?.createdAt || new Date().toISOString(),
      };
      DB.updateEstimate(updatedEstimate);
      setSavedEstimates(savedEstimates.map(e => e.id === editingId ? updatedEstimate : e));
      alert('Estimate updated!');
    } else {
      const newEstimate: Estimate = {
        id: Math.random().toString(36).substr(2, 9),
        projectId: targetProjectId || undefined,
        inputText,
        assumptions: result.assumptions,
        risks: result.risks,
        totalHours: result.totalHours,
        bufferPercent: buffer,
        items: result.items.map(i => ({ ...i, id: Math.random().toString(36).substr(2, 9) } as EstimateItem)),
        createdAt: new Date().toISOString(),
      };
      DB.saveEstimate(newEstimate);
      setSavedEstimates(prev => [...prev, newEstimate]);
      alert('Estimate saved!');
    }
  };

  const handleLoadEstimate = (est: Estimate) => {
    setEditingId(est.id);
    setInputText(est.inputText);
    setProjectType('Web Development'); 
    setTargetProjectId(est.projectId || '');
    setBuffer(est.bufferPercent);
    setResult({
      items: est.items,
      totalHours: est.totalHours,
      risks: est.risks,
      assumptions: est.assumptions,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setEditingId(null);
    setInputText('');
    setResult(null);
    setTargetProjectId('');
  };

  const finalTotal = useMemo(() => {
    if (!result) return 0;
    const total = result.items.reduce((sum, i) => sum + (Number(i.estimatedHours) || 0), 0);
    return Math.round(total * (1 + buffer / 100) * 10) / 10;
  }, [result, buffer]);

  // Group items by Phase for WBS view
  const groupedItems = useMemo(() => {
    const defaultRecord: Record<string, (EstimateItem & { originalIndex: number })[]> = {};
    if (!result) return defaultRecord;
    return result.items.reduce((acc, item, originalIndex) => {
      const phase = item.phase || 'General';
      if (!acc[phase]) acc[phase] = [];
      // Cast to any because result.items don't have 'id', but groupedItems type expects it.
      // This is safe for rendering and updateItem because we use originalIndex for updates.
      acc[phase].push({ ...item, originalIndex } as any);
      return acc;
    }, defaultRecord);
  }, [result]);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">AI Estimator</h2>
          <p className="text-slate-500 font-medium">Decompose requirements into a structured Work Breakdown Structure.</p>
        </div>
        {editingId && (
          <button 
            onClick={handleReset}
            className="px-6 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Create New
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Input Side */}
        <div className={`p-8 rounded-[2.5rem] border shadow-sm space-y-6 transition-all duration-500 ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                {editingId ? 'Edit WBS Requirements' : 'New Requirements'}
              </h3>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Work Scope</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste user stories, task lists, or natural language requirements here..."
              className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none h-64 resize-none custom-scrollbar text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Domain (Custom)</label>
              <input 
                type="text"
                value={projectType}
                onChange={e => setProjectType(e.target.value)}
                placeholder="e.g. Fintech Web App"
                className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link to Portfolio</label>
              <select 
                value={targetProjectId}
                onChange={e => setTargetProjectId(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-100 outline-none cursor-pointer text-slate-900 font-bold"
              >
                <option value="">(Standalone Estimate)</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !inputText}
            className={`w-full py-5 rounded-2xl font-black flex items-center justify-center space-x-3 transition-all shadow-xl active:scale-95 ${
              isGenerating || !inputText 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
                <span className="uppercase text-xs tracking-widest">Building WBS...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="uppercase text-xs tracking-widest">{editingId ? 'RE-BUILD WBS WITH AI' : 'GENERATE AI WBS'}</span>
              </>
            )}
          </button>
        </div>

        {/* Output Side */}
        <div className="bg-white min-h-[500px] rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          {!result && !isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-xl font-black text-slate-300 tracking-tight uppercase">Awaiting Input</p>
              <p className="text-sm mt-2 max-w-xs font-medium">Gemini will generate a phase-based WBS and time rationale.</p>
            </div>
          ) : isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-8">
               <div className="relative">
                  <div className="w-24 h-24 border-[6px] border-slate-50 border-t-blue-600 rounded-full animate-spin"></div>
               </div>
               <div className="text-center">
                  <p className="text-lg font-black text-slate-900 tracking-tight italic">Analyzing project architecture...</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Hierarchical decomposition in progress</p>
               </div>
            </div>
          ) : (
            <div className="p-10 space-y-10 animate-fadeIn h-full overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Work Breakdown Structure</h3>
                <div className="flex items-center space-x-3 bg-slate-50 px-4 py-2 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BUFFER</span>
                  <div className="flex items-center">
                    <input 
                      type="number" 
                      value={buffer} 
                      onChange={e => setBuffer(parseInt(e.target.value) || 0)}
                      className="w-12 bg-transparent border-none text-center font-black text-blue-600 text-sm focus:ring-0"
                    />
                    <span className="text-xs font-black text-slate-300">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-12">
                {/* Fix TypeScript unknown errors in groupedItems.map by adding type assertions for Object.entries */}
                {(Object.entries(groupedItems) as [string, (EstimateItem & { originalIndex: number })[]][]).map(([phase, items]) => (
                  <div key={phase} className="space-y-4">
                    <div className="flex items-center justify-between border-l-4 border-blue-600 pl-4 py-1">
                      <input 
                        type="text" 
                        value={phase} 
                        onChange={(e) => {
                          items.forEach(item => updateItem(item.originalIndex, 'phase', e.target.value));
                        }}
                        className="text-sm font-black text-slate-900 uppercase tracking-widest bg-transparent border-none focus:ring-0 p-0"
                      />
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        {items.reduce((sum, i) => sum + i.estimatedHours, 0)}Hr Subtotal
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.originalIndex} className="group p-6 rounded-3xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all duration-300 hover:shadow-lg hover:shadow-blue-50/50 relative">
                          <button 
                            onClick={() => deleteItem(item.originalIndex)}
                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove Task"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                            <div className="md:col-span-8">
                              <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1 block">Task Name</label>
                              <input
                                type="text"
                                value={item.taskName}
                                onChange={(e) => updateItem(item.originalIndex, 'taskName', e.target.value)}
                                className="w-full bg-transparent border-none p-0 text-md font-bold text-slate-900 focus:ring-0 group-hover:text-blue-700 transition-colors"
                              />
                            </div>
                            <div className="md:col-span-4 text-right pr-8">
                              <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1 block">Effort</label>
                              <div className="flex items-center justify-end">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={item.estimatedHours}
                                  onChange={(e) => updateItem(item.originalIndex, 'estimatedHours', parseFloat(e.target.value) || 0)}
                                  className="w-14 bg-transparent border-none p-0 text-xl font-black text-slate-900 tracking-tighter text-right focus:ring-0"
                                />
                                <span className="text-[10px] text-slate-300 font-black ml-1">Hr</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mb-4">
                            <input
                              type="text"
                              value={item.role || ''}
                              onChange={(e) => updateItem(item.originalIndex, 'role', e.target.value)}
                              className="px-3 py-1 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest border-none focus:ring-0 w-fit inline-block"
                              placeholder="Role (e.g. PM)"
                            />
                          </div>

                          <textarea
                            value={item.rationale}
                            onChange={(e) => updateItem(item.originalIndex, 'rationale', e.target.value)}
                            className="w-full bg-white rounded-2xl border border-slate-50 p-4 italic text-[11px] text-slate-500 font-medium leading-relaxed resize-none h-16 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-10 mt-10 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Total WBS Effort</p>
                  <p className="text-6xl font-black text-slate-900 tracking-tighter">
                    {finalTotal}
                    <span className="text-2xl text-slate-300 font-black ml-4 tracking-normal">Hr</span>
                  </p>
                </div>
                <button 
                  onClick={handleSave}
                  className="px-12 py-6 bg-emerald-600 text-white font-black rounded-3xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-50 active:scale-95 uppercase text-xs tracking-widest"
                >
                  {editingId ? 'Update WBS' : 'Commit WBS'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECENT ESTIMATES SECTION */}
      <section className="mt-16 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8 flex items-center">
           <span className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></span>
           WBS Library
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedEstimates.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-50 rounded-[2.5rem]">
               <p className="font-bold uppercase tracking-widest text-xs">No saved structures yet.</p>
            </div>
          )}
          {savedEstimates.slice().reverse().map(est => (
            <div 
              key={est.id} 
              onClick={() => handleLoadEstimate(est)}
              className="p-6 rounded-[2rem] border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-blue-300 cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-xl hover:shadow-blue-50/50"
            >
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                   {projects.find(p => p.id === est.projectId)?.name || 'Standalone'}
                 </span>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{est.createdAt.slice(0, 10)}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm line-clamp-2 mb-4 group-hover:text-blue-700 transition-colors leading-relaxed italic">
                 "{est.inputText.slice(0, 80)}..."
              </h4>
              <div className="flex items-end justify-between">
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">WBS Total</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">{est.totalHours}<span className="text-[10px] ml-0.5">Hr</span></span>
                 </div>
                 <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Estimator;
