import React, { useState, useEffect, useMemo } from 'react';
import { History, Settings2, Beaker, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import MarketRatesModal from './MarketRatesModal';
import BatchModal from './BatchModal';

export default function RateCalculator({ isAdmin, fetchData }) {
  const [marketRates, setMarketRates] = useState([]);
  const [formulations, setFormulations] = useState([]);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const CONVERSION_COST = 20;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ratesRes, batchRes] = await Promise.all([
          supabase.from('market_rates').select('*').order('created_at', { ascending: false }),
          supabase.from('formulations').select('*').order('quality_name')
        ]);
        
        if (ratesRes.data) {
          const latest = [];
          const seen = new Set();
          ratesRes.data.forEach(item => {
            if (!seen.has(item.material_name)) { latest.push(item); seen.add(item.material_name); }
          });
          setMarketRates(latest);
        }
        if (batchRes.data) setFormulations(batchRes.data);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const pricing = useMemo(() => {
    const results = {};
    const qualities = [...new Set(formulations.map(f => f.quality_name))];
    
    qualities.forEach(qName => {
      const recipeItems = formulations.filter(f => f.quality_name === qName);
      let totalMaterialCost = 0;
      let totalWeight = 0;

      recipeItems.forEach(item => {
        const rate = marketRates.find(r => r.material_name === item.material_name)?.rate || 0;
        totalMaterialCost += (item.quantity_kg * rate);
        totalWeight += item.quantity_kg;
      });

      if (totalWeight > 0) {
        const base = (totalMaterialCost / totalWeight) + CONVERSION_COST;
        results[qName] = base * 1.05; // Final rate including 5% GST
      }
    });
    return results;
  }, [marketRates, formulations]);

  return (
    <div className="space-y-4">
      {/* 1. QUALITY RATE CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading ? [...Array(4)].map((_, i) => <div key={i} className="p-4 h-24 bg-white rounded-3xl animate-pulse border border-slate-100" />) :
          Object.entries(pricing).map(([q, price]) => (
            <div key={q} className="p-4 rounded-[1.5rem] border bg-white border-slate-100 shadow-sm">
              <div className="text-[8px] font-black uppercase text-slate-400 mb-1">{q}</div>
              <div className="text-xl font-black text-slate-900">₹{price.toFixed(1)}</div>
              <div className="text-[7px] font-bold uppercase text-slate-300 italic">per kg (incl. 5% GST)</div>
            </div>
          ))
        }
      </div>

      {/* 2. FOOTER INDEX & CONTROL BUTTONS */}
      <div className="bg-slate-50 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm"><History size={16}/></div>
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-tight leading-none mb-1">Live Market Index</div>
            <div className="text-[12px] font-bold text-slate-700">PP Virgin: <span className="text-blue-600">₹{marketRates.find(r => r.material_name === 'Polypropylene(PP)')?.rate || '0'}</span></div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Batch Formulation Button */}
          <button 
            onClick={() => setShowBatchModal(true)}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-blue-50 transition-all active:scale-95"
          >
            <Beaker size={14}/> {isAdmin ? "Edit Batches" : "View Batches"}
          </button>
          
          {/* Market Rates Button */}
          <button 
            onClick={() => setShowRateModal(true)}
            className="px-4 py-2.5 bg-white border border-blue-200 text-blue-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
          >
            <Settings2 size={14}/> {isAdmin ? "Update Rates" : "View Rates"}
          </button>
        </div>
      </div>

      {showRateModal && <MarketRatesModal isAdmin={isAdmin} onClose={() => setShowRateModal(false)} onUpdate={() => window.location.reload()} />}
      {showBatchModal && <BatchModal isAdmin={isAdmin} formulations={formulations} onClose={() => setShowBatchModal(false)} onUpdate={() => window.location.reload()} />}
    </div>
  );
}