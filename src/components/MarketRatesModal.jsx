import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function MarketRatesModal({ onClose, onUpdate }) {
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // FETCH CURRENT RATES ON LOAD
  useEffect(() => {
    const fetchCurrent = async () => {
      const { data, error } = await supabase
        .from('market_rates')
        .select('material_name, rate')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Map to { "Material Name": rate } picking only the latest
        const latestMap = {};
        data.forEach(item => {
          if (!latestMap[item.material_name]) {
            latestMap[item.material_name] = item.rate;
          }
        });
        setRates(latestMap);
      }
      setLoading(false);
    };
    fetchCurrent();
  }, []);

  const handleSave = async () => {
    if (Object.keys(rates).length === 0) return;
    setIsSaving(true);
    try {
      const updates = Object.entries(rates).map(([name, rate]) => ({
        material_name: name,
        rate: parseFloat(rate)
      }));

      const { error } = await supabase.from('market_rates').insert(updates);
      if (error) throw error;
      
      alert("Rates Synced Successfully!");
      if (onUpdate) onUpdate(); 
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Update Market Rates</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 mb-6">
              {Object.entries(rates).map(([name, val]) => (
                <div key={name} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-2">{name}</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      className="w-full p-2 bg-white rounded-xl border border-slate-200 font-black text-sm outline-none focus:border-blue-500"
                      value={val}
                      onChange={(e) => setRates({ ...rates, [name]: e.target.value })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">₹/kg</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex gap-3 border border-blue-100">
              <AlertCircle size={18} className="text-blue-500 shrink-0" />
              <p className="text-[10px] font-bold text-blue-700 uppercase leading-tight">
                All qualities will update with 5% GST automatically.
              </p>
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? "SAVING..." : <><Save size={20} /> SYNC ALL PRICES</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}