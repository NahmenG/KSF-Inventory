import React, { useState } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function BatchModal({ isAdmin, formulations, onClose, onUpdate }) {
  const [localForm, setLocalForm] = useState(formulations);

  const handleSave = async () => {
    if (!isAdmin) return;
    // Clears existing formulations and replaces with updated list
    const { error } = await supabase.from('formulations').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
    if (!error) {
      const { error: insErr } = await supabase.from('formulations').insert(
        localForm.map(({quality_name, material_name, quantity_kg}) => ({ 
          quality_name, 
          material_name, 
          quantity_kg: parseFloat(quantity_kg) 
        }))
      );
      if (!insErr) { alert("Batch Formulations Updated!"); onUpdate(); onClose(); }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in zoom-in-95">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase text-slate-900">Batch Formulation (Qty)</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 mb-6">
          <div className="grid grid-cols-3 gap-2 px-3 text-[9px] font-black text-slate-400 uppercase">
            <span>Quality Name</span>
            <span>Raw Material</span>
            <span>Quantity (KG)</span>
          </div>
          {localForm.map((f, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center bg-slate-50 p-3 rounded-2xl">
              <input disabled={!isAdmin} className="bg-white px-3 py-2 rounded-xl text-xs font-black outline-none border border-slate-100 focus:border-blue-500" value={f.quality_name} onChange={e => { let n = [...localForm]; n[i].quality_name = e.target.value; setLocalForm(n); }} />
              <input disabled={!isAdmin} className="bg-white px-3 py-2 rounded-xl text-xs font-bold outline-none border border-slate-100 focus:border-blue-500" value={f.material_name} onChange={e => { let n = [...localForm]; n[i].material_name = e.target.value; setLocalForm(n); }} />
              <div className="flex items-center gap-2">
                <input type="number" disabled={!isAdmin} className="w-full bg-white px-3 py-2 rounded-xl text-xs font-black text-blue-600 outline-none border border-slate-100 focus:border-blue-500" value={f.quantity_kg} onChange={e => { let n = [...localForm]; n[i].quantity_kg = e.target.value; setLocalForm(n); }} />
                {isAdmin && <button onClick={() => setLocalForm(localForm.filter((_, idx) => idx !== i))} className="text-red-400 hover:bg-red-50 p-1 rounded-md"><Trash2 size={14}/></button>}
              </div>
            </div>
          ))}
          {isAdmin && (
            <button onClick={() => setLocalForm([...localForm, { quality_name: 'New Quality', material_name: 'New Material', quantity_kg: 0 }])} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
              <Plus size={14}/> Add New Batch Row
            </button>
          )}
        </div>

        {isAdmin ? (
          <button onClick={handleSave} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black shadow-xl hover:bg-green-700 active:scale-95 transition-all">
            UPDATE FORMULATIONS
          </button>
        ) : (
          <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-[10px] font-black text-amber-700 uppercase">View Only: Admin Mode Required to Edit</p>
          </div>
        )}
      </div>
    </div>
  );
}