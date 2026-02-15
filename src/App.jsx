import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import JsBarcode from 'jsbarcode';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
  AreaChart,
  Area
} from 'recharts';
import {
  Package,
  Truck,
  Layers,
  LogOut,
  Printer,
  Search,
  Download,
  Database,
  Clock,
  Trash2,
  X,
  Camera,
  Activity,
  CheckCircle,
  Filter,
  ToggleLeft,
  ToggleRight,
  Plus,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wifi,
  RotateCcw,
  FileSpreadsheet,
  Settings,
  AlertCircle,
  Edit3,
  FileText,
  Calendar,
  Eye,
  EyeOff,
  CloudOff,
  Loader,
  Hash,
  Image as ImageIcon,
  Share2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  User,
  BarChart2
} from 'lucide-react';
import { supabase } from './supabaseClient';

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("CRASH:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-900 min-h-screen flex flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-800">⚠️ Application Error</h1>
          <p className="mb-6 text-red-600">Something stopped the app. Try resetting below.</p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-200"
          >
            Clear Cache & Restart
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- GLOBAL UTILS ---
const safeJSONParse = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null') return fallback;
    return JSON.parse(item);
  } catch (e) {
    localStorage.removeItem(key);
    return fallback;
  }
};

const formatCurrency = (val) => new Intl.NumberFormat('en-IN').format(val);

// --- CONSTANTS ---
const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = [
  'White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow',
  'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue',
  'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'
];
const MAT_CATEGORIES = ['Colour', 'Filler', 'Additives', 'Polymers', 'Others'];
const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// --- DATA SERVICE ---
const DataService = {
  async getStock() {
    let allData = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('rolls')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + step - 1);
      if (error) {
        console.error(error);
        break;
      }
      if (!data || data.length === 0) break;
      allData = [...allData, ...data];
      if (data.length < step) break;
      from += step;
    }
    return allData;
  },

  async addRoll(roll, deviceName) {
    const { roll_seq, isOffline, ...cleanRollData } = roll;
    const rollWithDevice = {
      ...cleanRollData,
      device_name: deviceName,
      updated_at: new Date(),
      created_at: cleanRollData.created_at || new Date()
    };
    const { data, error } = await supabase.from('rolls').insert([rollWithDevice]).select();
    if (error) throw error;
    return data[0];
  },

  async updateRoll(id, updates, deviceName) {
    const updatesWithDevice = {
      ...updates,
      device_name: deviceName,
      updated_at: new Date()
    };
    const { error } = await supabase.from('rolls').update(updatesWithDevice).eq('id', id);
    if (error) throw error;
  },

  async deleteRoll(id) {
    await supabase.from('rolls').delete().eq('id', id);
  },

  async getRawMaterials() {
    const { data, error } = await supabase.from('raw_materials').select('*').order('name');
    return error ? [] : data;
  },

  async addRawMaterial(name, category, minLevel) {
    const newMat = { name, category, min_level: minLevel, stock_quantity: 0, unit: 'kg' };
    await supabase.from('raw_materials').insert([newMat]);
  },

  async editRawMaterial(id, updates) {
    const { error } = await supabase.from('raw_materials').update(updates).eq('id', id);
    if (error) throw error;
  },

  async updateRawMaterial(id, qty, isAddition, deviceName) {
    const { data } = await supabase.from('raw_materials').select('stock_quantity').eq('id', id).single();
    const currentQty = data ? parseFloat(data.stock_quantity) : 0;
    const newQty = currentQty + (isAddition ? parseFloat(qty) : -parseFloat(qty));
    await supabase.from('raw_materials').update({ stock_quantity: newQty, last_updated_by: deviceName }).eq('id', id);
  },

  async deleteRawMaterial(id) {
    await supabase.from('raw_materials').delete().eq('id', id);
  }
};

