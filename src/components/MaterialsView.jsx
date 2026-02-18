import React, { useState, useMemo } from 'react';
import { Search, Plus, AlertCircle, Edit3, Trash2, X, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

const MAT_CATEGORIES = ['Polymers', 'Filler', 'Additives', 'Colour', 'Others'];

export default function MaterialsView({ materials, onUpdate, onRefresh }) {
  const [activeCat, setActiveCat] = useState('Polymers');
  const [textSearch, setTextSearch] = useState('');

  const filtered = useMemo(() => materials.filter(m => (activeCat === 'Others' ? (!m.category || m.category === 'Others') : m.category === activeCat) && (!textSearch || m.name.toLowerCase().includes(textSearch.toLowerCase()))), [materials, activeCat, textSearch]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(materials);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "KSF_Materials_Backup.xlsx");
  };

  return (
    <div className="pb-24 flex flex-col h-full px-1">
      <div className="bg-white p-3 mb-3 rounded-xl shadow-sm border flex items-center gap-2">
        <Search size={18} className="text-gray-400" />
        <input className="w-full outline-none text-sm bg-transparent" placeholder="Search materials..." value={textSearch} onChange={e => setTextSearch(e.target.value)} />
        <button onClick={handleExport} className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Download size={14}/> XLS</button>
      </div>
      <div className="flex overflow-x-auto gap-2 pb-4 hide-scrollbar">
        {MAT_CATEGORIES.map(cat => (<button key={cat} onClick={() => setActiveCat(cat)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${activeCat === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}>{cat}</button>))}
      </div>
      <div className="space-y-3">
        {filtered.map(m => (
          <div key={m.id} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center ${m.stock_quantity < (m.min_level || 0) ? 'border-l-4 border-l-red-500' : 'border-gray-100'}`}>
            <div><div className="font-bold text-gray-800">{m.name}</div><div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{m.category || 'Others'}</div></div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-blue-600">{m.stock_quantity} kg</span>
              <div className="flex gap-1">
                <button onClick={() => onUpdate(m.id, prompt("Add:"), true)} className="bg-green-100 text-green-700 w-8 h-8 rounded-lg font-bold hover:bg-green-200 transition-colors">+</button>
                <button onClick={() => onUpdate(m.id, prompt("Remove:"), false)} className="bg-red-100 text-red-700 w-8 h-8 rounded-lg font-bold hover:bg-red-200 transition-colors">-</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}