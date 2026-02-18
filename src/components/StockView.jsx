import React, { useState, useMemo } from 'react';
import { Search, Printer, Download, ArrowDown, ArrowUp, Clock, Filter, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const StockView = React.memo(({ rolls, onPrint, onSelectRoll }) => {
  // 1. Multi-Parameter Search State
  const [filters, setFilters] = useState({
    customer: '',
    gsm: '',
    width: '',
    color: ''
  });
  const [sort, setSort] = useState('newest');

  // 2. Advanced Filtering Logic
  const filtered = useMemo(() => {
    return rolls.filter(r => {
      const isStock = r.status === 'in_stock';
      const matchCustomer = !filters.customer || (r.customer_name || '').toLowerCase().includes(filters.customer.toLowerCase()) || r.product_id.toLowerCase().includes(filters.customer.toLowerCase());
      const matchGSM = !filters.gsm || String(r.gsm) === filters.gsm;
      const matchWidth = !filters.width || String(r.width_inches) === filters.width;
      const matchColor = !filters.color || (r.color || '').toLowerCase().includes(filters.color.toLowerCase());
      
      return isStock && matchCustomer && matchGSM && matchWidth && matchColor;
    })
    .sort((a,b) => sort === 'newest' ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));
  }, [rolls, filters, sort]);

  const handleExport = () => {
    const data = filtered.map(r => ({ "ID": r.product_id, "Buyer": r.customer_name, "Quality": r.quality, "Color": r.color, "GSM": r.gsm, "Width": r.width_inches, "Net Kg": r.net_weight, "Date": new Date(r.created_at).toLocaleString() }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, "Filtered_Stock.xlsx");
  };

  const clearFilters = () => setFilters({ customer: '', gsm: '', width: '', color: '' });

  return (
    <div className="space-y-4 pb-20">
      {/* STICKY SEARCH PANEL */}
      <div className="sticky top-0 z-30 bg-slate-50 pt-2 space-y-2">
        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
              <Filter size={14} /> Multi-Search Filters
            </h3>
            {(filters.customer || filters.gsm || filters.width || filters.color) && (
              <button onClick={clearFilters} className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                <X size={12} /> Reset
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input 
              className="border p-2 rounded-lg text-xs font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100" 
              placeholder="Customer / ID" 
              value={filters.customer} 
              onChange={e => setFilters({...filters, customer: e.target.value})} 
            />
            <input 
              type="number"
              className="border p-2 rounded-lg text-xs font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100" 
              placeholder="GSM (e.g. 60)" 
              value={filters.gsm} 
              onChange={e => setFilters({...filters, gsm: e.target.value})} 
            />
            <input 
              type="number"
              className="border p-2 rounded-lg text-xs font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100" 
              placeholder="Size (e.g. 40)" 
              value={filters.width} 
              onChange={e => setFilters({...filters, width: e.target.value})} 
            />
            <input 
              className="border p-2 rounded-lg text-xs font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100" 
              placeholder="Color" 
              value={filters.color} 
              onChange={e => setFilters({...filters, color: e.target.value})} 
            />
          </div>

          <div className="flex gap-2 mt-3 pt-3 border-t">
            <button onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')} className="flex-1 py-2 border rounded-lg bg-white text-xs font-bold flex items-center justify-center gap-2">
              {sort === 'newest' ? <><ArrowDown size={14}/> Newest First</> : <><ArrowUp size={14}/> Oldest First</>}
            </button>
            <button onClick={handleExport} className="flex-1 bg-green-100 text-green-700 rounded-lg font-bold text-xs flex items-center justify-center gap-2">
              <Download size={16}/> Export Filtered XLS
            </button>
          </div>
        </div>

        {/* LARGE BLACK SUMMATION BAR */}
        <div className="bg-gray-900 text-white p-5 rounded-xl flex justify-between items-center shadow-xl border border-gray-800 transition-all">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Result</span>
            <span className="text-3xl font-black">{filtered.length} <span className="text-xs font-normal opacity-50">Rolls</span></span>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Weight</span>
            <span className="text-3xl font-black text-green-400">
              {filtered.reduce((s,r)=>s+(parseFloat(r.net_weight)||0),0).toFixed(1)} 
              <span className="text-xs font-normal text-white ml-1">kg</span>
            </span>
          </div>
        </div>
      </div>

      {/* ROLL LIST */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 italic bg-white rounded-xl border border-dashed">
            No rolls found matching these specific filters.
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center active:scale-95 transition-all shadow-sm hover:border-blue-200">
              <div>
                <div className="font-bold text-blue-600 text-lg flex items-center gap-2">
                  {r.product_id}
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                    <Clock size={10} /> {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-800">{r.customer_name || 'Stock'}</div>
                <div className="text-[10px] text-gray-400 uppercase font-bold">
                  {r.quality} • <span className="text-blue-500">{r.color}</span> • <span className="text-orange-600">{r.gsm} GSM</span> • <span className="text-green-600">{r.width_inches}"</span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="font-black text-xl text-gray-900">{r.net_weight} kg</div>
                <button onClick={(e) => { e.stopPropagation(); onPrint(r); }} className="text-blue-500 mt-2 p-1.5 hover:bg-blue-50 rounded-full transition-colors"><Printer size={20}/></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default StockView;