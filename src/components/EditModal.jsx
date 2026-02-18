import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

export default function EditModal({ roll, onClose, onSave }) {
  const [editData, setEditData] = useState({ ...roll });

  if (!roll) return null;

  const handleUpdate = async () => {
    const { error } = await supabase.from('rolls').update(editData).eq('id', roll.id);
    if (!error) onSave();
    else alert("Error updating roll");
  };

  const handleDelete = async () => {
    if (confirm("Delete this roll permanently?")) {
      await supabase.from('rolls').delete().eq('id', roll.id);
      onSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between mb-4 items-center border-b pb-2">
          <h2 className="font-bold text-lg text-gray-800">Edit Roll {roll.product_id}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X /></button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Customer</label>
            <input className="w-full border p-2 rounded" value={editData.customer_name || ''} onChange={e => setEditData({...editData, customer_name: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">Quality</label>
            <select className="w-full border p-2 rounded" value={editData.quality} onChange={e => setEditData({...editData, quality: e.target.value})}>
              {QUALITIES.map(q => <option key={q}>{q}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">Color</label>
            <select className="w-full border p-2 rounded" value={editData.color} onChange={e => setEditData({...editData, color: e.target.value})}>
              {COLORS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-bold text-gray-400 uppercase">Net Wt</label><input type="number" className="w-full border p-2 rounded" value={editData.net_weight} onChange={e => setEditData({...editData, net_weight: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-400 uppercase">GSM</label><input type="number" className="w-full border p-2 rounded" value={editData.gsm} onChange={e => setEditData({...editData, gsm: e.target.value})} /></div>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={handleUpdate} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">Save Changes</button>
          <button onClick={handleDelete} className="w-full text-red-500 border border-red-100 p-3 rounded-xl font-bold flex items-center justify-center gap-2"><Trash2 size={18}/> Delete Roll</button>
        </div>
      </div>
    </div>
  );
}