import React, { useState } from 'react';
import { X, Trash2, CheckCircle, Package } from 'lucide-react';
import { supabase } from '../supabaseClient';

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

export default function EditModal({ roll, onClose, onSave }) {
  const [data, setData] = useState({ ...roll });

  const handleUpdate = async () => {
    const { error } = await supabase.from('rolls').update({
      customer_name: data.customer_name,
      quality: data.quality,
      color: data.color,
      gsm: data.gsm,
      width_inches: data.width_inches,
      net_weight: data.net_weight,
      gross_weight: data.gross_weight,
      length_meters: data.length_meters, // Added length to update logic
      status: data.status,
      dispatched_at: data.status === 'in_stock' ? null : data.dispatched_at
    }).eq('id', roll.id);

    if (!error) onSave();
    else alert("Error: " + error.message);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="font-bold text-lg flex items-center gap-2 text-gray-800"><Package size={20} className="text-blue-600" /> Edit Roll Data</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100 flex justify-between items-center">
            <div><label className="text-[10px] font-bold text-blue-400 block uppercase">Roll ID</label><div className="text-xl font-black text-blue-800">{roll.product_id}</div></div>
            <div className="text-right"><label className="text-[10px] font-bold text-blue-400 block uppercase">Status</label><div className={`text-xs font-bold uppercase px-2 py-1 rounded inline-block ${data.status === 'in_stock' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{data.status.replace('_', ' ')}</div></div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase">Customer / Buyer</label><input className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-100" value={data.customer_name || ''} onChange={e => setData({...data, customer_name: e.target.value})} /></div>
           <div><label className="text-[10px] font-bold text-gray-400 uppercase">Quality</label><select className="w-full border p-3 rounded-lg bg-white" value={data.quality} onChange={e => setData({...data, quality: e.target.value})}>{QUALITIES.map(q => <option key={q}>{q}</option>)}</select></div>
           <div><label className="text-[10px] font-bold text-gray-400 uppercase">Color</label><select className="w-full border p-3 rounded-lg bg-white" value={data.color} onChange={e => setData({...data, color: e.target.value})}>{COLORS.map(c => <option key={c}>{c}</option>)}</select></div>
           <div><label className="text-[10px] font-bold text-gray-400 uppercase">GSM</label><input type="number" className="w-full border p-3 rounded-lg" value={data.gsm} onChange={e => setData({...data, gsm: e.target.value})} /></div>
           <div><label className="text-[10px] font-bold text-gray-400 uppercase">Size (Inches)</label><input type="number" className="w-full border p-3 rounded-lg" value={data.width_inches} onChange={e => setData({...data, width_inches: e.target.value})} /></div>
           
           {/* Added Length Input Field below Size */}
           <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase">Length (Meters)</label><input type="number" className="w-full border p-3 rounded-lg font-bold" value={data.length_meters || ''} onChange={e => setData({...data, length_meters: e.target.value})} /></div>
           
           <div className="col-span-2 pt-2 border-t mt-2"></div>
           <div><label className="text-[10px] font-bold text-blue-600 uppercase">Net Weight</label><input type="number" className="w-full border-2 border-blue-500 p-3 rounded-lg font-black text-xl text-blue-900" value={data.net_weight} onChange={e => setData({...data, net_weight: e.target.value})} /></div>
           <div><label className="text-[10px] font-bold text-gray-400 uppercase">Gross Weight</label><input type="number" className="w-full border p-3 rounded-lg" value={data.gross_weight} onChange={e => setData({...data, gross_weight: e.target.value})} /></div>
        </div>

        <div className="flex flex-col gap-2">
          {data.status === 'dispatched' && <button onClick={() => setData({...data, status: 'in_stock'})} className="w-full bg-orange-50 text-orange-600 py-3 rounded-xl font-bold border border-orange-100">Move Back to In Stock</button>}
          <button onClick={handleUpdate} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><CheckCircle size={20}/> Save All Changes</button>
          <button onClick={async () => { if(confirm("Delete permanently?")) { await supabase.from('rolls').delete().eq('id', roll.id); onSave(); } }} className="w-full text-red-400 font-bold py-2 text-xs uppercase tracking-widest mt-4 flex items-center justify-center gap-1"><Trash2 size={14}/> Delete Permanent</button>
        </div>
      </div>
    </div>
  );
}