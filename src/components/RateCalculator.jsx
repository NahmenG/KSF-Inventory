import React, { useState, useEffect, useMemo } from 'react';
import { History, ChevronRight, Calculator } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function RateCalculator() {
  const [marketRates, setMarketRates] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('Virgin');
  const [loading, setLoading] = useState(true);

  const CONVERSION_COST = 20; // Fixed: Electricity, Labour, Packing

  // 1. RECIPES (Based on your 100kg Strategy)
  const recipes = {
    "Virgin": { "PP Virgin": 100, "UV Additive": 2, "Color MB": 1 },
    "Fresh": { "PP Virgin": 80, "Filler": 20, "Vistamaxx": 2, "Color MB": 1, "Additives": 2 },
    "Semi-Fresh": { "PP Virgin": 65, "Filler": 35, "Vistamaxx": 1, "Color MB": 1, "Additives": 2 },
    "Semi": { "PP Virgin": 50, "Filler": 50, "Color MB": 1, "Additives": 2 },
    "Semi 2": { "PP Virgin": 40, "Filler": 60, "Color MB": 1, "Additives": 2 },
    "Semi Star": { "PP Virgin": 15, "RPP": 25, "Filler": 70, "Color MB": 1, "Additives": 2 },
    "Laminated": { "PP Virgin": 90, "LDPE": 10, "Color MB": 1, "Additives": 2 }
  };

  // 2. FETCH LATEST RATES
  useEffect(() => {
    const fetchRates = async () => {
      const { data, error } = await supabase
        .from('market_rates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const latest = [];
        const seen = new Set();
        data.forEach(item => {
          if (!seen.has(item.material_name)) {
            latest.push(item);
            seen.add(item.material_name);
          }
        });
        setMarketRates(latest);
      }
      setLoading(false);
    };
    fetchRates();
  }, []);

  // 3. AUTOMATIC PRICING LOGIC (Weighted Average + Conversion + 5% GST)
  const pricing = useMemo(() => {
    const results = {};
    Object.keys(recipes).forEach(qName => {
      const recipe = recipes[qName];
      let totalMaterialCost = 0;
      let totalWeight = 0;

      Object.entries(recipe).forEach(([matName, kg]) => {
        const rateObj = marketRates.find(r => r.material_name === matName);
        const rate = rateObj ? rateObj.rate : 0;
        totalMaterialCost += (kg * rate);
        totalWeight += kg;
      });

      const costPerKg = (totalMaterialCost / totalWeight) + CONVERSION_COST;
      // Add 5% GST to the per kg rate
      results[qName] = costPerKg * 1.05;
    });
    return results;
  }, [marketRates]);

  return (
    <div className="space-y-4">
      {/* SECTION: AUTO-PRICING CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.keys(recipes).map(q => (
          <button 
            key={q}
            onClick={() => setSelectedQuality(q)}
            className={`p-4 rounded-[1.5rem] border transition-all text-left ${selectedQuality === q ? 'bg-blue-600 border-blue-600 shadow-lg' : 'bg-white border-slate-100 hover:border-blue-200'}`}
          >
            <div className={`text-[8px] font-black uppercase tracking-widest mb-1 ${selectedQuality === q ? 'text-blue-100' : 'text-slate-400'}`}>{q}</div>
            <div className={`text-lg font-black ${selectedQuality === q ? 'text-white' : 'text-slate-900'}`}>₹{pricing[q]?.toFixed(1)}</div>
            <div className={`text-[7px] font-bold uppercase ${selectedQuality === q ? 'text-blue-200' : 'text-slate-300'}`}>per kg (incl. 5% GST)</div>
          </button>
        ))}
      </div>

      {/* SECTION: LIVE MARKET INDEX FOOTER */}
      <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm">
            <History size={14} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-tight leading-none mb-1">Live Market Index</div>
            <div className="text-[11px] font-bold text-slate-700">
               PP Virgin: <span className="text-blue-600">₹{marketRates.find(r => r.material_name === 'PP Virgin')?.rate || '0'}</span>
            </div>
          </div>
        </div>
        <div className="text-[8px] font-black text-slate-300 uppercase italic">Rates based on 100kg batch recipe</div>
      </div>
    </div>
  );
}