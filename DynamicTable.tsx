
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SectionData, TableColumn, TableRow } from '../types';
import { Plus, Trash2, Edit3, Save, ChevronUp, ChevronDown, ArrowUpDown, Columns, Rows, Hash } from 'lucide-react';

interface DynamicTableProps {
  data: SectionData;
  onChange: (newData: SectionData) => void;
  readOnly?: boolean;
}

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc' | null;
};

const DynamicTable: React.FC<DynamicTableProps> = ({ data, onChange, readOnly }) => {
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [tempColName, setTempColName] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const addColumn = () => {
    const newCol: TableColumn = {
      id: Math.random().toString(36).substring(7),
      header: `New Col`
    };
    onChange({
      ...data,
      columns: [...data.columns, newCol]
    });
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
      }
    }, 100);
  };

  const addRow = () => {
    const newRow: TableRow = {
      id: Math.random().toString(36).substring(7),
      values: {}
    };
    onChange({
      ...data,
      rows: [...data.rows, newRow]
    });
  };

  const updateCellValue = (rowId: string, colId: string, value: string) => {
    const newRows = data.rows.map(row => {
      if (row.id === rowId) {
        return { ...row, values: { ...row.values, [colId]: value } };
      }
      return row;
    });
    onChange({ ...data, rows: newRows });
  };

  const startEditColumn = (e: React.MouseEvent, col: TableColumn) => {
    e.stopPropagation();
    setEditingColId(col.id);
    setTempColName(col.header);
  };

  const saveColumnName = () => {
    if (editingColId) {
      const newCols = data.columns.map(c => 
        c.id === editingColId ? { ...c, header: tempColName } : c
      );
      onChange({ ...data, columns: newCols });
      setEditingColId(null);
    }
  };

  const deleteColumn = (e: React.MouseEvent, colId: string) => {
    e.stopPropagation();
    if (confirm('Delete this column and all its data?')) {
      const newCols = data.columns.filter(c => c.id !== colId);
      const newRows = data.rows.map(row => {
        const newValues = { ...row.values };
        delete newValues[colId];
        return { ...row, values: newValues };
      });
      onChange({ columns: newCols, rows: newRows });
    }
  };

  const deleteRow = (rowId: string) => {
    onChange({ ...data, rows: data.rows.filter(r => r.id !== rowId) });
  };

  const handleSort = (colId: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === colId && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === colId && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key: colId, direction });
  };

  const sortedRows = useMemo(() => {
    if (!sortConfig.direction) return data.rows;
    return [...data.rows].sort((a, b) => {
      const valA = (a.values[sortConfig.key] || '').toLowerCase();
      const valB = (b.values[sortConfig.key] || '').toLowerCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data.rows, sortConfig]);

  return (
    <div className="relative w-full">
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto no-scrollbar pb-24 md:pb-6 rounded-2xl bg-white"
      >
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-3 py-4 w-12 border-r border-slate-100 text-[10px] font-black text-slate-300 uppercase">
                <Hash size={12} className="mx-auto" />
              </th>
              {data.columns.map((col) => (
                <th 
                  key={col.id} 
                  onClick={() => !editingColId && handleSort(col.id)}
                  className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest min-w-[180px] relative group cursor-pointer hover:bg-blue-50/50 transition-colors border-r border-slate-100 last:border-r-0"
                >
                  {editingColId === col.id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input 
                        className="border-2 border-blue-500 rounded-lg px-3 py-1.5 w-full text-slate-900 font-bold normal-case focus:outline-none bg-white shadow-lg"
                        value={tempColName}
                        onChange={(e) => setTempColName(e.target.value)}
                        onBlur={saveColumnName}
                        onKeyDown={(e) => e.key === 'Enter' && saveColumnName()}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[120px]">{col.header}</span>
                        {sortConfig.key === col.id && sortConfig.direction && (
                          sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
                        )}
                      </div>
                      {!readOnly && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={(e) => startEditColumn(e, col)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-white transition-colors shadow-sm"><Edit3 size={12}/></button>
                          <button onClick={(e) => deleteColumn(e, col.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-md hover:bg-white transition-colors shadow-sm"><Trash2 size={12}/></button>
                        </div>
                      )}
                    </div>
                  )}
                </th>
              ))}
              {!readOnly && (
                <th className="px-6 py-5 w-20 bg-slate-50/50">
                  <button 
                    onClick={addColumn}
                    className="flex items-center justify-center w-full h-full text-blue-500 hover:scale-110 transition-transform"
                    title="Add Column"
                  >
                    <Plus size={24} strokeWidth={3} />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-blue-50/20 transition-colors group">
                <td className="px-3 py-4 text-center border-r border-slate-100 bg-slate-50/30 text-[10px] font-black text-slate-400">
                  {idx + 1}
                </td>
                {data.columns.map(col => (
                  <td key={col.id} className="px-0 py-0 border-r border-slate-50 last:border-r-0 relative">
                    <input 
                      type="text"
                      className={`w-full h-full min-h-[56px] px-6 py-4 bg-transparent border-2 border-transparent focus:border-blue-500/30 focus:bg-blue-50/10 focus:ring-0 focus:outline-none text-sm font-medium transition-all text-slate-800 placeholder:text-slate-300 ${readOnly ? 'cursor-default' : 'cursor-text'}`}
                      value={row.values[col.id] || ''}
                      onChange={(e) => updateCellValue(row.id, col.id, e.target.value)}
                      readOnly={readOnly}
                      placeholder={readOnly ? '' : 'Type here...'}
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-4 py-2 text-right w-20 sticky right-0 bg-white group-hover:bg-blue-50/20 transition-colors">
                    <button 
                      onClick={() => deleteRow(row.id)}
                      className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        
        {data.rows.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-200 shadow-inner">
              <Rows size={32} />
            </div>
            <p className="text-slate-500 font-bold">This section is currently empty.</p>
            {!readOnly && (
              <button 
                onClick={addRow}
                className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Insert First Row
              </button>
            )}
          </div>
        )}
      </div>

      {/* Touch-First Floating Controls */}
      {!readOnly && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-4 md:hidden">
          <button 
            onClick={addRow}
            className="flex items-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl shadow-slate-400 font-black active:scale-[0.92] transition-all"
          >
            <Rows size={24} strokeWidth={3} />
            <span>Add Row</span>
          </button>
          <button 
            onClick={addColumn}
            className="flex items-center gap-3 px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] shadow-2xl shadow-blue-400 font-black active:scale-[0.92] transition-all"
          >
            <Columns size={24} strokeWidth={3} />
            <span>Add Col</span>
          </button>
        </div>
      )}

      {!readOnly && data.rows.length > 0 && (
        <div className="hidden md:flex items-center gap-6 mt-6 px-2">
          <button 
            onClick={addRow}
            className="flex items-center gap-3 px-6 py-3 bg-white text-blue-600 border-2 border-blue-50 rounded-2xl text-sm font-black hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm"
          >
            <Plus size={20} strokeWidth={3} /> New Row
          </button>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
             <p className="text-xs text-slate-400 font-black uppercase tracking-widest">
               {data.rows.length} Active Records • {data.columns.length} Fields
             </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicTable;
