import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Package, 
  AlertCircle, 
  Save, 
  Edit2, 
  X, 
  Plus, 
  Trash2, 
  ArrowDown, 
  ArrowUp, 
  Loader2, 
  History,
  TrendingDown,
  ChevronRight
} from 'lucide-react';

/**
 * MaterialsView Component
 * Manages factory raw materials with specific focus on high-volume 
 * inventory like Polypropylene. Supports inline deduction and 
 * automatic shortage alerts.
 */
const MaterialsView = React.memo(({ materials, onUpdate }) => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // CATEGORY DEFINITIONS FOR KSF FACTORY
  const categories = ['Polymers', 'Filler', 'Additives', 'Colour', 'Others'];

  // 1. DATA GROUPING LOGIC
  // Organizes materials by category for better scannability on the factory floor
  const grouped = useMemo(() => {
    const groups = {};
    categories.forEach(cat => {
      groups[cat] = materials.filter(m => m.category === cat);
    });
    return groups;
  }, [materials]);

  // 2. UPDATE HANDLER
  // Handles the logic for deducting or adding stock (e.g., 38,000 to 36,000)
  const handleUpdateStock = async (id) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const newValue = parseFloat(editValue);
      if (isNaN(newValue)) throw new Error("Please enter a valid numeric value");

      const { error: updateError } = await supabase
        .from('raw_materials')
        .update({ 
          stock_quantity: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Close edit mode and refresh parent data
      setEditingId(null);
      setEditValue('');
      onUpdate(); 
      
    } catch (err) {
      setError(err.message);
      console.error("Material update failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* SECTION 1: HEADER & OVERVIEW */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Package className="text-blue-600" /> Raw Materials
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
            Real-time Inventory & Polymer Levels
          </p>
        </div>
        <div className="flex gap-2">
          <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-2 border border-blue-100">
            <History size={14} /> Log
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold text-sm animate-bounce">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* SECTION 2: CATEGORY SECTIONS */}
      {categories.map(category => {
        const items = grouped[category];
        if (!items || items.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2 ml-2">
              <ChevronRight size={14} className="text-blue-500" />
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                {category}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(m => {
                const isLow = m.stock_quantity <= m.min_level;
                const isEditing = editingId === m.id;

                return (
                  <div 
                    key={m.id} 
                    className={`bg-white p-5 rounded-[2rem] border transition-all shadow-sm relative overflow-hidden ${
                      isLow ? 'border-red-200 bg-red-50/10' : 'border-gray-50'
                    }`}
                  >
                    {/* Background indicator for low stock */}
                    {isLow && <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-12 -mt-12" />}

                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        <div className="font-black text-gray-900 text-lg tracking-tight">{m.name}</div>
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <TrendingDown size={10} /> Threshold: {m.min_level.toLocaleString()} kg
                        </div>
                      </div>
                      {isLow && (
                        <div className="bg-red-500 text-white p-2 rounded-xl shadow-lg shadow-red-100 animate-pulse">
                          <AlertCircle size={16} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 relative z-10">
                      {isEditing ? (
                        <div className="flex-1 flex gap-2">
                          <input 
                            autoFocus
                            type="number" 
                            className="flex-1 bg-blue-50 border-2 border-blue-200 rounded-2xl px-4 py-2 font-black text-blue-700 outline-none shadow-inner text-xl"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            placeholder="New Stock"
                          />
                          <button 
                            disabled={loading}
                            onClick={() => handleUpdateStock(m.id)}
                            className="bg-green-600 text-white p-3 rounded-2xl shadow-lg shadow-green-100 active:scale-90 transition-all"
                          >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          </button>
                          <button 
                            onClick={() => {setEditingId(null); setEditValue('');}}
                            className="bg-gray-100 text-gray-400 p-3 rounded-2xl active:scale-90 transition-all"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase">On Hand</span>
                            <span className={`text-3xl font-black tracking-tighter ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                              {m.stock_quantity.toLocaleString()} <span className="text-xs font-normal opacity-30 text-gray-500">kg</span>
                            </span>
                          </div>
                          <button 
                            onClick={() => {
                              setEditingId(m.id);
                              setEditValue(m.stock_quantity);
                            }}
                            className="p-4 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-[1.5rem] transition-all border border-gray-100 active:scale-95"
                          >
                            <Edit2 size={20} />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Low Stock Warning Text */}
                    {isLow && (
                      <div className="mt-4 text-[9px] font-black text-red-500 uppercase flex items-center gap-1">
                        <AlertCircle size={10} /> Critical Shortage: Replenish Immediately
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* SECTION 3: EMPTY STATE */}
      {materials.length === 0 && (
        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
          <Package size={48} className="mx-auto text-gray-100 mb-4" />
          <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
            Database empty: No raw materials found
          </p>
        </div>
      )}
    </div>
  );
});

export default MaterialsView;