// --- HELPER: GENERATE EXCEL GATE PASS ---
const generateChallanExcel = (rolls, details) => {
  try {
    const header = [
      ["KSF NON WOVEN"],
      [],
      ["Date:", new Date().toLocaleDateString(), "Time:", new Date().toLocaleTimeString()],
      ["Buyer:", details.buyer, "Vehicle:", details.vehicle],
      [],
      ["Sr No", "Roll ID", "Quality", "Color", "Size (in)", "Length (m)", "GSM", "Gross Kg", "Net Kg"]
    ];
    const body = rolls.map((r, i) => [
      i + 1,
      r.product_id,
      r.quality,
      r.color,
      r.width_inches,
      r.length_meters,
      r.gsm,
      parseFloat(r.gross_weight) || 0,
      parseFloat(r.net_weight) || 0
    ]);
    const totalNet = rolls.reduce((sum, r) => sum + (parseFloat(r.net_weight) || 0), 0);
    const totalGross = rolls.reduce((sum, r) => sum + (parseFloat(r.gross_weight) || 0), 0);
    const footer = [
      [],
      ["", "", "", "", "", "", "Totals:", totalGross.toFixed(2), totalNet.toFixed(2)]
    ];
    const finalData = [...header, ...body, ...footer];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    ws['!cols'] = [
      { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }
    ];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
    XLSX.utils.book_append_sheet(wb, ws, "GatePass");
    const fileName = `GatePass_${details.buyer.replace(/\s/g, '_')}_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return true;
  } catch (err) {
    console.error(err);
    alert("Excel Error: " + err.message);
    return false;
  }
};

// --- ANALYTICS COMPONENT ---
const AnalyticsView = ({ rolls, selectedMonth }) => {
  const data = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const daily = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${selectedMonth}-${String(i).padStart(2, '0')}`;
      const produced = rolls.filter(r => r.created_at.startsWith(dateStr));
      const dispatched = rolls.filter(r => r.status === 'dispatched' && r.dispatched_at?.startsWith(dateStr));

      const prodWt = produced.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0);
      const dispWt = dispatched.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0);
      const grossWt = produced.reduce((s, r) => s + (parseFloat(r.gross_weight) || 0), 0);

      daily.push({
        day: i,
        production: parseFloat(prodWt.toFixed(1)),
        dispatch: parseFloat(dispWt.toFixed(1)),
        consumption: parseFloat(grossWt.toFixed(1)),
        wastage: parseFloat(Math.max(0, grossWt - prodWt).toFixed(1))
      });
    }
    return daily;
  }, [rolls, selectedMonth]);

  const totals = useMemo(() => ({
    prod: data.reduce((s, d) => s + d.production, 0).toFixed(1),
    disp: data.reduce((s, d) => s + d.dispatch, 0).toFixed(1),
    waste: data.reduce((s, d) => s + d.wastage, 0).toFixed(1)
  }), [data]);

  return (
    <div className="space-y-8 mt-6">
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <TrendingUp size={18} /> Production vs Dispatch (kg)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" fontSize={10} />
              <YAxis fontSize={10} />
              <RechartsTooltip />
              <Legend verticalAlign="top" height={36} />
              <Area name={`Prod Total: ${totals.prod}kg`} type="monotone" dataKey="production" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
              <Area name={`Disp Total: ${totals.disp}kg`} type="monotone" dataKey="dispatch" stroke="#ea580c" fill="#ffedd5" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Activity size={18} /> Consumption & Wastage Analysis
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" fontSize={10} />
              <YAxis fontSize={10} />
              <RechartsTooltip />
              <Legend verticalAlign="top" height={36} />
              <Bar name="Consumption" dataKey="consumption" fill="#94a3b8" radius={[2, 2, 0, 0]} />
              <Bar name={`Wastage Total: ${totals.waste}kg`} dataKey="wastage" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const Header = React.memo(({ isGuest, deviceName, onLogout, onEditDeviceName, onOpenSettings, onManualSync, isSyncing, offlineCount, onLogoClick }) => (
  <header className="bg-white border-b border-gray-200 fixed top-0 w-full z-50 h-16 shadow-sm px-4 flex justify-between items-center print:hidden">
    <div
      onClick={onLogoClick}
      className="flex items-center pl-1 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
    >
      <img src="/logo.png" alt="KSF" className="h-10 w-auto object-contain" />
    </div>
    <div className="flex items-center gap-2 text-sm">
      {!isGuest && (
        <>
          <button
            onClick={onManualSync}
            disabled={isSyncing}
            className={`p-2 rounded-full relative ${isSyncing ? 'text-blue-500 bg-blue-50' : (offlineCount > 0 ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-500 hover:bg-gray-100')}`}
          >
            <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
            {offlineCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {offlineCount}
              </span>
            )}
          </button>
          <div
            onClick={onEditDeviceName}
            className="font-bold cursor-pointer bg-gray-100 px-3 py-1 rounded-full text-xs md:text-sm"
          >
            {deviceName || 'Device'} ✎
          </div>
          <button onClick={onOpenSettings} className="text-gray-600 hover:bg-gray-100 p-2 rounded-full">
            <Settings size={20} />
          </button>
        </>
      )}
      <button onClick={onLogout} className="text-red-600 font-bold hover:bg-red-50 px-2 py-1 rounded">
        <LogOut size={20} />
      </button>
    </div>
  </header>
));

const BottomNav = React.memo(({ activeTab, setTab, isGuest }) => {
  const tabs = [
    !isGuest && { id: 'entry', label: 'Add', icon: Plus },
    { id: 'stock', label: 'Stock', icon: Database },
    { id: 'dispatch', label: 'Disp', icon: Truck },
    { id: 'history', label: 'Hist', icon: Clock },
    { id: 'materials', label: 'Mat', icon: Layers }
  ].filter(Boolean);

  return (
    <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full z-50 h-16 flex justify-around items-center pb-1 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] font-bold">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
});

