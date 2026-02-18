import React, { useState, useMemo } from 'react';
import { Search, AlertCircle, TrendingUp } from 'lucide-react';

// STABLE ORDER
const MAT_CATEGORIES = ['Polymers', 'Filler', 'Additives', 'Colour', 'Others'];

const MaterialsView = React.memo(({ materials, onUpdate }) => {
  const [activeCat, setActiveCat] = useState('Polymers');
  const [textSearch, setTextSearch] = useState('');

  const filtered = useMemo(() => {
    return materials.filter(m => {
      const matchesCat = activeCat === 'Others' ? (!m.category || m.category === 'Others') : m.category === activeCat;
      const matchesSearch = !textSearch || m.name.toLowerCase().includes(textSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [materials, activeCat, textSearch]);

  const handleManualUpdate = (id, isAdd) => {
    const val = prompt(`Enter Kg to ${isAdd ? 'add' : 'remove'}:`);
    if (val && !isNaN(val)) {
      onUpdate(id, val, isAdd);
    }
  };

  return (
    <div className="pb-24 flex flex-col h-full px-1">
      <div className="bg-white p-3 mb-3 rounded-xl shadow-sm flex items-center gap-2 border border-gray-100">
        <Search size={18} className="text-gray-400" />
        <input 
          className="w-full outline-none text-sm bg-transparent" 
          placeholder="Search materials..." 
          value={textSearch} 
          onChange={e => setTextSearch(e.target.value)} 
        />
      </div>

      <div className="flex overflow-x-auto gap-2 pb-4 hide-scrollbar">
        {MAT_CATEGORIES.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCat(cat)} 
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${activeCat === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md active:scale-95' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-10 italic">No inventory matching this category.</div>
        ) : (
          filtered.map(m => {
            const isLow = m.min_level > 0 && m.stock_quantity < m.min_level;
            return (
              <div key={m.id} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center transition-all ${isLow ? 'border-l-4 border-l-red-500' : 'border-gray-100'}`}>
                <div>
                  <div className="font-bold text-gray-800 flex items-center gap-2">
                    {m.name} {isLow && <AlertCircle size={16} className="text-red-500 animate-pulse" />}
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                    {m.category || 'Others'} {m.min_level > 0 && `• Alert < ${m.min_level} kg`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* SMALLER FONT FOR WEIGHT */}
                  <span className={`text-lg font-black ${isLow ? 'text-red-600' : 'text-blue-600'}`}>
                    {m.stock_quantity} kg
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => handleManualUpdate(m.id, true)} className="bg-green-100 text-green-700 w-8 h-8 rounded-lg font-bold hover:bg-green-200 transition-colors">+</button>
                    <button onClick={() => handleManualUpdate(m.id, false)} className="bg-red-100 text-red-700 w-8 h-8 rounded-lg font-bold hover:bg-red-200 transition-colors">-</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default MaterialsView;