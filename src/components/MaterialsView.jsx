import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Package, AlertCircle, Save, Edit2, X, Plus, Trash2, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';

const MaterialsView = ({ materials, onUpdate }) => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Grouping logic for the factory layout
  const grouped = useMemo(() => {
    const groups = {};
    materials.forEach(m => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, [materials]);

  // UPDATE HANDLER
  const handleUpdateStock = async (id, currentStock) => {
    setLoading(true);
    setError(null);
    try {
      const newValue = parseFloat(editValue);
      if (isNaN(newValue)) throw new Error("Please enter a valid number");

      const { error: updateError } = await supabase
        .from('raw_materials')
        .update({ 
          stock_quantity: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setEditingId(null);
      setEditValue('');
      onUpdate(); // Trigger parent refresh to update the UI
    } catch (err) {
      setError(err.message);
      console.error("Update failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Package className="text-blue-600" /> Inventory Management
          </h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Raw Material & Polymer Stock</p>
        </div>
        <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
          <Package size={24} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold text-sm">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* CATEGORY LISTING */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">
            {category}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map(m => {
              const isLow = m.stock_quantity <= m.min_level;
              const isEditing = editingId === m.id;

              return (
                <div 
                  key={m.id} 
                  className={`bg-white p-5 rounded-3xl border transition-all shadow-sm ${
                    isLow ? 'border-red-100 bg-red-50/20' : 'border-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-black text-gray-900 text-lg tracking-tight">{m.name}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Min Level: {m.min_level} kg</div>
                    </div>
                    {isLow && (
                      <div className="bg-red-100 text-red-600 p-1.5 rounded-full animate-pulse">
                        <AlertCircle size={14} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    {isEditing ? (
                      <div className="flex-1 flex gap-2">
                        <input 
                          autoFocus
                          type="number" 
                          className="flex-1 bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-2 font-black text-blue-700 outline-none shadow-inner"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          placeholder="Enter weight..."
                        />
                        <button 
                          disabled={loading}
                          onClick={() => handleUpdateStock(m.id, m.stock_quantity)}
                          className="bg-green-600 text-white p-3 rounded-xl shadow-lg shadow-green-100 active:scale-90 transition-all"
                        >
                          {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        </button>
                        <button 
                          onClick={() => {setEditingId(null); setEditValue('');}}
                          className="bg-gray-100 text-gray-500 p-3 rounded-xl active:scale-90 transition-all"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Available Stock</span>
                          <span className={`text-3xl font-black ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                            {m.stock_quantity.toLocaleString()} <span className="text-sm font-normal opacity-40">kg</span>
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            setEditingId(m.id);
                            setEditValue(m.stock_quantity);
                          }}
                          className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-gray-100"
                        >
                          <Edit2 size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {materials.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
          <p className="text-gray-400 font-bold">No materials configured in database.</p>
        </div>
      )}
    </div>
  );
};

export default MaterialsView;