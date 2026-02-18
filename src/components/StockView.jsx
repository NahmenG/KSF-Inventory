import React, { useState, useMemo } from 'react';
import { Search, Printer, Download, ArrowDown, ArrowUp } from 'lucide-react';
import * as XLSX from 'xlsx';

const formatCurrency = (val) => new Intl.NumberFormat('en-IN').format(val);

const StockView = React.memo(({ rolls, onPrint, onSelectRoll }) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');

  const filtered = useMemo(() => {
    return rolls.filter(r => r.status === 'in_stock' && (!query || `${r.product_id} ${r.customer_name} ${r.quality}`.toLowerCase().includes(query.toLowerCase())))
    .sort((a,b) => sort === 'newest' ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));
  }, [rolls, query, sort]);

  const handleExport = () => {
    const exportData = filtered.map(r => ({
      "Roll ID": r.product_id, "Customer": r.customer_name, "Quality": r.quality, "Color": r.color, "GSM": r.gsm, "Width": r.width_inches, "Net Weight": r.net_weight, "Gross Weight": r.gross_weight, "Created": new Date(r.created_at).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `KSF_Stock_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-white p-3 rounded-xl shadow-sm border sticky top-0 z-10 space-y-2 border-gray-100">
        <div className="flex gap-2">
          <div className="flex-1 flex gap-2 border p-2 rounded-lg bg-gray-50 items-center focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="text-gray-400" size={18} />
            <input className="w-full outline-none bg-transparent text-sm" placeholder="Search rolls..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <button onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')} className="p-2 border rounded-lg bg-white active:bg-gray-50">{sort === 'newest' ? <ArrowDown size={20}/> : <ArrowUp size={20}/>}</button>
          <button onClick={handleExport} className="bg-green-100 text-green-700 px-3 rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-green-200 transition-colors shadow-sm"><Download size={16}/> XLS</button>
        </div>
        <div className="bg-gray-900 text-white p-2 rounded-lg flex justify-between text-[10px] font-bold px-4 uppercase tracking-widest shadow-inner">
          <span>Found {filtered.length} Rolls</span>
          <span>Weight: {filtered.reduce((s,r)=>s+(parseFloat(r.net_weight)||0),0).toFixed(1)} kg</span>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center active:scale-95 transition-all shadow-sm hover:border-blue-200 cursor-pointer">
            <div>
              <div className="font-bold text-blue-600 text-lg">{r.product_id}</div>
              <div className="text-sm font-semibold text-gray-800">{r.customer_name || 'Stock Roll'}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">{r.quality} • {r.color} • {r.gsm} GSM</div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="font-black text-xl text-gray-900">{r.net_weight} kg</div>
              <button onClick={(e) => { e.stopPropagation(); onPrint(r); }} className="text-blue-500 mt-2 p-2 hover:bg-blue-50 rounded-full"><Printer size={20}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default StockView;