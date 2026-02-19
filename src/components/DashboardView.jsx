import React, { useMemo } from 'react';
import { TrendingUp, Clock, AlertCircle, Package, History, BarChart3, PieChart as PieIcon, Edit3, Send, PlusCircle, RotateCcw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#fb7185', '#2dd4bf'];
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
  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => todayDate.toLocaleDateString(), [todayDate]);
  
  // 1. MASTER DATA PROCESSOR (Original logic restored)
  const processedData = useMemo(() => {
    const inStock = [];
    const producedToday = [];
    const dispatchedToday = [];
    const agedMap = {};
    let totalAgedWeight = 0;
    const dateMap = {};
    const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);

    rolls.forEach(r => {
      const rDate = new Date(r.created_at);
      const rDateStr = rDate.toLocaleDateString();
      const weight = parseFloat(r.net_weight) || 0;

      if (r.status === 'in_stock') {
        inStock.push(r);
        const diffDays = Math.ceil(Math.abs(todayDate - rDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          agedMap[r.quality] = (agedMap[r.quality] || 0) + weight;
          totalAgedWeight += weight;
        }
      }

      if (rDateStr === todayStr) producedToday.push(r);
      if (r.status === 'dispatched' && r.dispatched_at) {
        if (new Date(r.dispatched_at).toLocaleDateString() === todayStr) dispatchedToday.push(r);
      }

      if (rDate >= startOfMonth) {
        if (!dateMap[rDateStr]) dateMap[rDateStr] = { p: 0, d: 0, pw: 0, dw: 0 };
        dateMap[rDateStr].p += 1;
        dateMap[rDateStr].pw += weight;
      }
      if (r.status === 'dispatched' && r.dispatched_at) {
        const dDate = new Date(r.dispatched_at);
        if (dDate >= startOfMonth) {
          const dStr = dDate.toLocaleDateString();
          if (!dateMap[dStr]) dateMap[dStr] = { p: 0, d: 0, pw: 0, dw: 0 };
          dateMap[dStr].d += 1;
          dateMap[dStr].dw += weight;
        }
      }
    });

    return { inStock, producedToday, dispatchedToday, agedMap, totalAgedWeight, dateMap };
  }, [rolls, todayStr, todayDate]);

  const { timelineData, totalProdMonth, totalDispMonth } = useMemo(() => {
    const data = [];
    let pSum = 0; let dSum = 0;
    const start = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    for (let d = new Date(start); d <= todayDate; d.setDate(d.getDate() + 1)) {
      const s = d.toLocaleDateString();
      const day = processedData.dateMap[s] || { p: 0, d: 0, pw: 0, dw: 0 };
      pSum += day.pw; dSum += day.dw;
      data.push({ date: d.getDate().toString(), Produced: day.p, Dispatched: day.d });
    }
    return { timelineData: data, totalProdMonth: (pSum / 1000).toFixed(2), totalDispMonth: (dSum / 1000).toFixed(2) };
  }, [processedData.dateMap, todayDate]);

  const recentActivity = useMemo(() => {
    return [...rolls]
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 5)
      .map(r => {
        let type = "Produced", icon = <PlusCircle size={14} className="text-green-500" />;
        if (r.status === 'dispatched') { type = "Dispatched"; icon = <Send size={14} className="text-blue-500" />; }
        else if (r.updated_at !== r.created_at) { type = "Edited"; icon = <Edit3 size={14} className="text-orange-500" />; }
        return { ...r, type, icon };
      });
  }, [rolls]);

  const qualityData = useMemo(() => {
    const c = {}; processedData.inStock.forEach(r => c[r.quality] = (c[r.quality] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.entries(c).map(([name, w]) => ({ name: `${name} (${(w/1000).toFixed(2)}T)`, value: w }));
  }, [processedData.inStock]);

  const colorData = useMemo(() => {
    const c = {}; processedData.inStock.forEach(r => c[r.color] = (c[r.color] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.entries(c).map(([n, w]) => ({ name: abbreviateColor(n), weight: parseFloat(w.toFixed(1)) }))
      .sort((a, b) => b.weight - a.weight).slice(0, 8);
  }, [processedData.inStock]);

  const weightKg = processedData.inStock.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-500">
      
      {/* SECTION 1: VELOCITY */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-500 border border-gray-100">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Production</div>
          <div className="text-2xl font-black text-gray-900">{processedData.producedToday.length} <span className="text-xs opacity-30">Rolls</span></div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 border border-gray-100">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Dispatch</div>
          <div className="text-2xl font-black text-gray-900">{processedData.dispatchedToday.length} <span className="text-xs opacity-30">Rolls</span></div>
        </div>
      </div>

      {/* SECTION 2: SUBTLE STOCK TOTALS (Updated to subtle transparent bg) */}
      <div className="bg-[#1a1f2c]/90 backdrop-blur-md text-white rounded-[2rem] p-6 shadow-2xl flex justify-around items-center border border-gray-800">
        <div className="text-center">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Stock Count</div>
          <div className="text-3xl font-black">{processedData.inStock.length}</div>
        </div>
        <div className="h-10 w-px bg-gray-700/50" />
        <div className="text-center">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Weight</div>
          <div className="text-3xl font-black text-green-400">{(weightKg/1000).toFixed(2)} <span className="text-xs font-normal text-white/50">Ton</span></div>
        </div>
      </div>

      {/* SECTION 3: TIMELINE CHART (Increased Title Font) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-sm md:text-base font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-blue-600"/> Performance (Monthly)
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" fontSize={9} tick={{fontWeight: 'bold'}} axisLine={false} tickLine={false} />
              <YAxis fontSize={9} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }} 
                formatter={(val) => val === 'Produced' ? `P (${totalProdMonth}T)` : `D (${totalDispMonth}T)`} />
              <Bar dataKey="Produced" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Dispatched" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 4: RECENT ACTIVITY LOG (Increased Title Font) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b flex items-center justify-between">
          <h3 className="text-sm md:text-base font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
            <Clock size={16}/> Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActivity.map((r, i) => (
            <div key={i} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-xl">{r.icon}</div>
                <div>
                  <div className="font-black text-sm text-gray-900 tracking-tight">{r.product_id}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">{r.type} • {r.device_name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-gray-900 text-sm">{r.net_weight} kg</div>
                <div className="text-[10px] font-bold text-blue-500">{new Date(r.updated_at || r.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: QUALITY BREAKDOWN (Increased Title Font) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-sm md:text-base font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 mb-4">
          <PieIcon size={16} className="text-blue-600"/> Quality Breakdown
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={qualityData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                {qualityData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />)}
              </Pie>
              <Tooltip />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 6: COLOR ANALYSIS (Increased Title Font) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-sm md:text-base font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-blue-600"/> Color Analysis (Kg)
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={colorData} layout="vertical" margin={{ left: 5, right: 35 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={85} fontSize={9} tick={{fontWeight: 'bold'}} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="weight" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="weight" position="right" style={{ fontSize: '9px', fontWeight: 'bold', fill: '#64748b' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 7: AGED STOCK (Increased Title Font) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-red-50/50 border-b flex items-center gap-2">
          <History size={16} className="text-red-500" />
          <h3 className="text-sm md:text-base font-black text-gray-800 uppercase tracking-widest">
            Aged Stock Over 30 Days ({(processedData.totalAgedWeight/1000).toFixed(2)}T)
          </h3>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2">
          {Object.entries(processedData.agedMap).map(([q, w], i) => (
            <div key={i} className="bg-gray-50 p-3 rounded-2xl flex justify-between items-center border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase">{q}</span>
              <span className="text-sm font-black text-red-600">{w.toFixed(1)} <span className="text-[10px] opacity-40">kg</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 8: MATERIAL ALERTS (Original UI preserved) */}
      {materials.filter(m => m.stock_quantity < m.min_level).length > 0 && (
        <div className="bg-white p-5 rounded-3xl border-l-8 border-red-500 shadow-sm border border-gray-100">
          <h3 className="font-black text-red-800 flex items-center gap-2 mb-3 text-sm md:text-base uppercase tracking-widest">
            <AlertCircle size={16}/> Material Shortage
          </h3>
          <div className="space-y-2">
            {materials.filter(m => m.stock_quantity < m.min_level).map(m => (
              <div key={m.id} className="flex justify-between items-center bg-red-50 p-3 rounded-2xl border border-red-100">
                <div className="font-black text-sm text-gray-800">{m.name}</div>
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