const DashboardView = React.memo(({ rolls, materials }) => {
  const inStock = rolls.filter(r => r.status === 'in_stock');
  const totalWeight = inStock.reduce((acc, r) => acc + (parseFloat(r.net_weight) || 0), 0);
  const today = new Date().toLocaleDateString();
  const producedToday = rolls.filter(r => new Date(r.created_at).toLocaleDateString() === today).length;
  const dispatchedToday = rolls.filter(r => r.status === 'dispatched' && new Date(r.dispatched_at).toLocaleDateString() === today).length;

  const lowStockMaterials = useMemo(() => {
    const priority = { 'Polymers': 1, 'Filler': 2, 'Additives': 3, 'Colour': 4, 'Others': 5 };
    return (materials || [])
      .filter(m => { const limit = parseFloat(m.min_level); return limit > 0 && m.stock_quantity < limit; })
      .sort((a, b) => (priority[a.category] || 99) - (priority[b.category] || 99));
  }, [materials]);

  const agedStockBreakdown = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const aged = inStock.filter(r => new Date(r.created_at) < thirtyDaysAgo);
    const breakdown = {};
    aged.forEach(r => breakdown[r.quality] = (breakdown[r.quality] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.keys(breakdown).map(k => ({ quality: k, weight: breakdown[k].toFixed(1) }));
  }, [inStock]);

  const qualityData = useMemo(() => {
    const c = {}; inStock.forEach(r => c[r.quality] = (c[r.quality] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.keys(c).map(k => ({ name: k, value: parseFloat(c[k].toFixed(1)) }));
  }, [inStock]);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-600 border border-gray-100">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3"><TrendingUp size={18} /> Today's Velocity</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
            <div className="text-[10px] text-green-700 font-bold uppercase tracking-tight">Produced</div>
            <div className="text-2xl font-black text-green-800">{producedToday}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
            <div className="text-[10px] text-orange-700 font-bold uppercase tracking-tight">Dispatched</div>
            <div className="text-2xl font-black text-orange-800">{dispatchedToday}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-400 text-[10px] font-bold uppercase">Stock count</div>
          <div className="text-3xl font-black text-blue-600">{inStock.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-400 text-[10px] font-bold uppercase">Total weight</div>
          <div className="text-2xl font-black text-green-600">{formatCurrency(totalWeight)} <span className="text-xs font-normal">kg</span></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold mb-4 text-gray-700">Stock by Quality (kg)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={qualityData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label>
                {qualityData.map((entry, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {lowStockMaterials.length > 0 && (
        <div className="bg-red-50 p-4 rounded-xl border-l-4 border-red-500 shadow-sm border border-red-100">
          <h3 className="font-bold text-red-800 flex items-center gap-2 mb-2"><AlertCircle size={20} /> Low Material Alert</h3>
          <div className="space-y-2">
            {lowStockMaterials.map(m => (
              <div key={m.id} className="flex justify-between items-center bg-white p-2 rounded border border-red-100 text-sm shadow-sm">
                <div>
                  <span className="font-bold text-gray-700 block">{m.name}</span>
                  <span className="text-[10px] uppercase text-gray-400 font-bold">{m.category}</span>
                </div>
                <span className="font-bold text-red-600">{m.stock_quantity} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {agedStockBreakdown.length > 0 && (
        <div className="bg-orange-50 p-4 rounded-xl border-l-4 border-orange-500 shadow-sm border border-orange-100">
          <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
            <Clock size={20} /> Aged Stock Alert ({" > "} 30 Days)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {agedStockBreakdown.map((item, i) => (
              <div key={i} className="bg-white p-2 rounded border border-orange-100 text-xs">
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

const NewProductView = React.memo(({ formData, setFormData, onSubmit, isSaving, rolls }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);
  const existingCustomers = useMemo(() => {
    const names = rolls.map(r => r.customer_name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [rolls]);
  const filteredSuggestions = useMemo(() => {
    const typed = formData.customer_name?.toLowerCase() || '';
    if (!typed) return [];
    return existingCustomers.filter(name => name.toLowerCase().includes(typed) && name.toLowerCase() !== typed);
  }, [existingCustomers, formData.customer_name]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (suggestionRef.current && !suggestionRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleValueChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    if (field === 'width_inches' || field === 'gross_weight') {
      const width = parseFloat(field === 'width_inches' ? value : formData.width_inches);
      const gross = parseFloat(field === 'gross_weight' ? value : formData.gross_weight);
      if (!isNaN(width) && !isNaN(gross) && width > 0) {
        const coreWeight = (width / 63);
        const net = gross - coreWeight;
        newFormData.net_weight = net.toFixed(2);
      }
    }
    setFormData(newFormData);
    if (field === 'customer_name') setShowSuggestions(true);
  };

  const selectSuggestion = (name) => { setFormData({ ...formData, customer_name: name }); setShowSuggestions(false); };
  const [rollPrefix, setRollPrefix] = useState(() => localStorage.getItem('ksf_roll_prefix') || 'R');
  const [rollSeq, setRollSeq] = useState(() => localStorage.getItem('ksf_roll_sequence') || '1001');

  useEffect(() => { setFormData(prev => ({ ...prev, roll_seq: rollSeq })); }, [rollSeq, setFormData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullId = `${rollPrefix}-${rollSeq}`;
    try {
      const success = await onSubmit(e, fullId);
      if (success) {
        const nextSeq = String(Number(rollSeq) + 1);
        setRollSeq(nextSeq);
        localStorage.setItem('ksf_roll_sequence', nextSeq);
        localStorage.setItem('ksf_roll_prefix', rollPrefix);
      }
    } catch (err) { console.error("Save interrupted:", err); }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border mt-2 pb-24 border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2"><Package className="text-blue-600" /> New Entry</h2>
        <button onClick={() => setFormData({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' })} className="text-xs font-bold text-red-500 border border-red-100 bg-red-50 px-2 py-1 rounded">
          <RotateCcw size={12} /> Clear Form
        </button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-xs font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><Hash size={12} /> Roll ID</label>
          <div className="flex gap-2 w-full">
            <input type="text" className="w-[35%] border-2 border-blue-100 bg-blue-50 p-3 rounded text-lg font-bold text-blue-900 focus:border-blue-500 outline-none uppercase" value={rollPrefix} onChange={(e) => { setRollPrefix(e.target.value.toUpperCase()); localStorage.setItem('ksf_roll_prefix', e.target.value.toUpperCase()); }} />
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xl font-bold text-gray-400">-</span>
              <input type="number" required className="w-full border-2 border-blue-100 bg-blue-50 p-3 rounded text-lg font-bold text-blue-900 focus:border-blue-500 outline-none" value={rollSeq} onChange={(e) => { setRollSeq(e.target.value); localStorage.setItem('ksf_roll_sequence', e.target.value); }} />
            </div>
          </div>
        </div>

        <div className="col-span-2 relative" ref={suggestionRef}>
          <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><User size={12}/> Customer</label>
          <input required autoComplete="off" className="w-full border-b-2 border-gray-200 bg-gray-50 p-3 rounded focus:border-blue-500 outline-none transition-all" value={formData.customer_name} onChange={e => handleValueChange('customer_name', e.target.value)} onFocus={() => setShowSuggestions(true)} />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-b-lg shadow-2xl max-h-48 overflow-y-auto mt-1 border-t-0">
              {filteredSuggestions.map((name, i) => (
                <div key={i} onClick={() => selectSuggestion(name)} className="p-3 border-b hover:bg-blue-50 cursor-pointer text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" /> {name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div><label className="text-xs font-bold text-gray-500 uppercase">Quality</label><select required className="w-full border p-3 rounded bg-white" value={formData.quality} onChange={e => handleValueChange('quality', e.target.value)}><option value="">Select...</option>{QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}</select></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Color</label><select required className="w-full border p-3 rounded bg-white" value={formData.color} onChange={e => handleValueChange('color', e.target.value)}><option value="">Select...</option>{COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="col-span-2 grid grid-cols-3 gap-3">
          <div><label className="text-xs font-bold text-gray-500 uppercase">GSM</label><input type="number" className="w-full border p-3 rounded" value={formData.gsm} onChange={e => handleValueChange('gsm', e.target.value)} /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Width (in)</label><input type="number" className="w-full border p-3 rounded" value={formData.width_inches} onChange={e => handleValueChange('width_inches', e.target.value)} /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Length (m)</label><input type="number" className="w-full border p-3 rounded" value={formData.length_meters} onChange={e => handleValueChange('length_meters', e.target.value)} /></div>
        </div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Gross Kg</label><input type="number" className="w-full border p-3 rounded" value={formData.gross_weight} onChange={e => handleValueChange('gross_weight', e.target.value)} /></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Net Kg</label><input type="number" className="w-full border-2 border-blue-100 p-3 rounded font-bold text-blue-900" value={formData.net_weight} onChange={e => handleValueChange('net_weight', e.target.value)} /></div>
        
        <button type="submit" disabled={isSaving} className={`col-span-2 p-4 rounded-xl font-bold mt-4 shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${isSaving ? 'bg-gray-400' : 'bg-blue-600 text-white shadow-blue-100'}`}>
          {isSaving ? <><Loader className="animate-spin" size={20} /> Saving...</> : 'Save & Print Label'}
        </button>
      </form>
    </div>
  );
});

const StockView = React.memo(({ rolls = [], onPrint, onSelectRoll }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [textSearch, setTextSearch] = useState(() => localStorage.getItem('ksf_filter_text') || '');
  const [filterQuality, setFilterQuality] = useState(() => localStorage.getItem('ksf_filter_quality') || '');
  const [filterColor, setFilterColor] = useState(() => localStorage.getItem('ksf_filter_color') || '');
  const [filterGSM, setFilterGSM] = useState(() => localStorage.getItem('ksf_filter_gsm') || '');
  const [filterWidth, setFilterWidth] = useState(() => localStorage.getItem('ksf_filter_width') || '');
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('ksf_stock_sort') || 'newest');

  useEffect(() => {
    localStorage.setItem('ksf_filter_text', textSearch);
    localStorage.setItem('ksf_filter_quality', filterQuality);
    localStorage.setItem('ksf_filter_color', filterColor);
    localStorage.setItem('ksf_filter_gsm', filterGSM);
    localStorage.setItem('ksf_filter_width', filterWidth);
    localStorage.setItem('ksf_stock_sort', sortOrder);
  }, [textSearch, filterQuality, filterColor, filterGSM, filterWidth, sortOrder]);

  const safeRolls = Array.isArray(rolls) ? rolls : [];
  const filtered = useMemo(() => {
    const list = safeRolls.filter(r => {
      if (r.status !== 'in_stock') return false;
      if (textSearch) {
        const terms = textSearch.toLowerCase().split(' ').filter(t => t.trim() !== '');
        const isMatch = terms.every(term => {
          if (/^\d+gsm$/.test(term)) return r.gsm == parseFloat(term);
          if (/^\d+in$/.test(term)) return r.width_inches == parseFloat(term);
          return `${r.product_id} ${r.customer_name || ''} ${r.quality || ''} ${r.color || ''}`.toLowerCase().includes(term);
        });
        if (!isMatch) return false;
      }
      if (filterQuality && r.quality !== filterQuality) return false;
      if (filterColor && r.color !== filterColor) return false;
      if (filterGSM && String(r.gsm) !== String(filterGSM)) return false;
      if (filterWidth && String(r.width_inches) !== String(filterWidth)) return false;
      return true;
    });
    return list.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [safeRolls, textSearch, filterQuality, filterColor, filterGSM, filterWidth, sortOrder]);

  const totalFilteredWeight = filtered.reduce((s, r) => s + (Number(r.net_weight) || 0), 0);
  const clearFilters = () => { setTextSearch(''); setFilterQuality(''); setFilterColor(''); setFilterGSM(''); setFilterWidth(''); };

  const handleExportFiltered = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      "Roll ID": r.product_id,
      "Customer": r.customer_name,
      "Quality": r.quality,
      "Color": r.color,
      "GSM": r.gsm,
      "Size": r.width_inches,
      "Length": r.length_meters,
      "Gross Weight": r.gross_weight,
      "Net Weight": r.net_weight,
      "Status": r.status,
      "Date Added": new Date(r.created_at).toLocaleString()
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, `Stock_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4 h-full flex flex-col relative pb-20">
      <div className="sticky top-16 z-20 bg-slate-50 pt-3 pb-2 px-1">
        <div className="bg-white p-3 rounded shadow-sm flex flex-col gap-3 border border-gray-100">
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2 border p-2 rounded bg-gray-50 items-center focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search className="text-gray-400" size={20} />
              <input className="w-full outline-none bg-transparent" placeholder="Search stock..." value={textSearch} onChange={e => setTextSearch(e.target.value)} />
            </div>
            <button onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')} className={`p-2 rounded border transition-colors ${sortOrder === 'oldest' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
              {sortOrder === 'newest' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded border transition-colors ${showFilters ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white hover:bg-gray-50'}`}><Filter size={20} /></button>
            <button onClick={handleExportFiltered} className="bg-green-100 text-green-700 px-3 rounded text-sm font-bold flex items-center gap-1 hover:bg-green-200 transition-colors shadow-sm"><Download size={14} /> XLS</button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-2 border-t pt-2">
              <select className="border p-2 rounded text-sm outline-none" value={filterQuality} onChange={e => setFilterQuality(e.target.value)}><option value="">All Qualities</option>{QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}</select>
              <select className="border p-2 rounded text-sm outline-none" value={filterColor} onChange={e => setFilterColor(e.target.value)}><option value="">All Colors</option>{COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <input className="border p-2 rounded text-sm outline-none" placeholder="GSM" value={filterGSM} onChange={e => setFilterGSM(e.target.value)} type="number" />
              <input className="border p-2 rounded text-sm outline-none" placeholder="Width" value={filterWidth} onChange={e => setFilterWidth(e.target.value)} type="number" />
              <button onClick={clearFilters} className="col-span-2 md:col-span-4 text-xs text-red-500 font-bold py-1 hover:bg-red-50 rounded">Clear Filters</button>
            </div>
          )}
          <div className="bg-gray-900 text-white p-3 rounded-lg flex justify-between items-center text-sm shadow-inner">
            <div><div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Found</div><div className="font-bold">{filtered.length} Rolls</div></div>
            <div className="text-right"><div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Total Weight</div><div className="font-bold text-lg text-yellow-400">{formatCurrency(totalFilteredWeight)} kg</div></div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-24 px-1">
        {filtered.length === 0 ? (<div className="text-center text-gray-400 mt-10">No matching rolls found.</div>) : filtered.map(r => (
          <div key={r.id || r.product_id} onClick={() => onSelectRoll(r)} className={`bg-white p-4 rounded-xl border mb-2 shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all ${r.isOffline ? 'border-l-4 border-l-yellow-400' : 'border-gray-100 hover:border-blue-200'}`}>
            <div>
              <div className="font-bold text-blue-600 text-lg flex items-center gap-2">{r.product_id} {r.isOffline && <span className="bg-yellow-100 text-yellow-800 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1"><CloudOff size={10} /> PENDING</span>}</div>
              <div className="text-[10px] text-gray-400 mb-1 tracking-tight">{r.created_at ? new Date(r.created_at).toLocaleString() : 'Date Unknown'}</div>
              <div className="font-semibold text-gray-800">{r.customer_name}</div>
              <div className="text-xs text-gray-500 mt-1 inline-flex gap-2 flex-wrap"><span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{r.quality}</span><span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{r.color}</span><span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{r.gsm} GSM</span></div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl text-gray-900">{r.net_weight} <span className="text-xs font-normal text-gray-400">kg</span></div>
              <button onClick={(e) => { e.stopPropagation(); onPrint(r); }} className="mt-2 bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100 active:scale-90 transition-all"><Printer size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const DispatchView = React.memo(({ rolls, isGuest, deviceName, onDispatch, onUndoDispatch }) => {
  const [scanId, setScanId] = useState('');
  const [reviewData, setReviewData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [sessionList, setSessionList] = useState(() => safeJSONParse('ksf_dispatch_list_v10', []));
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('ksf_dispatch_customer_v10') || '');
  const [vehicleNo, setVehicleNo] = useState(() => localStorage.getItem('ksf_dispatch_vehicle_v10') || '');

  useEffect(() => {
    localStorage.setItem('ksf_dispatch_list_v10', JSON.stringify(sessionList));
    localStorage.setItem('ksf_dispatch_customer_v10', customerName);
    localStorage.setItem('ksf_dispatch_vehicle_v10', vehicleNo);
  }, [sessionList, customerName, vehicleNo]);

  const handleSearch = (idToSearch) => {
    const query = idToSearch || scanId;
    const roll = (rolls || []).find(r => r.product_id === query && r.status === 'in_stock');
    if (roll) {
      if (sessionList.some(r => r.id === roll.id)) { alert("Already in list!"); setScanId(''); return; }
      setReviewData(roll);
    } else { alert('Roll not found or dispatched.'); }
    setScanId('');
  };

  const handleConfirmDispatch = async () => {
    if (!reviewData) return;
    await onDispatch(reviewData);
    setSessionList(prev => [reviewData, ...prev]);
    setReviewData(null);
  };

  const handleRemoveFromManifest = async (index, item) => {
    if (confirm("Remove this roll?")) {
      await onUndoDispatch(item.id);
      const newList = [...sessionList];
      newList.splice(index, 1);
      setSessionList(newList);
    }
  };

  const handlePrint = () => {
    if (generateChallanExcel(sessionList, { buyer: customerName, vehicle: vehicleNo, device: deviceName })) {
      if (confirm("Start new batch?")) { setSessionList([]); setCustomerName(''); setVehicleNo(''); }
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {isScanning && <BarcodeScanner onScan={(txt) => { setIsScanning(false); handleSearch(txt); }} onClose={() => setIsScanning(false)} />}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-xl text-white shadow-lg">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={20} /> Dispatch Manifest</h3>
        <div className="grid grid-cols-2 gap-2">
          <input className="w-full p-2 rounded text-black text-sm outline-none" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <input className="w-full p-2 rounded text-black text-sm outline-none" placeholder="Vehicle No" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
        </div>
      </div>

      {!reviewData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center border-gray-100">
          <div className="flex gap-2 mb-4">
            <input className="flex-1 border-2 border-gray-200 p-3 rounded-lg text-center text-lg font-mono tracking-wider focus:border-blue-500 outline-none transition-all" placeholder="Enter / Scan ID" value={scanId} onChange={e => setScanId(e.target.value)} />
            <button onClick={() => setIsScanning(true)} className="bg-gray-900 text-white p-3 rounded-lg hover:bg-black transition-colors"><Camera size={24} /></button>
          </div>
          <button onClick={() => handleSearch()} className="bg-blue-600 text-white w-full py-4 rounded-lg font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all">Search Roll</button>
        </div>
      )}

      {reviewData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg flex items-center gap-2 text-blue-600"><Edit3 size={18} /> Verify & Dispatch</h3>
              <button onClick={() => setReviewData(null)} className="bg-gray-100 p-1 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
            </div>

            <div className="bg-blue-50 p-3 rounded text-center mb-4 border border-blue-100">
              <div className="text-xs font-bold text-blue-400 uppercase">Roll ID</div>
              <div className="text-xl font-black text-blue-800 tracking-widest">{reviewData.product_id}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Customer</label>
                <input className="w-full border p-2 rounded bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100" value={reviewData.customer_name} onChange={e => setReviewData({ ...reviewData, customer_name: e.target.value })} />
              </div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">Quality</label><select className="w-full border p-2 rounded bg-white text-sm outline-none" value={reviewData.quality} onChange={e => setReviewData({ ...reviewData, quality: e.target.value })}>{QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}</select></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">Color</label><select className="w-full border p-2 rounded bg-white text-sm outline-none" value={reviewData.color} onChange={e => setReviewData({ ...reviewData, color: e.target.value })}>{COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">GSM</label><input type="number" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-100" value={reviewData.gsm} onChange={e => setReviewData({ ...reviewData, gsm: e.target.value })} /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">Size (in)</label><input type="number" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-100" value={reviewData.width_inches} onChange={e => setReviewData({ ...reviewData, width_inches: e.target.value })} /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">Net Kg</label><input type="number" className="w-full border-2 border-green-500 p-2 rounded font-bold text-green-700 outline-none" value={reviewData.net_weight} onChange={e => setReviewData({ ...reviewData, net_weight: e.target.value })} /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">Gross Kg</label><input type="number" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-100" value={reviewData.gross_weight} onChange={e => setReviewData({ ...reviewData, gross_weight: e.target.value })} /></div>
            </div>

            <button onClick={handleConfirmDispatch} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-100 flex items-center justify-center gap-2 active:scale-95 transition-all">
              <CheckCircle size={20} /> Confirm & Add
            </button>
          </div>
        </div>
      )}

      {sessionList.length > 0 && (
        <div className="bg-white rounded-xl shadow border overflow-hidden border-gray-100">
          <div className="p-3 bg-gray-50 border-b flex justify-between font-bold text-gray-500 text-sm">
            <span>Items: {sessionList.length}</span>
            <span>Total: {sessionList.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0).toFixed(1)} kg</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {sessionList.map((item, i) => (
              <div key={i} className="p-3 border-b flex justify-between items-center last:border-0 hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-mono text-gray-800 font-bold">{item.product_id}</div>
                  <div className="text-xs text-gray-500 mt-0.5 tracking-tight">
                    {item.quality} • {item.color} • {item.gsm} GSM • {item.width_inches}"
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900">{item.net_weight} <span className="text-xs font-normal text-gray-400">kg</span></div>
                  <button onClick={() => handleRemoveFromManifest(i, item)} className="text-xs text-red-500 border border-red-100 bg-red-50 px-2 py-0.5 rounded mt-1 hover:bg-red-100 transition-colors">Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50 border-t">
            <button onClick={handlePrint} className="w-full bg-green-700 text-white py-4 rounded-xl font-bold flex justify-center gap-2 items-center hover:bg-green-800 shadow-lg active:scale-95 transition-all"><FileSpreadsheet size={20} /> Generate Excel Gate Pass</button>
          </div>
        </div>
      )}
    </div>
  );
});

const HistoryView = React.memo(({ rolls, onExport, onSelectRoll, onOpenReports }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchText, setSearchText] = useState('');
  const history = useMemo(() => {
    let list = (rolls || []).filter(r => r.status === 'dispatched');
    if (startDate) list = list.filter(r => new Date(r.dispatched_at) >= new Date(startDate));
    if (endDate) list = list.filter(r => new Date(r.dispatched_at) <= new Date(endDate + 'T23:59:59'));
    if (searchText) {
      const lower = searchText.toLowerCase();
      list = list.filter(r => (r.customer_name && r.customer_name.toLowerCase().includes(lower)) || (r.product_id && r.product_id.toLowerCase().includes(lower)) || (r.quality && r.quality.toLowerCase().includes(lower)));
    }
    list.sort((a, b) => new Date(b.dispatched_at) - new Date(a.dispatched_at));
    return list;
  }, [rolls, startDate, endDate, searchText]);
  const totalWeight = history.reduce((sum, r) => sum + (parseFloat(r.net_weight) || 0), 0);
  return (
    <div className="pb-24">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl">History</h2>
        <div className="flex gap-2">
          <button onClick={onOpenReports} className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow hover:bg-blue-700 transition-colors"><FileText size={16} /> Reports</button>
          <button onClick={() => onExport(history)} className="bg-green-100 text-green-700 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1 hover:bg-green-200 transition-colors"><Download size={16} /> List</button>
        </div>
      </div>
      <div className="sticky top-16 z-20 bg-slate-50 pt-1 pb-2">
        <div className="bg-white p-4 rounded-xl shadow-sm mb-4 space-y-3 border border-gray-100">
          <div className="flex gap-2 border p-2 rounded-lg bg-gray-50 items-center focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="text-gray-400" size={20} />
            <input className="w-full outline-none bg-transparent text-sm" placeholder="Search customer or ID..." value={searchText} onChange={e => setSearchText(e.target.value)} />
            {searchText && <button onClick={() => setSearchText('')}><X size={16} className="text-gray-400" /></button>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Start Date</label>
              <input type="date" className="w-full border p-2 rounded text-sm outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">End Date</label>
              <input type="date" className="w-full border p-2 rounded text-sm outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg flex justify-between items-center mb-3 text-sm border border-gray-200 shadow-inner">
          <span className="font-bold text-gray-600">{history.length} Rolls Dispatched</span>
          <span className="font-bold text-blue-700">{formatCurrency(totalWeight)} kg</span>
        </div>
      </div>
      <div className="px-1 overflow-y-auto">
      {history.length === 0 ? <div className="text-center text-gray-400 mt-10">No records found.</div> : history.map(r => (
        <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-3 rounded-xl border mb-2 text-sm shadow-sm hover:border-blue-200 cursor-pointer transition-colors">
          <div className="flex justify-between mb-1">
            <span className="font-bold text-gray-800">{r.customer_name || 'Unknown'}</span>
            <span className="text-green-600 font-bold">{r.net_weight} kg</span>
          </div>
          <div className="flex justify-between text-gray-500 text-[11px] tracking-tight">
            <span>{r.product_id} • {r.quality}</span>
            <span>{new Date(r.dispatched_at).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
});

const MaterialsView = React.memo(({ materials, isGuest, onUpdate, onAdd, onEdit, onDelete }) => {
  const [activeCat, setActiveCat] = useState('Colour');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [textSearch, setTextSearch] = useState('');
  const filteredMaterials = useMemo(() => {
    return (materials || []).filter(m => {
      const matchesCat = activeCat === 'Others' ? (m.category === 'Others' || !m.category) : m.category === activeCat;
      const matchesSearch = !textSearch || m.name.toLowerCase().includes(textSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [materials, activeCat, textSearch]);
  const handleUpdate = (id, type) => { const qty = prompt(`Enter Kg to ${type === 'add' ? 'add' : 'remove'}:`); if (qty) onUpdate(id, qty, type === 'add'); };
  const handleSaveNewMaterial = (name, category, minLevel) => { onAdd(name, category, minLevel); setAddModalOpen(false); };
  const handleSaveEditMaterial = (updates) => { onEdit(updates.id, updates); setEditingMaterial(null); };
  const handleDelete = (id) => { if(confirm("Delete this material?")) onDelete(id); };
  return (
    <div className="pb-24 flex flex-col h-full px-1">
      <div className="bg-white p-2 mb-2 rounded shadow-sm flex items-center gap-2 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <Search size={18} className="text-gray-400" />
        <input className="w-full outline-none text-sm bg-transparent" placeholder="Search materials..." value={textSearch} onChange={e => setTextSearch(e.target.value)} />
      </div>
      <div className="flex overflow-x-auto gap-2 pb-4 mb-2 hide-scrollbar">
        {MAT_CATEGORIES.map(cat => (<button key={cat} onClick={() => setActiveCat(cat)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCat === cat ? 'bg-blue-600 text-white shadow-md active:scale-95' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}>{cat}</button>))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredMaterials.length === 0 ? (<div className="text-center text-gray-400 mt-10">No materials found.</div>) : filteredMaterials.map(m => {
          const limit = parseFloat(m.min_level);
          const isLow = limit > 0 && m.stock_quantity < limit;
          return (
            <div key={m.id} className={`bg-white p-4 rounded-xl shadow-sm border mb-3 flex justify-between items-center transition-all ${isLow ? 'border-l-4 border-l-red-500' : 'border-gray-100 hover:border-blue-200'}`}>
              <div>
                <div className="font-bold text-lg text-gray-800 flex items-center gap-2">{m.name}{isLow && <AlertCircle size={16} className="text-red-500 animate-pulse" />}</div>
                <div className="text-xs text-gray-400 flex gap-2"><span>{m.category || 'Others'}</span>{limit > 0 && <span>• Alert: &lt; {limit} kg</span>}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-black ${isLow ? 'text-red-600' : 'text-blue-600'}`}>{m.stock_quantity < 0 ? 0 : m.stock_quantity} <span className="text-sm font-normal text-gray-400 uppercase">kg</span></span>
                {!isGuest && (
                  <div className="flex flex-col gap-1 items-end">
                    <div className="flex gap-1">
                      <button onClick={() => handleUpdate(m.id, 'add')} className="bg-green-100 text-green-700 w-8 h-8 rounded flex items-center justify-center font-bold hover:bg-green-200 transition-colors">+</button>
                      <button onClick={() => handleUpdate(m.id, 'sub')} className="bg-red-100 text-red-700 w-8 h-8 rounded flex items-center justify-center font-bold hover:bg-red-200 transition-colors">-</button>
                    </div>
                    <div className="flex gap-3 mt-1">
                      <button onClick={() => setEditingMaterial(m)} className="text-gray-300 hover:text-blue-500 transition-colors"><Edit3 size={14}/></button>
                      <button onClick={() => handleDelete(m.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!isGuest && (
        <div className="fixed bottom-24 right-6">
          <button onClick={() => setAddModalOpen(true)} className="bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-200 flex items-center justify-center active:scale-95 transition-transform"><Plus size={24} /></button>
        </div>
      )}
      {isAddModalOpen && <AddMaterialModal onSave={handleSaveNewMaterial} onClose={() => setAddModalOpen(false)} />}
      {editingMaterial && <EditMaterialDetailsModal material={editingMaterial} onSave={handleSaveEditMaterial} onClose={() => setEditingMaterial(null)} />}
    </div>
  );
});

const MainApp = () => {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [deviceName, setDeviceName] = useState(localStorage.getItem('ksf_device_name') || '');
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [editRoll, setEditRoll] = useState(null);
  const [isDeviceModalOpen, setDeviceModalOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isReportsOpen, setReportsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ksf_active_tab') || 'dashboard');
  const [formData, setFormData] = useState(() => safeJSONParse('ksf_form_data', { customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' }));
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    const serverData = await DataService.getStock();
    const offlineData = safeJSONParse('ksf_offline_rolls', []);
    setOfflineCount(offlineData.length);
    const serverIds = new Set(serverData.map(r => r.product_id));
    const uniqueOffline = offlineData.filter(r => !serverIds.has(r.product_id));
    const taggedOffline = uniqueOffline.map(r => ({ ...r, isOffline: true }));
    setRolls([...taggedOffline, ...serverData]);
    setMaterials(await DataService.getRawMaterials());
    if (!isBackground) setLoading(false);
  }, []);

  const syncOffline = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    const offline = safeJSONParse('ksf_offline_rolls', []);
    if (offline.length === 0) { setIsSyncing(false); return; }
    for (const roll of offline) {
      try {
        const { roll_seq, isOffline, ...cleanRoll } = roll;
        const { data: existing } = await supabase.from('rolls').select('id').eq('product_id', cleanRoll.product_id).maybeSingle();
        if (!existing) {
          const finalPayload = { ...cleanRoll, created_at: cleanRoll.created_at || new Date() };
          await supabase.from('rolls').insert([finalPayload]);
        }
      } catch (e) {}
    }
    localStorage.setItem('ksf_offline_rolls', JSON.stringify([]));
    fetchData(true);
    setIsSyncing(false);
  }, [isSyncing, fetchData]);

  useEffect(() => { window.addEventListener('online', syncOffline); syncOffline(); return () => window.removeEventListener('online', syncOffline); }, [syncOffline]);
  useEffect(() => { localStorage.setItem('ksf_active_tab', activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem('ksf_form_data', JSON.stringify(formData)); }, [formData]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setUser(session.user); setIsGuest(false); fetchData(); }
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session && !user) { setIsGuest(false); fetchData(); }
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  useEffect(() => { if (user && !isGuest && !deviceName) setDeviceModalOpen(true); }, [user, isGuest, deviceName]);

  const handleSaveRoll = async (e, customRollId) => {
    e.preventDefault();
    if (isSaving) return false;
    setIsSaving(true);
    const id = customRollId;
    const newRoll = { ...formData, product_id: id, status: 'in_stock', created_at: new Date().toISOString() };
    if (!navigator.onLine) {
      const offlineRolls = safeJSONParse('ksf_offline_rolls', []);
      localStorage.setItem('ksf_offline_rolls', JSON.stringify([...offlineRolls, newRoll]));
      setRolls(prev => [{ ...newRoll, isOffline: true }, ...prev]);
      setPrintData(newRoll);
      setIsSaving(false); return true;
    }
    try {
      await DataService.addRoll(newRoll, deviceName);
      setPrintData(newRoll);
      fetchData(true);
      setFormData(prev => ({ ...prev, net_weight: '', gross_weight: '' }));
      return true;
    } catch (err) {
      alert("Error saving roll!");
      return false;
    } finally { setIsSaving(false); }
  };

  if (!user && !isGuest) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100">
          <img src="/logo.png" className="h-24 w-auto mx-auto mb-8 object-contain" alt="KSF" />
          <h1 className="text-2xl font-bold mb-2 text-gray-900">KSF Inventory</h1>
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold mb-3 shadow-lg hover:bg-blue-700 transition-all">Login with Google</button>
          <button onClick={() => setIsGuest(true)} className="w-full bg-white text-gray-700 py-3.5 rounded-xl font-bold border hover:bg-gray-50 transition-all">View Only (Guest)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans pt-16 pb-20">
      <Header
        isGuest={isGuest}
        deviceName={deviceName}
        onLogout={() => supabase.auth.signOut().then(() => window.location.reload())}
        onEditDeviceName={() => setDeviceModalOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onManualSync={syncOffline}
        isSyncing={isSyncing}
        offlineCount={offlineCount}
        onLogoClick={() => setActiveTab('dashboard')}
      />
      <main className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
        {loading && activeTab !== 'dashboard' ? (
          <div className="flex justify-center p-12 text-gray-400">Loading Data...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} />}
            {activeTab === 'entry' && <NewProductView formData={formData} setFormData={setFormData} onSubmit={handleSaveRoll} isSaving={isSaving} rolls={rolls} />}
            {activeTab === 'stock' && <StockView rolls={rolls || []} onPrint={setPrintData} onSelectRoll={setEditRoll} />}
            {activeTab === 'dispatch' && <DispatchView rolls={rolls || []} isGuest={isGuest} deviceName={deviceName} onDispatch={d => DataService.updateRoll(d.id, { ...d, status: 'dispatched', dispatched_at: new Date() }, deviceName).then(() => fetchData(true))} onUndoDispatch={id => DataService.updateRoll(id, { status: 'in_stock', dispatched_at: null }, deviceName).then(() => fetchData(true))} />}
            {activeTab === 'history' && <HistoryView rolls={rolls || []} onSelectRoll={setEditRoll} onExport={d => { const ws = XLSX.utils.json_to_sheet(d); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "History"); XLSX.writeFile(wb, "History.xlsx"); }} onOpenReports={() => setReportsOpen(true)} />}
            {activeTab === 'materials' && <MaterialsView materials={materials || []} isGuest={isGuest} onUpdate={(id, qty, isAdd) => DataService.updateRawMaterial(id, qty, isAdd, deviceName).then(() => fetchData())} onAdd={(n, c, l) => DataService.addRawMaterial(n, c, l).then(() => fetchData())} onEdit={(id, u) => DataService.editRawMaterial(id, u).then(() => fetchData())} onDelete={id => DataService.deleteRawMaterial(id).then(() => fetchData())} />}
          </>
        )}
      </main>
      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />

      {isDeviceModalOpen && <DeviceNameModal onSave={n => { localStorage.setItem('ksf_device_name', n); setDeviceName(n); setDeviceModalOpen(false); }} initialName={deviceName} onClose={() => setDeviceModalOpen(false)} />}
      {isSettingsOpen && <SettingsModal visible={isSettingsOpen} onClose={() => setSettingsOpen(false)} onBackup={async () => { const a = await DataService.getStock(); const ws = XLSX.utils.json_to_sheet(a); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Backup"); XLSX.writeFile(wb, "Backup.xlsx"); }} />}
      {isReportsOpen && <ReportsModal visible={isReportsOpen} onClose={() => setReportsOpen(false)} rolls={rolls} />}
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
      {editRoll && <EditModal roll={editRoll} isGuest={isGuest} onClose={() => setEditRoll(null)} onSave={u => DataService.updateRoll(u.id, u, deviceName).then(() => { setEditRoll(null); fetchData(true); })} onDelete={id => DataService.deleteRoll(id).then(() => { setEditRoll(null); fetchData(); })} />}
    </div>
  );
};

export default function App() { return (<ErrorBoundary><MainApp /></ErrorBoundary>); }