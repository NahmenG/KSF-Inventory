import React, { useState, useMemo } from 'react';
import { Search, Printer, Download, ArrowDown, ArrowUp, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';

const StockView = React.memo(({ rolls, onPrint, onSelectRoll }) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');

  const filtered = useMemo(() => {
    return rolls.filter(r => r.status === 'in_stock' && (!query || `${r.product_id} ${r.customer_name} ${r.quality}`.toLowerCase().includes(query.toLowerCase())))
    .sort((a,b) => sort === 'newest' ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));
  }, [rolls, query, sort]);

  const handleExport = () => {
    const data = filtered.map(r => ({ "ID": r.product_id, "Buyer": r.customer_name, "Quality": r.quality, "Color": r.color, "GSM": r.gsm, "Net Kg": r.net_weight, "Date": new Date(r.created_at).toLocaleString() }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, "KSF_Stock_Inventory.xlsx");
  };

  return (
    <div className="space-y-4 pb-20">
      {/* STICKY HEADER SECTION */}
      <div className="sticky top-0 z-30 bg-slate-50 pt-2 space-y-2">
        <div className="bg-white p-3 rounded-xl shadow-sm border flex gap-2">
          <div className="flex-1 flex gap-2 border p-2 rounded-lg bg-gray-50 items-center">
            <Search className="text-gray-400" size={18} />
            <input className="w-full outline-none text-sm bg-transparent font-semibold" placeholder="Search product..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <button onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')} className="p-2 border rounded-lg bg-white">{sort === 'newest' ? <ArrowDown size={20}/> : <ArrowUp size={20}/>}</button>
          <button onClick={handleExport} className="bg-green-100 text-green-700 px-4 rounded-lg font-bold text-xs flex items-center gap-1"><Download size={16}/> XLS</button>
        </div>

        {/* BIGGER SUMMATION BAR */}
        <div className="bg-gray-900 text-white p-4 rounded-xl flex justify-between items-center shadow-xl border border-gray-800">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Rolls</span>
            <span className="text-2xl font-black">{filtered.length}</span>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Weight</span>
            <span className="text-2xl font-black text-green-400">{filtered.reduce((s,r)=>s+(parseFloat(r.net_weight)||0),0).toFixed(1)} <span className="text-xs font-normal">kg</span></span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center active:scale-95 transition-all shadow-sm hover:border-blue-200">
            <div>
              <div className="font-bold text-blue-600 text-lg flex items-center gap-2">
                {r.product_id}
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                  <Clock size={10} /> {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-800">{r.customer_name || 'Stock'}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">{r.quality} • {r.color} • {r.gsm} GSM</div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="font-black text-xl text-gray-900">{r.net_weight} kg</div>
              <button onClick={(e) => { e.stopPropagation(); onPrint(r); }} className="text-blue-500 mt-2 p-1.5 hover:bg-blue-50 rounded-full"><Printer size={20}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default StockView;