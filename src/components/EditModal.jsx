import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, ChevronDown } from 'lucide-react';

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

export default function EditModal({ roll, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({ ...roll });
  const [isDeleting, setIsDeleting] = useState(false);

  // AUTO-CALCULATION logic (Net = Gross - (Width / 63))
  const handleValueChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    
    if (field === 'width_inches' || field === 'gross_weight') {
      const w = parseFloat(field === 'width_inches' ? value : formData.width_inches);
      const g = parseFloat(field === 'gross_weight' ? value : formData.gross_weight);
      
      if (!isNaN(w) && !isNaN(g) && w > 0) {
        updatedData.net_weight = (g - (w / 63)).toFixed(2);
      }
    }
    setFormData(updatedData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleDelete = () => {
    if (window.confirm(`PERMANENTLY delete Roll ${roll.product_id}?`)) {
      setIsDeleting(true);
      onDelete(roll.product_id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Edit Roll Details</h2>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{roll.product_id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-400"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* CUSTOMER */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Buyer Name</label>
            <input 
              className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.customer_name}
              onChange={e => handleValueChange('customer_name', e.target.value)}
            />
          </div>

          {/* QUALITY & COLOR */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Quality</label>
              <div className="relative">
                <select className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none appearance-none" value={formData.quality} onChange={e => handleValueChange('quality', e.target.value)}>
                  {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Color</label>
              <div className="relative">
                <select className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none appearance-none" value={formData.color} onChange={e => handleValueChange('color', e.target.value)}>
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* GSM, SIZE, LENGTH */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">GSM</label>
              <input type="number" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={formData.gsm} onChange={e => handleValueChange('gsm', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Size (in)</label>
              <input type="number" step="0.1" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={formData.width_inches} onChange={e => handleValueChange('width_inches', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Length (m)</label>
              <input type="number" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={formData.length_meters} onChange={e => handleValueChange('length_meters', e.target.value)} />
            </div>
          </div>

          {/* WEIGHTS */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Gross Weight (KG)</label>
              <input 
                type="number" step="0.01"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.gross_weight}
                onChange={e => handleValueChange('gross_weight', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-600 uppercase ml-2">Net Weight (KG)</label>
              <input 
                type="number" step="0.01" readOnly
                className="w-full p-4 bg-blue-50/50 border-2 border-blue-100 rounded-2xl font-black text-blue-800 text-lg outline-none"
                value={formData.net_weight}
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="pt-4 space-y-3">
            <button type="submit" className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-gray-200">
              <Save size={18} /> SAVE CHANGES
            </button>
            <button type="button" onClick={handleDelete} disabled={isDeleting} className="w-full py-4 bg-red-50 text-red-600 rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-2 hover:bg-red-100 border border-red-100 transition-all">
              {isDeleting ? "DELETING..." : <><Trash2 size={16} /> DELETE ROLL PERMANENTLY</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}