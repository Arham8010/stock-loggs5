
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, FileText, Lock, Unlock, Download, 
  Trash2, User as UserIcon, LogOut, ChevronRight, 
  Sparkles, Filter, MoreHorizontal, Copy, X, Users, UserPlus,
  CheckCircle2, AlertCircle, Calendar, BarChart3, Clock, TrendingUp,
  ChevronDown, FileDown, Layers, Image as ImageIcon, File as FileIcon
} from 'lucide-react';
import { StockLog, LogSectionType, User, SectionData } from './types';
import DynamicTable from './components/DynamicTable';
import { exportLogToPDF, exportSectionToPDF } from './pdfService';
import { exportElementToImage } from './imageService';
import { analyzeStockLog } from './geminiService';

const EMPTY_SECTION: SectionData = { columns: [{ id: '1', header: 'Item Name' }, { id: '2', header: 'Quantity' }], rows: [] };

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<LogSectionType>(LogSectionType.DORI);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Load from local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('stocklog_current_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    const savedUsers = localStorage.getItem('stocklog_users');
    if (savedUsers) setAvailableUsers(JSON.parse(savedUsers));
    
    const savedLogs = localStorage.getItem('stocklog_logs');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  // Handle click outside for export menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('stocklog_users', JSON.stringify(availableUsers));
  }, [availableUsers]);

  useEffect(() => {
    localStorage.setItem('stocklog_logs', JSON.stringify(logs));
  }, [logs]);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const getUserColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    if (name.trim()) {
      const newUser = { name: name.trim() };
      if (!availableUsers.find(u => u.name === newUser.name)) {
        setAvailableUsers([...availableUsers, newUser]);
      }
      handleSelectUser(newUser);
      setIsAddingUser(false);
      addToast(`Welcome, ${newUser.name}!`);
    }
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('stocklog_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('stocklog_current_user');
    setSelectedLogId(null);
  };

  const createNewLog = () => {
    if (!currentUser) return;
    const newLog: StockLog = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      author: currentUser.name,
      isLocked: false,
      [LogSectionType.DORI]: JSON.parse(JSON.stringify(EMPTY_SECTION)),
      [LogSectionType.WARPIN]: JSON.parse(JSON.stringify(EMPTY_SECTION)),
      [LogSectionType.BHEEM]: JSON.parse(JSON.stringify(EMPTY_SECTION)),
      [LogSectionType.DELIVERY]: JSON.parse(JSON.stringify(EMPTY_SECTION))
    };
    setLogs([newLog, ...logs]);
    setSelectedLogId(newLog.id);
    addToast("New log created successfully");
  };

  const duplicateLog = (log: StockLog) => {
    if (!currentUser) return;
    const duplicated: StockLog = {
      ...JSON.parse(JSON.stringify(log)),
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      author: currentUser.name,
      isLocked: false
    };
    setLogs([duplicated, ...logs]);
    setSelectedLogId(duplicated.id);
    addToast("Log duplicated as template");
  };

  const updateLog = (updatedLog: StockLog) => {
    setLogs(logs.map(l => l.id === updatedLog.id ? updatedLog : l));
  };

  const deleteLog = (id: string) => {
    if (confirm('Permanently delete this stock log?')) {
      setLogs(logs.filter(l => l.id !== id));
      if (selectedLogId === id) setSelectedLogId(null);
      addToast("Log deleted", "info");
    }
  };

  const toggleLock = (log: StockLog) => {
    if (log.author !== currentUser?.name) return;
    updateLog({ ...log, isLocked: !log.isLocked });
    addToast(log.isLocked ? "Log unlocked" : "Log finalized and locked", "info");
  };

  const handleFullExport = (log: StockLog) => {
    exportLogToPDF(log);
    addToast("Full PDF report exported");
    setShowExportMenu(false);
  };

  const handleSectionPdfExport = (log: StockLog, section: LogSectionType) => {
    exportSectionToPDF(log, section);
    addToast(`${section} exported as PDF`);
    setShowExportMenu(false);
  };

  const handleSectionImageExport = async (log: StockLog, section: LogSectionType) => {
    const wasDifferent = activeSection !== section;
    if (wasDifferent) {
      setActiveSection(section);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    try {
      addToast(`Generating image for ${section}...`, 'info');
      await exportElementToImage('table-capture-area', `${section}_${log.date}`);
      addToast(`${section} exported as PNG image`);
    } catch (e) {
      addToast("Image export failed", "error");
    }
    
    setShowExportMenu(false);
  };

  const selectedLog = logs.find(l => l.id === selectedLogId);
  const canEdit = selectedLog && !selectedLog.isLocked && selectedLog.author === currentUser?.name;

  const filteredLogs = useMemo(() => {
    return logs
      .filter(l => {
        const matchesSearch = l.date.includes(searchQuery) || 
                             l.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAuthor = filterAuthor === '' || l.author.toLowerCase() === filterAuthor.toLowerCase();
        return matchesSearch && matchesAuthor;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [logs, searchQuery, sortOrder, filterAuthor]);

  const latestLogs = useMemo(() => logs.slice(0, 3), [logs]);

  const handleAiAnalyze = async () => {
    if (!selectedLog) return;
    setIsAnalyzing(true);
    const result = await analyzeStockLog(selectedLog);
    setAiAnalysis(result);
    setIsAnalyzing(false);
    addToast("AI Analysis Complete");
  };

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toLocaleDateString();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md space-y-8 border border-slate-100 animate-in fade-in zoom-in duration-500">
          <div className="text-center">
            <div className="inline-flex p-5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-[1.5rem] mb-6 shadow-xl shadow-blue-100">
              <BarChart3 size={40} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">StockLog Pro</h1>
            <p className="text-slate-500 font-medium text-lg">Daily Stock Management</p>
          </div>

          {!isAddingUser && availableUsers.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-64 overflow-y-auto pr-2 no-scrollbar space-y-3">
                {availableUsers.map(user => (
                  <button
                    key={user.name}
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-white hover:shadow-lg hover:shadow-slate-100 border border-slate-100 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold transition-all ${getUserColor(user.name)}`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700 text-lg">{user.name}</span>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setIsAddingUser(true)}
                className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={20} /> Add New Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Employee Name</label>
                <input 
                  name="name"
                  required
                  autoFocus
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white focus:outline-none transition-all font-bold text-slate-800 text-lg"
                  placeholder="e.g. Michael Scott"
                />
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-[1.5rem] transition-all shadow-xl shadow-blue-200 active:scale-[0.98]"
                >
                  Continue to App
                </button>
                {availableUsers.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-all"
                  >
                    Back to Selection
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] text-slate-900 overflow-hidden font-inter">
      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right duration-300 ${
            toast.type === 'success' ? 'bg-white border-green-100 text-green-700' : 
            toast.type === 'error' ? 'bg-white border-red-100 text-red-700' : 'bg-white border-blue-100 text-blue-700'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <div className={`w-full md:w-[22rem] border-r border-slate-200 flex flex-col bg-white/80 backdrop-blur-xl h-screen z-50 transition-all ${selectedLogId && 'hidden md:flex'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-[0.75rem] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-100">SL</div>
            <h1 className="font-black text-xl tracking-tighter text-slate-900">StockLog Pro</h1>
          </div>
          <button onClick={handleLogout} className="p-2.5 hover:bg-red-50 rounded-xl transition-all text-slate-400 hover:text-red-500"><LogOut size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border-2 border-transparent rounded-[1rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:outline-none text-sm font-medium transition-all"
              placeholder="Search by date or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                  showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Filter size={16} /> Filters
              </button>
              <button 
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-slate-300"
              >
                {sortOrder === 'desc' ? 'Latest' : 'Oldest'}
              </button>
            </div>
            
            <button 
              onClick={createNewLog}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-[0.97]"
            >
              <Plus size={18} strokeWidth={3} /> New Entry
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3 no-scrollbar">
          {filteredLogs.map(log => (
            <div 
              key={log.id}
              onClick={() => setSelectedLogId(log.id)}
              className={`p-5 rounded-[1.5rem] cursor-pointer transition-all border-2 relative overflow-hidden group ${
                selectedLogId === log.id 
                ? 'bg-blue-50 border-blue-200 shadow-md' 
                : 'bg-white border-slate-50 hover:border-slate-200 hover:shadow-lg'
              }`}
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-blue-500" />
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.1em]">{log.date}</p>
                    {isToday(log.date) && (
                      <span className="flex items-center gap-1 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse">
                        <TrendingUp size={8} /> NEW
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                    {log.author === currentUser.name ? 'My Log' : log.author}
                    {log.isLocked && <Lock size={14} className="text-amber-500" />}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[9px] px-2 py-1 bg-slate-100 text-slate-500 rounded-lg font-black uppercase">Dori</span>
                    <span className="text-[9px] px-2 py-1 bg-slate-100 text-slate-500 rounded-lg font-black uppercase">Warp</span>
                    <span className="text-[9px] px-2 py-1 bg-slate-100 text-slate-500 rounded-lg font-black uppercase">Bheem</span>
                    <span className="text-[9px] px-2 py-1 bg-slate-100 text-slate-500 rounded-lg font-black uppercase">Del</span>
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold ${getUserColor(log.author)}`}>
                  {log.author.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-blue-100 text-white font-bold text-xl ${getUserColor(currentUser.name)}`}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Active Profile</p>
              <p className="text-base font-black text-slate-900 truncate">{currentUser.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden ${!selectedLogId && 'hidden md:flex'}`}>
        {selectedLog ? (
          <>
            <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-[60]">
              <div className="flex items-center gap-5">
                <button 
                  onClick={() => setSelectedLogId(null)} 
                  className="md:hidden p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-all"
                >
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{selectedLog.date}</h2>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedLog.isLocked ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {selectedLog.isLocked ? 'Finalized' : 'Editable'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-bold mt-0.5">
                    Author: <span className="text-blue-600">{selectedLog.author === currentUser.name ? 'You' : selectedLog.author}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handleAiAnalyze}
                  className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-black hover:bg-violet-700 transition-all shadow-lg shadow-violet-100 disabled:opacity-50"
                  disabled={isAnalyzing}
                >
                  <Sparkles size={16} className={isAnalyzing ? 'animate-spin' : ''} />
                  {isAnalyzing ? 'Analyzing...' : 'AI Summary'}
                </button>
                
                <div className="hidden md:block h-6 w-px bg-slate-200 mx-2"></div>

                <div className="flex bg-slate-50 p-1 rounded-xl relative" ref={exportMenuRef}>
                  <button 
                    onClick={() => duplicateLog(selectedLog)}
                    className="p-2.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all"
                    title="Template"
                  ><Copy size={20} /></button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className={`p-2.5 rounded-lg transition-all flex items-center gap-1 ${showExportMenu ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-white hover:shadow-sm text-slate-600'}`}
                      title="Export Options"
                    >
                      <Download size={20} />
                      <ChevronDown size={14} className={showExportMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>

                    {/* Enhanced Export Dropdown Menu */}
                    {showExportMenu && (
                      <div className="absolute top-full right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl p-2 z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-2 mb-2 border-b border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Daily Export Options</p>
                        </div>
                        
                        <button 
                          onClick={() => handleFullExport(selectedLog)}
                          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Layers size={16} />
                          </div>
                          <div className="text-left flex-1">
                            <p className="text-xs font-black">Full Daily Report (PDF)</p>
                            <p className="text-[9px] text-slate-400 font-bold">Comprehensive combined report</p>
                          </div>
                        </button>

                        <div className="my-2 border-t border-slate-50 pt-2 px-3">
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Separate Section Exports</p>
                        </div>

                        <div className="space-y-1">
                          {Object.values(LogSectionType).map((type) => (
                            <div 
                              key={type}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-transparent hover:border-slate-100 transition-all"
                            >
                              <span className="text-[11px] font-bold text-slate-600">{type}</span>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => handleSectionPdfExport(selectedLog, type)}
                                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                                  title={`Download ${type} PDF`}
                                >
                                  <FileIcon size={14} />
                                </button>
                                <button 
                                  onClick={() => handleSectionImageExport(selectedLog, type)}
                                  className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all"
                                  title={`Download ${type} PNG`}
                                >
                                  <ImageIcon size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedLog.author === currentUser.name && (
                  <div className="flex gap-2 ml-2">
                    <button 
                      onClick={() => toggleLock(selectedLog)}
                      className={`p-2.5 rounded-xl transition-all border ${selectedLog.isLocked ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
                    >
                      {selectedLog.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                    </button>
                    <button 
                      onClick={() => deleteLog(selectedLog.id)}
                      className="hidden md:block p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-100"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            </header>

            <nav className="px-6 flex items-center gap-8 border-b border-slate-100 bg-white sticky top-[81px] z-40 overflow-x-auto no-scrollbar">
              {Object.values(LogSectionType).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveSection(type)}
                  className={`py-5 text-sm font-black whitespace-nowrap transition-all border-b-4 px-1 relative ${
                    activeSection === type 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </nav>

            <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50/50 space-y-8 no-scrollbar relative">
              {aiAnalysis && (
                <div className="p-6 bg-gradient-to-br from-violet-600 to-indigo-800 text-white rounded-[2rem] shadow-2xl relative overflow-hidden group border border-violet-400/30 animate-in zoom-in-95 duration-500">
                  <div className="absolute top-[-20px] right-[-20px] p-4 opacity-10 rotate-12 group-hover:scale-125 transition-transform duration-1000">
                    <Sparkles size={120} />
                  </div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                        <Sparkles size={18} />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-[0.2em]">Smart Summary</h4>
                    </div>
                    <button onClick={() => setAiAnalysis(null)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={18} /></button>
                  </div>
                  <p className="text-lg text-violet-50 leading-relaxed font-medium relative z-10 italic">"{aiAnalysis}"</p>
                </div>
              )}

              <section className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{activeSection}</h3>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Data Entry Grid</p>
                  </div>
                </div>

                <div 
                  id="table-capture-area" 
                  className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden p-2"
                >
                   <DynamicTable 
                    data={selectedLog[activeSection]}
                    onChange={(newData) => updateLog({ ...selectedLog, [activeSection]: newData })}
                    readOnly={!canEdit}
                   />
                </div>
              </section>

              {!canEdit && (
                <div className="p-8 bg-white border border-slate-200 rounded-[2rem] flex items-center gap-6 text-slate-900 shadow-lg shadow-slate-100">
                  <div className={`p-4 rounded-2xl text-white ${selectedLog.isLocked ? 'bg-amber-500' : 'bg-blue-500'}`}>
                    {selectedLog.isLocked ? <Lock size={32} /> : <UserIcon size={32} />}
                  </div>
                  <div>
                    <h5 className="font-black text-xl tracking-tight">Viewing Mode Only</h5>
                    <p className="text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                      {selectedLog.isLocked 
                        ? "This record has been finalized by the author. You can view all data, but changes are disabled." 
                        : `You are viewing a shared entry from ${selectedLog.author}. Only the creator can modify this specific log.`}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="h-40"></div>
            </main>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-white relative no-scrollbar">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-600 border-2 border-blue-100 shadow-inner">
                    <BarChart3 size={40} />
                  </div>
                  <div>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Team Dashboard</h2>
                    <p className="text-slate-500 font-bold text-xl mt-2">Welcome back, {currentUser.name}.</p>
                  </div>
                </div>
                <button 
                  onClick={createNewLog}
                  className="px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 flex items-center gap-3 transform active:scale-95 whitespace-nowrap"
                >
                  <Plus size={24} strokeWidth={3} /> Start Today's Log
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                    <Clock className="text-blue-600" size={24} /> Recent Team Activity
                  </h3>
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Across All Users</p>
                </div>
                
                {latestLogs.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-6">
                    {latestLogs.map(log => (
                      <div 
                        key={log.id}
                        onClick={() => setSelectedLogId(log.id)}
                        className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-2xl hover:shadow-slate-100 hover:scale-[1.02] transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold ${getUserColor(log.author)}`}>
                            {log.author.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.date}</span>
                        </div>
                        <h4 className="font-black text-slate-800 mb-1">{log.author}'s Log</h4>
                        <p className="text-xs text-slate-500 font-bold mb-4">Daily stock verification</p>
                        <div className="flex justify-between items-center">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${log.isLocked ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {log.isLocked ? 'FINALIZED' : 'ACTIVE'}
                          </span>
                          <ChevronRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                    <TrendingUp size={64} className="mb-4 opacity-20" />
                    <p className="font-black uppercase tracking-widest">No activity reported yet</p>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                   <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
                     <Lock size={160} />
                   </div>
                   <h4 className="text-xl font-black mb-2 flex items-center gap-2 tracking-tight">Ownership Policy</h4>
                   <p className="text-slate-400 text-sm font-medium leading-relaxed">
                     Every log is visible to the entire team, but only the original author can modify or lock it. This ensures data integrity while maintaining full transparency.
                   </p>
                </div>
                <div className="p-8 bg-blue-50 border border-blue-100 text-blue-900 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                  <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:-rotate-12 transition-transform duration-1000">
                     <TrendingUp size={160} />
                   </div>
                   <h4 className="text-xl font-black mb-2 flex items-center gap-2 tracking-tight text-blue-800">Export Ready</h4>
                   <p className="text-blue-600/70 text-sm font-medium leading-relaxed">
                     Select any log from the sidebar to view full details. You can export any team member's log as a professional PDF or high-quality PNG image for each section.
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
