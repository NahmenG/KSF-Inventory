import React, { useMemo } from 'react';
import { TrendingUp, Clock, AlertCircle, Package, History, ArrowRight, BarChart3 } from 'lucide-react';

const DashboardView = React.memo(({ rolls, materials }) => {
  const inStock = rolls.filter(r => r.status === 'in_stock');
  const todayDate = new Date();
  const todayStr = todayDate.toLocaleDateString();
  
  // 1. Velocity Logic
  const producedToday = rolls.filter(r => new Date(r.created_at).toLocaleDateString() === todayStr);
  const dispatchedToday = rolls.filter(r => r.status === 'dispatched' && new Date(r.dispatched_at).toLocaleDateString() === todayStr);

  // 2. Recent Activity Logic (5 most recent entries across all statuses)
  const recentActivity = useMemo(() => {
    return [...rolls]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  }, [rolls]);

  // 3. Aged Stock Logic (In stock > 30 Days)
  const agedStock = useMemo(() => {
    return inStock.filter(r => {
      const createdDate = new Date(r.created_at);
      const diffTime = Math.abs(todayDate - createdDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 30;
    }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).slice(0, 5);
  }, [inStock, todayDate]);

  const stockWeight = inStock.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0);
  const lowMaterials = materials.filter(m => m.min_level > 0 && m.stock_quantity < m.min_level);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* SECTION 1: TODAY'S VELOCITY */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-600"><TrendingUp size={80} /></div>
        <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <BarChart3 size={14} className="text-blue-600" /> Plant Velocity (Today)
        </h3>
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-green-50 border border-green-100 p-4 rounded-2xl">
            <div className="text-[10px] text-green-700 font-black uppercase">Produced</div>
            <div className="text-3xl font-black text-green-900">{producedToday.length} <span className="text-xs font-normal opacity-60">Rolls</span></div>
          </div>
          <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
            <div className="text-[10px] text-orange-700 font-black uppercase">Dispatched</div>
            <div className="text-3xl font-black text-orange-900">{dispatchedToday.length} <span className="text-xs font-normal opacity-60">Rolls</span></div>
          </div>
        </div>
      </div>

      {/* SECTION 2: RECENT ACTIVITY */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b flex items-center justify-between">
          <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
            <Clock size={14} className="text-blue-500" /> Recent Activity
          </h3>
          <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">LIVE FEED</span>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActivity.map((r, i) => (
            <div key={i} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.status === 'in_stock' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                  <Package size={18} />
                </div>
                <div>
                  <div className="font-black text-gray-800 text-sm">{r.product_id}</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                    {r.customer_name || 'Stock'} • {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-gray-900">{r.net_weight} kg</div>
                <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${r.status === 'in_stock' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                  {r.status.replace('_', ' ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: AGED STOCK ALERT */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-red-50/30 border-b flex items-center gap-2">
          <History size={16} className="text-red-500" />
          <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">Aged Stock (>30 Days)</h3>
        </div>
        <div className="p-2">
          {agedStock.length > 0 ? (
            <div className="space-y-1">
              {agedStock.map((r, i) => (
                <div key={i} className="p-3 flex justify-between items-center bg-white rounded-xl border border-gray-50">
                  <span className="font-bold text-gray-700 text-sm">{r.product_id}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-black text-xs">{Math.ceil((todayDate - new Date(r.created_at)) / (1000 * 60 * 60 * 24))} Days</span>
                    <ArrowRight size={12} className="text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs italic">All stock is fresh.</div>
          )}
        </div>
      </div>

      {/* SECTION 4: GLOBAL TOTALS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Stock Count</div>
          <div className="text-3xl font-black text-blue-600">{inStock.length}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Weight</div>
          <div className="text-3xl font-black text-green-600">{stockWeight.toFixed(1)} <span className="text-xs">kg</span></div>
        </div>
      </div>

      {/* SECTION 5: LOW MATERIALS */}
      {lowMaterials.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border-l-4 border-l-red-500 border border-gray-100 shadow-sm">
          <h3 className="font-black text-red-800 flex items-center gap-2 mb-4 text-[10px] uppercase tracking-widest">
            <AlertCircle size={16} /> Inventory Alerts
          </h3>
          <div className="space-y-3">
            {lowMaterials.map(m => (
              <div key={m.id} className="flex justify-between items-center bg-red-50/50 p-3 rounded-xl border border-red-100">
                <span className="font-bold text-gray-800 text-sm">{m.name}</span>
                <span className="text-red-700 font-black">{m.stock_quantity} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default DashboardView;