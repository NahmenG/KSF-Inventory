import React, { useMemo } from 'react';
import { TrendingUp, Clock, Wifi, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList 
} from 'recharts';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const formatCurrency = (val) => new Intl.NumberFormat('en-IN').format(val);

const DashboardView = React.memo(({ rolls, materials }) => {
  // 1. Logic for Stock Numbers
  const inStock = rolls.filter(r => r.status === 'in_stock');
  const totalWeight = inStock.reduce((acc, r) => acc + (parseFloat(r.net_weight) || 0), 0);
  
  // 2. Logic for Daily Velocity
  const today = new Date().toLocaleDateString();
  const producedToday = rolls.filter(r => new Date(r.created_at).toLocaleDateString() === today).length;
  const dispatchedToday = rolls.filter(r => r.status === 'dispatched' && new Date(r.dispatched_at).toLocaleDateString() === today).length;

  // 3. Logic for Aged Stock (> 30 Days)
  const agedStockBreakdown = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const aged = inStock.filter(r => new Date(r.created_at) < thirtyDaysAgo);
    const breakdown = {};
    aged.forEach(r => {
      breakdown[r.quality] = (breakdown[r.quality] || 0) + (parseFloat(r.net_weight) || 0);
    });
    return Object.keys(breakdown).map(k => ({ quality: k, weight: breakdown[k].toFixed(1) }));
  }, [inStock]);

  // 4. Chart Data Preparation
  const qualityData = useMemo(() => {
    const c = {};
    inStock.forEach(r => c[r.quality] = (c[r.quality] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.keys(c).map(k => ({ name: k, value: parseFloat(c[k].toFixed(1)) }));
  }, [inStock]);

  const colorData = useMemo(() => {
    const c = {};
    inStock.forEach(r => c[r.color] = (c[r.color] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.keys(c)
      .map(k => ({ name: k, count: parseFloat(c[k].toFixed(1)) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [inStock]);

  return (
    <div className="space-y-6 pb-20">
      {/* Velocity Card */}
      <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-600 border border-gray-100">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
          <TrendingUp size={18} /> Today's Velocity
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
            <div className="text-[10px] text-green-700 font-bold uppercase tracking-tight">Produced</div>
            <div className="text-2xl font-black text-green-800">{producedToday}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-center">
            <div className="text-[10px] text-orange-700 font-bold uppercase tracking-tight">Dispatched</div>
            <div className="text-2xl font-black text-orange-800">{dispatchedToday}</div>
          </div>
        </div>
      </div>

      {/* Totals Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex flex-col justify-center">
          <div className="text-gray-500 text-xs font-bold uppercase">Stock Count</div>
          <div className="text-3xl font-bold text-blue-600">{inStock.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex flex-col justify-center">
          <div className="text-gray-500 text-xs font-bold uppercase">Stock Weight</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalWeight)} <span className="text-sm font-normal">kg</span>
          </div>
        </div>
      </div>

      {/* Quality Chart */}
      <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
        <h3 className="font-bold mb-4 text-gray-700 text-sm uppercase tracking-wider">Weight by Quality</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={qualityData} 
                cx="50%" cy="50%" 
                innerRadius={60} 
                outerRadius={80} 
                paddingAngle={5} 
                dataKey="value" 
                label
              >
                {qualityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Color Chart */}
      <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
        <h3 className="font-bold mb-4 text-gray-700 text-sm uppercase tracking-wider">Top Colors in Stock</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={colorData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="count" position="right" style={{ fontSize: '12px', fill: '#666' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Aged Stock Section */}
      {agedStockBreakdown.length > 0 && (
        <div className="bg-orange-50 p-4 rounded-xl border-l-4 border-orange-500 shadow-sm border border-orange-100">
          <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
            <Clock size={20} /> Aged Stock Alert ({">"} 30 Days)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {agedStockBreakdown.map((item, i) => (
              <div key={i} className="bg-white p-2 rounded border border-orange-100 text-xs shadow-sm">
                <div className="text-gray-400 font-bold uppercase">{item.quality}</div>
                <div className="text-lg font-black text-orange-700">{item.weight} kg</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default DashboardView;