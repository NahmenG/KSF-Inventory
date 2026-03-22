import React, { useState, useEffect, useMemo } from 'react';
import { History, Settings2, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import MarketRatesModal from './MarketRatesModal';

export default function RateCalculator({ isAdmin, fetchData }) {
  const [marketRates, setMarketRates] = useState([]);
  const [showRateModal, setShowRateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const CONVERSION_COST = 20; // Fixed: Electricity, Labour, Packing

  // 1. RECIPES (Aligned with Database Material Names)
  const recipes = {
    "Virgin": { "Polypropylene(PP)": 100, "IOCL - U V": 2, "Color MB": 1 },
    "Fresh": { "Polypropylene(PP)": 80, "Filler": 20, "Vistamaxx": 2, "Color MB": 1, "Additives": 2 },
    "Semi-Fresh": { "Polypropylene(PP)": 65, "Filler": 35, "Vistamaxx": 1, "Color MB": 1, "Additives": 2 },
    "Semi": { "Polypropylene(PP)": 50, "Filler": 50, "Color MB": 1, "Additives": 2 },
    "Semi 2": { "Polypropylene(PP)": 40, "Filler": 60, "Color MB": 1, "Additives": 2 },
    "Semi Star": { "Polypropylene(PP)": 15, "RPP- Ivory": 25, "Filler": 70, "Color MB": 1, "Additives": 2 },
    "Laminated": { "Polypropylene(PP)": 90, "LDPE": 10, "Color MB": 1, "Additives": 2 }
  };

  // 2. FETCH LATEST RATES
  useEffect(() => {
    const fetchRates = async () => {
      try {
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
      } catch (err) {
        console.error("Error fetching rates:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, []);

  // 3. AUTOMATIC PRICING LOGIC (Base + Conversion + 5% GST)
  const pricing = useMemo(() => {
    const results = {};
    Object.keys(recipes).forEach(qName => {
      const recipe = recipes[qName];
      let totalMaterialCost = 0;
      let totalWeight = 0;

      Object.entries(recipe).forEach(([matName, kg]) => {
        // Find rate by matching material name
        const rateObj = marketRates.find(r => r.material_name === matName);
        const rate = rateObj ? rateObj.rate : 0;
        totalMaterialCost += (kg * rate);
        totalWeight += kg;
      });

      if (totalWeight === 0) {
        results[qName] = 0;
      } else {
        const baseCost = (totalMaterialCost / totalWeight) + CONVERSION_COST;
        // Final Rate = Base Cost + 5% GST
        results[qName] = baseCost * 1.05;
      }
    });
    return results;
  }, [marketRates]);

  // Helper to get specific raw material rate for the footer
  const getPPRate = () => {
    const rate = marketRates.find(r => r.material_name === 'Polypropylene(PP)')?.rate;
    return rate ? `₹${rate}` : 'N/A';
  };

  return (
    <div className="space-y-4">
      {/* SECTION 1: AUTO-PRICING CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading ? (
          // Loading Skeletons
          [...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-[1.5rem] border bg-white border-slate-50 animate-pulse h-24 flex flex-col justify-center">
              <div className="h-2 w-12 bg-slate-100 rounded mb-2"></div>
              <div className="h-6 w-20 bg-slate-100 rounded"></div>
            </div>
          ))
        ) : (
          Object.keys(recipes).map(q => (
            <div 
              key={q}
              className="p-4 rounded-[1.5rem] border bg-white border-slate-100 shadow-sm hover:border-blue-200 transition-all group"
            >
              <div className="text-[8px] font-black uppercase tracking-widest mb-1 text-slate-400 group-hover:text-blue-400 transition-colors">{q}</div>
              <div className="text-xl font-black text-slate-900">
                {pricing[q] > 20 ? `₹${pricing[q].toFixed(1)}` : '---'}
              </div>
              <div className="text-[7px] font-bold uppercase text-slate-300 italic">per kg (incl. 5% GST)</div>
            </div>
          ))
        )}
      </div>

      {/* SECTION 2: LIVE MARKET INDEX & UPDATE BUTTON */}
      <div className="bg-slate-50 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between border border-slate-100">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm">
            <History size={16} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-tight leading-none mb-1">Live Market Index</div>
            <div className="text-[12px] font-bold text-slate-700">
               PP Virgin: <span className="text-blue-600">{getPPRate()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="text-[8px] font-black text-slate-300 uppercase italic text-left md:text-right leading-tight">
            Prices calculated from<br/>100kg batch recipe
          </div>
          
          {isAdmin && (
            <button 
              onClick={() => setShowRateModal(true)}
              className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 active:scale-95 shadow-sm"
            >
              <Settings2 size={14} /> Update Rates
            </button>
          )}
        </div>
      </div>

      {/* MODAL RENDER */}
      {showRateModal && (
        <MarketRatesModal 
          onClose={() => setShowRateModal(false)}
          onUpdate={() => {
            if(fetchData) fetchData();
            // We use a small timeout before reload to let Supabase finish
            setTimeout(() => window.location.reload(), 500);
          }} 
        />
      )}
    </div>
  );
}