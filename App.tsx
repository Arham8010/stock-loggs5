
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, FileText, Lock, Unlock, Download, 
  Trash2, User as UserIcon, LogOut, ChevronRight, 
  Sparkles, Filter, MoreHorizontal, Copy, X, Users, UserPlus
} from 'lucide-react';
import { StockLog, LogSectionType, User, SectionData } from './types';
import DynamicTable from './components/DynamicTable';
import { exportLogToPDF } from './services/pdfService';
import { analyzeStockLog } from './services/geminiService';

const EMPTY_SECTION: SectionData = { columns: [{ id: '1', header: 'Details' }], rows: [] };

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

  // Load from local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('stocklog_current_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    const savedUsers = localStorage.getItem('stocklog_users');
    if (savedUsers) setAvailableUsers(JSON.parse(savedUsers));
    
    const savedLogs = localStorage.getItem('stocklog_logs');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  // Sync users and logs to storage
  useEffect(() => {
    localStorage.setItem('stocklog_users', JSON.stringify(availableUsers));
  }, [availableUsers]);

  useEffect(() => {
    localStorage.setItem('stocklog_logs', JSON.stringify(logs));
  }, [logs]);

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
  };

  const updateLog = (updatedLog: StockLog) => {
    setLogs(logs.map(l => l.id === updatedLog.id ? updatedLog : l));
  };

  const deleteLog = (id: string) => {
    if (confirm('Are you sure you want to delete this log?')) {
      setLogs(logs.filter(l => l.id !== id));
      if (selectedLogId === id) setSelectedLogId(null);
    }
  };

  const toggleLock = (log: StockLog) => {
    if (log.author !== currentUser?.name) return;
    updateLog({ ...log, isLocked: !log.isLocked });
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

  const authorsInLogs = useMemo(() => Array.from(new Set(logs.map(l => l.author))), [logs]);

  const handleAiAnalyze = async () => {
    if (!selectedLog) return;
    setIsAnalyzing(true);
    const result = await analyzeStockLog(selectedLog);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-blue-100">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-8 border border-white">
          <div className="text-center">
            <div className="inline-flex p-4 bg-blue-600 text-white rounded-2xl mb-4 shadow-lg shadow-blue-200">
              <Users size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">StockLog Access</h1>
            <p className="text-slate-500 font-medium">Select your profile to continue</p>
          </div>

          {!isAddingUser && availableUsers.length > 0 ? (
            <div className="space-y-3">
              <div className="max-h-60 overflow-y-auto pr-2 no-scrollbar space-y-2">
                {availableUsers.map(user => (
                  <button
                    key={user.name}
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-500">
                        <UserIcon size={20} />
                      </div>
                      <span className="font-bold text-slate-700">{user.name}</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-400" />
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setIsAddingUser(true)}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={18} /> Add New User
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} className="space-y-4 animate-in fade-in duration-300">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Employee Name</label>
                <input 
                  name="name"
                  required
                  autoFocus
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all font-bold text-slate-800"
                  placeholder="Enter full name"
                />
              </div>
              <div className="flex gap-2">
                {availableUsers.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Back
                  </button>
                )}
                <button 
                  type="submit"
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200"
                >
                  Confirm Identity
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      {/* Sidebar / List View */}
      <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col glass h-screen ${selectedLogId && 'hidden md:flex'}`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">SL</div>
            <h1 className="font-bold text-lg tracking-tight">StockLogs</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-red-50 rounded-full transition-colors text-slate-400 hover:text-red-500"
            title="Switch User / Logout"
          >
            <LogOut size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3 bg-white/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-slate-100/50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Filter size={14} /> Filter
              </button>
              <button 
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </button>
              <button 
                onClick={createNewLog}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm shadow-blue-200"
              >
                <Plus size={14} /> New
              </button>
            </div>

            {showFilters && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2 duration-200">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter by Author</label>
                <select 
                  className="w-full text-xs bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filterAuthor}
                  onChange={(e) => setFilterAuthor(e.target.value)}
                >
                  <option value="">All Authors</option>
                  {authorsInLogs.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <button 
                  onClick={() => {setFilterAuthor(''); setShowFilters(false)}}
                  className="mt-2 text-[10px] text-blue-600 font-bold hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {filteredLogs.map(log => (
            <div 
              key={log.id}
              onClick={() => setSelectedLogId(log.id)}
              className={`p-4 rounded-2xl cursor-pointer transition-all border group relative ${
                selectedLogId === log.id 
                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                : 'bg-white border-transparent hover:border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">{log.date}</p>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                    {log.author}
                    {log.isLocked && <Lock size={12} className="text-amber-500" />}
                  </h3>
                  <div className="mt-1 flex gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">Dori</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">Warp</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">Bheem</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">Del</span>
                  </div>
                </div>
                <ChevronRight size={18} className={`text-slate-300 transition-transform ${selectedLogId === log.id ? 'translate-x-1' : ''}`} />
              </div>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="text-center py-10 opacity-50">
              <FileText size={48} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-400">No logs found</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-50 to-blue-100 rounded-full flex items-center justify-center border border-blue-200 shadow-sm">
              <UserIcon size={20} className="text-blue-600" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none mb-1">Signed in as</p>
              <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden ${!selectedLogId && 'hidden md:flex'}`}>
        {selectedLog ? (
          <>
            {/* Header */}
            <header className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedLogId(null)} 
                  className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    {selectedLog.date}
                    {selectedLog.isLocked && <Lock size={16} className="text-amber-500" />}
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    Created by <span className={`font-bold ${selectedLog.author === currentUser.name ? 'text-blue-600' : 'text-slate-700'}`}>
                      {selectedLog.author === currentUser.name ? 'You' : selectedLog.author}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                <button 
                  onClick={handleAiAnalyze}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 text-violet-600 rounded-xl text-xs font-bold hover:bg-violet-100 transition-all border border-violet-100 disabled:opacity-50"
                  disabled={isAnalyzing}
                >
                  <Sparkles size={14} className={isAnalyzing ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{isAnalyzing ? 'Thinking...' : 'AI Insights'}</span>
                </button>
                
                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                <button 
                  onClick={() => duplicateLog(selectedLog)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                  title="Duplicate as Template"
                >
                  <Copy size={20} />
                </button>
                <button 
                  onClick={() => exportLogToPDF(selectedLog)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                  title="Download PDF"
                >
                  <Download size={20} />
                </button>

                {selectedLog.author === currentUser.name && (
                  <>
                    <button 
                      onClick={() => toggleLock(selectedLog)}
                      className={`p-2 rounded-xl transition-all ${selectedLog.isLocked ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'hover:bg-slate-100 text-slate-600 border border-transparent'}`}
                      title={selectedLog.isLocked ? "Unlock Log" : "Lock Log"}
                    >
                      {selectedLog.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                    </button>
                    <button 
                      onClick={() => deleteLog(selectedLog.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors"
                      title="Delete Log"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                )}
              </div>
            </header>

            {/* AI Insights Card */}
            {aiAnalysis && (
              <div className="m-4 p-5 bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl shadow-xl relative overflow-hidden group border border-violet-400/30 animate-in zoom-in-95 duration-300">
                <div className="absolute top-[-10px] right-[-10px] p-2 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Sparkles size={80} />
                </div>
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <h4 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest"><Sparkles size={16} /> Gemini AI Analysis</h4>
                  <button onClick={() => setAiAnalysis(null)} className="text-white/60 hover:text-white transition-colors"><X size={18} /></button>
                </div>
                <p className="text-sm text-violet-50 leading-relaxed italic relative z-10 font-medium">"{aiAnalysis}"</p>
                <div className="mt-3 text-[10px] text-violet-200/60 uppercase tracking-tighter relative z-10">AI-generated summary based on table data</div>
              </div>
            )}

            {/* Navigation Tabs */}
            <nav className="px-4 flex items-center gap-6 border-b border-slate-100 overflow-x-auto no-scrollbar bg-white sticky top-0 z-[5]">
              {Object.values(LogSectionType).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveSection(type)}
                  className={`py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 px-2 relative ${
                    activeSection === type 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {type}
                  {activeSection === type && (
                    <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-blue-600 blur-[2px] opacity-40"></span>
                  )}
                </button>
              ))}
            </nav>

            {/* Editor Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/30 space-y-8 no-scrollbar">
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{activeSection}</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">Configure and manage stock entries with dynamic tables.</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
                   <DynamicTable 
                    data={selectedLog[activeSection]}
                    onChange={(newData) => updateLog({ ...selectedLog, [activeSection]: newData })}
                    readOnly={!canEdit}
                   />
                </div>
              </section>

              {/* Status Info for locked items */}
              {!canEdit && (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4 text-amber-900 shadow-sm">
                  <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm">Log Read-Only</h5>
                    <p className="text-xs font-medium text-amber-800/80 mt-1 leading-relaxed">
                      {selectedLog.isLocked 
                        ? "This log has been finalized and locked. Editing is disabled until the author unlocks it." 
                        : `This entry belongs to ${selectedLog.author}. You can view the data but cannot modify it.`}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="h-20"></div> {/* Bottom Spacer */}
            </main>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 text-slate-200 border-4 border-slate-50 group transition-all hover:scale-105">
              <FileText size={48} className="group-hover:text-blue-200 transition-colors" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tighter">Welcome, {currentUser.name}</h2>
            <p className="text-slate-500 max-w-xs mx-auto font-medium">
              Start your daily stock records. Your entries are private and secure.
            </p>
            <button 
              onClick={createNewLog}
              className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-3 transform active:scale-95"
            >
              <Plus size={20} /> New Daily Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
