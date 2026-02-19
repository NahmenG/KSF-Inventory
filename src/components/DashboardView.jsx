import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { Package, TrendingUp, Scale, AlertTriangle, Layers, Activity, Truck, Calendar } from 'lucide-react';

const DashboardView = React.memo(({ rolls, materials }) => {
  // 1. COMPREHENSIVE STATS CALCULATION
  const stats = useMemo(() => {
    const inStockRolls = rolls.filter(r => r.status === 'in_stock');
    const dispatchedRolls = rolls.filter(r => r.status === 'dispatched');
    
    const stockWeight = inStockRolls.reduce((acc, r) => acc + (parseFloat(r.net_weight) || 0), 0);
    const dispatchWeight = dispatchedRolls.reduce((acc, r) => acc + (parseFloat(r.net_weight) || 0), 0);
    
    const alerts = materials.filter(m => m.stock_quantity <= m.min_level);
    
    return {
      stockCount: inStockRolls.length,
      stockWeight: stockWeight.toFixed(1),
      dispatchCount: dispatchedRolls.length,
      dispatchWeight: dispatchWeight.toFixed(1),
      alertCount: alerts.length
    };
  }, [rolls, materials]);

  // 2. QUALITY DISTRIBUTION DATA
  const qualityData = useMemo(() => {
    const counts = {};
    rolls.filter(r => r.status === 'in_stock').forEach(r => {
      counts[r.quality] = (counts[r.quality] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rolls]);

  // 3. MATERIAL INVENTORY STATUS DATA
  const materialData = useMemo(() => {
    return materials.map(m => ({
      name: m.name,
      stock: parseFloat(m.stock_quantity) || 0,
      min: parseFloat(m.min_level) || 0,
      shortage: Math.max(0, m.min_level - m.stock_quantity)
    }));
  }, [materials]);

  const COLORS = ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bae6fd'];

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-700">
      
      {/* SECTION 1: REFINED GLASS SUMMARY BAR */}
      {/* Replaces the heavy black bar with high-readability glass cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-md border border-gray-100 p-5 rounded-[2rem] shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 mb-2">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">In Stock</p>
            <h3 className="text-2xl font-black text-gray-800">{stats.stockCount}</h3>
            <p className="text-[10px] font-bold text-blue-500">{stats.stockWeight} kg</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-gray-100 p-5 rounded-[2rem] shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="bg-green-50 w-10 h-10 rounded-xl flex items-center justify-center text-green-600 mb-2">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Dispatched</p>
            <h3 className="text-2xl font-black text-gray-800">{stats.dispatchCount}</h3>
            <p className="text-[10px] font-bold text-green-600">{stats.dispatchWeight} kg</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-gray-100 p-5 rounded-[2rem] shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="bg-orange-50 w-10 h-10 rounded-xl flex items-center justify-center text-orange-600 mb-2">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Materials</p>
            <h3 className="text-2xl font-black text-gray-800">{materials.length}</h3>
            <p className="text-[10px] font-bold text-orange-500">Total Items</p>
          </div>
        </div>

        <div className={`backdrop-blur-md border p-5 rounded-[2rem] shadow-sm flex flex-col justify-between min-h-[120px] transition-colors ${stats.alertCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white/80 border-gray-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${stats.alertCount > 0 ? 'bg-white text-red-600 shadow-sm' : 'bg-gray-50 text-gray-400'}`}>
            <AlertTriangle size={20} className={stats.alertCount > 0 ? 'animate-pulse' : ''} />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Stock Alerts</p>
            <h3 className={`text-2xl font-black ${stats.alertCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>{stats.alertCount}</h3>
            <p className="text-[10px] font-bold text-red-400">Low Inventory</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* QUALITY PIE CHART */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
          <h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3 uppercase tracking-tight">
            <Layers className="text-blue-600" size={28} /> Quality Mix
          </h2>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={qualityData} 
                  innerRadius={70} 
                  outerRadius={100} 
                  paddingAngle={8} 
                  dataKey="value"
                  stroke="none"
                >
                  {qualityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MATERIAL BAR CHART */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
          <h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3 uppercase tracking-tight">
            <Activity className="text-green-600" size={28} /> Stock Levels
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={materialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="stock" fill="#1e40af" radius={[8, 8, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PRODUCTION TREND AREA CHART */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-sm border border-gray-50">
          <h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3 uppercase tracking-tight">
            <TrendingUp className="text-blue-700" size={28} /> Production Performance
          </h2>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={materialData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} hide />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="stock" 
                  stroke="#1e40af" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorProd)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DashboardView;