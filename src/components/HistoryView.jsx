import React, { useState, useMemo } from 'react';
import { Download, Clock, X, ChevronDown, Calendar, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

const HistoryView = React.memo(({ rolls, onSelectRoll, onFetchRange }) => {
  const [filters, setFilters] = useState({ customer: '', quality: '', gsm: '', width: '', color: '', startDate: '', endDate: '' });
  const [sort, setSort] = useState('newest');

  const uniqueQualities = useMemo(() => [...new Set(rolls.map(r => r.quality))].filter(Boolean).sort(), [rolls]);
  const uniqueColors = useMemo(() => [...new Set(rolls.map(r => r.color))].filter(Boolean).sort(), [rolls]);

  const filtered = useMemo(() => {
    return rolls.filter(r => {
      const matchCustomer = !filters.customer || (r.customer_name || '').toLowerCase().includes(filters.customer.toLowerCase()) || r.product_id.toLowerCase().includes(filters.customer.toLowerCase());
      const matchQuality = !filters.quality || r.quality === filters.quality;
      const matchGSM = !filters.gsm || String(r.gsm) === filters.gsm;
      const matchWidth = !filters.width || String(r.width_inches) === filters.width;
      const matchColor = !filters.color || r.color === filters.color;
      return matchCustomer && matchQuality && matchGSM && matchWidth && matchColor;
    }).sort((a, b) => {
      const dateA = new Date(a.dispatched_at || a.created_at);
      const dateB = new Date(b.dispatched_at || b.created_at);
      return sort === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [rolls, filters, sort]);

  const handleExport = () => {
    const data = filtered.map(r => ({
      "Roll ID": r.product_id,
      "Buyer": r.customer_name || 'Stock',
      "Quality": r.quality,
      "GSM": r.gsm,
      "Width": r.width_inches,
      "Weight": r.net_weight,
      "Date": r.dispatched_at ? new Date(r.dispatched_at).toLocaleDateString() : new Date(r.created_at).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, "KSF_History.xlsx");
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-500">
      {/* SEARCH CARD - REMOVED TOGGLE, ADDED DATE FETCH */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <input className="border border-gray-100 p-2 rounded-xl text-xs font-bold bg-gray-50 outline-none" placeholder="Buyer / ID" value={filters.customer} onChange={e => setFilters({...filters, customer: e.target.value})} />
          <select className="border border-gray-100 p-2 rounded-xl text-xs font-bold bg-gray-50 outline-none" value={filters.quality} onChange={e => setFilters({...filters, quality: e.target.value})}>
            <option value="">Quality</option>
            {uniqueQualities.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <select className="border border-gray-100 p-2 rounded-xl text-xs font-bold bg-gray-50 outline-none" value={filters.color} onChange={e => setFilters({...filters, color: e.target.value})}>
            <option value="">Color</option>
            {uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* DATE FETCH RANGE */}
        <div className="flex items-center gap-2 bg-blue-50/50 p-2 rounded-2xl border border-blue-100">
          <input type="date" className="flex-1 bg-transparent text-[10px] font-black outline-none uppercase" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
          <ChevronDown size={12} className="text-blue-300" />
          <input type="date" className="flex-1 bg-transparent text-[10px] font-black outline-none uppercase" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
          <button onClick={() => onFetchRange(filters.startDate, filters.endDate)} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg active:scale-90 transition-all">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')} className="flex-1 bg-gray-100 p-2 rounded-xl text-[10px] font-black uppercase">Sort: {sort}</button>
          <button onClick={handleExport} className="flex-1 bg-green-600 text-white p-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 shadow-md"><Download size={12}/> Export XLS</button>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm active:scale-95 transition-all">
            <div className="flex-1">
              <div className="font-black text-blue-600 text-lg flex items-center gap-2">
                {r.product_id}
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${r.status === 'in_stock' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {r.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-sm font-bold text-gray-800">{r.customer_name || 'Stock'}</div>
              <div className="text-[10px] text-gray-400 font-bold uppercase">{r.quality} • {r.gsm}GSM • {r.width_inches}"</div>
            </div>
            <div className="text-right">
              <div className="font-black text-xl text-gray-900">{r.net_weight} <span className="text-[10px]">kg</span></div>
              <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1 justify-end mt-1 uppercase">
                <Clock size={10} /> {r.dispatched_at ? new Date(r.dispatched_at).toLocaleDateString() : new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default HistoryView;