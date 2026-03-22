import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function MarketRatesModal({ onClose, onUpdate, isAdmin }) {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      const { data } = await supabase.from('market_rates').select('*').order('created_at', { ascending: false });
      if (data) {
        const latest = []; const seen = new Set();
        data.forEach(d => { if(!seen.has(d.material_name)){ latest.push(d); seen.add(d.material_name); }});
        setRates(latest);
      }
      setLoading(false);
    };
    fetchRates();
  }, []);

  const handleSave = async () => {
    if (!isAdmin) return;
    const { error } = await supabase.from('market_rates').insert(
      rates.map(({material_name, rate}) => ({ material_name, rate: parseFloat(rate) }))
    );
    if (!error) { alert("Market Rates Synced!"); onUpdate(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase text-slate-900">Market Rates</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
        </div>

        {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600"/></div> : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 mb-6">
            {rates.map((r, i) => (
              <div key={i} className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <input 
                  disabled={!isAdmin}
                  className="flex-1 bg-transparent font-bold text-sm outline-none px-2 focus:text-blue-600"
                  value={r.material_name}
                  onChange={e => { let n = [...rates]; n[i].material_name = e.target.value; setRates(n); }}
                />
                <div className="flex items-center gap-1 w-24 bg-white px-3 py-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-300">₹</span>
                  <input 
                    type="number" disabled={!isAdmin}
                    className="w-full font-black text-sm outline-none"
                    value={r.rate}
                    onChange={e => { let n = [...rates]; n[i].rate = e.target.value; setRates(n); }}
                  />
                </div>
                {isAdmin && <button onClick={() => setRates(rates.filter((_, idx) => idx !== i))} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>}
              </div>
            ))}
            {isAdmin && (
              <button onClick={() => setRates([...rates, { material_name: 'New Material', rate: 0 }])} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                <Plus size={14}/> Add New Material
              </button>
            )}
          </div>
        )}

        {isAdmin && (
          <button onClick={handleSave} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all">
            SYNC ALL RATES
          </button>
        )}
      </div>
    </div>
  );
}