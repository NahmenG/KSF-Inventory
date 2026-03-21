import React, { useState } from 'react';
import { X, Save, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function MarketRatesModal({ currentRates, onClose, onUpdate }) {
  const [rates, setRates] = useState(currentRates);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Prepare all changed rates for insertion
      const updates = Object.entries(rates).map(([name, rate]) => ({
        material_name: name,
        rate: parseFloat(rate)
      }));

      const { error } = await supabase.from('market_rates').insert(updates);
      
      if (error) throw error;
      
      alert("Market Rates Updated & History Recorded");
      onUpdate(); // Trigger refresh in parent
      onClose();
    } catch (err) {
      alert("Update Failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Update Market Rates</h2>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Updates live pricing for all qualities</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 mb-6">
          {Object.entries(rates).map(([name, val]) => (
            <div key={name} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-tighter">{name}</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 font-black text-sm outline-none focus:border-blue-500"
                  value={val}
                  onChange={(e) => setRates({ ...rates, [name]: e.target.value })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">₹/kg</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex gap-3 items-start border border-blue-100">
          <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-blue-700 uppercase leading-relaxed">
            Note: Changing these values will update the Cost-per-KG for all 5 fabric qualities on the dashboard instantly.
          </p>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isSaving ? "SYNCING..." : <><Save size={20} /> SAVE & SYNC RATES</>}
        </button>
      </div>
    </div>
  );
}