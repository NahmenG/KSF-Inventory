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
  LabelList
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
  ImageIcon,
  Share2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  User
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
          <h1 className="text-2xl font-bold mb-2 text-red-800">⚠️ Something went wrong</h1>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="bg-red-600 text-white px-6 py-3 rounded font-bold shadow-lg"
          >
            Reset App
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

// REORDERED CATEGORIES
const MAT_CATEGORIES = ['Polymers', 'Filler', 'Additives', 'Colour', 'Others'];

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
    const updatesWithDevice = { ...updates, device_name: deviceName, updated_at: new Date() };
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

  async updateRawMaterial(id, qty, isAddition, deviceName) {
    const { data } = await supabase.from('raw_materials').select('stock_quantity').eq('id', id).single();
    const currentQty = data ? parseFloat(data.stock_quantity) : 0;
    const newQty = currentQty + (isAddition ? parseFloat(qty) : -parseFloat(qty));
    await supabase.from('raw_materials').update({ stock_quantity: newQty, last_updated_by: deviceName }).eq('id', id);
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

// --- UI COMPONENTS ---

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

const ReportsModal = ({ visible, onClose, rolls }) => {
  const [reportType, setReportType] = useState('production_daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  if (!visible) return null;

  const handleDownload = () => {
    let filteredData = [];
    let filename = "Report.xlsx";

    if (reportType === 'production_daily') {
      filteredData = rolls.filter(r => new Date(r.created_at).toLocaleDateString() === new Date(selectedDate).toLocaleDateString());
      filename = `Production_Daily_${selectedDate}.xlsx`;
    }
    else if (reportType === 'production_monthly') {
      filteredData = rolls.filter(r => r.created_at.startsWith(selectedMonth));
      filename = `Production_Monthly_${selectedMonth}.xlsx`;
    }
    else if (reportType === 'dispatch_monthly') {
      filteredData = rolls.filter(r => r.status === 'dispatched' && r.dispatched_at && r.dispatched_at.startsWith(selectedMonth));
      filename = `Dispatch_Monthly_${selectedMonth}.xlsx`;
    }

    if (filteredData.length === 0) { alert("No data found."); return; }

    const dataForExcel = filteredData.map(r => ({
      "Roll ID": r.product_id,
      "Date": new Date(r.created_at).toLocaleDateString(),
      "Customer": r.customer_name || '-',
      "Quality": r.quality,
      "Color": r.color,
      "Size": r.width_inches,
      "GSM": r.gsm,
      "Gross Kg": r.gross_weight,
      "Net Kg": r.net_weight,
      "Status": r.status
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, filename);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><FileText size={22} /> Reports</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <select className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="production_daily">Daily Production</option>
            <option value="production_monthly">Monthly Production</option>
            <option value="dispatch_monthly">Monthly Dispatch</option>
          </select>
          {reportType === 'production_daily' ?
            <input type="date" className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /> :
            <input type="month" className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          }
          <button onClick={handleDownload} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"><Download size={20} /> Download Excel Report</button>
        </div>
      </div>
    </div>
  );
};

const SettingsModal = ({ visible, onClose, onBackup }) => (!visible ? null : (
  <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
    <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-2xl border">
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2"><Settings /> Settings</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
      </div>
      <button onClick={onBackup} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
        <Download /> Backup Database
      </button>
    </div>
  </div>
));

const DeviceNameModal = ({ onSave, initialName, onClose }) => {
  const [name, setName] = useState(initialName || '');
  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-sm text-center shadow-2xl border">
        <h2 className="text-xl font-bold mb-4">Device Name</h2>
        <input className="w-full border p-3 rounded mb-4 text-center outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)} placeholder="Enter Device Name" />
        <button onClick={() => onSave(name)} className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 transition-colors">Save</button>
      </div>
    </div>
  );
};

const AddMaterialModal = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Polymers');
  const [minLevel, setMinLevel] = useState('');
  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-2xl border">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Add Material</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
        </div>
        <div className="space-y-4">
          <input className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Material Name" value={name} onChange={e => setName(e.target.value)} />
          <select className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" value={category} onChange={e => setCategory(e.target.value)}>
            {MAT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" type="number" placeholder="Alert Level (kg)" value={minLevel} onChange={e => setMinLevel(e.target.value)} />
          <button onClick={() => onSave(name, category, minLevel)} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Add Material</button>
        </div>
      </div>
    </div>
  );
};

const EditMaterialDetailsModal = ({ material, onSave, onClose }) => {
  const [name, setName] = useState(material.name);
  const [category, setCategory] = useState(material.category);
  const [minLevel, setMinLevel] = useState(material.min_level || '');
  const handleSave = () => { onSave({ ...material, name, category, min_level: minLevel }); };
  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-2xl border">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Material</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
        </div>
        <div className="space-y-4">
          <input className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)} />
          <select className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" value={category} onChange={e => setCategory(e.target.value)}>
            {MAT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" type="number" value={minLevel} onChange={e => setMinLevel(e.target.value)} />
          <button onClick={handleSave} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

const BarcodeScanner = ({ onScan, onClose }) => {
  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScan, () => { }).catch(console.error);
    return () => { try { html5QrCode.stop().then(() => html5QrCode.clear()); } catch (e) { } };
  }, [onScan]);
  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
      <div className="text-white font-bold mb-4">Scan Barcode</div>
      <div id="reader" className="w-full bg-white rounded overflow-hidden max-w-sm shadow-2xl border-4 border-white/20"></div>
      <button onClick={onClose} className="mt-8 bg-red-600 text-white px-8 py-4 rounded-full font-bold active:scale-95 transition-all">Close</button>
    </div>
  );
};

