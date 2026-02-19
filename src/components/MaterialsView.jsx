import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Package, Edit2, Check, X, Loader2, AlertTriangle, 
  Trash2, Bell, Save, Layers, Droplets, Box, Zap, MoreHorizontal 
} from 'lucide-react';

const MaterialsView = React.memo(({ materials, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('Polymers');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editMinLevel, setEditMinLevel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const CATEGORIES = [
    { name: 'Polymers', icon: <Layers size={16} /> },
    { name: 'Filler', icon: <Box size={16} /> },
    { name: 'Colour', icon: <Droplets size={16} /> },
    { name: 'Additives', icon: <Zap size={16} /> },
    { name: 'Others', icon: <MoreHorizontal size={16} /> }
  ];

  // 1. SAVE LOGIC (Handles Stock Deduction & Alert Setting)
  const handleSave = async (id) => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const numValue = parseFloat(editValue);
      const minLevelValue = parseFloat(editMinLevel);
      
      if (isNaN(numValue) || isNaN(minLevelValue)) throw new Error("Invalid Numbers");

      const { error } = await supabase
        .from('raw_materials')
        .update({ 
          stock_quantity: numValue,
          min_level: minLevelValue,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      onUpdate(); 
    } catch (err) {
      alert("Update failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 2. DELETE LOGIC
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
    
    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      onUpdate();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const currentItems = useMemo(() => 
    materials.filter(m => m.category === activeTab), 
    [materials, activeTab]
  );

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* SECTION 1: CATEGORY TABS */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar gap-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.name}
            onClick={() => setActiveTab(cat.name)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === cat.name 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* SECTION 2: MATERIAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentItems.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <Package className="mx-auto text-gray-200 mb-2" size={40} />
            <p className="text-gray-400 font-bold text-sm">No items in {activeTab}</p>
          </div>
        ) : (
          currentItems.map(m => (
            <div key={m.id} className={`bg-white p-5 rounded-3xl shadow-sm border transition-all ${
              m.stock_quantity <= m.min_level ? 'border-red-200 bg-red-50/10' : 'border-gray-50'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-black text-gray-900 text-xl tracking-tight">{m.name}</div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase mt-1">
                    <Bell size={10} className={m.stock_quantity <= m.min_level ? 'text-red-500' : ''} />
                    Alert Level: {m.min_level.toLocaleString()} kg
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingId(m.id);
                      setEditValue(m.stock_quantity);
                      setEditMinLevel(m.min_level);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-xl transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(m.id, m.name)}
                    className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {editingId === m.id ? (
                <div className="space-y-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-blue-600 uppercase mb-1 block">Update Stock (kg)</label>
                      <input 
                        type="number" 
                        className="w-full bg-white border-2 border-blue-100 px-3 py-2 rounded-xl font-black text-blue-700 outline-none focus:border-blue-500 shadow-inner"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase mb-1 block">Set Alert (kg)</label>
                      <input 
                        type="number" 
                        className="w-full bg-white border-2 border-gray-100 px-3 py-2 rounded-xl font-black text-gray-700 outline-none focus:border-blue-500 shadow-inner"
                        value={editMinLevel}
                        onChange={e => setEditMinLevel(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleSave(m.id)}
                      disabled={isSaving}
                      className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="px-4 bg-white text-gray-400 py-2.5 rounded-xl font-black text-xs uppercase border border-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-0.5">Available Quantity</span>
                    <span className={`text-3xl font-black tracking-tighter ${m.stock_quantity <= m.min_level ? 'text-red-600' : 'text-gray-900'}`}>
                      {m.stock_quantity.toLocaleString()} <span className="text-sm font-normal opacity-30">kg</span>
                    </span>
                  </div>
                  {m.stock_quantity <= m.min_level && (
                    <div className="bg-red-50 text-red-500 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border border-red-100">
                      <AlertTriangle size={12} /> Low Stock
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
});

export default MaterialsView;