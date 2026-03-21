import React, { useState, useMemo, useEffect } from 'react';
import { Download, Clock, X, RefreshCw, ChevronDown, Filter, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

/**
 * HistoryView Component
 * Manages historical records with date-range fetching, 
 * BOPP/Laminated support, and Admin-aware UI.
 */
const HistoryView = React.memo(({ rolls, isAdmin, onSelectRoll, onFetchRange, activeRange }) => {
  // 1. STATE PERSISTENCE
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('ksf_history_filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing history filters:", e);
      }
    }
    return { customer: '', quality: '', gsm: '', width: '', color: '', startDate: '', endDate: '' };
  });

  const [sort] = useState('newest');

  useEffect(() => {
    localStorage.setItem('ksf_history_filters', JSON.stringify(filters));
  }, [filters]);

  // 2. DATA EXTRACTION
  const uniqueQualities = useMemo(() => {
    // Added Laminated Fabric to the master list
    const masterQualities = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric', 'BOPP Fabric', 'Laminated Fabric'];
    const currentQualities = rolls.map(r => r.quality).filter(Boolean);
    
    return [...new Set([...masterQualities, ...currentQualities])].sort();
  }, [rolls]);

  const uniqueColors = useMemo(() => {
    const colors = rolls.map(r => r.color).filter(Boolean);
    return [...new Set(colors)].sort();
  }, [rolls]);

  // 3. FILTERING
  const filtered = useMemo(() => {
    return rolls.filter(r => {
      const matchCustomer = !filters.customer || 
        (r.customer_name || '').toLowerCase().includes(filters.customer.toLowerCase()) || 
        r.product_id.toLowerCase().includes(filters.customer.toLowerCase());
      
      const matchQuality = !filters.quality || r.quality === filters.quality;
      const matchGSM = !filters.gsm || String(r.gsm) === filters.gsm;
      const matchWidth = !filters.width || String(r.width_inches) === filters.width;
      const matchColor = !filters.color || r.color === filters.color;
      
      return matchCustomer && matchQuality && matchGSM && matchWidth && matchColor;
    }).sort((a, b) => new Date(b.dispatched_at || b.created_at) - new Date(a.dispatched_at || a.created_at));
  }, [rolls, filters]);

  // 4. EXPORT & RESET
  const handleExport = () => {
    const data = filtered.map(r => ({
      "Roll ID": r.product_id,
      "Buyer": r.customer_name || 'Generic Stock',
      "Quality": r.quality,
      "Color": r.color,
      "GSM": r.gsm,
      "Width (in)": r.width_inches,
      "Length (m)": r.length_meters || 0,
      "Gross Weight (kg)": r.gross_weight || 0,
      "Net Weight (kg)": r.net_weight || 0,
      "Dispatch Date": r.dispatched_at ? new Date(r.dispatched_at).toLocaleString() : 'N/A',
      "Device": r.device_name || 'N/A'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, `KSF_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearFilters = () => {
    const defaultFilters = { customer: '', quality: '', gsm: '', width: '', color: '', startDate: '', endDate: '' };
    setFilters(defaultFilters);
    localStorage.setItem('ksf_history_filters', JSON.stringify(defaultFilters));
    if (onFetchRange) onFetchRange(null, null); 
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-500">
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-2 space-y-2 pb-2">
        <div className="bg-white px-4 py-3 rounded-2xl shadow-md border border-gray-100 relative">
          
          {(filters.customer || filters.quality || filters.gsm || filters.width || filters.color || filters.startDate || filters.endDate) && (
            <button 
              onClick={clearFilters} 
              className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full shadow-lg z-10 active:scale-90 transition-all hover:bg-red-600"
            >
              <X size={12} />
            </button>
          )}

          <div className="space-y-2">
            <h3 className="text-[9px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-1 mb-1">
              <Calendar size={12} /> History Filters {isAdmin && <span className="ml-2 text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Admin Mode</span>}
            </h3>

            <div className="grid grid-cols-5 gap-1.5">
              <input 
                className="border border-gray-100 p-2 rounded-xl text-[10px] font-bold bg-gray-50 outline-none focus:ring-1 focus:ring-blue-200" 
                placeholder="Buyer / ID" 
                value={filters.customer} 
                onChange={e => setFilters({...filters, customer: e.target.value})} 
              />
              <div className="relative">
                <select 
                  className="w-full appearance-none border border-gray-100 p-2 rounded-xl text-[10px] font-bold bg-gray-50 outline-none" 
                  value={filters.quality} 
                  onChange={e => setFilters({...filters, quality: e.target.value})}
                >
                  <option value="">Quality</option>
                  {uniqueQualities.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <input 
                type="number" 
                className="border border-gray-100 p-2 rounded-xl text-[10px] font-bold bg-gray-50 outline-none" 
                placeholder="GSM" 
                value={filters.gsm} 
                onChange={e => setFilters({...filters, gsm: e.target.value})} 
              />
              <input 
                type="number" 
                className="border border-gray-100 p-2 rounded-xl text-[10px] font-bold bg-gray-50 outline-none" 
                placeholder="Size" 
                value={filters.width} 
                onChange={e => setFilters({...filters, width: e.target.value})} 
              />
              <div className="relative">
                <select 
                  className="w-full appearance-none border border-gray-100 p-2 rounded-xl text-[10px] font-bold bg-gray-50 outline-none" 
                  value={filters.color} 
                  onChange={e => setFilters({...filters, color: e.target.value})}
                >
                  <option value="">Color</option>
                  {uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 items-center">
              <input 
                type="date" 
                className="border border-gray-100 p-2 rounded-xl text-[9px] font-black bg-blue-50/30 outline-none uppercase" 
                value={filters.startDate} 
                onChange={e => setFilters({...filters, startDate: e.target.value})} 
              />
              <input 
                type="date" 
                className="border border-gray-100 p-2 rounded-xl text-[9px] font-black bg-blue-50/30 outline-none uppercase" 
                value={filters.endDate} 
                onChange={e => setFilters({...filters, endDate: e.target.value})} 
              />
              <button 
                onClick={() => onFetchRange(filters.startDate, filters.endDate)} 
                className="bg-blue-600 text-white rounded-xl font-black text-[9px] h-full py-2 flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <RefreshCw size={12} /> FETCH RANGE
              </button>
              <button 
                onClick={handleExport} 
                className="bg-green-600 text-white rounded-xl font-black text-[9px] h-full py-2 flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <Download size={12} /> EXCEL
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 text-white p-3 md:p-4 rounded-2xl flex justify-between items-center shadow-2xl border border-gray-800">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mb-0.5">
              {activeRange === '15days' ? 'Record for last 15 days' : 
               activeRange === 'current_month' ? 'Record for current month' : 
               'Record for selected range'}
            </span>
            <span className="text-xl md:text-2xl font-black text-orange-400">
              {filtered.length} <span className="text-[10px] md:text-xs font-normal opacity-40 text-white ml-1">Rolls</span>
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

      <div className="space-y-2 px-1">
        {filtered.map(r => (
          <div 
            key={r.id} 
            onClick={() => onSelectRoll(r)} 
            className={`bg-white p-4 rounded-2xl border flex justify-between items-center active:scale-[0.98] transition-all shadow-sm cursor-pointer group ${isAdmin ? 'hover:border-green-300 border-gray-100' : 'hover:border-blue-200 border-gray-100'}`}
          >
            <div className="flex-1">
              <div className="font-black text-blue-600 text-lg flex items-center gap-2">
                {r.product_id}
                <span className={`text-[7px] md:text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${r.status === 'in_stock' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {r.status === 'in_stock' ? 'In Stock' : 'Dispatched'}
                </span>
              </div>
              <div className="text-sm font-black text-gray-800 mt-1">{r.customer_name || 'Generic Stock'}</div>
              <div className="text-[10px] font-black mt-1 flex flex-wrap gap-2 items-center">
                <span className="bg-slate-50 px-1.5 py-0.5 rounded text-gray-600 uppercase tracking-tighter font-bold">{r.quality}</span>
                <span className="text-blue-500 font-bold">{r.color}</span>
                <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase tracking-tighter font-bold">{r.gsm} GSM</span>
                <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase tracking-tighter font-bold">{r.width_inches}" Size</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end min-w-[100px]">
              <div className="font-black text-2xl text-gray-900 leading-none">{r.net_weight} <span className="text-[10px] font-normal text-gray-400">kg</span></div>
              <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-2 uppercase tracking-tighter">
                 <Clock size={10} /> {new Date(r.dispatched_at || r.created_at).toLocaleDateString()}
              </div>
              {isAdmin && <div className="mt-2 text-[7px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-black uppercase border border-green-100">Editable</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default HistoryView;