import React, { useMemo } from 'react';
import { TrendingUp, Truck, AlertCircle, Package } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const formatCurrency = (val) => new Intl.NumberFormat('en-IN').format(val);

const DashboardView = React.memo(({ rolls, materials }) => {
  const inStock = rolls.filter(r => r.status === 'in_stock');
  const today = new Date().toLocaleDateString();
  
  const producedToday = rolls.filter(r => new Date(r.created_at).toLocaleDateString() === today);
  const dispatchedToday = rolls.filter(r => r.status === 'dispatched' && new Date(r.dispatched_at).toLocaleDateString() === today);

  const stats = {
    stockWt: inStock.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0),
    dispWt: dispatchedToday.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0),
  };

  const qualityData = useMemo(() => {
    const c = {}; inStock.forEach(r => c[r.quality] = (c[r.quality] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.keys(c).map(k => ({ name: k, value: parseFloat(c[k].toFixed(1)) }));
  }, [inStock]);

  const colorData = useMemo(() => {
    const c = {}; inStock.forEach(r => c[r.color] = (c[r.color] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.keys(c).map(k => ({ name: k, count: parseFloat(c[k].toFixed(1)) })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [inStock]);

  const lowMaterials = materials.filter(m => m.min_level > 0 && m.stock_quantity < m.min_level);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-600 border border-gray-100">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3"><TrendingUp size={18} /> Today's Velocity</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded-lg text-center"><div className="text-[10px] text-green-700 font-bold uppercase">Produced</div><div className="text-2xl font-black text-green-800">{producedToday.length}</div></div>
          <div className="bg-orange-50 p-3 rounded-lg text-center"><div className="text-[10px] text-orange-700 font-bold uppercase">Dispatched</div><div className="text-2xl font-black text-orange-800">{dispatchedToday.length}</div></div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl shadow-lg text-white">
        <h3 className="font-bold flex items-center gap-2 mb-2 text-sm uppercase tracking-wider"><Truck size={18} /> Today's Dispatch Summary</h3>
        <div className="flex justify-between items-end">
          <div>
            <div className="text-3xl font-black">{stats.dispWt.toFixed(1)} <span className="text-sm font-normal opacity-80">kg Total</span></div>
            <div className="text-[10px] font-bold opacity-90 mt-1 uppercase">Loaded across {dispatchedToday.length} rolls</div>
          </div>
          <div className="bg-white/20 p-2 rounded-lg text-right">
            <div className="text-[10px] uppercase font-bold">Avg/Roll</div>
            <div className="text-sm font-bold">{(stats.dispWt / (dispatchedToday.length || 1)).toFixed(1)} kg</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100"><div className="text-gray-500 text-xs font-bold uppercase">In Stock</div><div className="text-2xl font-black text-blue-600">{inStock.length} <span className="text-xs font-normal">Rolls</span></div></div>
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100"><div className="text-gray-500 text-xs font-bold uppercase">Total Wt</div><div className="text-2xl font-black text-green-600">{formatCurrency(stats.stockWt)} <span className="text-xs font-normal">kg</span></div></div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow border border-gray-100"><h3 className="font-bold mb-4 text-gray-700 text-sm uppercase">By Quality</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={qualityData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label>{qualityData.map((e, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></div>

      {lowMaterials.length > 0 && (
        <div className="bg-red-50 p-4 rounded-xl border-l-4 border-red-500 shadow-sm border border-red-100">
          <h3 className="font-bold text-red-800 flex items-center gap-2 mb-2"><AlertCircle size={20} /> Low Material Alert</h3>
          <div className="space-y-2">
            {lowMaterials.map(m => (
              <div key={m.id} className="flex justify-between items-center bg-white p-2 rounded border border-red-100 text-sm shadow-sm">
                <span className="font-bold text-gray-700">{m.name}</span>
                <span className="font-bold text-red-600">{m.stock_quantity} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default DashboardView;