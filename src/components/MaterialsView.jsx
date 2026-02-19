import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Package, Edit2, X, Loader2, AlertTriangle, 
  Trash2, Bell, Save, Layers, Droplets, Box, Zap, 
  MoreHorizontal, Plus, Search, Download, Calculator
} from 'lucide-react';
import * as XLSX from 'xlsx';

const MaterialsView = React.memo(({ materials, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('Polymers');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // States for Editing/Adding
  const [editValue, setEditValue] = useState('');
  const [editMinLevel, setEditMinLevel] = useState('');
  const [newMaterial, setNewMaterial] = useState({ name: '', category: 'Polymers', stock_quantity: '', min_level: '' });

  const CATEGORIES = [
    { name: 'Polymers', icon: <Layers size={14} />, color: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-700' },
    { name: 'Filler', icon: <Box size={14} />, color: 'bg-green-600', light: 'bg-green-50', text: 'text-green-700' },
    { name: 'Colour', icon: <Droplets size={14} />, color: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700' },
    { name: 'Additives', icon: <Zap size={14} />, color: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-700' },
    { name: 'Others', icon: <MoreHorizontal size={14} />, color: 'bg-slate-600', light: 'bg-slate-50', text: 'text-slate-700' }
  ];

  // 1. SUMMATION LOGIC
  const categoryTotals = useMemo(() => {
    const totals = { Polymers: 0, Filler: 0, Colour: 0, Additives: 0, Others: 0 };
    materials.forEach(m => {
      if (totals[m.category] !== undefined) {
        totals[m.category] += (parseFloat(m.stock_quantity) || 0);
      }
    });
    return totals;
  }, [materials]);

  // 2. SEARCH & FILTER LOGIC
  const filteredItems = useMemo(() => {
    const search = searchQuery.toLowerCase();
    return materials.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(search);
      const matchesTab = m.category === activeTab;
      return matchesSearch && (searchQuery ? true : matchesTab);
    });
  }, [materials, activeTab, searchQuery]);

  // 3. EXCEL EXPORT
  const handleExport = () => {
    const data = materials.map(m => ({
      Material: m.name,
      Category: m.category,
      "Current Stock (kg)": m.stock_quantity,
      "Min Alert Level (kg)": m.min_level,
      Status: m.stock_quantity <= m.min_level ? "LOW STOCK" : "OK"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Material_Stock");
    XLSX.writeFile(wb, `KSF_Materials_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 4. ADD NEW MATERIAL
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
      
      {/* TABS */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar gap-1">
        {CATEGORIES.map(cat => (
          <button key={cat.name} onClick={() => {setActiveTab(cat.name); setSearchQuery('');}} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-tighter transition-all whitespace-nowrap ${activeTab === cat.name && !searchQuery ? `${cat.color} text-white shadow-md` : 'text-gray-400 hover:bg-gray-50'}`}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* SEARCH & DOWNLOAD BAR */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-10 pr-4 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Search all materials..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <button onClick={handleExport} className="bg-green-600 text-white p-3 rounded-xl shadow-lg shadow-green-100 active:scale-95 transition-all">
          <Download size={20} />
        </button>
      </div>

      {/* SUMMATION BAR */}
      <div className="bg-gray-900 rounded-2xl p-3 flex overflow-x-auto no-scrollbar gap-4 border border-gray-800 shadow-xl">
        {CATEGORIES.map(cat => (
          <div key={cat.name} className="flex flex-col min-w-max border-r border-gray-800 last:border-0 pr-4">
            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{cat.name}</span>
            <span className="text-sm font-black text-white">{categoryTotals[cat.name].toLocaleString()} <span className="text-[9px] opacity-40">kg</span></span>
          </div>
        ))}
      </div>

      {/* MATERIAL CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map(m => (
          <div key={m.id} className={`bg-white p-3 rounded-2xl border transition-all ${m.stock_quantity <= m.min_level ? 'border-red-200 bg-red-50/30' : 'border-gray-50 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="truncate"><div className="font-black text-gray-800 text-xs truncate uppercase">{m.name}</div></div>
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
                <div className={`text-lg font-black tracking-tighter ${m.stock_quantity <= m.min_level ? 'text-red-600' : 'text-gray-900'}`}>{m.stock_quantity.toLocaleString()} <span className="text-[9px] font-normal opacity-40">kg</span></div>
                {m.stock_quantity <= m.min_level && <AlertTriangle size={14} className="text-red-500" />}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button onClick={() => setShowAddPopup(true)} className="fixed bottom-24 right-6 bg-blue-600 text-white p-5 rounded-full shadow-2xl shadow-blue-300 active:scale-90 transition-all z-40 border-4 border-white">
        <Plus size={28} />
      </button>

      {/* ADD POPUP MODAL */}
      {showAddPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black mb-6 text-gray-800 flex items-center gap-2"><Package className="text-blue-600" /> Add Material</h3>
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <input required className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" placeholder="Material Name" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} />
              <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={newMaterial.category} onChange={e => setNewMaterial({...newMaterial, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" required className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" placeholder="Opening Stock" value={newMaterial.stock_quantity} onChange={e => setNewMaterial({...newMaterial, stock_quantity: e.target.value})} />
                <input type="number" required className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" placeholder="Alert Level" value={newMaterial.min_level} onChange={e => setNewMaterial({...newMaterial, min_level: e.target.value})} />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg"> {isSaving ? 'Saving...' : 'ADD ITEM'} </button>
                <button type="button" onClick={() => setShowAddPopup(false)} className="px-6 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold">CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

export default MaterialsView;