import React, { useState, useMemo } from 'react';
import { Search, Printer, Download, ArrowDown, ArrowUp, Clock, Filter, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const StockView = React.memo(({ rolls, onPrint, onSelectRoll }) => {
  // 1. MULTI-PARAMETER SEARCH STATE
  const [filters, setFilters] = useState({
    customer: '',
    gsm: '',
    width: '',
    color: ''
  });
  const [sort, setSort] = useState('newest');

  // 2. FILTERING LOGIC
  const filtered = useMemo(() => {
    return rolls.filter(r => {
      const isStock = r.status === 'in_stock';
      
      const matchCustomer = !filters.customer || 
        (r.customer_name || '').toLowerCase().includes(filters.customer.toLowerCase()) || 
        r.product_id.toLowerCase().includes(filters.customer.toLowerCase());
      
      const matchGSM = !filters.gsm || String(r.gsm) === filters.gsm;
      const matchWidth = !filters.width || String(r.width_inches) === filters.width;
      const matchColor = !filters.color || (r.color || '').toLowerCase().includes(filters.color.toLowerCase());
      
      return isStock && matchCustomer && matchGSM && matchWidth && matchColor;
    })
    .sort((a,b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sort === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [rolls, filters, sort]);

  // 3. EXCEL EXPORT
  const handleExport = () => {
    const data = filtered.map(r => ({
      "Roll ID": r.product_id,
      "Buyer": r.customer_name || 'Stock',
      "Quality": r.quality,
      "Color": r.color,
      "GSM": r.gsm,
      "Size (in)": r.width_inches,
      "Net Weight": r.net_weight,
      "Production Date": new Date(r.created_at).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, `KSF_Stock_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearFilters = () => setFilters({ customer: '', gsm: '', width: '', color: '' });

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-500">
      
      {/* SECTION 1: STICKY SEARCH PANEL */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-2 space-y-2">
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] flex items-center gap-2">
              <Filter size={14} /> Advanced Filters
            </h3>
            {(filters.customer || filters.gsm || filters.width || filters.color) && (
              <button 
                onClick={clearFilters} 
                className="text-[10px] font-black text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg transition-colors"
              >
                <X size={12} /> Reset
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Buyer / ID</label>
              <input 
                className="border border-gray-100 p-2.5 rounded-xl text-xs font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
                placeholder="Ex: Reliance" 
                value={filters.customer} 
                onChange={e => setFilters({...filters, customer: e.target.value})} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">GSM</label>
              <input 
                type="number"
                className="border border-gray-100 p-2.5 rounded-xl text-xs font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
                placeholder="Ex: 60" 
                value={filters.gsm} 
                onChange={e => setFilters({...filters, gsm: e.target.value})} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Size (in)</label>
              <input 
                type="number"
                className="border border-gray-100 p-2.5 rounded-xl text-xs font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
                placeholder="Ex: 42" 
                value={filters.width} 
                onChange={e => setFilters({...filters, width: e.target.value})} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Color</label>
              <input 
                className="border border-gray-100 p-2.5 rounded-xl text-xs font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
                placeholder="Ex: White" 
                value={filters.color} 
                onChange={e => setFilters({...filters, color: e.target.value})} 
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
            <button 
              onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')} 
              className="flex-1 py-2.5 border border-gray-100 rounded-xl bg-white text-xs font-black text-gray-600 flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              {sort === 'newest' ? <><ArrowDown size={14} className="text-blue-500"/> Newest</> : <><ArrowUp size={14} className="text-blue-500"/> Oldest</>}
            </button>
            <button 
              onClick={handleExport} 
              className="flex-1 bg-green-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-100"
            >
              <Download size={14}/> XLS Export
            </button>
          </div>
        </div>

        {/* SECTION 2: COMPACT BLACK SUMMATION BAR (UPDATED SIZE) */}
        <div className="bg-gray-900 text-white p-3 md:p-4 rounded-2xl flex justify-between items-center shadow-2xl border border-gray-800 transition-all">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mb-0.5">Stock Count</span>
            <span className="text-xl md:text-2xl font-black">
              {filtered.length} <span className="text-[10px] md:text-xs font-normal opacity-40">Rolls</span>
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
      <div className="space-y-2 mt-4">
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
                  <span className="bg-slate-50 px-1.5 rounded">{r.quality}</span>
                  <span className="text-blue-500">{r.color}</span>
                  <span className="text-orange-600 bg-orange-50 px-1.5 rounded">{r.gsm} GSM</span>
                  <span className="text-green-600 bg-green-50 px-1.5 rounded">{r.width_inches}" Size</span>
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