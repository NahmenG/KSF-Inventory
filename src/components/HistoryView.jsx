import React, { useState, useMemo, useEffect } from 'react';
import { Search, Download, Calendar, Filter, ChevronDown, Hash, User, Tag } from 'lucide-react';
import * as XLSX from 'xlsx';

/**
 * HistoryView Component
 * Manages the "Dispatched" records with BOPP Fabric support,
 * custom date range filtering, and comprehensive dispatch reporting.
 */
const HistoryView = React.memo(({ rolls, onSelectRoll }) => {
  // 1. FILTERS & SEARCH STATE
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuality, setFilterQuality] = useState('All');
  const [dateRange, setDateRange] = useState('all'); // all, today, week, month

  // 2. DYNAMIC QUALITY LIST (Includes BOPP Fabric)
  const qualities = useMemo(() => {
    const base = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric', 'BOPP Fabric'];
    return ['All', ...base].sort();
  }, []);

  // 3. FILTERING LOGIC
  const filteredHistory = useMemo(() => {
    return rolls.filter(r => {
      if (r.status !== 'dispatched') return false;

      const matchSearch = !searchTerm || 
        r.product_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchQuality = filterQuality === 'All' || r.quality === filterQuality;

      // Date Filtering
      if (dateRange === 'all') return matchSearch && matchQuality;
      
      const rollDate = new Date(r.dispatched_at || r.created_at);
      const now = new Date();
      if (dateRange === 'today') {
        return matchSearch && matchQuality && rollDate.toDateString() === now.toDateString();
      }
      if (dateRange === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        return matchSearch && matchQuality && rollDate >= weekAgo;
      }
      
      return matchSearch && matchQuality;
    }).sort((a, b) => new Date(b.dispatched_at || b.created_at) - new Date(a.dispatched_at || a.created_at));
  }, [rolls, searchTerm, filterQuality, dateRange]);

  // 4. MASTER DISPATCH EXPORT
  const handleExport = () => {
    const data = filteredHistory.map(r => ({
      "Dispatch Date": new Date(r.dispatched_at).toLocaleString(),
      "Roll ID": r.product_id,
      "Buyer Name": r.customer_name,
      "Quality": r.quality,
      "Color": r.color,
      "GSM": r.gsm,
      "Size (In)": r.width_inches,
      "Length (M)": r.length_meters || 0,
      "Gross Wt (Kg)": r.gross_weight || 0,
      "Net Wt (Kg)": r.net_weight || 0,
      "Dispatched By": r.dispatched_by || r.device_name || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dispatch_History");
    XLSX.writeFile(wb, `KSF_Dispatch_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-500">
      
      {/* SEARCH & FILTER SECTION */}
      <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Search ID or Buyer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <select 
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none appearance-none"
              value={filterQuality}
              onChange={e => setFilterQuality(e.target.value)}
            >
              {qualities.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select 
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none appearance-none"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
            </select>
            <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <button 
          onClick={handleExport}
          className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
        >
          <Download size={16} /> DOWNLOAD DISPATCH LOG (XLS)
        </button>
      </div>

      {/* SUMMARY BAR */}
      <div className="bg-slate-900 p-5 rounded-[2.5rem] flex justify-between items-center text-white">
        <div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Dispatched</p>
          <h3 className="text-2xl font-black text-blue-400">{filteredHistory.length} <span className="text-xs font-normal text-slate-400">Rolls</span></h3>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dispatched Tonnage</p>
          <h3 className="text-2xl font-black text-green-400">
            {(filteredHistory.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0) / 1000).toFixed(2)} 
            <span className="text-xs font-normal text-slate-400 ml-1">Tons</span>
          </h3>
        </div>
      </div>

      {/* HISTORY LIST */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-bold italic bg-white rounded-[2.5rem] border border-dashed border-gray-200">
            No dispatch records found.
          </div>
        ) : (
          filteredHistory.map(r => (
            <div 
              key={r.id} 
              onClick={() => onSelectRoll(r)}
              className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-black text-gray-900">{r.product_id}</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                      {r.quality}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-500">{r.customer_name || 'Generic Stock'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-gray-900">{r.net_weight} <span className="text-[10px] text-gray-400">kg</span></p>
                  <p className="text-[9px] font-bold text-green-600 uppercase tracking-tighter">
                    {new Date(r.dispatched_at || r.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-50 text-[9px] font-black uppercase text-gray-400">
                <div className="flex flex-col">
                  <span>Gross</span>
                  <span className="text-gray-700">{r.gross_weight} kg</span>
                </div>
                <div className="flex flex-col">
                  <span>GSM</span>
                  <span className="text-gray-700">{r.gsm}</span>
                </div>
                <div className="flex flex-col">
                  <span>Size</span>
                  <span className="text-gray-700">{r.width_inches}"</span>
                </div>
                <div className="flex flex-col">
                  <span>Length</span>
                  <span className="text-gray-700">{r.length_meters} m</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default HistoryView;