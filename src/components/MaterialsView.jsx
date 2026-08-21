import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Package, Edit2, X, Loader2, AlertTriangle, 
  Trash2, Bell, Save, Layers, Droplets, Box, Zap, 
  MoreHorizontal, Plus, Search, Download, CheckCircle, ChevronDown, ClipboardList, Database
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- CUSTOM SEARCHABLE DROPDOWN COMPONENT ---
const MaterialDropdown = ({ category, materials, selectedId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  const filteredMaterials = materials.filter(m => 
    m.category === category && 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedItem = materials.find(m => m.id === selectedId);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-xs font-bold text-gray-700 flex justify-between items-center cursor-pointer hover:border-blue-300 transition-colors"
      >
        <span className="truncate pr-2 text-[10px] uppercase tracking-tighter">
          {selectedItem ? selectedItem.name : `Select ${category}`}
        </span>
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input 
                autoFocus
                placeholder="Search..." 
                className="w-full pl-7 pr-2 py-2 text-[11px] font-bold bg-white border rounded-lg outline-none focus:border-blue-500"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {filteredMaterials.length === 0 ? (
              <div className="p-3 text-center text-xs font-bold text-gray-400">No {category} found.</div>
            ) : (
              filteredMaterials.map(m => (
                <div 
                  key={m.id} 
                  onClick={() => { onSelect(m.id); setIsOpen(false); setSearch(''); }}
                  className="flex justify-between items-center p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                >
                  <span className="text-[10px] font-black text-gray-800 uppercase tracking-tighter truncate">{m.name}</span>
                  <span className="text-[9px] font-bold text-blue-600 whitespace-nowrap ml-2 bg-blue-50/50 px-1.5 py-0.5 rounded">{m.stock_quantity} kg</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MaterialsView = React.memo(({ materials, onUpdate }) => {
  // --- TOP LEVEL TAB STATE ---
  const [mainTab, setMainTab] = useState('inventory'); // 'inventory' or 'consumption'

  const [activeTab, setActiveTab] = useState('Polymers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [editItem, setEditItem] = useState(null); 
  const [isSaving, setIsSaving] = useState(false);

  // --- DYNAMIC DAILY CONSUMPTION STATE ---
  const [consumptionDate, setConsumptionDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [consumptionShift, setConsumptionShift] = useState('Day Shift');
  
  const getInitialEntries = () => ({
    Polymers: [{ uid: 'p1', materialId: '', qty: '' }],
    Filler: [{ uid: 'f1', materialId: '', qty: '' }],
    Colour: [{ uid: 'c1', materialId: '', qty: '' }],
    Additives: [{ uid: 'a1', materialId: '', qty: '' }],
    Others: [{ uid: 'o1', materialId: '', qty: '' }]
  });
  
  const [consumedItems, setConsumedItems] = useState(getInitialEntries());
  const [newMaterial, setNewMaterial] = useState({ name: '', category: 'Polymers', stock_quantity: '', min_level: '' });

  const CATEGORIES = [
    { name: 'Polymers', icon: <Layers size={14} />, text: 'text-blue-600', activeBg: 'bg-blue-600' },
    { name: 'Filler', icon: <Box size={14} />, text: 'text-green-600', activeBg: 'bg-green-600' },
    { name: 'Colour', icon: <Droplets size={14} />, text: 'text-amber-500', activeBg: 'bg-amber-500' },
    { name: 'Additives', icon: <Zap size={14} />, text: 'text-purple-600', activeBg: 'bg-purple-600' },
    { name: 'Others', icon: <MoreHorizontal size={14} />, text: 'text-slate-600', activeBg: 'bg-slate-600' }
  ];

  const categoryTotals = useMemo(() => {
    const totals = { Polymers: 0, Filler: 0, Colour: 0, Additives: 0, Others: 0 };
    materials.forEach(m => {
      if (totals[m.category] !== undefined) {
        totals[m.category] += (parseFloat(m.stock_quantity) || 0);
      }
    });
    return totals;
  }, [materials]);

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

  // MULTIPLE ITEM LOGIC
  const handleItemChange = (category, uid, field, value) => {
    setConsumedItems(prev => ({
      ...prev,
      [category]: prev[category].map(item => item.uid === uid ? { ...item, [field]: value } : item)
    }));
  };

  const addRow = (category) => {
    setConsumedItems(prev => ({
      ...prev,
      [category]: [...prev[category], { uid: Math.random().toString(), materialId: '', qty: '' }]
    }));
  };

  const removeRow = (category, uid) => {
    setConsumedItems(prev => ({
      ...prev,
      [category]: prev[category].filter(item => item.uid !== uid)
    }));
  };

  // --- AUTOMATED CONSUMPTION DEDUCTION LOGIC ---
  const handleLogConsumption = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updates = [];
      const loggedData = {};

      for (const cat of CATEGORIES) {
        for (const item of consumedItems[cat.name]) {
          const val = parseFloat(item.qty);
          if (item.materialId && val > 0) {
            const dbItem = materials.find(m => m.id === item.materialId);
            if (!dbItem) throw new Error(`Material not found in inventory.`);
            if (val > dbItem.stock_quantity) {
              throw new Error(`Insufficient stock for ${dbItem.name}. Tried to consume ${val}kg, but only ${dbItem.stock_quantity}kg available.`);
            }
            
            updates.push({ id: dbItem.id, stock_quantity: dbItem.stock_quantity - val });
            loggedData[dbItem.name] = (loggedData[dbItem.name] || 0) + val;
          }
        }
      }

      if (updates.length === 0) throw new Error("Please select and enter a weight for at least one material.");

      const updatePromises = updates.map(u => 
        supabase.from('raw_materials')
          .update({ stock_quantity: u.stock_quantity })
          .eq('id', u.id)
      );
      
      const updateResults = await Promise.all(updatePromises);
      updateResults.forEach(res => { if (res.error) throw res.error; });

      const { error: logError } = await supabase.from('consumption_logs').insert([{
        date: consumptionDate,
        shift: consumptionShift,
        consumed_data: loggedData
      }]);
      if (logError) throw logError;

      setConsumedItems(getInitialEntries());
      alert("Shift consumption successfully logged and stock deducted!");
      onUpdate();
      
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- DATABASE ACTIONS ---
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

  const handleUpdateMaterial = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('raw_materials').update({ 
        name: editItem.name,
        category: editItem.category,
        stock_quantity: parseFloat(editItem.stock_quantity),
        min_level: parseFloat(editItem.min_level)
      }).eq('id', editItem.id);
      if (error) throw error;
      setEditItem(null);
      onUpdate();
    } catch (err) { alert(err.message); }
    finally { setIsSaving(false); }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("Are you sure you want to delete this material? This action cannot be undone.")) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('raw_materials').delete().eq('id', id);
      if (error) throw error;
      setEditItem(null);
      onUpdate();
    } catch (err) { alert(err.message); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4 pb-32 animate-in fade-in duration-500 relative">
      
      {/* --- TOP MASTER TABS --- */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 shadow-inner">
        <button 
          onClick={() => setMainTab('inventory')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${mainTab === 'inventory' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}
        >
          <Database size={16} /> RM Inventory Log
        </button>
        <button 
          onClick={() => setMainTab('consumption')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${mainTab === 'consumption' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}
        >
          <ClipboardList size={16} /> Shift Consumption Log
        </button>
      </div>

      {/* --- TAB 1: SHIFT CONSUMPTION LOG --- */}
      {mainTab === 'consumption' && (
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <form onSubmit={handleLogConsumption} className="space-y-4">
            <div className="flex gap-2 mb-2">
              <input 
                type="date" required
                className="flex-1 bg-gray-50 border border-gray-100 p-3 rounded-xl font-bold text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 uppercase shadow-inner"
                value={consumptionDate} onChange={e => setConsumptionDate(e.target.value)}
              />
              <select 
                className="flex-1 bg-gray-50 border border-gray-100 p-3 rounded-xl font-bold text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-inner"
                value={consumptionShift} onChange={e => setConsumptionShift(e.target.value)}
              >
                <option value="Day Shift">Day Shift</option>
                <option value="Night Shift">Night Shift</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 bg-gray-50/50 p-3 rounded-2xl border border-gray-50">
              {CATEGORIES.map(cat => (
                <div key={cat.name} className="flex flex-col bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 min-h-[120px]">
                  <label className={`text-[10px] font-black uppercase flex items-center gap-1.5 mb-2 px-1 ${cat.text}`}>
                    {cat.icon} {cat.name}
                  </label>
                  
                  <div className="space-y-2 flex-1">
                    {consumedItems[cat.name].map((item) => (
                      <div key={item.uid} className="flex flex-col gap-1.5 bg-gray-50 p-2 rounded-lg relative group border border-gray-100">
                        {consumedItems[cat.name].length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeRow(cat.name, item.uid)}
                            className="absolute -top-1.5 -right-1.5 bg-red-100 text-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
                          >
                            <X size={10} />
                          </button>
                        )}
                        <MaterialDropdown 
                          category={cat.name} 
                          materials={materials} 
                          selectedId={item.materialId} 
                          onSelect={(id) => handleItemChange(cat.name, item.uid, 'materialId', id)} 
                        />
                        <input 
                          type="number" placeholder="Weight (kg)"
                          className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-xs font-bold outline-none focus:border-blue-400" 
                          value={item.qty} 
                          onChange={e => handleItemChange(cat.name, item.uid, 'qty', e.target.value)} 
                        />
                      </div>
                    ))}
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={() => addRow(cat.name)}
                    className="mt-2 w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-[9px] font-bold text-gray-500 uppercase flex items-center justify-center gap-1 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                  >
                    <Plus size={10} /> Add
                  </button>
                </div>
              ))}
            </div>
            
            <button type="submit" disabled={isSaving} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 flex items-center justify-center gap-2 active:scale-[0.99] transition-all">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Validate & Deduct Live Inventory</>}
            </button>
          </form>
        </div>
      )}

      {/* --- TAB 2: RM INVENTORY LOG --- */}
      {mainTab === 'inventory' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
          {/* CATEGORY TABS WITH TOTALS */}
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar gap-1">
            {CATEGORIES.map(cat => {
              const isActive = activeTab === cat.name && !searchQuery;
              return (
                <button key={cat.name} onClick={() => {setActiveTab(cat.name); setSearchQuery('');}} className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all min-w-[85px] ${isActive ? `${cat.activeBg} text-white shadow-lg` : 'bg-transparent'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={isActive ? 'text-white' : cat.text}>{cat.icon}</span>
                    <span className={`font-black text-[10px] uppercase tracking-tighter ${isActive ? 'text-white' : cat.text}`}>{cat.name}</span>
                  </div>
                  <span className={`text-[9px] font-bold ${isActive ? 'text-white/80' : 'text-gray-400'}`}>{categoryTotals[cat.name].toLocaleString()} <span className="text-[7px]">kg</span></span>
                </button>
              );
            })}
          </div>

          {/* SEARCH BAR & EXPORT */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-10 pr-4 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Search materials..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={handleExport} className="bg-green-600 text-white p-3 rounded-xl shadow-lg shadow-green-100 active:scale-95 transition-all"><Download size={20} /></button>
          </div>

          {/* COMPACT CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map(m => (
              <div key={m.id} className={`bg-white p-3 rounded-2xl border transition-all ${m.stock_quantity <= m.min_level ? 'border-red-200 bg-red-50/30' : 'border-gray-50 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="truncate"><div className="font-black text-gray-800 text-[11px] truncate uppercase tracking-tighter">{m.name}</div></div>
                  <button onClick={() => setEditItem({...m})} className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-blue-600"><Edit2 size={12} /></button>
                </div>
                <div className="flex items-center justify-between">
                  <div className={`text-lg font-black tracking-tighter ${m.stock_quantity <= m.min_level ? 'text-red-600' : 'text-gray-900'}`}>{parseFloat(m.stock_quantity).toLocaleString()} <span className="text-[9px] font-normal opacity-40">kg</span></div>
                  {m.stock_quantity <= m.min_level && <AlertTriangle size={14} className="text-red-500" />}
                </div>
              </div>
            ))}
          </div>

          {/* FLOATING ADD BUTTON */}
          <button onClick={() => setShowAddPopup(true)} className="fixed bottom-24 right-6 bg-blue-600 text-white p-5 rounded-full shadow-2xl shadow-blue-300 active:scale-90 transition-all z-40 border-4 border-white"><Plus size={28} /></button>
        </div>
      )}

      {/* POPUP: ADD NEW */}
      {showAddPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black mb-6 text-gray-800 flex items-center gap-2"><Plus className="text-blue-600" /> New Material</h3>
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
                <button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">ADD ITEM</button>
                <button type="button" onClick={() => setShowAddPopup(false)} className="px-6 bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold uppercase text-[10px]">CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: EDIT / DELETE */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><Edit2 className="text-blue-600" size={20} /> Edit Material</h3>
              <button onClick={() => handleDeleteMaterial(editItem.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"><Trash2 size={20} /></button>
            </div>
            <form onSubmit={handleUpdateMaterial} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Material Name</label>
                <input required className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Category</label>
                <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={editItem.category} onChange={e => setEditItem({...editItem, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Stock (kg)</label>
                  <input type="number" required className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={editItem.stock_quantity} onChange={e => setEditItem({...editItem, stock_quantity: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Alert (kg)</label>
                  <input type="number" required className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={editItem.min_level} onChange={e => setEditItem({...editItem, min_level: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg uppercase text-xs">Update Item</button>
                <button type="button" onClick={() => setEditItem(null)} className="px-6 bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold uppercase text-[10px]">Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

export default MaterialsView;