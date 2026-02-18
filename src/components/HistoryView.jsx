import React, { useMemo, useState } from 'react';
import { Search, Clock, Download, Filter, X, Calendar, Package } from 'lucide-react';
import * as XLSX from 'xlsx';

const formatCurrency = (val) => new Intl.NumberFormat('en-IN').format(val);

const HistoryView = React.memo(({ rolls, onSelectRoll }) => {
  // 1. Multi-Parameter Search State
  const [filters, setFilters] = useState({
    customer: '',
    gsm: '',
    width: '',
    color: ''
  });

  // 2. Advanced Filtering Logic for Dispatched Items
  const list = useMemo(() => {
    return rolls
      .filter(r => {
        const isDispatched = r.status === 'dispatched';
        const matchCustomer = !filters.customer || 
          (r.customer_name || '').toLowerCase().includes(filters.customer.toLowerCase()) || 
          r.product_id.toLowerCase().includes(filters.customer.toLowerCase());
        const matchGSM = !filters.gsm || String(r.gsm) === filters.gsm;
        const matchWidth = !filters.width || String(r.width_inches) === filters.width;
        const matchColor = !filters.color || (r.color || '').toLowerCase().includes(filters.color.toLowerCase());
        
        return isDispatched && matchCustomer && matchGSM && matchWidth && matchColor;
      })
      .sort((a, b) => new Date(b.dispatched_at) - new Date(a.dispatched_at));
  }, [rolls, filters]);

  const totalWeight = useMemo(() => {
    return list.reduce((sum, r) => sum + (parseFloat(r.net_weight) || 0), 0);
  }, [list]);

  const handleExport = () => {
    const exportData = list.map(r => ({
      "Roll ID": r.product_id,
      "Buyer": r.customer_name,
      "Quality": r.quality,
      "Color": r.color,
      "GSM": r.gsm,
      "Width (in)": r.width_inches,
      "Net Kg": r.net_weight,
      "Dispatched Date": new Date(r.dispatched_at).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DispatchHistory");
    XLSX.writeFile(wb, `KSF_History_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearFilters = () => setFilters({ customer: '', gsm: '', width: '', color: '' });

  return (
    <div className="space-y-4 pb-20">
      {/* STICKY SEARCH PANEL */}
      <div className="sticky top-0 z-30 bg-slate-50 pt-2 space-y-2">
        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-black uppercase text-orange-600 tracking-widest flex items-center gap-2">
              <Calendar size={14} /> Dispatch History Filters
            </h3>
            {(filters.customer || filters.gsm || filters.width || filters.color) && (
              <button onClick={clearFilters} className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                <X size={12} /> Clear Filters
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input 
              className="border p-2 rounded-lg text-xs font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-orange-100" 
              placeholder="Buyer / ID" 
              value={filters.customer} 
              onChange={e => setFilters({...filters, customer: e.target.value})} 
            />
            <input 
              type="number"
              className="border p-2 rounded-lg text-xs font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-orange-100" 
              placeholder="GSM" 
              value={filters.gsm} 
              onChange={e => setFilters({...filters, gsm: e.target.value})} 
            />
            <input 
              type="number"
              className="border p-2 rounded-lg text-xs font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-orange-100" 
              placeholder="Size" 
              value={filters.width} 
              onChange={e => setFilters({...filters, width: e.target.value})} 
            />
            <input 
              className="border p-2 rounded-lg text-xs font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-orange-100" 
              placeholder="Color" 
              value={filters.color} 
              onChange={e => setFilters({...filters, color: e.target.value})} 
            />
          </div>

          <button onClick={handleExport} className="w-full mt-3 bg-green-100 text-green-700 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-green-200 transition-colors">
            <Download size={16}/> Export History to XLS
          </button>
        </div>

        {/* LARGE BLACK SUMMATION BAR */}
        <div className="bg-gray-900 text-white p-5 rounded-xl flex justify-between items-center shadow-xl border border-gray-800">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Dispatched Count</span>
            <span className="text-3xl font-black">{list.length} <span className="text-xs font-normal opacity-50 text-white">Rolls</span></span>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Weight Out</span>
            <span className="text-3xl font-black text-orange-400">
              {totalWeight.toFixed(1)} 
              <span className="text-xs font-normal text-white ml-1">kg</span>
            </span>
          </div>
        </div>
      </div>

      {/* DISPATCHED ROLL LIST */}
      <div className="space-y-2">
        {list.length === 0 ? (
          <div className="text-center py-20 text-gray-400 italic bg-white rounded-xl border border-dashed">
            No history found matching these filters.
          </div>
        ) : (
          list.map(r => (
            <div 
              key={r.id} 
              onClick={() => onSelectRoll(r)} 
              className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center active:scale-[0.98] transition-all shadow-sm hover:border-orange-200 cursor-pointer"
            >
              <div>
                <div className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  {r.product_id}
                  <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                    <Clock size={10} /> {new Date(r.dispatched_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="font-bold text-sm text-blue-700">{r.customer_name || 'Unknown Buyer'}</div>
                <div className="text-[10px] text-gray-400 uppercase font-bold mt-1">
                  {r.quality} • <span className="text-orange-600">{r.gsm} GSM</span> • <span className="text-green-600">{r.width_inches}"</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-xl text-green-700">{r.net_weight} kg</div>
                <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Tap to Edit History</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default HistoryView;