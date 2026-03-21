import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, History, ChevronRight, IndianRupee } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function RateCalculator() {
  const [marketRates, setMarketRates] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('Virgin');
  const [customWeight, setCustomWeight] = useState('');
  const [loading, setLoading] = useState(true);

  const CONVERSION_COST = 20; // Fixed: Electricity, Labour, Packing

  // 1. UPDATED RECIPES (Based on your 100kg Strategy)
  const recipes = {
    "Virgin": { "PP Virgin": 100, "UV Additive": 2, "Color MB": 1 },
    "Fresh": { "PP Virgin": 80, "Filler": 20, "Vistamaxx": 2, "Color MB": 1, "Additives": 2 },
    "Semi-Fresh": { "PP Virgin": 65, "Filler": 35, "Vistamaxx": 1, "Color MB": 1, "Additives": 2 },
    "Semi": { "PP Virgin": 50, "Filler": 50, "Color MB": 1, "Additives": 2 },
    "Semi 2": { "PP Virgin": 40, "Filler": 60, "Color MB": 1, "Additives": 2 },
    "Semi Star": { "PP Virgin": 15, "RPP": 25, "Filler": 70, "Color MB": 1, "Additives": 2 },
    "Laminated": { "PP Virgin": 90, "LDPE": 10, "Color MB": 1, "Additives": 2 } // Added Laminated
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

  // 3. AUTOMATIC PRICING LOGIC
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

      // Calculate Weighted Average + Conversion Cost
      results[qName] = (totalMaterialCost / totalWeight) + CONVERSION_COST;
    });
    return results;
  }, [marketRates]);

  const currentRatePerKg = pricing[selectedQuality] || 0;
  const subtotal = (parseFloat(customWeight) || 0) * currentRatePerKg;
  
  // FIXED: GST 5% Logic
  const gstAmount = subtotal * 0.05;
  const totalBill = subtotal + gstAmount;

  return (
    <div className="space-y-4">
      {/* SECTION 1: AUTO-PRICING CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.keys(recipes).map(q => (
          <button 
            key={q}
            onClick={() => setSelectedQuality(q)}
            className={`p-4 rounded-[1.5rem] border transition-all text-left ${selectedQuality === q ? 'bg-blue-600 border-blue-600 shadow-lg' : 'bg-white border-slate-100 hover:border-blue-200'}`}
          >
            <div className={`text-[8px] font-black uppercase tracking-widest mb-1 ${selectedQuality === q ? 'text-blue-100' : 'text-slate-400'}`}>{q}</div>
            <div className={`text-lg font-black ${selectedQuality === q ? 'text-white' : 'text-slate-900'}`}>₹{pricing[q]?.toFixed(1)}</div>
            <div className={`text-[7px] font-bold uppercase ${selectedQuality === q ? 'text-blue-200' : 'text-slate-300'}`}>per kg</div>
          </button>
        ))}
      </div>

      {/* SECTION 2: LIVE QUOTE CALCULATOR */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Calculator size={18}/></div>
            <span className="text-xs font-black uppercase tracking-tighter text-slate-500 italic">Calculator: {selectedQuality} Quality</span>
          </div>
          <div className="relative">
            <input 
              type="number" 
              placeholder="Enter Total Weight (kg)"
              className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-black text-xl outline-none border-2 border-transparent focus:border-blue-500 transition-all"
              value={customWeight}
              onChange={e => setCustomWeight(e.target.value)}
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Input Weight</div>
          </div>
        </div>

        <div className="w-full md:w-72 bg-slate-900 p-6 rounded-[2rem] text-center shadow-xl border border-white/5">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Grand Total</span>
          <div className="text-3xl font-black text-white mt-1">₹{totalBill.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div className="flex justify-center gap-3 mt-2">
            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Rate: ₹{currentRatePerKg.toFixed(1)}</div>
            <div className="text-[8px] font-bold text-green-500 uppercase tracking-tighter">GST: 5% Incl.</div>
          </div>
        </div>
      </div>

      {/* SECTION 3: QUICK VIEW MARKET PP RATE */}
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
        <div className="text-[8px] font-black text-slate-300 uppercase italic">Prices based on 100kg recipe</div>
      </div>
    </div>
  );
}