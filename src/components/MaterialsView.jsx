import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Package, Edit2, X, Loader2, AlertTriangle, 
  Trash2, Bell, Save, Layers, Droplets, Box, Zap, 
  MoreHorizontal, Plus, Search, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

const MaterialsView = React.memo(({ materials, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('Polymers');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editValue, setEditValue] = useState('');
  const [editMinLevel, setEditMinLevel] = useState('');
  const [newMaterial, setNewMaterial] = useState({ name: '', category: 'Polymers', stock_quantity: '', min_level: '' });

  // 1. UPDATED CATEGORY CONFIG (With specific text colors)
  const CATEGORIES = [
    { name: 'Polymers', icon: <Layers size={14} />, text: 'text-blue-600', activeBg: 'bg-blue-600' },
    { name: 'Filler', icon: <Box size={14} />, text: 'text-green-600', activeBg: 'bg-green-600' },
    { name: 'Colour', icon: <Droplets size={14} />, text: 'text-amber-500', activeBg: 'bg-amber-500' },
    { name: 'Additives', icon: <Zap size={14} />, text: 'text-purple-600', activeBg: 'bg-purple-600' },
    { name: 'Others', icon: <MoreHorizontal size={14} />, text: 'text-slate-600', activeBg: 'bg-slate-600' }
  ];

  // 2. CATEGORY TOTALS CALCULATION
  const categoryTotals = useMemo(() => {
    const totals = { Polymers: 0, Filler: 0, Colour: 0, Additives: 0, Others: 0 };
    materials.forEach(m => {
      if (totals[m.category] !== undefined) {
        totals[m.category] += (parseFloat(m.stock_quantity) || 0);
      }
    });
    return totals;
  }, [materials]);

  // 3. SEARCH & FILTER LOGIC
  const filteredItems = useMemo(() => {
    const search = searchQuery.toLowerCase();
    return materials.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(search);
      const matchesTab = m.category === activeTab;
      return matchesSearch && (searchQuery ? true : matchesTab);
    });
  }, [materials, activeTab, searchQuery]);

  const handleExport = () => {
    const data = materials.map(m => ({
      Material: m.name,
      Category: m.category,
      "Stock (kg)": m.stock_quantity,
      "Alert Level (kg)": m.min_level
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `KSF_Materials_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('raw_materials').insert([{
        ...newMaterial,
        stock_quantity: parseFloat(newMaterial.stock_quantity),
        min_level: parseFloat(newMaterial.min_level)
      }]);
      if (error) throw error;
      setShowAddPopup(false);
      setNewMaterial({ name: '', category: 'Polymers', stock_quantity: '', min_level: '' });
      onUpdate();
    } catch (err) { alert(err.message); }
    finally { setIsSaving(false); }
  };

  const handleUpdateStock = async (id) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('raw_materials').update({ 
        stock_quantity: parseFloat(editValue),
        min_level: parseFloat(editMinLevel)
      }).eq('id', id);
      if (error) throw error;
      setEditingId(null);
      onUpdate();
    } catch (err) { alert(err.message); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4 pb-32 animate-in fade-in duration-500 relative">
      
      {/* SECTION 1: TABS WITH INTEGRATED TOTALS */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar gap-1">
        {CATEGORIES.map(cat => {
          const isActive = activeTab === cat.name && !searchQuery;
          return (
            <button 
              key={cat.name} 
              onClick={() => {setActiveTab(cat.name); setSearchQuery('');}} 
              className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all min-w-[85px] ${
                isActive ? `${cat.activeBg} text-white shadow-lg` : 'bg-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={isActive ? 'text-white' : cat.text}>{cat.icon}</span>
                <span className={`font-black text-[10px] uppercase tracking-tighter ${isActive ? 'text-white' : cat.text}`}>
                  {cat.name}
                </span>
              </div>
              <span className={`text-[9px] font-bold ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                {categoryTotals[cat.name].toLocaleString()} <span className="text-[7px]">kg</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* SECTION 2: SEARCH & EXCEL */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-10 pr-4 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Search all categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <button onClick={handleExport} className="bg-green-600 text-white p-3 rounded-xl shadow-lg shadow-green-100 active:scale-95 transition-all">
          <Download size={20} />
        </button>
      </div>

      {/* SECTION 3: MATERIAL CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map(m => (
          <div key={m.id} className={`bg-white p-3 rounded-2xl border transition-all ${m.stock_quantity <= m.min_level ? 'border-red-200 bg-red-50/30' : 'border-gray-50 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="truncate"><div className="font-black text-gray-800 text-[11px] truncate uppercase tracking-tighter">{m.name}</div></div>
              <button onClick={() => { setEditingId(m.id); setEditValue(m.stock_quantity); setEditMinLevel(m.min_level); }} className="p-1.5 rounded-lg bg-gray-50 text-gray-400"><Edit2 size={12} /></button>
            </div>
            {editingId === m.id ? (
              <div className="space-y-1 mt-1">
                <input type="number" className="w-full border border-gray-200 px-2 py-1 rounded-lg text-xs font-black" value={editValue} onChange={e => setEditValue(e.target.value)} />
                <input type="number" className="w-full border border-gray-200 px-2 py-1 rounded-lg text-xs font-black" value={editMinLevel} onChange={e => setEditMinLevel(e.target.value)} />
                <button onClick={() => handleUpdateStock(m.id)} className="w-full bg-blue-600 text-white py-1 rounded-lg font-black text-[9px]">{isSaving ? '...' : 'SAVE'}</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className={`text-lg font-black tracking-tighter ${m.stock_quantity <= m.min_level ? 'text-red-600' : 'text-gray-900'}`}>{parseFloat(m.stock_quantity).toLocaleString()} <span className="text-[9px] font-normal opacity-40">kg</span></div>
                {m.stock_quantity <= m.min_level && <AlertTriangle size={14} className="text-red-500" />}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FLOATING ADD BUTTON */}
      <button onClick={() => setShowAddPopup(true)} className="fixed bottom-24 right-6 bg-blue-600 text-white p-5 rounded-full shadow-2xl shadow-blue-300 active:scale-90 transition-all z-40 border-4 border-white">
        <Plus size={28} />
      </button>

      {/* ADD POPUP */}
      {showAddPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black mb-6 text-gray-800 flex items-center gap-2"><Package className="text-blue-600" /> New Material</h3>
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <input required className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" placeholder="Material Name" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} />
              <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={newMaterial.category} onChange={e => setNewMaterial({...newMaterial, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" required className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" placeholder="Stock" value={newMaterial.stock_quantity} onChange={e => setNewMaterial({...newMaterial, stock_quantity: e.target.value})} />
                <input type="number" required className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" placeholder="Alert" value={newMaterial.min_level} onChange={e => setNewMaterial({...newMaterial, min_level: e.target.value})} />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg"> ADD ITEM </button>
                <button type="button" onClick={() => setShowAddPopup(false)} className="px-6 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold uppercase text-xs">CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

export default MaterialsView;