const LabelPrint = ({ data, onClose }) => {
  const canvasRef = useRef(null);
  const labelRef = useRef(null);
  const [showBrand, setShowBrand] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (data && canvasRef.current) {
      try { JsBarcode(canvasRef.current, data.product_id, { format: "CODE128", displayValue: false, height: 25, width: 2, margin: 0 }); } catch (e) { console.error(e); }
    }
  }, [data]);

  const handleDownloadPDF = async () => {
    if (!labelRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(labelRef.current, { scale: 4, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [2.4, 3.9] });
      pdf.addImage(imgData, 'PNG', 0, 0, 2.4, 3.9);
      pdf.save(`Label-${data.product_id}.pdf`);
    } catch (error) {
      alert("Failed to generate PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-sm overflow-hidden flex flex-col max-h-screen shadow-2xl border">
        <div className="p-4 border-b flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Label Preview</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowBrand(!showBrand)} className={`flex items-center justify-center gap-1 text-xs font-bold p-2 rounded ${showBrand ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              {showBrand ? <ToggleRight size={18} /> : <ToggleLeft size={18} />} Brand
            </button>
            <button onClick={() => setShowDate(!showDate)} className={`flex items-center justify-center gap-1 text-xs font-bold p-2 rounded ${showDate ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              {showDate ? <Eye size={18} /> : <EyeOff size={18} />} Date
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center">
          <div ref={labelRef} className="flex flex-col justify-between items-center text-center bg-white shadow-xl relative" style={{ width: '2.4in', height: '3.9in', padding: '0.1in', boxSizing: 'border-box' }}>
            <div className="w-full border-b-2 border-black pb-1 h-10 flex items-center justify-center">
              {showBrand ? (<div className="font-black text-xl tracking-tighter uppercase">KSF NON WOVEN</div>) : (<div className="w-full h-full"></div>)}
            </div>
            <div className="w-full grid grid-cols-2 gap-y-1 text-left px-1 flex-1 content-center">
              <div><span className="text-[10px] uppercase font-bold text-gray-500 block">Quality</span><span className="font-bold text-lg leading-none">{data.quality}</span></div>
              <div className="text-right"><span className="text-[10px] uppercase font-bold text-gray-500 block">Color</span><span className="font-bold text-lg leading-none">{data.color}</span></div>
              <div><span className="text-[10px] uppercase font-bold text-gray-500 block">Size (in)</span><span className="font-bold text-lg leading-none">{data.width_inches}"</span></div>
              <div className="text-right"><span className="text-[10px] uppercase font-bold text-gray-500 block">Length</span><span className="font-bold text-lg leading-none">{data.length_meters}m</span></div>
              <div className="col-span-2 text-center mt-1"><span className="text-[10px] uppercase font-bold text-gray-500 block">GSM</span><span className="font-bold text-2xl leading-none">{data.gsm}</span></div>
            </div>
            <div className="w-full border-y-2 border-black py-2 my-1 flex justify-between items-end px-1">
              <div className="text-left"><span className="text-[10px] uppercase font-bold block">Gross Wt</span><span className="text-sm font-bold">{data.gross_weight} kg</span></div>
              <div className="text-right"><span className="text-[10px] uppercase font-bold block text-gray-500">Net Weight</span><span className="text-4xl font-black leading-none">{data.net_weight}<span className="text-lg">kg</span></span></div>
            </div>
            <div className="w-full flex flex-col items-center overflow-hidden pb-6">
              <canvas ref={canvasRef} className="max-w-full h-8 mb-1"></canvas>
              <div className="font-mono font-bold text-lg tracking-widest leading-none mt-1">{data.product_id}</div>
              {showDate && <div className="text-[8px] text-gray-500 mt-1 leading-none">{data.created_at ? new Date(data.created_at).toLocaleString() : new Date().toLocaleString()}</div>}
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 flex gap-2 border-t">
          <button onClick={handleDownloadPDF} disabled={isGenerating} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold shadow hover:bg-blue-700 flex justify-center gap-2 items-center active:scale-95 transition-all">
            {isGenerating ? 'Generating...' : <><Printer size={18} /> Save PDF for Print</>}
          </button>
          <button onClick={onClose} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

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

  const colorData = useMemo(() => {
    const c = {}; inStock.forEach(r => c[r.color] = (c[r.color] || 0) + (parseFloat(r.net_weight) || 0));
    return Object.keys(c).map(k => ({ name: k, count: parseFloat(c[k].toFixed(1)) })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [inStock]);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-600 border border-gray-100">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3"><TrendingUp size={18} /> Today's Velocity</h3>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
          <div className="text-gray-500 text-xs font-bold uppercase">Stock Count</div>
          <div className="text-3xl font-bold text-blue-600">{inStock.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
          <div className="text-gray-500 text-xs font-bold uppercase">Stock Weight</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalWeight)} <span className="text-sm text-gray-400 font-normal">kg</span></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
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

      <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
        <h3 className="font-bold mb-4 text-gray-700">Stock by Color (kg)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={colorData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
              <RechartsTooltip />
              <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="count" position="right" style={{ fontSize: '12px', fill: '#666' }} />
                {colorData.map((entry, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AGED STOCK ALERT (MOVED UP) */}
      {agedStockBreakdown.length > 0 && (
        <div className="bg-orange-50 p-4 rounded-xl border-l-4 border-orange-500 shadow-sm border border-orange-100">
          <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
            <Clock size={20} /> Aged Stock Alert ({" > "} 30 Days)
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
    </div>
  );
});

const NewProductView = React.memo(({ formData, setFormData, onSubmit, isSaving, rolls }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);
  const existingCustomers = useMemo(() => [...new Set(rolls.map(r => r.customer_name).filter(Boolean))].sort(), [rolls]);
  const filteredSuggestions = useMemo(() => {
    const typed = formData.customer_name?.toLowerCase() || '';
    return typed ? existingCustomers.filter(name => name.toLowerCase().includes(typed) && name.toLowerCase() !== typed) : [];
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
        newFormData.net_weight = (gross - (width / 63)).toFixed(2);
      }
    }
    setFormData(newFormData);
    if (field === 'customer_name') setShowSuggestions(true);
  };

  const [rollPrefix, setRollPrefix] = useState(() => localStorage.getItem('ksf_roll_prefix') || 'R');
  const [rollSeq, setRollSeq] = useState(() => localStorage.getItem('ksf_roll_sequence') || '1001');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullId = `${rollPrefix}-${rollSeq}`;
    if (await onSubmit(e, fullId)) {
      const nextSeq = String(Number(rollSeq) + 1);
      setRollSeq(nextSeq);
      localStorage.setItem('ksf_roll_sequence', nextSeq);
      localStorage.setItem('ksf_roll_prefix', rollPrefix);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border mt-2 pb-24 border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2"><Package className="text-blue-600" /> New Roll Entry</h2>
        <button onClick={() => setFormData({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' })} className="text-xs font-bold text-red-500 border border-red-100 bg-red-50 px-2 py-1 rounded">Clear Form</button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-xs font-bold text-blue-600 uppercase mb-1"><Hash size={12} /> Roll ID</label>
          <div className="flex gap-2 w-full">
            <input type="text" className="w-[35%] border-2 border-blue-100 bg-blue-50 p-3 rounded text-lg font-bold text-blue-900 outline-none uppercase" value={rollPrefix} onChange={(e) => setRollPrefix(e.target.value.toUpperCase())} />
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xl font-bold text-gray-400">-</span>
              <input type="number" required className="w-full border-2 border-blue-100 bg-blue-50 p-3 rounded text-lg font-bold text-blue-900 outline-none" value={rollSeq} onChange={(e) => setRollSeq(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="col-span-2 relative" ref={suggestionRef}>
          <label className="text-xs font-bold text-gray-500 uppercase">Customer</label>
          <input required autoComplete="off" className="w-full border-b-2 border-gray-200 bg-gray-50 p-3 rounded focus:border-blue-500 outline-none transition-all" value={formData.customer_name} onChange={e => handleValueChange('customer_name', e.target.value)} onFocus={() => setShowSuggestions(true)} />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-b-lg shadow-2xl max-h-48 overflow-y-auto mt-1">
              {filteredSuggestions.map((name, i) => (
                <div key={i} onClick={() => { setFormData({ ...formData, customer_name: name }); setShowSuggestions(false); }} className="p-3 border-b hover:bg-blue-50 cursor-pointer text-sm font-semibold text-gray-700 transition-colors">
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Quality</label><select required className="w-full border p-3 rounded bg-white outline-none focus:ring-2 focus:ring-blue-100" value={formData.quality} onChange={e => handleValueChange('quality', e.target.value)}><option value="">Select...</option>{QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}</select></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Color</label><select required className="w-full border p-3 rounded bg-white outline-none focus:ring-2 focus:ring-blue-100" value={formData.color} onChange={e => handleValueChange('color', e.target.value)}><option value="">Select...</option>{COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="col-span-2 grid grid-cols-3 gap-3">
          <div><label className="text-xs font-bold text-gray-500 uppercase">GSM</label><input type="number" className="w-full border p-3 rounded outline-none" value={formData.gsm} onChange={e => handleValueChange('gsm', e.target.value)} /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Width (in)</label><input type="number" className="w-full border p-3 rounded outline-none" value={formData.width_inches} onChange={e => handleValueChange('width_inches', e.target.value)} /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Length (m)</label><input type="number" className="w-full border p-3 rounded outline-none" value={formData.length_meters} onChange={e => handleValueChange('length_meters', e.target.value)} /></div>
        </div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Gross Kg</label><input type="number" className="w-full border p-3 rounded outline-none" value={formData.gross_weight} onChange={e => handleValueChange('gross_weight', e.target.value)} /></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Net Kg</label><input type="number" className="w-full border-2 border-blue-100 p-3 rounded font-bold text-blue-900 outline-none" value={formData.net_weight} onChange={e => handleValueChange('net_weight', e.target.value)} /></div>
        <button type="submit" disabled={isSaving} className={`col-span-2 p-4 rounded-xl font-bold mt-4 shadow-lg active:scale-95 transition-all ${isSaving ? 'bg-gray-400' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}>
          {isSaving ? <><Loader className="animate-spin" size={20} /> Saving...</> : 'Save & Print Label'}
        </button>
      </form>
    </div>
  );
});

// --- STOCK VIEW ---
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
      "Roll ID": r.product_id, "Customer": r.customer_name, "Quality": r.quality, "Color": r.color, "GSM": r.gsm, "Size": r.width_inches, "Length": r.length_meters, "Gross Weight": r.gross_weight, "Net Weight": r.net_weight, "Status": r.status, "Date Added": new Date(r.created_at).toLocaleString()
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, `Stock_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleSort = () => { setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest'); };

  return (
    <div className="space-y-4 h-full flex flex-col relative pb-20 px-1">
      <div className="sticky top-16 z-20 bg-slate-50 pt-3 pb-2">
        <div className="bg-white p-3 rounded-xl shadow-sm flex flex-col gap-3 border border-gray-100">
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2 border p-2 rounded-lg bg-gray-50 items-center focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search className="text-gray-400" size={20} />
              <input className="w-full outline-none bg-transparent" placeholder="Search stock..." value={textSearch} onChange={e => setTextSearch(e.target.value)} />
            </div>
            <button onClick={toggleSort} className={`p-2 rounded-lg border transition-colors ${sortOrder === 'oldest' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
              {sortOrder === 'newest' ? <ArrowDown size={18}/> : <ArrowUp size={18}/>}
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white hover:bg-gray-50'}`}><Filter size={20} /></button>
            <button onClick={handleExportFiltered} className="bg-green-100 text-green-700 px-3 rounded-lg text-sm font-bold shadow-sm transition-colors"><Download size={14} /> XLS</button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-2 border-t pt-2">
              <select className="border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100" value={filterQuality} onChange={e => setFilterQuality(e.target.value)}><option value="">All Qualities</option>{QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}</select>
              <select className="border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100" value={filterColor} onChange={e => setFilterColor(e.target.value)}><option value="">All Colors</option>{COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <input className="border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="GSM" value={filterGSM} onChange={e => setFilterGSM(e.target.value)} type="number" />
              <input className="border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Width" value={filterWidth} onChange={e => setFilterWidth(e.target.value)} type="number" />
              <button onClick={clearFilters} className="col-span-2 md:col-span-4 text-xs text-red-500 font-bold text-center mt-1 py-1 hover:bg-red-50 rounded">Clear All Filters</button>
            </div>
          )}
          <div className="bg-gray-900 text-white p-3 rounded-lg flex justify-between items-center text-sm shadow-inner">
            <div><div className="text-gray-400 text-[10px] uppercase font-bold tracking-tighter">Found</div><div className="font-bold">{filtered.length} Rolls</div></div>
            <div className="text-right"><div className="text-gray-400 text-[10px] uppercase font-bold tracking-tighter">Total weight</div><div className="font-bold text-lg text-yellow-400">{formatCurrency(totalFilteredWeight)} kg</div></div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-24 px-1">
        {filtered.length === 0 ? (<div className="text-center text-gray-400 mt-10 italic">No matching rolls found...</div>) : filtered.map(r => (
          <div key={r.id || r.product_id} onClick={() => onSelectRoll(r)} className={`bg-white p-4 rounded-xl border mb-2 shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all ${r.isOffline ? 'border-l-4 border-l-yellow-400' : 'border-gray-100 hover:border-blue-200'}`}>
            <div>
              <div className="font-bold text-blue-600 text-lg flex items-center gap-2">{r.product_id} {r.isOffline && <span className="bg-yellow-100 text-yellow-800 text-[9px] px-1.5 py-0.5 rounded font-bold">OFFLINE</span>}</div>
              <div className="text-[10px] text-gray-400 mb-1">{new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
              <div className="font-semibold text-gray-800">{r.customer_name}</div>
              <div className="text-xs text-gray-500 mt-1 inline-flex gap-2 flex-wrap"><span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{r.quality}</span><span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{r.color}</span><span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{r.gsm} GSM</span></div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl text-gray-900">{r.net_weight} kg</div>
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

  return (
    <div className="space-y-4 pb-24">
      {isScanning && <BarcodeScanner onScan={(txt) => { setIsScanning(false); handleSearch(txt); }} onClose={() => setIsScanning(false)} />}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-xl text-white shadow-lg">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={20} /> Dispatch Manifest</h3>
        <div className="grid grid-cols-2 gap-2">
          <input className="w-full p-2 rounded-lg text-black text-sm outline-none" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <input className="w-full p-2 rounded-lg text-black text-sm outline-none" placeholder="Vehicle No" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
        </div>
      </div>
      {!reviewData ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center border-gray-100">
          <div className="flex gap-2 mb-4">
            <input className="flex-1 border-2 border-gray-200 p-3 rounded-lg text-center text-lg font-mono tracking-wider focus:border-blue-500 outline-none transition-all" placeholder="Enter / Scan ID" value={scanId} onChange={e => setScanId(e.target.value)} />
            <button onClick={() => setIsScanning(true)} className="bg-gray-900 text-white p-3 rounded-lg hover:bg-black transition-colors"><Camera size={24} /></button>
          </div>
          <button onClick={() => handleSearch()} className="bg-blue-600 text-white w-full py-4 rounded-lg font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all">Search Roll</button>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border">
            <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-lg text-blue-600"><Edit3 size={18} /> Verify Dispatch</h3><button onClick={() => setReviewData(null)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} /></button></div>
            <div className="bg-blue-50 p-3 rounded text-center mb-4 border border-blue-100"><div className="text-xs font-bold text-blue-400 uppercase tracking-widest">Roll ID</div><div className="text-xl font-black text-blue-800 tracking-widest">{reviewData.product_id}</div></div>
            <div className="grid grid-cols-2 gap-3 mb-6 text-sm"><div className="col-span-2 font-bold text-gray-500">Buyer: {reviewData.customer_name}</div><div>Net Weight: {reviewData.net_weight} kg</div><div>Quality: {reviewData.quality}</div></div>
            <button onClick={handleConfirmDispatch} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-100 flex items-center justify-center gap-2 active:scale-95 transition-all"><CheckCircle size={20} /> Add to Manifest</button>
          </div>
        </div>
      )}
      {sessionList.length > 0 && (
        <div className="bg-white rounded-xl shadow border overflow-hidden border-gray-100">
          <div className="p-3 bg-gray-50 border-b flex justify-between font-bold text-gray-500 text-sm"><span>Items: {sessionList.length}</span><span>Total: {sessionList.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0).toFixed(1)} kg</span></div>
          <div className="max-h-64 overflow-y-auto">
            {sessionList.map((item, i) => (
              <div key={i} className="p-3 border-b flex justify-between items-center last:border-0 hover:bg-gray-50 transition-colors">
                <div><div className="font-mono text-gray-800 font-bold">{item.product_id}</div><div className="text-[10px] text-gray-400 uppercase tracking-tighter">{item.quality} • {item.net_weight}kg</div></div>
                <button onClick={() => { if (confirm("Remove?")) { onUndoDispatch(item.id); setSessionList(sessionList.filter((_,idx)=>idx!==i)); } }} className="text-red-500 p-2"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50 border-t"><button onClick={() => { if(generateChallanExcel(sessionList, { buyer: customerName, vehicle: vehicleNo, device: deviceName })) { if(confirm("Clear?")) { setSessionList([]); setCustomerName(''); setVehicleNo(''); } } }} className="w-full bg-green-700 text-white py-4 rounded-xl font-bold flex justify-center gap-2 items-center hover:bg-green-800 shadow-lg active:scale-95 transition-all"><FileSpreadsheet size={20} /> Generate Gate Pass</button></div>
        </div>
      )}
    </div>
  );
});

// --- MATERIALS VIEW ---
const MaterialsView = React.memo(({ materials, isGuest, onUpdate, onAdd, onEdit, onDelete }) => {
  const [activeCat, setActiveCat] = useState('Polymers');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [textSearch, setTextSearch] = useState('');
  
  // UPDATED ORDER
  const orderedCategories = ['Polymers', 'Filler', 'Additives', 'Colour', 'Others'];

  const filtered = useMemo(() => (materials || []).filter(m => (activeCat === 'Others' ? (!m.category || m.category === 'Others') : m.category === activeCat) && (!textSearch || m.name.toLowerCase().includes(textSearch.toLowerCase()))), [materials, activeCat, textSearch]);
  const handleUpdate = (id, type) => { const qty = prompt(`Enter Kg to ${type === 'add' ? 'add' : 'remove'}:`); if (qty && !isNaN(qty)) onUpdate(id, qty, type === 'add'); };

  return (
    <div className="pb-24 flex flex-col h-full px-1">
      <div className="bg-white p-2 mb-2 rounded-xl shadow-sm flex items-center gap-2 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <Search size={18} className="text-gray-400" />
        <input className="w-full outline-none text-sm bg-transparent" placeholder="Search material stocks..." value={textSearch} onChange={e => setTextSearch(e.target.value)} />
      </div>
      <div className="flex overflow-x-auto gap-2 pb-4 mb-2 hide-scrollbar">
        {orderedCategories.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${activeCat === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md active:scale-95' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}>
            {cat}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {filtered.length === 0 ? <div className="text-center text-gray-400 mt-10 italic">No materials found...</div> : filtered.map(m => {
          const isLow = m.min_level > 0 && m.stock_quantity < m.min_level;
          return (
            <div key={m.id} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center transition-all ${isLow ? 'border-l-4 border-l-red-500' : 'border-gray-100 hover:border-blue-200'}`}>
              <div><div className="font-bold text-lg text-gray-800 flex items-center gap-2">{m.name}{isLow && <AlertCircle size={16} className="text-red-500 animate-pulse" />}</div><div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{m.category || 'Others'}{m.min_level > 0 && ` • Alert: < ${m.min_level} kg`}</div></div>
              <div className="flex items-center gap-3">
                {/* REDUCED FONT SIZE HERE */}
                <span className={`text-lg font-black ${isLow ? 'text-red-600' : 'text-blue-600'}`}>{m.stock_quantity} kg</span>
                {!isGuest && (
                  <div className="flex flex-col gap-1 items-end">
                    <div className="flex gap-1">
                      <button onClick={() => handleUpdate(m.id, 'add')} className="bg-green-100 text-green-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-green-200">+</button>
                      <button onClick={() => handleUpdate(m.id, 'remove')} className="bg-red-100 text-red-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-red-200">-</button>
                    </div>
                    <div className="flex gap-3 mt-1 px-1">
                      <button onClick={() => setEditingMaterial(m)} className="text-gray-300 hover:text-blue-500 transition-colors"><Edit3 size={14} /></button>
                      <button onClick={() => { if(confirm("Delete?")) onDelete(m.id); }} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!isGuest && (<div className="fixed bottom-24 right-6"><button onClick={() => setAddModalOpen(true)} className="bg-blue-600 text-white p-4 rounded-full shadow-xl active:scale-95 transition-all hover:bg-blue-700"><Plus size={24} /></button></div>)}
      {isAddModalOpen && <AddMaterialModal onSave={(n, c, l) => { supabase.from('raw_materials').insert([{ name: n, category: c, min_level: l, stock_quantity: 0 }]); setAddModalOpen(false); }} onClose={() => setAddModalOpen(false)} />}
      {editingMaterial && <EditMaterialDetailsModal material={editingMaterial} onSave={(u) => { supabase.from('raw_materials').update(u).eq('id', editingMaterial.id); setEditingMaterial(null); }} onClose={() => setEditingMaterial(null)} />}
    </div>
  );
});

// --- MAIN CONTAINER ---
const MainApp = () => {
  const [user, setUser] = useState(null); const [isGuest, setIsGuest] = useState(false); const [deviceName, setDeviceName] = useState(localStorage.getItem('ksf_device_name') || ''); const [loading, setLoading] = useState(false); const [rolls, setRolls] = useState([]); const [materials, setMaterials] = useState([]); const [printData, setPrintData] = useState(null); const [editRoll, setEditRoll] = useState(null); const [isDeviceModalOpen, setDeviceModalOpen] = useState(false); const [isSettingsOpen, setSettingsOpen] = useState(false); const [isReportsOpen, setReportsOpen] = useState(false); const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ksf_active_tab') || 'dashboard'); const [formData, setFormData] = useState(() => safeJSONParse('ksf_form_data', { customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' })); const [isSaving, setIsSaving] = useState(false); const [isSyncing, setIsSyncing] = useState(false); const [offlineCount, setOfflineCount] = useState(0);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const serverData = await DataService.getStock();
      const offlineData = safeJSONParse('ksf_offline_rolls', []);
      setOfflineCount(offlineData.length);
      const serverIds = new Set(serverData.map(r => r.product_id));
      const uniqueOffline = offlineData.filter(r => !serverIds.has(r.product_id)).map(r => ({ ...r, isOffline: true }));
      setRolls([...uniqueOffline, ...serverData]);
      setMaterials(await DataService.getRawMaterials());
    } catch (e) { console.error(e); } finally { if (!isBackground) setLoading(false); }
  }, []);

  const syncOffline = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return; setIsSyncing(true);
    const offline = safeJSONParse('ksf_offline_rolls', []); if (offline.length === 0) { setIsSyncing(false); return; }
    for (const roll of offline) {
      try {
        const { roll_seq, isOffline, ...cleanRoll } = roll;
        const { data: existing } = await supabase.from('rolls').select('id').eq('product_id', cleanRoll.product_id).maybeSingle();
        if (!existing) await supabase.from('rolls').insert([{ ...cleanRoll, created_at: cleanRoll.created_at || new Date() }]);
      } catch (e) {}
    }
    localStorage.setItem('ksf_offline_rolls', JSON.stringify([]));
    fetchData(true); setIsSyncing(false);
  }, [isSyncing, fetchData]);

  useEffect(() => { window.addEventListener('online', syncOffline); syncOffline(); return () => window.removeEventListener('online', syncOffline); }, [syncOffline]);
  useEffect(() => { localStorage.setItem('ksf_active_tab', activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem('ksf_form_data', JSON.stringify(formData)); }, [formData]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setUser(session.user); fetchData(); }
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session && !user) fetchData();
    });
    const interval = setInterval(() => { if ((user || isGuest)) fetchData(true); }, 15000);
    return () => { subscription.unsubscribe(); clearInterval(interval); };
  }, [fetchData]);

  useEffect(() => { if (user && !deviceName) setDeviceModalOpen(true); }, [user, deviceName]);

  const handleSaveRoll = async (e, customRollId) => {
    e.preventDefault(); if (isSaving) return false; setIsSaving(true);
    const newRoll = { ...formData, product_id: customRollId, status: 'in_stock', created_at: new Date().toISOString() };
    if (!navigator.onLine) {
      const off = safeJSONParse('ksf_offline_rolls', []); localStorage.setItem('ksf_offline_rolls', JSON.stringify([...off, newRoll]));
      setRolls(prev => [{ ...newRoll, isOffline: true }, ...prev]); setPrintData(newRoll); setIsSaving(false); return true;
    }
    try {
      await DataService.addRoll(newRoll, deviceName); setPrintData(newRoll); fetchData(true);
      setFormData(prev => ({ ...prev, net_weight: '', gross_weight: '' })); return true;
    } catch (err) { alert("Save failed!"); return false; } finally { setIsSaving(false); }
  };

  if (!user && !isGuest) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100 tracking-tighter">
          <img src="/logo.png" className="h-24 w-auto mx-auto mb-8 object-contain" alt="KSF" />
          {/* REMOVED EXTRA TEXT HERE */}
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold mb-3 shadow-lg active:scale-95 transition-all">Login with Google</button>
          <button onClick={() => setIsGuest(true)} className="w-full bg-white text-gray-700 py-4 rounded-xl font-bold border hover:bg-gray-50 active:scale-95 transition-all">View Only (Guest)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans pt-16 pb-20">
      <Header isGuest={isGuest} deviceName={deviceName} onLogout={() => supabase.auth.signOut().then(() => window.location.reload())} onEditDeviceName={() => setDeviceModalOpen(true)} onOpenSettings={() => setSettingsOpen(true)} onManualSync={syncOffline} isSyncing={isSyncing} offlineCount={offlineCount} onLogoClick={() => setActiveTab('dashboard')} />
      <main className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
        {loading && activeTab !== 'dashboard' ? (
          <div className="flex justify-center p-12 text-gray-400 italic">Accessing data warehouse...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} />}
            {activeTab === 'entry' && <NewProductView formData={formData} setFormData={setFormData} onSubmit={handleSaveRoll} isSaving={isSaving} rolls={rolls} />}
            {activeTab === 'stock' && <StockView rolls={rolls || []} onPrint={setPrintData} onSelectRoll={setEditRoll} />}
            {activeTab === 'dispatch' && <DispatchView rolls={rolls || []} isGuest={isGuest} deviceName={deviceName} onDispatch={d => DataService.updateRoll(d.id, { ...d, status: 'dispatched', dispatched_at: new Date() }, deviceName).then(() => fetchData(true))} onUndoDispatch={id => DataService.updateRoll(id, { status: 'in_stock', dispatched_at: null }, deviceName).then(() => fetchData(true))} />}
            {activeTab === 'history' && <HistoryView rolls={rolls || []} onSelectRoll={setEditRoll} onExport={d => { const ws = XLSX.utils.json_to_sheet(d); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "History"); XLSX.writeFile(wb, "History.xlsx"); }} onOpenReports={() => setReportsOpen(true)} />}
            {activeTab === 'materials' && <MaterialsView materials={materials || []} isGuest={isGuest} onUpdate={(id, qty, isAdd) => DataService.updateRawMaterial(id, qty, isAdd, deviceName).then(() => fetchData())} onAdd={(n, c, l) => supabase.from('raw_materials').insert([{ name: n, category: c, min_level: l, stock_quantity: 0 }]).then(() => fetchData())} onEdit={(id, u) => supabase.from('raw_materials').update(u).eq('id', id).then(() => fetchData())} onDelete={id => supabase.from('raw_materials').delete().eq('id', id).then(() => fetchData())} />}
          </>
        )}
      </main>
      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />
      {isDeviceModalOpen && <DeviceNameModal onSave={n => { localStorage.setItem('ksf_device_name', n); setDeviceName(n); setDeviceModalOpen(false); }} initialName={deviceName} onClose={() => setDeviceModalOpen(false)} />}
      {isSettingsOpen && <SettingsModal visible={isSettingsOpen} onClose={() => setSettingsOpen(false)} onBackup={async () => { const a = await DataService.getStock(); const ws = XLSX.utils.json_to_sheet(a); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Backup"); XLSX.writeFile(wb, "Backup.xlsx"); }} />}
      {isReportsOpen && <ReportsModal visible={isReportsOpen} onClose={() => setReportsOpen(false)} rolls={rolls} />}
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
      {editRoll && <EditModal roll={editRoll} isGuest={isGuest} onClose={() => setEditRoll(null)} onSave={u => DataService.updateRoll(u.id, u, deviceName).then(() => { setEditRoll(null); fetchData(true); })} onDelete={id => supabase.from('rolls').delete().eq('id', id).then(() => { setEditRoll(null); fetchData(); })} />}
    </div>
  );
};

export default function App() { return (<ErrorBoundary><MainApp /></ErrorBoundary>); }