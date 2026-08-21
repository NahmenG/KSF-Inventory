import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { TrendingUp, Clock, AlertCircle, Package, History, BarChart3, PieChart as PieIcon, Edit3, Send, PlusCircle, Calculator, Activity, Truck, FileSpreadsheet, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';

// Components
import RateCalculator from './RateCalculator';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#fb7185', '#2dd4bf', '#a855f7', '#ec4899'];

const DashboardView = React.memo(({ rolls, materials, isAdmin, fetchData }) => {
  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => todayDate.toLocaleDateString(), [todayDate]);
  
  const [consumptionLogs, setConsumptionLogs] = useState([]);
  
  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase.from('consumption_logs').select('*');
      if (data) setConsumptionLogs(data);
    };
    fetchLogs();
  }, [rolls]);

  // 1. MASTER DATA PROCESSOR
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

  // 2. TIMELINE CALCULATIONS
  const { timelineData, totalProdMonth, totalDispMonth } = useMemo(() => {
    const data = [];
    let pSum = 0; let dSum = 0;
    const start = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const tempDate = new Date(start);
    while (tempDate <= todayDate) {
      const s = tempDate.toLocaleDateString();
      const day = processedData.dateMap[s] || { p: 0, d: 0, pw: 0, dw: 0 };
      pSum += day.pw; dSum += day.dw;
      data.push({ date: tempDate.getDate().toString(), Produced: day.p, Dispatched: day.d });
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return { timelineData: data, totalProdMonth: (pSum / 1000).toFixed(2), totalDispMonth: (dSum / 1000).toFixed(2) };
  }, [processedData.dateMap, todayDate]);

  // 3. DYNAMIC CONSUMPTION CHART PREP (Kg values, specific date format, stacking order, excluded items)
  const { consumptionChartData, uniqueMaterials, cumulativeTotals } = useMemo(() => {
    const dailyMap = {};
    const materialsSet = new Set();
    const totals = {};

    consumptionLogs.forEach(log => {
      if (!dailyMap[log.date]) {
        // Parse the YYYY-MM-DD date string down to just the two digit day
        const dayString = parseInt(log.date.split('-')[2], 10).toString();
        dailyMap[log.date] = { date: log.date, displayDate: dayString };
      }
      
      if (log.consumed_data && typeof log.consumed_data === 'object') {
        Object.entries(log.consumed_data).forEach(([matName, kgVal]) => {
          // EXCLUSION: Ignore any item matching "core pipe" from the graph dataset entirely
          if (matName.toLowerCase().includes('core pipe')) return;
          
          materialsSet.add(matName);
          const kg = parseFloat(kgVal) || 0;
          
          dailyMap[log.date][matName] = (dailyMap[log.date][matName] || 0) + kg;
          totals[matName] = (totals[matName] || 0) + kg;
        });
      }
    });

    // Rigid Stacking Order Algorithm (The lower the number, the lower on the bar stack)
    const getSortValue = (name) => {
      const lower = name.toLowerCase();
      // 1. Virgin PP
      if (lower.includes('pp') && !lower.includes('rpp') && !lower.includes('recycled')) return 10;
      // 2. Recycled PP
      if (lower.includes('rpp') || lower.includes('recycled')) return 20;
      
      // Fallback category mapping for other dynamic items
      const mat = materials.find(m => m.name === name);
      const cat = mat ? mat.category : 'Others';
      
      if (cat === 'Filler') return 30; // 3. Filler
      if (cat === 'Colour') return 40; // 4. Color
      if (cat === 'Additives') return 50; // 5. Additives
      return 60; // 6. Everything else on top
    };

    const sortedMaterials = Array.from(materialsSet).sort((a, b) => getSortValue(a) - getSortValue(b));
    // Sort array chronologically based on the original YYYY-MM-DD date format
    const sortedData = Object.values(dailyMap).sort((a,b) => a.date.localeCompare(b.date));

    return {
      consumptionChartData: sortedData,
      uniqueMaterials: sortedMaterials,
      cumulativeTotals: totals
    };
  }, [consumptionLogs, materials]);

  // 4. FACTORY REPORT EXPORT LOGIC
  const downloadFactoryReport = () => {
    const wb = XLSX.utils.book_new();

    const consumptionSheet = consumptionLogs.map(c => {
      const row = { "Date": c.date, "Shift": c.shift };
      if (c.consumed_data && typeof c.consumed_data === 'object') {
        Object.entries(c.consumed_data).forEach(([matName, kgVal]) => {
          row[`${matName} (kg)`] = kgVal;
        });
      }
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consumptionSheet), "Daily_Consumption");

    const statsSheet = Object.entries(processedData.dateMap).map(([date, data]) => ({
      "Date": date,
      "Total Produced Rolls": data.p,
      "Produced Weight (kg)": data.pw,
      "Total KSF Sales / Dispatched Rolls": data.d,
      "Dispatched Weight (kg)": data.dw
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsSheet), "Production_Sales_Report");

    XLSX.writeFile(wb, `KSF_Factory_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // RECENT ACTIVITY
  const recentActivity = useMemo(() => {
    const events = [];
    rolls.forEach(r => {
      if (r.created_at) {
        events.push({ id: `${r.product_id}-p`, productId: r.product_id, type: 'Produced', icon: <PlusCircle size={14} className="text-green-500" />, time: new Date(r.created_at), terminal: r.device_name || 'Production', weight: r.net_weight });
      }
      if (r.status === 'dispatched' && r.dispatched_at) {
        events.push({ id: `${r.product_id}-d`, productId: r.product_id, type: 'Sale', icon: <Send size={14} className="text-blue-500" />, time: new Date(r.dispatched_at), terminal: r.dispatched_by || 'KSF Logistics', weight: r.net_weight });
      }
    });
    return events.sort((a, b) => b.time - a.time).slice(0, 10);
  }, [rolls]);

  const qualityData = useMemo(() => {
    const c = {}; processedData.inStock.forEach(r => c[r.quality] = (c[r.quality] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.entries(c).map(([name, w]) => ({ name: `${name} (${(w/1000).toFixed(2)}T)`, value: w }));
  }, [processedData.inStock]);

  const weightKg = processedData.inStock.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-500">
      
      {/* 1. STAT CARDS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-500 border border-gray-100">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today Production</div>
          <div className="text-2xl font-black text-gray-900">{processedData.producedToday.length} <span className="text-xs opacity-30">Rolls</span></div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 border border-gray-100">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today KSF Sales</div>
          <div className="text-2xl font-black text-gray-900">{processedData.dispatchedToday.length} <span className="text-xs opacity-30">Rolls</span></div>
        </div>
      </div>

      {/* 2. STOCK TOTALS */}
      <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-2xl flex justify-around items-center border border-white/10">
        <div className="text-center">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">In Stock</div>
          <div className="text-3xl font-black">{processedData.inStock.length}</div>
        </div>
        <div className="h-10 w-px bg-white/20" />
        <div className="text-center">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Weight Stock</div>
          <div className="text-3xl font-black text-green-400">{(weightKg/1000).toFixed(2)} <span className="text-xs font-normal text-white/50">Ton</span></div>
        </div>
      </div>

      {/* --- FACTORY REPORT COMPONENT (DYNAMIC BARS) --- */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
            <Layers size={16} className="text-indigo-600"/> Daily Material Consumption (Kg)
          </h3>
          <button onClick={downloadFactoryReport} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm">
            <FileSpreadsheet size={14} /> Factory Report
          </button>
        </div>
        <div className="h-64 min-h-[256px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consumptionChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="displayDate" fontSize={9} tick={{fontWeight: 'bold'}} axisLine={false} tickLine={false} />
              <YAxis fontSize={9} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }} />
              
              {/* Iterating through strictly sorted list to enforce stacking order */}
              {uniqueMaterials.map((matName, index) => (
                <Bar 
                  key={matName} 
                  dataKey={matName} 
                  name={`${matName} (${cumulativeTotals[matName]} kg)`} 
                  stackId="a" 
                  fill={CHART_COLORS[index % CHART_COLORS.length]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. PERFORMANCE CHART */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-blue-600"/> Monthly Activity
        </h3>
        <div className="h-56 min-h-[224px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" fontSize={9} tick={{fontWeight: 'bold'}} axisLine={false} tickLine={false} />
              <YAxis fontSize={9} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
              
              <Legend 
                verticalAlign="top" 
                align="right" 
                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }} 
                formatter={(val) => val === 'Produced' ? `P (${totalProdMonth}T)` : `Sales (${totalDispMonth}T)`} 
              />

              <Bar dataKey="Produced" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Dispatched" name="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
            <Clock size={16}/> Recent Actions
          </h3>
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <Activity size={14} />
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActivity.map((r) => (
            <div key={r.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-xl">{r.icon}</div>
                <div>
                  <div className="font-black text-sm text-gray-900 tracking-tight">{r.productId}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                    {r.type} <span className="text-blue-500/60 mx-1">•</span> {r.terminal}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-gray-900 text-sm">{r.weight} kg</div>
                <div className="text-[10px] font-bold text-blue-500">{r.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. QUALITY MIX BREAKDOWN */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 mb-4">
          <PieIcon size={16} className="text-blue-600"/> Quality Mix
        </h3>
        <div className="h-64 min-h-[256px]">
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

      {/* 6. AGED STOCK */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-red-50/50 border-b flex items-center gap-2">
          <History size={16} className="text-red-500" />
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">
            Aged Stock ({">"}30 Days) - {(processedData.totalAgedWeight/1000).toFixed(2)}T
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

      {/* 7. SHORTAGE ALERTS */}
      {materials.filter(m => m.stock_quantity < m.min_level).length > 0 && (
        <div className="bg-white p-5 rounded-3xl border-l-8 border-red-500 shadow-sm border border-gray-100">
          <h3 className="font-black text-red-800 flex items-center gap-2 mb-3 text-sm uppercase tracking-widest">
            <AlertCircle size={16}/> Stock Warning
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

      {/* --- RATE CALCULATOR --- */}
      <div className="pt-6 border-t-2 border-slate-100 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calculator size={18} className="text-blue-600" />
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Fabric Rate Calculator</h3>
        </div>
        <RateCalculator isAdmin={isAdmin} fetchData={fetchData} />
      </div>

    </div>
  );
});

export default DashboardView;