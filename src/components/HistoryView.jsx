import React, { useState, useMemo, useEffect } from 'react';
import { Download, ArrowDown, ArrowUp, Clock, Filter, X, ChevronDown, History, ToggleLeft, ToggleRight, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

const HistoryView = React.memo(({ rolls, onSelectRoll }) => {
  // 1. FULL STATE PERSISTENCE LOGIC
  // This restores the exact view (filters, toggle, dates) from localStorage
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('ksf_history_filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing history filters:", e);
      }
    }
    return {
      customer: '',
      quality: '',
      gsm: '',
      width: '',
      color: '',
      dispatchDate: '',
      onlyDispatched: false // This tracks the toggle state
    };
  });

  const [sort, setSort] = useState('newest');

  // Sync all UI states to local cache so data is preserved during refresh
  useEffect(() => {
    localStorage.setItem('ksf_history_filters', JSON.stringify(filters));
  }, [filters]);

  // 2. DYNAMIC DROPDOWN DATA EXTRACTION
  // Populates dropdowns based on current data available in the master list
  const uniqueQualities = useMemo(() => {
    const qualities = rolls.map(r => r.quality).filter(Boolean);
    return [...new Set(qualities)].sort();
  }, [rolls]);

  const uniqueColors = useMemo(() => {
    const colors = rolls.map(r => r.color).filter(Boolean);
    return [...new Set(colors)].sort();
  }, [rolls]);

  // 3. MASTER FILTERING & SORTING LOGIC
  const filtered = useMemo(() => {
    return rolls.filter(r => {
      // LOGIC: Toggle Switch (If active, show ONLY dispatched rolls)
      if (filters.onlyDispatched && r.status !== 'dispatched') {
        return false;
      }

      // LOGIC: Search by Buyer Name or Product ID
      const matchCustomer = !filters.customer || 
        (r.customer_name || '').toLowerCase().includes(filters.customer.toLowerCase()) || 
        r.product_id.toLowerCase().includes(filters.customer.toLowerCase());
      
      // LOGIC: Quality Dropdown
      const matchQuality = !filters.quality || r.quality === filters.quality;
      
      // LOGIC: GSM Search (Numeric)
      const matchGSM = !filters.gsm || String(r.gsm) === filters.gsm;
      
      // LOGIC: Width / Size Search (Numeric)
      const matchWidth = !filters.width || String(r.width_inches) === filters.width;
      
      // LOGIC: Color Dropdown
      const matchColor = !filters.color || r.color === filters.color;

      // LOGIC: Dispatch Date Filter
      // Matches the specific date selected in the calendar
      const matchDispatchDate = !filters.dispatchDate || 
        (r.dispatched_at && new Date(r.dispatched_at).toLocaleDateString() === new Date(filters.dispatchDate).toLocaleDateString());
      
      return matchCustomer && matchQuality && matchGSM && matchWidth && matchColor && matchDispatchDate;
    })
    .sort((a, b) => {
      // Sort logic: Uses dispatch date if available, otherwise creation date
      const dateA = new Date(a.dispatched_at || a.created_at);
      const dateB = new Date(b.dispatched_at || b.created_at);
      return sort === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [rolls, filters, sort]);

  // 4. MASTER EXCEL EXPORT LOGIC
  const handleExport = () => {
    const data = filtered.map(r => ({
      "Roll ID": r.product_id,
      "Current Status": r.status.toUpperCase(),
      "Buyer Name": r.customer_name || 'Generic Stock',
      "Quality": r.quality,
      "Color": r.color,
      "GSM": r.gsm,
      "Size (Inches)": r.width_inches,
      "Net Weight (Kg)": r.net_weight,
      "Production Date": new Date(r.created_at).toLocaleString(),
      "Dispatch Date": r.dispatched_at ? new Date(r.dispatched_at).toLocaleString() : 'N/A',
      "Device": r.device_name || 'Factory System'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master_Log");
    XLSX.writeFile(wb, `KSF_Master_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 5. RESET FILTERS LOGIC (Including Toggle and Date)
  const clearFilters = () => {
    setFilters({
      customer: '',
      quality: '',
      gsm: '',
      width: '',
      color: '',
      dispatchDate: '',
      onlyDispatched: false
    });
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-500">
      
      {/* SECTION 1: STICKY SEARCH PANEL */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-2 space-y-2 pb-2">
        <div className="bg-white px-4 py-3 rounded-2xl shadow-md border border-gray-100 relative transition-all">
          
          {/* TOP RIGHT RESET BUTTON (RED CROSS) */}
          {(filters.customer || filters.quality || filters.gsm || filters.width || filters.color || filters.dispatchDate || filters.onlyDispatched) && (
            <button 
              onClick={clearFilters} 
              className="absolute top-3 right-3 p-1.5 bg-red-50 text-red-500 rounded-full hover:bg-red-600 hover:text-white transition-all z-10 shadow-sm border border-red-100 active:scale-90"
              title="Clear All Filters"
            >
              <X size={14} />
            </button>
          )}

          {/* HEADER AND TOGGLE SWITCH */}
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[9px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-1">
              <History size={12} className="text-blue-500" /> Master History Logs
            </h3>
            
            <button 
              onClick={() => setFilters({...filters, onlyDispatched: !filters.onlyDispatched})}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border shadow-sm active:scale-95 ${
                filters.onlyDispatched 
                  ? 'bg-orange-500 text-white border-orange-400 shadow-orange-100' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              <span className="text-[9px] font-black uppercase tracking-tighter">
                {filters.onlyDispatched ? 'Dispatched Mode' : 'View All Rolls'}
              </span>
              {filters.onlyDispatched ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
          </div>
          
          {/* SEARCH GRID (6 COLUMNS ON DESKTOP) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {/* Buyer/ID Search */}
            <input 
              className="border border-gray-100 p-2 rounded-xl text-[11px] font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300" 
              placeholder="Buyer / ID" 
              value={filters.customer} 
              onChange={e => setFilters({...filters, customer: e.target.value})} 
            />

            {/* Quality Dropdown */}
            <div className="relative">
              <select 
                className="w-full appearance-none border border-gray-100 p-2 pr-6 rounded-xl text-[11px] font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                value={filters.quality}
                onChange={e => setFilters({...filters, quality: e.target.value})}
              >
                <option value="">Quality</option>
                {uniqueQualities.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* GSM Filter */}
            <input 
              type="number"
              className="border border-gray-100 p-2 rounded-xl text-[11px] font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300" 
              placeholder="GSM" 
              value={filters.gsm} 
              onChange={e => setFilters({...filters, gsm: e.target.value})} 
            />

            {/* Size Filter */}
            <input 
              type="number"
              className="border border-gray-100 p-2 rounded-xl text-[11px] font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300" 
              placeholder="Size" 
              value={filters.width} 
              onChange={e => setFilters({...filters, width: e.target.value})} 
            />

            {/* NEW: DISPATCH DATE CALENDAR FILTER */}
            <div className="relative">
              <input 
                type="date" 
                className="w-full border border-gray-100 p-2 rounded-xl text-[10px] font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-orange-100 uppercase transition-all" 
                value={filters.dispatchDate} 
                onChange={e => setFilters({...filters, dispatchDate: e.target.value})} 
              />
            </div>

            {/* Color Dropdown */}
            <div className="relative">
              <select 
                className="w-full appearance-none border border-gray-100 p-2 pr-6 rounded-xl text-[11px] font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                value={filters.color}
                onChange={e => setFilters({...filters, color: e.target.value})}
              >
                <option value="">Color</option>
                {uniqueColors.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-50">
            <button 
              onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')} 
              className="flex-1 py-1.5 border border-gray-100 rounded-lg bg-white text-[10px] font-black text-gray-600 flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              {sort === 'newest' ? <ArrowDown size={12} className="text-blue-500"/> : <ArrowUp size={12} className="text-blue-500"/>} Sort Date
            </button>
            <button 
              onClick={handleExport} 
              className="flex-1 bg-green-600 text-white rounded-lg font-black text-[10px] flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all"
            >
              <Download size={12}/> Master Export
            </button>
          </div>
        </div>

        {/* SECTION 2: SUMMATION BAR (ORANGE COUNT THEME) */}
        <div className="bg-gray-900 text-white p-3 md:p-4 rounded-2xl flex justify-between items-center shadow-2xl border border-gray-800 transition-all">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mb-0.5">Found Records</span>
            <span className="text-xl md:text-2xl font-black text-orange-400">
              {filtered.length} <span className="text-[10px] md:text-xs font-normal opacity-40 text-white">Rolls</span>
            </span>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-[8px] md:text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mb-0.5">Total weight</span>
            <span className="text-xl md:text-2xl font-black text-green-400">
              {filtered.reduce((s,r)=>s+(parseFloat(r.net_weight)||0),0).toFixed(1)} 
              <span className="text-[10px] md:text-xs font-normal text-white/50 ml-1">kg</span>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: DATA LISTING */}
      <div className="space-y-2 px-1">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-100 font-black italic">
            No records found for the selected filters.
          </div>
        ) : (
          filtered.map(r => (
            <div 
              key={r.id} 
              onClick={() => onSelectRoll(r)} 
              className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center active:scale-[0.98] transition-all shadow-sm hover:border-blue-200 cursor-pointer group"
            >
              <div className="flex-1">
                <div className="font-black text-blue-600 text-lg flex items-center gap-2">
                  {r.product_id}
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    r.status === 'in_stock' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {r.status === 'in_stock' ? 'In Stock' : 'Dispatched'}
                  </span>
                </div>
                <div className="text-sm font-black text-gray-800 mt-1">{r.customer_name || 'Generic Stock'}</div>
                <div className="text-[10px] text-gray-400 uppercase font-black mt-1 flex flex-wrap gap-2">
                  <span className="bg-slate-100 px-1.5 rounded text-gray-600 font-bold">{r.quality}</span>
                  <span className="text-blue-500 font-bold">{r.color}</span>
                  <span className="text-orange-600 bg-orange-50 px-1.5 rounded font-bold">{r.gsm} GSM</span>
                  <span className="text-green-600 bg-green-50 px-1.5 rounded font-bold">{r.width_inches}" Size</span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end min-w-[100px]">
                <div className="font-black text-2xl text-gray-900 leading-none">{r.net_weight} <span className="text-[10px] font-normal text-gray-400">kg</span></div>
                <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-2">
                   <Clock size={10} /> 
                   {r.status === 'dispatched' && r.dispatched_at 
                     ? new Date(r.dispatched_at).toLocaleDateString() 
                     : new Date(r.created_at).toLocaleDateString()}
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