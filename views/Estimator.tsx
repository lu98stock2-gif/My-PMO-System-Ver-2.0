
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

  const groupedItems = useMemo(() => {
    const defaultRecord: Record<string, (EstimateItem & { originalIndex: number })[]> = {};
    if (!result) return defaultRecord;
    return result.items.reduce((acc, item, originalIndex) => {
      const phase = item.phase || 'General';
      if (!acc[phase]) acc[phase] = [];
      acc[phase].push({ ...item, originalIndex } as any);
      return acc;
    }, defaultRecord);
  }, [result]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-10 md:pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">AI Estimator</h2>
          <p className="text-xs md:text-base text-slate-500 font-medium">Breakdown work using AI logic.</p>
        </div>
        {editingId && (
          <button 
            onClick={handleReset}
            className="px-6 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all self-center"
          >
            Create New
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 items-start">
        <div className={`p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border shadow-sm space-y-6 transition-all duration-500 ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center space-x-2 text-blue-600">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight uppercase">
              Requirements
            </h3>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Scope</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste project scope or features..."
              className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none h-40 md:h-64 resize-none text-xs md:text-sm text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Domain</label>
              <input 
                type="text"
                value={projectType}
                onChange={e => setProjectType(e.target.value)}
                className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs md:text-sm text-slate-900 font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Project</label>
              <select 
                value={targetProjectId}
                onChange={e => setTargetProjectId(e.target.value)}
                className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-white border border-slate-100 outline-none text-xs md:text-sm text-slate-900 font-bold"
              >
                <option value="">(Standalone)</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !inputText}
            className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black flex items-center justify-center space-x-3 transition-all shadow-xl active:scale-95 ${
              isGenerating || !inputText 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
                <span className="uppercase text-[10px] tracking-widest">Building...</span>
              </div>
            ) : (
              <span className="uppercase text-[10px] md:text-xs tracking-widest">{editingId ? 'RE-BUILD WITH AI' : 'GENERATE AI WBS'}</span>
            )}
          </button>
        </div>

        <div className="bg-white min-h-[300px] md:min-h-[500px] rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          {!result && !isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center text-slate-400">
              <p className="text-base md:text-xl font-black text-slate-300 tracking-tight uppercase">Awaiting Input</p>
            </div>
          ) : isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
               <div className="w-12 h-12 md:w-24 md:h-24 border-4 md:border-[6px] border-slate-50 border-t-blue-600 rounded-full animate-spin"></div>
               <p className="text-sm md:text-lg font-black text-slate-900 tracking-tight italic">AI is decomposing scope...</p>
            </div>
          ) : (
            <div className="p-6 md:p-10 space-y-8 md:space-y-10 animate-fadeIn h-full overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 md:pb-6">
                <h3 className="text-base md:text-xl font-black text-slate-900 tracking-tight uppercase truncate mr-2">Work Breakdown</h3>
                <div className="flex items-center space-x-2 md:space-x-3 bg-slate-50 px-2 md:px-4 py-1.5 md:py-2 rounded-xl">
                  <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">BUFF</span>
                  <input 
                    type="number" 
                    value={buffer} 
                    onChange={e => setBuffer(parseInt(e.target.value) || 0)}
                    className="w-10 md:w-12 bg-transparent border-none text-center font-black text-blue-600 text-xs md:text-sm focus:ring-0 p-0"
                  />
                  <span className="text-[10px] font-black text-slate-300">%</span>
                </div>
              </div>

              <div className="space-y-8 md:space-y-12">
                {(Object.entries(groupedItems) as [string, (EstimateItem & { originalIndex: number })[]][]).map(([phase, items]) => (
                  <div key={phase} className="space-y-4">
                    <div className="flex items-center justify-between border-l-4 border-blue-600 pl-3 md:pl-4 py-1">
                      <span className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest truncate">{phase}</span>
                      <span className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap ml-2">
                        {items.reduce((sum, i) => sum + i.estimatedHours, 0)}h Sub
                      </span>
                    </div>
                    
                    <div className="space-y-3 md:space-y-4">
                      {items.map((item) => (
                        <div key={item.originalIndex} className="group p-4 md:p-6 rounded-xl md:rounded-3xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all duration-300 hover:shadow-lg relative">
                          <button 
                            onClick={() => deleteItem(item.originalIndex)}
                            className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 transition-colors md:opacity-0 group-hover:opacity-100"
                          >
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>

                          <div className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 mb-3 md:mb-4">
                            <div className="md:col-span-8">
                              <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1 block">Task</label>
                              <input
                                type="text"
                                value={item.taskName}
                                onChange={(e) => updateItem(item.originalIndex, 'taskName', e.target.value)}
                                className="w-full bg-transparent border-none p-0 text-sm md:text-md font-bold text-slate-900 focus:ring-0"
                              />
                            </div>
                            <div className="flex md:flex-col md:col-span-4 justify-between md:text-right">
                              <label className="md:hidden text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Effort</label>
                              <div className="flex items-center md:justify-end">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={item.estimatedHours}
                                  onChange={(e) => updateItem(item.originalIndex, 'estimatedHours', parseFloat(e.target.value) || 0)}
                                  className="w-10 md:w-14 bg-transparent border-none p-0 text-base md:text-xl font-black text-slate-900 tracking-tighter text-right focus:ring-0"
                                />
                                <span className="text-[10px] text-slate-300 font-black ml-1 md:ml-2">h</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center mb-3 md:mb-4">
                            <input
                              type="text"
                              value={item.role || ''}
                              onChange={(e) => updateItem(item.originalIndex, 'role', e.target.value)}
                              className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest border-none focus:ring-0"
                              placeholder="Role"
                            />
                          </div>

                          <textarea
                            value={item.rationale}
                            onChange={(e) => updateItem(item.originalIndex, 'rationale', e.target.value)}
                            className="w-full bg-white rounded-lg md:rounded-2xl border border-slate-50 p-3 md:p-4 italic text-[10px] md:text-[11px] text-slate-500 font-medium leading-relaxed resize-none h-12 md:h-16 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 md:pt-10 mt-6 md:mt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left w-full md:w-auto">
                  <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Total Effort</p>
                  <p className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">
                    {finalTotal}
                    <span className="text-xl md:text-2xl text-slate-300 font-black ml-2 tracking-normal">h</span>
                  </p>
                </div>
                <button 
                  onClick={handleSave}
                  className="w-full md:w-auto px-10 py-4 md:px-12 md:py-6 bg-emerald-600 text-white font-black rounded-xl md:rounded-3xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-50 active:scale-95 uppercase text-[10px] md:text-xs tracking-widest"
                >
                  Commit WBS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="mt-8 md:mt-16 bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-sm">
        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-6 md:mb-8 flex items-center">
           <span className="w-1.5 h-5 md:h-6 bg-blue-600 rounded-full mr-3"></span>
           WBS Library
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {savedEstimates.length === 0 && (
            <div className="col-span-full py-10 md:py-20 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-50 rounded-xl md:rounded-[2.5rem]">
               <p className="font-bold uppercase tracking-widest text-[10px]">No saved structures.</p>
            </div>
          )}
          {savedEstimates.slice().reverse().map(est => (
            <div 
              key={est.id} 
              onClick={() => handleLoadEstimate(est)}
              className="p-4 md:p-6 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-blue-300 cursor-pointer transition-all duration-300 group shadow-sm"
            >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                 <span className="text-[8px] md:text-[9px] font-black text-blue-600 uppercase tracking-widest truncate max-w-[60%]">
                   {projects.find(p => p.id === est.projectId)?.name || 'Standalone'}
                 </span>
                 <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{est.createdAt.slice(0, 10)}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs md:text-sm line-clamp-2 mb-3 md:mb-4 italic">
                 "{est.inputText.slice(0, 80)}..."
              </h4>
              <div className="flex items-end justify-between">
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Total</span>
                    <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">{est.totalHours}<span className="text-[10px] ml-1 md:ml-2">h</span></span>
                 </div>
                 <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-lg md:rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
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
