import React, { useState } from 'react';
import { X, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

export default function EditModal({ roll, onClose, onSave }) {
  const [data, setData] = useState({ ...roll });

  const handleUpdate = async () => {
    const { error } = await supabase.from('rolls').update(data).eq('id', roll.id);
    if (!error) onSave();
    else alert("Error saving changes.");
  };

  const handleDelete = async () => {
    if (confirm("Permanently delete this roll?")) {
      const { error } = await supabase.from('rolls').delete().eq('id', roll.id);
      if (!error) onSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b pb-2">
          <h2 className="font-bold text-lg">Edit Roll {roll.product_id}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400">BUYER</label><input className="w-full border p-2 rounded" value={data.customer_name || ''} onChange={e => setData({...data, customer_name: e.target.value})} /></div>
           <div><label className="text-[10px] font-bold text-gray-400">QUALITY</label><select className="w-full border p-2 rounded" value={data.quality} onChange={e => setData({...data, quality: e.target.value})}>{QUALITIES.map(q => <option key={q}>{q}</option>)}</select></div>
           <div><label className="text-[10px] font-bold text-gray-400">COLOR</label><select className="w-full border p-2 rounded" value={data.color} onChange={e => setData({...data, color: e.target.value})}>{COLORS.map(c => <option key={c}>{c}</option>)}</select></div>
           <div><label className="text-[10px] font-bold text-gray-400">NET WT</label><input type="number" className="w-full border-2 border-blue-500 p-2 rounded font-bold" value={data.net_weight} onChange={e => setData({...data, net_weight: e.target.value})} /></div>
           <div><label className="text-[10px] font-bold text-gray-400">GSM</label><input type="number" className="w-full border p-2 rounded" value={data.gsm} onChange={e => setData({...data, gsm: e.target.value})} /></div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={handleUpdate} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><CheckCircle size={20}/> Update Entry</button>
          <button onClick={handleDelete} className="w-full text-red-500 border border-red-100 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Trash2 size={18}/> Delete Roll</button>
        </div>
      </div>
    </div>
  );
}