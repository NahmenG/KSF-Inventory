import React, { useState, useMemo, useEffect } from 'react';
import { Printer, Download, ArrowDown, ArrowUp, Clock, Filter, X, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

/**
 * StockView Component
 * Manages the "In Stock" inventory with advanced multi-parameter filtering,
 * persistent search states, and detailed Excel reporting.
 */
const StockView = React.memo(({ rolls, onPrint, onSelectRoll }) => {
  // 1. STATE PERSISTENCE LOGIC
  // Restores search filters from localStorage so operators don't lose their place on refresh
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('ksf_stock_filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing stock filters:", e);
      }
    }
    return {
      customer: '',
      quality: '',
      gsm: '',
      width: '',
      color: ''
    };
  });

  const [sort, setSort] = useState('newest');

  // Sync filters to local storage on every change
  useEffect(() => {
    localStorage.setItem('ksf_stock_filters', JSON.stringify(filters));
  }, [filters]);

  // 2. DYNAMIC DROPDOWN DATA EXTRACTION
  // Automatically populates filters based on current stock data
  const uniqueQualities = useMemo(() => {
    const qualities = rolls
      .filter(r => r.status === 'in_stock')
      .map(r => r.quality)
      .filter(Boolean);
    return [...new Set(qualities)].sort();
  }, [rolls]);

  const uniqueColors = useMemo(() => {
    const colors = rolls
      .filter(r => r.status === 'in_stock')
      .map(r => r.color)
      .filter(Boolean);
    return [...new Set(colors)].sort();
  }, [rolls]);

  // 3. MASTER FILTERING & SORTING LOGIC
  const filtered = useMemo(() => {
    return rolls.filter(r => {
      // Logic for Status (Only physical stock)
      const isStock = r.status === 'in_stock';
      
      // Logic for Buyer Name or Product ID search
      const matchCustomer = !filters.customer || 
        (r.customer_name || '').toLowerCase().includes(filters.customer.toLowerCase()) || 
        r.product_id.toLowerCase().includes(filters.customer.toLowerCase());
      
      // Logic for Quality Dropdown
      const matchQuality = !filters.quality || r.quality === filters.quality;
      
      // Logic for GSM Search (Numeric Exact Match)
      const matchGSM = !filters.gsm || String(r.gsm) === filters.gsm;
      
      // Logic for Width / Size Search (Numeric Exact Match)
      const matchWidth = !filters.width || String(r.width_inches) === filters.width;
      
      // Logic for Color Dropdown
      const matchColor = !filters.color || r.color === filters.color;
      
      return isStock && matchCustomer && matchQuality && matchGSM && matchWidth && matchColor;
    })
    .sort((a,b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sort === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [rolls, filters, sort]);

  // 4. COMPREHENSIVE EXCEL EXPORT
  // Exports all technical parameters requested: Length, Weights, GSM, Width, Color, Name
  const handleExport = () => {
    const data = filtered.map(r => ({
      "Roll ID": r.product_id,
      "Buyer Name": r.customer_name || 'Generic Stock',
      "Quality": r.quality,
      "Color": r.color,
      "GSM": r.gsm,
      "Width (Inches)": r.width_inches,
      "Length (Meters)": r.length_meters || 0,
      "Net Weight (Kg)": r.net_weight,
      "Gross Weight (Kg)": r.gross_weight,
      "Production Date": new Date(r.created_at).toLocaleString(),
      "Status": "In Stock",
      "Device Station": r.device_name || 'N/A'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Current_Inventory");
    XLSX.writeFile(wb, `KSF_Stock_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 5. RESET FILTERS HANDLER
  const clearFilters = () => {
    setFilters({
      customer: '',
      quality: '',
      gsm: '',
      width: '',
      color: ''
    });
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-500">
      
      {/* SECTION 1: STICKY SEARCH PANEL */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-2 space-y-2 pb-2">
        <div className="bg-white px-4 py-3 rounded-2xl shadow-md border border-gray-100 relative transition-all">
          
          {/* RESET BUTTON (TOP RIGHT RED CROSS) */}
          {(filters.customer || filters.quality || filters.gsm || filters.width || filters.color) && (
            <button 
              onClick={clearFilters} 
              className="absolute top-3 right-3 p-1.5 bg-red-50 text-red-500 rounded-full hover:bg-red-600 hover:text-white transition-all z-10 shadow-sm border border-red-100 active:scale-90"
              title="Clear All Filters"
            >
              <X size={14} />
            </button>
          )}

          <h3 className="text-[9px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-1 mb-2">
            <Filter size={12} /> Stock Search Panel
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {/* Buyer/ID Search */}
            <input 
              className="border border-gray-100 p-2 rounded-xl text-[11px] font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300 shadow-inner" 
              placeholder="Buyer / ID" 
              value={filters.customer} 
              onChange={e => setFilters({...filters, customer: e.target.value})} 
            />

            {/* Quality Dropdown */}
            <div className="relative">
              <select 
                className="w-full appearance-none border border-gray-100 p-2 pr-6 rounded-xl text-[11px] font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-inner"
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
              className="border border-gray-100 p-2 rounded-xl text-[11px] font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300 shadow-inner" 
              placeholder="GSM" 
              value={filters.gsm} 
              onChange={e => setFilters({...filters, gsm: e.target.value})} 
            />

            {/* Size Filter */}
            <input 
              type="number"
              className="border border-gray-100 p-2 rounded-xl text-[11px] font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300 shadow-inner" 
              placeholder="Size" 
              value={filters.width} 
              onChange={e => setFilters({...filters, width: e.target.value})} 
            />
            
            {/* Color Dropdown */}
            <div className="relative">
              <select 
                className="w-full appearance-none border border-gray-100 p-2 pr-6 rounded-xl text-[11px] font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-inner"
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
              <Download size={12}/> XLS Export
            </button>
          </div>
        </div>

        {/* SECTION 2: COMPACT BLACK SUMMATION BAR (BLUE COUNT THEME) */}
        <div className="bg-gray-900 text-white p-3 md:p-4 rounded-2xl flex justify-between items-center shadow-2xl border border-gray-800 transition-all">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mb-0.5">Inventory Count</span>
            <span className="text-xl md:text-2xl font-black text-blue-400">
              {filtered.length} <span className="text-[10px] md:text-xs font-normal opacity-40 text-white">Rolls</span>
            </span>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-[8px] md:text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mb-0.5">Total Weight</span>
            <span className="text-xl md:text-2xl font-black text-green-400">
              {filtered.reduce((s,r)=>s+(parseFloat(r.net_weight)||0),0).toFixed(1)} 
              <span className="text-[10px] md:text-xs font-normal text-white/50 ml-1">kg</span>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: INTERACTIVE ROLL LIST */}
      <div className="space-y-2 px-1">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-100 font-black italic">
            No stock matches these filters.
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
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg flex items-center gap-1 font-black">
                    <Clock size={10} /> {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-sm font-black text-gray-800 mt-1">{r.customer_name || 'Generic Stock'}</div>
                <div className="text-[10px] text-gray-400 uppercase font-black mt-1 flex flex-wrap gap-2">
                  <span className="bg-blue-50 text-blue-700 px-1.5 rounded font-bold">{r.quality}</span>
                  <span className="text-blue-500 font-bold">{r.color}</span>
                  <span className="text-orange-600 bg-orange-50 px-1.5 rounded font-bold">{r.gsm} GSM</span>
                  <span className="text-green-600 bg-green-50 px-1.5 rounded font-bold">{r.width_inches}" Size</span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end min-w-[100px]">
                <div className="font-black text-2xl text-gray-900 leading-none">{r.net_weight} <span className="text-[10px] font-normal text-gray-400">kg</span></div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onPrint(r); }} 
                  className="text-blue-500 mt-3 p-2.5 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white rounded-xl transition-all shadow-sm"
                >
                  <Printer size={20}/>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default StockView;