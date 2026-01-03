
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Plus, Search, FileText, Lock, Unlock, Download, 
  Trash2, User as UserIcon, LogOut, ChevronRight, 
  Sparkles, Filter, MoreHorizontal, Copy, X, Users, UserPlus,
  CheckCircle2, AlertCircle, Calendar, BarChart3, Clock, TrendingUp,
  ChevronDown, FileDown, Layers, Image as ImageIcon, File as FileIcon,
  Database, Share2, UploadCloud, RefreshCw, Package, ShieldCheck, Edit2, Check,
  Eraser
} from 'lucide-react';
import { StockLog, LogSectionType, User, SectionData } from './types';
import DynamicTable from './DynamicTable';
import { exportLogToPDF, exportSectionToPDF } from './pdfService';
import { exportElementToImage } from './imageService';
import { analyzeStockLog } from './geminiService';

const EMPTY_SECTION: SectionData = { 
  columns: [{ id: '1', header: 'Item Name' }, { id: '2', header: 'Quantity' }], 
  rows: [],
  notes: ''
};

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

const Logo: React.FC<{ className?: string; showAppName?: boolean; vertical?: boolean; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ 
  className = "w-12 h-12", 
  showAppName = false,
  vertical = false,
  size = 'md'
}) => {
  const iconSizes = {
    sm: { box: 'w-10 h-10', main: 16, text: 'text-lg' },
    md: { box: 'w-14 h-14', main: 24, text: 'text-2xl' },
    lg: { box: 'w-24 h-24', main: 40, text: 'text-4xl' },
    xl: { box: 'w-40 h-40', main: 64, text: 'text-6xl' }
  };

  const current = iconSizes[size];

  return (
    <div className={`flex ${vertical ? 'flex-col' : 'flex-row'} items-center gap-4 group transition-all`}>
      <div className="relative">
        <div className={`${current.box} bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 rounded-[1.25rem] shadow-xl shadow-blue-200 flex items-center justify-center p-2.5 transform group-hover:scale-105 transition-all duration-300 ring-4 ring-white`}>
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-lg">
             <Package size={current.main} className="text-white/20 absolute -bottom-2 -right-2" />
             <div className="text-white font-black text-xl italic tracking-tighter drop-shadow-md">SK</div>
          </div>
        </div>
        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg border-2 border-white animate-in zoom-in duration-500 delay-300">
          <ShieldCheck size={size === 'xl' ? 24 : 14} strokeWidth={3} />
        </div>
      </div>
      
      {showAppName && (
        <div className={vertical ? 'text-center' : 'text-left'}>
          <h1 className={`${current.text} font-black text-slate-900 tracking-tighter leading-none flex items-center justify-center gap-2`}>
            StockLog <span className="text-blue-600">Pro</span>
          </h1>
          <div className={`flex items-center gap-2 mt-1.5 ${vertical ? 'justify-center' : ''}`}>
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">SK Textile Enterprise</p>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('stocklog_current_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    const savedUsers = localStorage.getItem('stocklog_users');
    if (savedUsers) setAvailableUsers(JSON.parse(savedUsers));
    
    const savedLogs = localStorage.getItem('stocklog_logs');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

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

  const handleExportDatabase = () => {
    const backup = {
      users: availableUsers,
      logs: logs,
      version: "1.0",
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StockLog_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    addToast("Backup file downloaded");
  };

  const handleShareDatabaseCode = () => {
    const backup = {
      users: availableUsers,
      logs: logs
    };
    const code = btoa(JSON.stringify(backup));
    navigator.clipboard.writeText(code);
    addToast("Sync code copied to clipboard!");
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.logs && data.users) {
          if (confirm("Restore this backup? This will MERGE with existing data on this device.")) {
            setAvailableUsers(prev => {
              const merged = [...prev];
              data.users.forEach((u: User) => {
                if (!merged.find(mu => mu.name === u.name)) merged.push(u);
              });
              return merged;
            });
            setLogs(prev => {
              const merged = [...prev];
              data.logs.forEach((l: StockLog) => {
                if (!merged.find(ml => ml.id === l.id)) merged.push(l);
              });
              return merged;
            });
            addToast("Data successfully synchronized!");
            setShowSyncModal(false);
          }
        } else {
          addToast("Invalid backup file", "error");
        }
      } catch (err) {
        addToast("Failed to read backup", "error");
      }
    };
    reader.readAsText(file);
  };

  const createNewLog = () => {
    if (!currentUser) return;
    const newLog: StockLog = {
      id: Date.now().toString(),
      title: 'Daily Stock Entry',
      date: new Date().toLocaleDateString(),
      author: currentUser.name,
      isLocked: false,
      [LogSectionType.DORI]: JSON.parse(JSON.stringify(EMPTY_SECTION)),
      [LogSectionType.WARPIN]: JSON.parse(JSON.stringify(EMPTY_SECTION)),
      [LogSectionType.BHEEM]: JSON.parse(JSON.stringify(EMPTY_SECTION)),
      [LogSectionType.DELIVERY]: JSON.parse(JSON.stringify(EMPTY_SECTION))
    };
    setLogs(prev => [newLog, ...prev]);
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
    setLogs(prev => [duplicated, ...prev]);
    setSelectedLogId(duplicated.id);
    addToast("Log duplicated as template");
  };

  const updateLog = (updatedLog: StockLog) => {
    setLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
  };

  const handleDeleteLog = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!id) return;

    const logToDelete = logs.find(l => l.id === id);
    if (!logToDelete) return;

    // Rule: Only author can delete if locked. If unlocked, anyone can delete as requested.
    if (logToDelete.isLocked && logToDelete.author !== currentUser?.name) {
      addToast("Only the author can delete a finalized record", "error");
      return;
    }

    if (window.confirm('Are you sure you want to permanently delete this stock entry? This cannot be undone.')) {
      if (selectedLogId === id) setSelectedLogId(null);
      setLogs(prev => {
        const filtered = prev.filter(l => l.id !== id);
        localStorage.setItem('stocklog_logs', JSON.stringify(filtered));
        return filtered;
      });
      addToast("Log record deleted permanently", "info");
    }
  };

  const handleClearSection = (section: LogSectionType) => {
    const log = logs.find(l => l.id === selectedLogId);
    if (!log) return;
    if (log.isLocked && log.author !== currentUser?.name) {
      addToast("Cannot clear locked section", "error");
      return;
    }

    if (window.confirm(`Clear all data in "${section}"? This will reset the table and notes.`)) {
      updateLog({
        ...log,
        [section]: JSON.parse(JSON.stringify(EMPTY_SECTION))
      });
      addToast(`${section} has been cleared`, "info");
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

  const startEditTitle = () => {
    if (canEdit && selectedLog) {
      setTempTitle(selectedLog.title);
      setIsEditingTitle(true);
    }
  };

  const saveTitle = () => {
    if (selectedLog && tempTitle.trim()) {
      updateLog({ ...selectedLog, title: tempTitle.trim() });
      setIsEditingTitle(false);
      addToast("Log title updated");
    }
  };

  const filteredLogs = useMemo(() => {
    return logs
      .filter(l => {
        const matchesSearch = l.date.includes(searchQuery) || 
                             l.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             l.title.toLowerCase().includes(searchQuery.toLowerCase());
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
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-md space-y-10 border border-slate-100 animate-in fade-in zoom-in duration-500">
          <div className="text-center flex flex-col items-center">
            <Logo size="xl" vertical showAppName />
          </div>

          {!isAddingUser && availableUsers.length > 0 ? (
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-center mb-4">Select Your Profile</p>
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

          <div className="pt-6 border-t border-slate-100">
            <button 
              onClick={() => setShowSyncModal(true)}
              className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-sm transition-all"
            >
              <RefreshCw size={16} /> Sync / Restore Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] text-slate-900 overflow-hidden font-inter">
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

      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Sync & Backup</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Manage Cross-Device Data</p>
                </div>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Data is stored locally on this device. To see your logs on another device, export your data here and import it there.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleExportDatabase}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:bg-blue-50 hover:border-blue-100 transition-all group"
                  >
                    <Download className="text-slate-400 group-hover:text-blue-600 mb-2" size={32} />
                    <span className="font-black text-xs uppercase tracking-widest text-slate-600 group-hover:text-blue-600">Export File</span>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:bg-emerald-50 hover:border-emerald-100 transition-all group"
                  >
                    <UploadCloud className="text-slate-400 group-hover:text-emerald-600 mb-2" size={32} />
                    <span className="font-black text-xs uppercase tracking-widest text-slate-600 group-hover:text-blue-600">Restore File</span>
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-50">
                <button 
                  onClick={handleShareDatabaseCode}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  <Share2 size={20} /> Copy Quick Sync Key
                </button>
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportDatabase} />
          </div>
        </div>
      )}

      <div className={`w-full md:w-[22rem] border-r border-slate-200 flex flex-col bg-white/80 backdrop-blur-xl h-screen z-50 transition-all ${selectedLogId && 'hidden md:flex'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-center md:justify-start">
          <Logo size="sm" showAppName />
        </div>

        <div className="p-5 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border-2 border-transparent rounded-[1rem] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:outline-none text-sm font-medium transition-all"
              placeholder="Search logs..."
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
              onClick={() => { setSelectedLogId(log.id); setIsEditingTitle(false); }}
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
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg truncate max-w-[160px]">
                    {log.title || log.date}
                    {log.isLocked && <Lock size={14} className="text-amber-500 flex-shrink-0" />}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className={`w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 ${getUserColor(log.author)}`}>
                    {log.author.charAt(0).toUpperCase()}
                  </div>
                  {(log.author === currentUser.name || !log.isLocked) && (
                    <button 
                      type="button"
                      onClick={(e) => handleDeleteLog(log.id, e)}
                      className="p-4 -mr-2 -mb-2 text-red-500 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center z-[100]"
                      title="Delete Entry"
                    >
                      <Trash2 size={20} className="pointer-events-none" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
          <button 
            onClick={() => setShowSyncModal(true)}
            className="w-full flex items-center gap-4 p-4 bg-white hover:bg-blue-50 border border-slate-100 hover:border-blue-100 rounded-2xl transition-all group"
          >
            <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 rounded-xl flex items-center justify-center transition-all">
              <Database size={20} />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Transfer Data</p>
              <p className="text-xs font-black text-slate-900">Backup & Sync</p>
            </div>
          </button>
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-blue-100 text-white font-bold text-xl flex-shrink-0 ${getUserColor(currentUser.name)}`}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Active Profile</p>
                <p className="text-base font-black text-slate-900 truncate">{currentUser.name}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2.5 hover:bg-red-50 rounded-xl transition-all text-slate-400 hover:text-red-500 ml-2"><LogOut size={20} /></button>
          </div>
        </div>
      </div>

      <div className={`flex-1 flex flex-col h-screen overflow-hidden ${!selectedLogId && 'hidden md:flex'}`}>
        {selectedLog ? (
          <>
            <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-[60]">
              <div className="flex items-center gap-5 overflow-hidden flex-1">
                <button 
                  onClick={() => setSelectedLogId(null)} 
                  className="md:hidden p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-all flex-shrink-0"
                >
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-3">
                    {isEditingTitle ? (
                      <div className="flex items-center gap-2">
                        <input 
                          autoFocus
                          className="text-2xl font-black text-slate-900 tracking-tighter bg-slate-100 px-3 py-1 rounded-lg border-2 border-blue-500 focus:outline-none"
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                          onBlur={saveTitle}
                        />
                        <button onClick={saveTitle} className="p-2 bg-blue-600 text-white rounded-lg"><Check size={20}/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group cursor-pointer" onClick={startEditTitle}>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter truncate max-w-[150px] sm:max-w-md">{selectedLog.title || selectedLog.date}</h2>
                        {canEdit && <Edit2 size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />}
                      </div>
                    )}
                    <span className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedLog.isLocked ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {selectedLog.isLocked ? 'Finalized' : 'Editable'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-bold mt-0.5 truncate">
                    Entry Date: {selectedLog.date} • Author: <span className="text-blue-600">{selectedLog.author === currentUser.name ? 'You' : selectedLog.author}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
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
                <div className="flex gap-2 ml-2">
                  {selectedLog.author === currentUser.name && (
                    <button 
                      onClick={() => toggleLock(selectedLog)}
                      className={`p-2.5 rounded-xl transition-all border ${selectedLog.isLocked ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
                      title={selectedLog.isLocked ? "Unlock Record" : "Finalize & Lock Record"}
                    >
                      {selectedLog.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                    </button>
                  )}
                  {/* Rule: Author can always delete. Unlocked entries can be deleted by anyone as requested. */}
                  {(selectedLog.author === currentUser.name || !selectedLog.isLocked) && (
                    <button 
                      type="button"
                      onClick={(e) => handleDeleteLog(selectedLog.id, e)}
                      className="p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-100 flex items-center justify-center z-[100]"
                      title="Delete Record"
                    >
                      <Trash2 size={24} className="pointer-events-none" />
                    </button>
                  )}
                </div>
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
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Structured Log & Notes</p>
                  </div>
                  <button 
                    onClick={() => handleClearSection(activeSection)}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-black transition-all"
                  >
                    <Eraser size={14} /> Clear Section
                  </button>
                </div>
                <div id="table-capture-area" className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden p-2">
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
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-100 pb-10">
                <div className="space-y-6">
                  <Logo size="lg" showAppName />
                  <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Team Dashboard</h2>
                    <p className="text-slate-500 font-bold text-lg mt-2">Logged in as <span className="text-blue-600">{currentUser.name}</span></p>
                  </div>
                </div>
                <button 
                  onClick={createNewLog}
                  className="px-10 py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100 flex items-center gap-3 transform active:scale-95 whitespace-nowrap"
                >
                  <Plus size={28} strokeWidth={3} /> Start Today's Log
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                    <Clock className="text-blue-600" size={24} /> Recent Team Activity
                  </h3>
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Global Feed</p>
                </div>
                {latestLogs.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-6">
                    {latestLogs.map(log => (
                      <div 
                        key={log.id}
                        onClick={() => setSelectedLogId(log.id)}
                        className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-2xl hover:shadow-slate-100 hover:scale-[1.02] transition-all cursor-pointer group relative"
                      >
                        {/* Rule: Author can always delete. Unlocked entries can be deleted by anyone. */}
                        {(log.author === currentUser.name || !log.isLocked) && (
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteLog(log.id, e)}
                            className="absolute top-4 right-4 p-4 bg-white text-red-500 rounded-2xl shadow-lg border border-slate-100 hover:bg-red-50 transition-all z-[100]"
                            title="Quick Delete"
                          >
                            <Trash2 size={20} className="pointer-events-none" />
                          </button>
                        )}
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold ${getUserColor(log.author)}`}>
                            {log.author.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.date}</span>
                        </div>
                        <h4 className="font-black text-slate-800 mb-1 truncate">{log.title || `${log.author}'s Log`}</h4>
                        <p className="text-xs text-slate-500 font-bold mb-4">Author: {log.author}</p>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
