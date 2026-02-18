import React, { useState, useMemo } from 'react';
import { Search, Plus, AlertCircle, Edit3, Trash2, X, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

const MAT_CATEGORIES = ['Polymers', 'Filler', 'Additives', 'Colour', 'Others'];

export default function MaterialsView({ materials, onUpdate }) {
  const [activeCat, setActiveCat] = useState('Polymers');
  const [textSearch, setTextSearch] = useState('');
  const [editingMat, setEditingMat] = useState(null);

  const filtered = useMemo(() => materials.filter(m => (activeCat === 'Others' ? (!m.category || m.category === 'Others') : m.category === activeCat) && (!textSearch || m.name.toLowerCase().includes(textSearch.toLowerCase()))), [materials, activeCat, textSearch]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(materials);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Materials_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleManualUpdate = (id, isAdd) => {
    const val = prompt(`Enter Kg to ${isAdd ? 'add' : 'remove'}:`);
    if (val && !isNaN(val)) onUpdate(id, val, isAdd);
  };

  return (
    <div className="pb-24 flex flex-col h-full px-1">
      <div className="bg-white p-3 mb-3 rounded-xl shadow-sm border flex items-center gap-2 border-gray-100">
        <Search size={18} className="text-gray-400" />
        <input className="w-full outline-none text-sm bg-transparent" placeholder="Search materials..." value={textSearch} onChange={e => setTextSearch(e.target.value)} />
        <button onClick={handleExport} className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-green-200 transition-colors"><Download size={14}/> XLS</button>
      </div>
      <div className="flex overflow-x-auto gap-2 pb-4 hide-scrollbar">
        {MAT_CATEGORIES.map(cat => (<button key={cat} onClick={() => setActiveCat(cat)} className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold transition-all border ${activeCat === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{cat}</button>))}
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {filtered.map(m => (
          <div key={m.id} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center transition-all ${m.stock_quantity < (m.min_level || 0) ? 'border-l-4 border-l-red-500' : 'border-gray-100 hover:border-blue-100'}`}>
            <div>
              <div className="font-bold text-lg text-gray-800 flex items-center gap-2">{m.name} {m.stock_quantity < (m.min_level || 0) && <AlertCircle size={16} className="text-red-500 animate-pulse"/>}</div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{m.category || 'Others'} • Alert Threshold: {m.min_level} kg</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-blue-600">{m.stock_quantity} <span className="text-xs font-normal text-gray-400">kg</span></span>
              <div className="flex flex-col gap-1">
                 <div className="flex gap-1">
                    <button onClick={() => handleManualUpdate(m.id, true)} className="bg-green-100 text-green-700 w-8 h-8 rounded-lg font-bold hover:bg-green-200 transition-colors">+</button>
                    <button onClick={() => handleManualUpdate(m.id, false)} className="bg-red-100 text-red-700 w-8 h-8 rounded-lg font-bold hover:bg-red-200 transition-colors">-</button>
                 </div>
                 <div className="flex justify-end gap-2 pr-1">
                    <button onClick={() => {const n = prompt("New Name:", m.name); const l = prompt("New Alert Level:", m.min_level); if(n && l) supabase.from('raw_materials').update({name: n, min_level: l}).eq('id', m.id).then(()=>onUpdate())}} className="text-gray-300 hover:text-blue-500"><Edit3 size={14}/></button>
                    <button onClick={() => {if(confirm("Delete?")) supabase.from('raw_materials').delete().eq('id', m.id).then(()=>onUpdate())}} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}