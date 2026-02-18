import React, { useMemo } from 'react';
import { TrendingUp, Clock, AlertCircle, Package, History, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const DashboardView = React.memo(({ rolls, materials }) => {
  const inStock = rolls.filter(r => r.status === 'in_stock');
  const todayDate = new Date();
  const todayStr = todayDate.toLocaleDateString();
  
  // 1. Velocity Logic
  const producedToday = rolls.filter(r => new Date(r.created_at).toLocaleDateString() === todayStr);
  const dispatchedToday = rolls.filter(r => r.status === 'dispatched' && new Date(r.dispatched_at).toLocaleDateString() === todayStr);

  // 2. Compact Recent Activity (Top 5)
  const recentActivity = useMemo(() => {
    return [...rolls].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  }, [rolls]);

  // 3. Aged Stock Quality Wise (Over 30 Days)
  const agedData = useMemo(() => {
    const aged = inStock.filter(r => {
      const diffDays = Math.ceil(Math.abs(todayDate - new Date(r.created_at)) / (1000 * 60 * 60 * 24));
      return diffDays > 30;
    });
    const counts = {};
    aged.forEach(r => { counts[r.quality] = (counts[r.quality] || 0) + 1; });
    return Object.keys(counts).map(k => ({ quality: k, count: counts[k] }));
  }, [inStock, todayDate]);

  // 4. Chart Data
  const qualityChartData = useMemo(() => {
    const c = {}; inStock.forEach(r => c[r.quality] = (c[r.quality] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.keys(c).map(k => ({ name: k, value: parseFloat(c[k].toFixed(1)) }));
  }, [inStock]);

  const colorChartData = useMemo(() => {
    const c = {}; inStock.forEach(r => c[r.color] = (c[r.color] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.keys(c).map(k => ({ name: k, weight: parseFloat(c[k].toFixed(1)) }));
  }, [inStock]);

  const stockWeight = inStock.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0);
  const lowMaterials = materials.filter(m => m.min_level > 0 && m.stock_quantity < m.min_level);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-500">
      
      {/* SECTION 1: PLANT VELOCITY */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
        <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-600" /> Plant Velocity (Today)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 p-3 rounded-xl border border-green-100">
            <div className="text-[9px] text-green-700 font-black uppercase">Produced</div>
            <div className="text-xl font-black text-green-900">{producedToday.length}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
            <div className="text-[9px] text-orange-700 font-black uppercase">Dispatched</div>
            <div className="text-xl font-black text-orange-900">{dispatchedToday.length}</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: STOCK TOTALS (Moved Up) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={18}/></div>
          <div>
            <div className="text-gray-400 text-[9px] font-black uppercase">In Stock</div>
            <div className="text-lg font-black text-blue-600">{inStock.length}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-green-50 text-green-600 rounded-lg"><BarChart3 size={18}/></div>
          <div>
            <div className="text-gray-400 text-[9px] font-black uppercase">Weight</div>
            <div className="text-lg font-black text-green-600">{stockWeight.toFixed(1)} <span className="text-[10px]">kg</span></div>
          </div>
        </div>
      </div>

      {/* SECTION 3: COMPACT RECENT ACTIVITY */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 bg-gray-50/50 border-b flex items-center justify-between">
          <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Clock size={14} className="text-blue-500" /> Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActivity.map((r, i) => (
            <div key={i} className="px-3 py-2 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'in_stock' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                <span className="font-bold text-gray-700">{r.product_id}</span>
                <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{r.customer_name || 'Stock'}</span>
              </div>
              <div className="font-black text-gray-900">{r.net_weight} kg</div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: AGED STOCK QUALITY WISE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 bg-red-50/30 border-b flex items-center gap-2">
          <History size={16} className="text-red-500" />
          <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest">Aged Stock by Quality</h3>
        </div>
        <div className="p-3">
          {agedData.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {agedData.map((d, i) => (
                <div key={i} className="bg-white border p-2 rounded-lg flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-600 uppercase">{d.quality}</span>
                  <span className="text-sm font-black text-red-600">{d.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-gray-400 italic">No rolls over 30 days.</div>
          )}
        </div>
      </div>

      {/* SECTION 5: CHARTS (Quality Pie & Color Bar) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-black text-gray-400 text-[10px] uppercase mb-4 flex items-center gap-2"><PieIcon size={14}/> Quality Mix (kg)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={qualityChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                  {qualityChartData.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-black text-gray-400 text-[10px] uppercase mb-4 flex items-center gap-2"><BarChart3 size={14}/> Stock by Color (kg)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={colorChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} tick={{fill: '#9ca3af'}} />
                <YAxis fontSize={10} tick={{fill: '#9ca3af'}} />
                <Tooltip />
                <Bar dataKey="weight" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 6: LOW MATERIALS */}
      {lowMaterials.length > 0 && (
        <div className="bg-red-50 p-4 rounded-xl border-l-4 border-red-500 border border-red-100">
          <h3 className="font-black text-red-800 flex items-center gap-2 mb-2 text-[10px] uppercase tracking-widest">
            <AlertCircle size={16} /> Low Inventory Alert
          </h3>
          <div className="space-y-1">
            {lowMaterials.map(m => (
              <div key={m.id} className="flex justify-between items-center text-xs py-1 border-b border-red-100 last:border-0 font-bold">
                <span className="text-gray-700">{m.name}</span>
                <span className="text-red-700">{m.stock_quantity} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default DashboardView;