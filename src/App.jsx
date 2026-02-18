import React, { useMemo } from 'react';
import { TrendingUp, Clock, AlertCircle, Package, History } from 'lucide-react';

const DashboardView = React.memo(({ rolls, materials }) => {
  const inStock = rolls.filter(r => r.status === 'in_stock');
  const today = new Date();
  
  // Stats for Velocity
  const producedToday = rolls.filter(r => new Date(r.created_at).toLocaleDateString() === today.toLocaleDateString());
  const dispatchedToday = rolls.filter(r => r.status === 'dispatched' && new Date(r.dispatched_at).toLocaleDateString() === today.toLocaleDateString());

  // 1. Recent Activity (Latest 5 rolls regardless of status)
  const recentActivity = useMemo(() => {
    return [...rolls].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  }, [rolls]);

  // 2. Aged Stock (In stock for more than 30 days)
  const agedStock = useMemo(() => {
    return inStock.filter(r => {
      const createdDate = new Date(r.created_at);
      const diffTime = Math.abs(today - createdDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 30;
    }).slice(0, 5); // Show top 5 oldest
  }, [inStock]);

  const stockWeight = inStock.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0);
  const lowMaterials = materials.filter(m => m.min_level > 0 && m.stock_quantity < m.min_level);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Velocity Card */}
      <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-600 border border-gray-100">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3 text-sm uppercase tracking-wider"><TrendingUp size={18} /> Today's Velocity</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded-lg text-center"><div className="text-[10px] text-green-700 font-bold uppercase">Produced</div><div className="text-2xl font-black text-green-800">{producedToday.length}</div></div>
          <div className="bg-orange-50 p-3 rounded-lg text-center"><div className="text-[10px] text-orange-700 font-bold uppercase">Dispatched</div><div className="text-2xl font-black text-orange-800">{dispatchedToday.length}</div></div>
        </div>
      </div>

      {/* Recent Activity Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 bg-gray-50/50 border-b flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          <h3 className="font-bold text-gray-700 text-xs uppercase tracking-widest">Recent Activity</h3>
        </div>
        <div className="divide-y">
          {recentActivity.map((r, i) => (
            <div key={i} className="p-3 flex justify-between items-center text-sm">
              <div>
                <div className="font-bold text-gray-800">{r.product_id}</div>
                <div className="text-[10px] text-gray-400 uppercase font-bold">{r.customer_name || 'Stock'}</div>
              </div>
              <div className={`text-[10px] font-black px-2 py-1 rounded uppercase ${r.status === 'in_stock' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {r.status.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aged Stock Card (New) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 bg-red-50/30 border-b flex items-center gap-2">
          <History size={16} className="text-red-500" />
          <h3 className="font-bold text-gray-700 text-xs uppercase tracking-widest">Aged Stock (>30 Days)</h3>
        </div>
        <div className="p-2 divide-y">
          {agedStock.length > 0 ? agedStock.map((r, i) => (
            <div key={i} className="p-2 flex justify-between items-center text-sm">
              <span className="font-bold text-gray-700">{r.product_id}</span>
              <span className="text-red-600 font-black text-xs">{Math.ceil((today - new Date(r.created_at)) / (1000 * 60 * 60 * 24))} Days Old</span>
            </div>
          )) : <div className="p-4 text-center text-xs text-gray-400 italic">No aged stock found.</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 text-center"><div className="text-gray-500 text-[10px] font-bold uppercase">Stock Count</div><div className="text-2xl font-black text-blue-600">{inStock.length}</div></div>
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 text-center"><div className="text-gray-500 text-[10px] font-bold uppercase">Total Wt</div><div className="text-2xl font-black text-green-600">{stockWeight.toFixed(1)}</div></div>
      </div>

      {lowMaterials.length > 0 && (
        <div className="bg-red-50 p-4 rounded-xl border-l-4 border-red-500 border border-red-100">
          <h3 className="font-bold text-red-800 flex items-center gap-2 mb-2 text-xs uppercase"><AlertCircle size={16} /> Low Materials</h3>
          {lowMaterials.map(m => (
            <div key={m.id} className="flex justify-between text-sm py-1 font-bold"><span>{m.name}</span><span className="text-red-600">{m.stock_quantity} kg</span></div>
          ))}
        </div>
      )}
    </div>
  );
});

export default DashboardView;