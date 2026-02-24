import React, { useState } from 'react';
import { X, Save, Trash2, AlertCircle } from 'lucide-react';

export default function EditModal({ roll, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({ ...roll });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to PERMANENTLY delete Roll ${roll.product_id}?`)) {
      setIsDeleting(true);
      onDelete(roll.product_id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Edit Roll Details</h2>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{roll.product_id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Buyer Name</label>
            <input 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={formData.customer_name}
              onChange={e => setFormData({...formData, customer_name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">GSM</label>
              <input 
                type="number"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none"
                value={formData.gsm}
                onChange={e => setFormData({...formData, gsm: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Size (Inches)</label>
              <input 
                type="number" step="0.1"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none"
                value={formData.width_inches}
                onChange={e => setFormData({...formData, width_inches: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-blue-600 uppercase ml-2">Net Weight (KG)</label>
              <input 
                type="number" step="0.01"
                className="w-full p-4 bg-blue-50/30 border border-blue-100 rounded-2xl font-black text-blue-700 outline-none"
                value={formData.net_weight}
                onChange={e => setFormData({...formData, net_weight: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Status</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none appearance-none"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="in_stock">In Stock</option>
                <option value="dispatched">Dispatched</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button 
              type="submit"
              className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all shadow-lg"
            >
              <Save size={18} /> SAVE CHANGES
            </button>

            <button 
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full py-4 bg-red-50 text-red-600 rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-2 hover:bg-red-100 active:scale-[0.98] transition-all border border-red-100"
            >
              {isDeleting ? "DELETING..." : <><Trash2 size={16} /> DELETE ROLL PERMANENTLY</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}