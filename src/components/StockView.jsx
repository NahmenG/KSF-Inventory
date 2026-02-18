import React, { useState, useMemo } from 'react';
import { Search, Printer, Download, ArrowDown, ArrowUp } from 'lucide-react';
import * as XLSX from 'xlsx';

const formatCurrency = (val) => new Intl.NumberFormat('en-IN').format(val);

const StockView = React.memo(({ rolls, onPrint, onSelectRoll }) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');

  const filtered = useMemo(() => {
    return rolls.filter(r => r.status === 'in_stock' && (!query || `${r.product_id} ${r.customer_name}`.toLowerCase().includes(query.toLowerCase())))
    .sort((a,b) => sort === 'newest' ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));
  }, [rolls, query, sort]);

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-white p-3 rounded-xl shadow-sm border sticky top-0 z-10 space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 flex gap-2 border p-2 rounded-lg bg-gray-50 items-center">
            <Search className="text-gray-400" size={18} />
            <input className="w-full outline-none text-sm bg-transparent" placeholder="Search product..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <button onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')} className="p-2 border rounded-lg">{sort === 'newest' ? <ArrowDown size={18}/> : <ArrowUp size={18}/>}</button>
          <button onClick={() => {
            const ws = XLSX.utils.json_to_sheet(filtered);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Stock");
            XLSX.writeFile(wb, "KSF_Stock_Export.xlsx");
          }} className="bg-green-100 text-green-700 px-3 rounded-lg font-bold text-xs flex items-center gap-1"><Download size={14}/> XLS</button>
        </div>
        <div className="bg-gray-900 text-white p-2 rounded-lg flex justify-between text-xs font-bold px-4">
          <span>Found: {filtered.length}</span>
          <span>Total Weight: {filtered.reduce((s,r)=>s+(parseFloat(r.net_weight)||0),0).toFixed(1)} kg</span>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center active:scale-95 transition-all shadow-sm">
            <div>
              <div className="font-bold text-blue-600">{r.product_id}</div>
              <div className="text-sm font-semibold text-gray-800">{r.customer_name}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">{r.quality} • {r.color}</div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="font-black text-lg">{r.net_weight} kg</div>
              <button onClick={(e) => { e.stopPropagation(); onPrint(r); }} className="text-blue-500 mt-1"><Printer size={18}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default StockView;