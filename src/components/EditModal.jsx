import React, { useState } from 'react';
import { X, Save, Trash2, Scale, Ruler, Hash, Layers } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function EditModal({ roll, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...roll });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('rolls')
        .update({
          customer_name: formData.customer_name,
          quality: formData.quality,
          gsm: formData.gsm,
          width_inches: formData.width_inches,
          net_weight: formData.net_weight,
          length_meters: formData.length_meters, // Updated to include length
          color: formData.color
        })
        .eq('id', roll.id);

      if (error) throw error;
      onSave();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this roll?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('rolls').delete().eq('id', roll.id);
      if (error) throw error;
      onSave();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Edit Roll</h2>
            <p className="text-[10px] font-black text-blue-600 mt-1 uppercase tracking-widest">{roll.product_id}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><X size={24}/></button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Buyer */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Buyer Name</label>
            <input 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.customer_name || ''} 
              onChange={e => setFormData({...formData, customer_name: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quality */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Quality</label>
              <div className="relative">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none"
                  value={formData.quality || ''} 
                  onChange={e => setFormData({...formData, quality: e.target.value})} 
                />
              </div>
            </div>
            {/* Color */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Color</label>
              <input 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none"
                value={formData.color || ''} 
                onChange={e => setFormData({...formData, color: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* GSM */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">GSM</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="number"
                  className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none"
                  value={formData.gsm || ''} 
                  onChange={e => setFormData({...formData, gsm: e.target.value})} 
                />
              </div>
            </div>
            {/* Size */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Width (In)</label>
              <div className="relative">
                <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="number"
                  className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none"
                  value={formData.width_inches || ''} 
                  onChange={e => setFormData({...formData, width_inches: e.target.value})} 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Net Weight */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Net Weight (Kg)</label>
              <div className="relative">
                <Scale className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="number"
                  className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none"
                  value={formData.net_weight || ''} 
                  onChange={e => setFormData({...formData, net_weight: e.target.value})} 
                />
              </div>
            </div>
            {/* Length - NEWLY ADDED */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Length (Mtrs)</label>
              <div className="relative">
                <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="number"
                  className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none font-sans"
                  value={formData.length_meters || ''} 
                  onChange={e => setFormData({...formData, length_meters: e.target.value})} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 flex gap-3">
          <button 
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 p-4 bg-white text-red-500 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 border border-red-100 active:scale-95 transition-all disabled:opacity-50"
          >
            <Trash2 size={18} /> Delete
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-[2] p-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
          >
            <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}