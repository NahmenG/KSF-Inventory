import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, ArrowDown, ArrowUp, Download, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

const StockView = React.memo(({ rolls, onPrint, onSelectRoll }) => {
  const [textSearch, setTextSearch] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const filtered = useMemo(() => {
    return rolls.filter(r => {
      if (r.status !== 'in_stock') return false;
      const matchText = !textSearch || `${r.product_id} ${r.customer_name} ${r.quality} ${r.color}`.toLowerCase().includes(textSearch.toLowerCase());
      const matchQual = !filterQuality || r.quality === filterQuality;
      const matchCol = !filterColor || r.color === filterColor;
      return matchText && matchQual && matchCol;
    }).sort((a, b) => sortOrder === 'newest' ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));
  }, [rolls, textSearch, filterQuality, filterColor, sortOrder]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-xl shadow-sm border space-y-3 sticky top-0 z-10">
        <div className="flex gap-2">
          <div className="flex-1 flex gap-2 border p-2 rounded-lg bg-gray-50 items-center">
            <Search className="text-gray-400" size={20} />
            <input className="w-full outline-none bg-transparent text-sm" placeholder="Search stock..." value={textSearch} onChange={e => setTextSearch(e.target.value)} />
          </div>
          <button onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')} className="p-2 border rounded-lg bg-white">{sortOrder === 'newest' ? <ArrowDown size={18}/> : <ArrowUp size={18}/>}</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className="border p-2 rounded-lg text-xs" value={filterQuality} onChange={e => setFilterQuality(e.target.value)}><option value="">All Qualities</option>{QUALITIES.map(q => <option key={q}>{q}</option>)}</select>
          <select className="border p-2 rounded-lg text-xs" value={filterColor} onChange={e => setFilterColor(e.target.value)}><option value="">All Colors</option>{COLORS.map(c => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="bg-gray-900 text-white p-2 rounded-lg flex justify-between text-xs font-bold uppercase tracking-widest">
            <span>Found: {filtered.length}</span>
            <span>Total: {filtered.reduce((s,r)=>s+(parseFloat(r.net_weight)||0),0).toFixed(1)}kg</span>
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-3 rounded-xl border flex justify-between items-center active:scale-95 transition-all shadow-sm">
            <div>
              <div className="font-bold text-blue-600">{r.product_id}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">{r.quality} • {r.color}</div>
              <div className="text-sm font-semibold">{r.customer_name}</div>
            </div>
            <div className="text-right">
              <div className="font-black text-lg">{r.net_weight} kg</div>
              <button onClick={(e) => { e.stopPropagation(); onPrint(r); }} className="text-blue-500 p-1"><Printer size={16}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default StockView;