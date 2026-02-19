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

  // 1. COLOR CONFIGURATION PER TAB
  const CATEGORIES = [
    { name: 'Polymers', icon: <Layers size={14} />, color: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    { name: 'Filler', icon: <Box size={14} />, color: 'bg-green-600', light: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
    { name: 'Colour', icon: <Droplets size={14} />, color: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    { name: 'Additives', icon: <Zap size={14} />, color: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
    { name: 'Others', icon: <MoreHorizontal size={14} />, color: 'bg-slate-600', light: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100' }
  ];

  const activeConfig = useMemo(() => 
    CATEGORIES.find(c => c.name === activeTab), 
    [activeTab]
  );

  // 2. SAVE LOGIC
  const handleSave = async (id) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const numValue = parseFloat(editValue);
      const minLevelValue = parseFloat(editMinLevel);
      if (isNaN(numValue) || isNaN(minLevelValue)) throw new Error("Invalid Input");

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
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const currentItems = useMemo(() => 
    materials.filter(m => m.category === activeTab), 
    [materials, activeTab]
  );

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-500">
      
      {/* SECTION 1: COLOR-CODED TABS */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar gap-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.name}
            onClick={() => setActiveTab(cat.name)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-tighter transition-all whitespace-nowrap ${
              activeTab === cat.name 
                ? `${cat.color} text-white shadow-md` 
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* SECTION 2: COMPACT MATERIAL CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {currentItems.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border-2 border-dashed border-gray-100 text-gray-400 font-bold text-xs">
            No items in {activeTab}
          </div>
        ) : (
          currentItems.map(m => {
            const isLow = m.stock_quantity <= m.min_level;
            const isEditing = editingId === m.id;

            return (
              <div key={m.id} className={`bg-white p-3 rounded-2xl border transition-all ${
                isLow ? 'border-red-200 bg-red-50/30' : 'border-gray-50 shadow-sm'
              }`}>
                {/* Compact Header */}
                <div className="flex justify-between items-start mb-2">
                  <div className="truncate pr-2">
                    <div className="font-black text-gray-800 text-xs truncate uppercase tracking-tighter">{m.name}</div>
                    <div className="text-[8px] font-bold text-gray-400 flex items-center gap-0.5">
                      <Bell size={8} className={isLow ? 'text-red-500' : ''} /> {m.min_level}kg
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingId(m.id);
                      setEditValue(m.stock_quantity);
                      setEditMinLevel(m.min_level);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${activeConfig.light} ${activeConfig.text}`}
                  >
                    <Edit2 size={12} />
                  </button>
                </div>

                {/* Edit Form */}
                {isEditing ? (
                  <div className="space-y-2 mt-1 animate-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-1 gap-1.5">
                      <input 
                        type="number" 
                        className="w-full bg-white border border-gray-200 px-2 py-1 rounded-lg font-black text-xs outline-none focus:border-blue-500"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        placeholder="Stock"
                      />
                      <input 
                        type="number" 
                        className="w-full bg-white border border-gray-200 px-2 py-1 rounded-lg font-black text-xs outline-none focus:border-blue-500"
                        value={editMinLevel}
                        onChange={e => setEditMinLevel(e.target.value)}
                        placeholder="Alert"
                      />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleSave(m.id)} className="flex-1 bg-blue-600 text-white py-1 rounded-lg font-black text-[9px] flex items-center justify-center">
                        {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-100 text-gray-400 py-1 rounded-lg font-black text-[9px]">
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className={`text-lg font-black tracking-tighter ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                      {parseFloat(m.stock_quantity).toLocaleString()} 
                      <span className="text-[9px] font-normal opacity-40 ml-0.5">kg</span>
                    </div>
                    {isLow && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
});

export default MaterialsView;