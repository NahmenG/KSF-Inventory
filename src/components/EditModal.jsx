import React, { useState } from 'react';
import { X, Save, Package, User, Hash, Ruler, Scale } from 'lucide-react';
import { supabase } from '../supabaseClient';

const EditModal = ({ roll, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...roll });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('rolls')
        .update({
          customer_name: formData.customer_name,
          quality: formData.quality,
          gsm: parseFloat(formData.gsm),
          color: formData.color,
          width_inches: parseFloat(formData.width_inches),
          net_weight: parseFloat(formData.net_weight),
          gross_weight: parseFloat(formData.gross_weight),
          length_meters: parseFloat(formData.length_meters),
          updated_at: new Date().toISOString()
        })
        .eq('id', roll.id);

      if (error) throw error;
      onSave();
    } catch (err) {
      alert("Error updating roll: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Package className="text-blue-600" size={20} /> Edit Roll Data
            </h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
              ID: {roll.product_id}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-red-500">
            <X size={24} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 flex items-center gap-1">
              <User size={10} /> Buyer Name
            </label>
            <input 
              className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              value={formData.customer_name || ''}
              onChange={e => setFormData({...formData, customer_name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Quality</label>
              <input 
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-gray-800 outline-none"
                value={formData.quality || ''}
                onChange={e => setFormData({...formData, quality: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Color</label>
              <input 
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-gray-800 outline-none"
                value={formData.color || ''}
                onChange={e => setFormData({...formData, color: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2 flex items-center gap-1">
                <Hash size={10} /> GSM
              </label>
              <input 
                type="number"
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-gray-800 outline-none"
                value={formData.gsm || ''}
                onChange={e => setFormData({...formData, gsm: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2 flex items-center gap-1">
                <Ruler size={10} /> Size
              </label>
              <input 
                type="number"
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-gray-800 outline-none"
                value={formData.width_inches || ''}
                onChange={e => setFormData({...formData, width_inches: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Length</label>
              <input 
                type="number"
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-gray-800 outline-none"
                value={formData.length_meters || ''}
                onChange={e => setFormData({...formData, length_meters: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2 flex items-center gap-1">
                <Scale size={10} /> Gross (kg)
              </label>
              <input 
                type="number"
                step="0.01"
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-gray-800 outline-none"
                value={formData.gross_weight || ''}
                onChange={e => setFormData({...formData, gross_weight: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-600 uppercase ml-2 flex items-center gap-1">
                <Scale size={10} /> Net (kg)
              </label>
              <input 
                type="number"
                step="0.01"
                className="w-full bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl font-black text-blue-900 outline-none"
                value={formData.net_weight || ''}
                onChange={e => setFormData({...formData, net_weight: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6 pb-2">
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? "Saving..." : <><Save size={20} /> Update Roll</>}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="px-8 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;