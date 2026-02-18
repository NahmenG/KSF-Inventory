import React, { useMemo } from 'react';
import { TrendingUp, Clock, AlertCircle, Package, History, BarChart3, PieChart as PieIcon, Edit3, Send, PlusCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const MAT_ORDER = { 'Polymers': 1, 'Filler': 2, 'Additives': 3, 'Colour': 4, 'Others': 5 };

const abbreviateColor = (name) => {
  if (!name) return 'N/A';
  return name
    .replace(/Royal Blue/gi, 'R.Blue')
    .replace(/Golden Yellow/gi, 'G.Yellow')
    .replace(/Lemon Yellow/gi, 'L.Yellow')
    .replace(/Parrot Green/gi, 'P.Green')
    .replace(/Bottle Green/gi, 'B.Green')
    .replace(/Sea Green/gi, 'S.Green')
    .replace(/Peacock Blue/gi, 'P.Blue')
    .replace(/Navy Blue/gi, 'N.Blue')
    .replace(/Baby Pink/gi, 'B.Pink')
    .replace(/Coffee Brown/gi, 'C.Brown')
    .replace(/Colour Change/gi, 'CC');
};

const DashboardView = React.memo(({ rolls, materials }) => {
  const inStock = rolls.filter(r => r.status === 'in_stock');
  const todayDate = new Date();
  const todayStr = todayDate.toLocaleDateString();
  
  // 1. Logic to determine Activity Type for Recent Activity
  const recentActivity = useMemo(() => {
    return [...rolls]
      .sort((a, b) => {
        // Sort by the latest available timestamp (either dispatched or created)
        const timeA = new Date(a.dispatched_at || a.created_at);
        const timeB = new Date(b.dispatched_at || b.created_at);
        return timeB - timeA;
      })
      .slice(0, 5)
      .map(r => {
        let activity = "Produced";
        let time = r.created_at;
        let icon = <PlusCircle size={14} className="text-green-500" />;

        if (r.status === 'dispatched') {
          activity = "Dispatched";
          time = r.dispatched_at || r.created_at;
          icon = <Send size={14} className="text-blue-500" />;
        } else if (r.updated_at && r.updated_at !== r.created_at) {
          // This logic assumes you have an updated_at column in your Supabase table
          activity = "Edited";
          time = r.updated_at;
          icon = <Edit3 size={14} className="text-orange-500" />;
        }

        return { ...r, activityType: activity, activityTime: time, activityIcon: icon };
      });
  }, [rolls]);

  // Rest of your logic (Timeline, Aged Stock, Charts, etc.)
  const timelineData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString();
    }).reverse();

    return last7Days.map(date => ({
      date: date.split('/')[0] + '/' + date.split('/')[1],
      Produced: rolls.filter(r => new Date(r.created_at).toLocaleDateString() === date).length,
      Dispatched: rolls.filter(r => r.status === 'dispatched' && new Date(r.dispatched_at).toLocaleDateString() === date).length
    }));
  }, [rolls]);

  const agedData = useMemo(() => {
    const aged = inStock.filter(r => {
      const diffDays = Math.ceil(Math.abs(todayDate - new Date(r.created_at)) / (1000 * 60 * 60 * 24));
      return diffDays > 30;
    });
    const weights = {};
    aged.forEach(r => { weights[r.quality] = (weights[r.quality] || 0) + (parseFloat(r.net_weight) || 0); });
    return Object.keys(weights).map(k => ({ quality: k, weight: weights[k].toFixed(1) }));
  }, [inStock, todayDate]);

  const qualityChartData = useMemo(() => {
    const c = {}; inStock.forEach(r => c[r.quality] = (c[r.quality] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.keys(c).map(k => ({ name: k, value: parseFloat(c[k].toFixed(1)) }));
  }, [inStock]);

  const colorChartData = useMemo(() => {
    const c = {}; inStock.forEach(r => c[r.color] = (c[r.color] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.keys(c).map(k => ({ name: abbreviateColor(k), weight: parseFloat(c[k].toFixed(1)) }));
  }, [inStock]);

  const sortedLowMaterials = useMemo(() => {
    return materials
      .filter(m => m.min_level > 0 && m.stock_quantity < m.min_level)
      .sort((a, b) => (MAT_ORDER[a.category] || 99) - (MAT_ORDER[b.category] || 99));
  }, [materials]);

  const stockWeight = inStock.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-500">
      
      {/* VELOCITY & TOTALS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
            <div className="text-[9px] text-gray-400 font-black uppercase">In Stock</div>
            <div className="text-xl font-black text-blue-600">{inStock.length} <span className="text-xs font-normal">Rolls</span></div>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
            <div className="text-[9px] text-gray-400 font-black uppercase">Total Weight</div>
            <div className="text-xl font-black text-green-600">{stockWeight.toFixed(1)} <span className="text-xs">kg</span></div>
        </div>
      </div>

      {/* UPDATED RECENT ACTIVITY CARD */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 bg-gray-50/50 border-b">
          <h3 className="font-black text-gray-400 text-[10px] uppercase flex items-center gap-2"><Clock size={14} /> Recent Log</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActivity.map((r, i) => (
            <div key={i} className="px-4 py-3 flex justify-between items-center transition-colors hover:bg-slate-50">
              <div className="flex-1">
                {/* FIRST LINE: Roll ID and Activity Type */}
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-black text-gray-900 text-sm tracking-tight">{r.product_id}</span>
                  <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                    {r.activityIcon}
                    <span className="text-[9px] font-black uppercase text-gray-600">{r.activityType}</span>
                  </div>
                </div>
                {/* SECOND LINE: Device Name */}
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                  Device: {r.device_name || 'System'}
                </div>
              </div>
              
              <div className="text-right">
                {/* FIRST LINE: Weight (Value context) */}
                <div className="font-black text-gray-900 text-sm leading-none mb-1">{r.net_weight} kg</div>
                {/* SECOND LINE: Time Stamp */}
                <div className="text-[10px] font-bold text-blue-500 uppercase">
                  {new Date(r.activityTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PRODUCTION VS DISPATCH TIMELINE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-black text-gray-400 text-[10px] uppercase mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-600" /> Production vs Dispatch (7 Days)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }} />
              <Bar dataKey="Produced" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Dispatched" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* REST OF DASHBOARD (STOCK OVER 30 DAYS, CHARTS, LOW MATERIALS) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 bg-red-50/30 border-b flex items-center gap-2">
          <History size={16} className="text-red-500" />
          <h3 className="font-black text-gray-400 text-[10px] uppercase">Stock Over 30 Days Old</h3>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          {agedData.map((d, i) => (
            <div key={i} className="bg-white border p-2 rounded-lg flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase">{d.quality}</span>
              <span className="text-sm font-black text-red-600">{d.weight} Kg</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-black text-gray-400 text-[10px] uppercase mb-4 flex items-center gap-2"><PieIcon size={14}/> Quality Breakdown (Kg)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={qualityChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                  {qualityChartData.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-black text-gray-400 text-[10px] uppercase mb-4 flex items-center gap-2"><BarChart3 size={14}/> Color Analysis (Kg)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={colorChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={9} interval={0} tick={{fill: '#4b5563', fontWeight: 'bold'}} />
                <YAxis fontSize={9} />
                <Tooltip />
                <Bar dataKey="weight" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {sortedLowMaterials.length > 0 && (
        <div className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm border border-gray-100">
          <h3 className="font-black text-red-800 flex items-center gap-2 mb-3 text-[10px] uppercase tracking-widest">
            <AlertCircle size={16} /> Material Replenishment
          </h3>
          <div className="space-y-2">
            {sortedLowMaterials.map(m => (
              <div key={m.id} className="flex justify-between items-center bg-red-50/50 p-2 rounded-lg border border-red-100">
                <div>
                  <div className="text-[11px] font-black text-gray-800">{m.name}</div>
                  <div className="text-[8px] text-red-400 font-bold uppercase">{m.category}</div>
                </div>
                <div className="text-sm font-black text-red-700">{m.stock_quantity} kg</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default DashboardView;