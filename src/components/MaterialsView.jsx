import React, { useState, useMemo } from 'react';
import { Search, Plus, AlertCircle, Edit3, Trash2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

const MAT_CATEGORIES = ['Polymers', 'Filler', 'Additives', 'Colour', 'Others'];

// Internal Modal for Adding New Material
const AddMaterialModal = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Polymers');
  const [minLevel, setMinLevel] = useState('');
  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-2xl">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Add Material</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <input className="w-full border p-3 rounded mb-4 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Material Name" value={name} onChange={e => setName(e.target.value)} />
        <select className="w-full border p-3 rounded mb-4 outline-none focus:ring-2 focus:ring-blue-500" value={category} onChange={e => setCategory(e.target.value)}>
          {MAT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="w-full border p-3 rounded mb-6 outline-none focus:ring-2 focus:ring-blue-500" type="number" placeholder="Alert Level (kg)" value={minLevel} onChange={e => setMinLevel(e.target.value)} />
        <button onClick={() => onSave(name, category, minLevel)} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold shadow-lg">Add to Inventory</button>
      </div>
    </div>
  );
};

// Internal Modal for Editing Existing Material
const EditMaterialDetailsModal = ({ material, onSave, onClose }) => {
  const [name, setName] = useState(material.name);
  const [category, setCategory] = useState(material.category);
  const [minLevel, setMinLevel] = useState(material.min_level || '');
  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-2xl">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Details</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <label className="text-[10px] font-bold text-gray-400 uppercase">Material Name</label>
        <input className="w-full border p-3 rounded mb-4 outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)} />
        <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
        <select className="w-full border p-3 rounded mb-4 outline-none focus:ring-2 focus:ring-blue-500" value={category} onChange={e => setCategory(e.target.value)}>
          {MAT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <label className="text-[10px] font-bold text-gray-400 uppercase">Alert Level (kg)</label>
        <input className="w-full border p-3 rounded mb-6 outline-none focus:ring-2 focus:ring-blue-500" type="number" value={minLevel} onChange={e => setMinLevel(e.target.value)} />
        <button onClick={() => onSave({ ...material, name, category, min_level: minLevel })} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold shadow-lg">Save Changes</button>
      </div>
    </div>
  );
};

const MaterialsView = React.memo(({ materials, onUpdate }) => {
  const [activeCat, setActiveCat] = useState('Polymers');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [textSearch, setTextSearch] = useState('');

  const filtered = useMemo(() => materials.filter(m => {
    const matchesCat = activeCat === 'Others' ? (!m.category || m.category === 'Others') : m.category === activeCat;
    const matchesSearch = !textSearch || m.name.toLowerCase().includes(textSearch.toLowerCase());
    return matchesCat && matchesSearch;
  }), [materials, activeCat, textSearch]);

  const handleManualUpdate = (id, isAdd) => {
    const val = prompt(`Enter Kg to ${isAdd ? 'add' : 'remove'}:`);
    if (val && !isNaN(val)) onUpdate(id, val, isAdd);
  };

  const handleAddMaterial = async (name, category, minLevel) => {
    const { error } = await supabase.from('raw_materials').insert([{ name, category, min_level: minLevel, stock_quantity: 0 }]);
    if (!error) { setAddModalOpen(false); onUpdate(); }
  };

  const handleEditMaterial = async (updates) => {
    const { error } = await supabase.from('raw_materials').update(updates).eq('id', updates.id);
    if (!error) { setEditingMaterial(null); onUpdate(); }
  };

  const handleDeleteMaterial = async (id) => {
    if (confirm("Delete this material permanently?")) {
      const { error } = await supabase.from('raw_materials').delete().eq('id', id);
      if (!error) onUpdate();
    }
  };

  return (
    <div className="pb-24 flex flex-col h-full px-1">
      <div className="bg-white p-2 mb-2 rounded-xl shadow-sm border flex items-center gap-2">
        <Search size={18} className="text-gray-400" />
        <input className="w-full outline-none text-sm" placeholder="Search inventory..." value={textSearch} onChange={e => setTextSearch(e.target.value)} />
      </div>

      <div className="flex overflow-x-auto gap-2 pb-4 hide-scrollbar">
        {MAT_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${activeCat === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md active:scale-95' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(m => {
          const isLow = m.stock_quantity < (m.min_level || 0);
          return (
            <div key={m.id} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center transition-all ${isLow ? 'border-l-4 border-l-red-500' : 'border-gray-100'}`}>
              <div>
                <div className="font-bold text-gray-800 flex items-center gap-2">
                  {m.name} {isLow && <AlertCircle size={16} className="text-red-500 animate-pulse" />}
                </div>
                <div className="text-[10px] text-gray-400 font-bold uppercase">Stock Level</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-blue-600">{m.stock_quantity} kg</span>
                <div className="flex flex-col gap-1 items-end">
                  <div className="flex gap-1">
                    <button onClick={() => handleManualUpdate(m.id, true)} className="bg-green-100 text-green-700 w-8 h-8 rounded-lg font-bold hover:bg-green-200 transition-colors">+</button>
                    <button onClick={() => handleManualUpdate(m.id, false)} className="bg-red-100 text-red-700 w-8 h-8 rounded-lg font-bold hover:bg-red-200 transition-colors">-</button>
                  </div>
                  <div className="flex gap-3 mt-1 px-1">
                    <button onClick={() => setEditingMaterial(m)} className="text-gray-300 hover:text-blue-500 transition-colors"><Edit3 size={14} /></button>
                    <button onClick={() => handleDeleteMaterial(m.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-24 right-6">
        <button onClick={() => setAddModalOpen(true)} className="bg-blue-600 text-white p-4 rounded-full shadow-xl active:scale-95 transition-all hover:bg-blue-700"><Plus size={24} /></button>
      </div>

      {isAddModalOpen && <AddMaterialModal onSave={handleAddMaterial} onClose={() => setAddModalOpen(false)} />}
      {editingMaterial && <EditMaterialDetailsModal material={editingMaterial} onSave={handleEditMaterial} onClose={() => setEditingMaterial(null)} />}
    </div>
  );
});

export default MaterialsView;