import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import JsBarcode from 'jsbarcode';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// Recharts import
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
// Lucide icons
import { 
  Package, Truck, Layers, LogOut, Printer, Search, 
  Download, Database, Calendar, Clock, 
  Pencil, Trash2, X, Camera, Smartphone, Activity, Eye, FileText, CheckCircle, Filter, Undo2, ToggleLeft, ToggleRight
} from 'lucide-react';
import { supabase } from './supabaseClient';

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("CRASH:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-900 min-h-screen flex flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-bold mb-2">⚠️ Something went wrong</h1>
          <pre className="bg-white p-4 rounded border border-red-200 text-left overflow-auto max-w-full text-xs font-mono mb-4">
            {this.state.error && this.state.error.toString()}
          </pre>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-red-600 text-white px-6 py-3 rounded font-bold">
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
const QUALITIES = ['Virgin', 'Fresh', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = [
  'White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 
  'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 
  'Navy Blue', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'
];
const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// --- DATA SERVICE ---
const DataService = {
  async getStock() {
    const { data, error } = await supabase.from('rolls').select('*').order('updated_at', { ascending: false });
    return error ? [] : data;
  },
  async addRoll(roll, deviceName) {
    const rollWithDevice = { ...roll, device_name: deviceName, updated_at: new Date() };
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
  async addRawMaterial(name) {
      const newMat = { name, stock_quantity: 0, unit: 'kg' };
      await supabase.from('raw_materials').insert([newMat]);
  },
  async updateRawMaterial(id, qty, isAddition, deviceName) {
    const { data } = await supabase.from('raw_materials').select('stock_quantity').eq('id', id).single();
    const currentQty = data ? parseFloat(data.stock_quantity) : 0;
    const newQty = currentQty + (isAddition ? parseFloat(qty) : -parseFloat(qty));
    await supabase.from('raw_materials').update({ stock_quantity: newQty, last_updated_by: deviceName }).eq('id', id);
  }
};

// --- HELPER: GENERATE PDF ---
const generateChallan = (rolls, details) => {
    try {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("KSF NON WOVEN", 105, 20, null, null, "center");
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 40);
        doc.text(`Time: ${new Date().toLocaleTimeString()}`, 14, 46);
        doc.text(`Buyer: ${details.buyer}`, 14, 56);
        doc.text(`Vehicle: ${details.vehicle}`, 14, 62);
        
        const tableData = rolls.map((r, i) => [i + 1, r.product_id, r.quality, r.color, r.width_inches, r.gsm, r.net_weight]);
        doc.autoTable({ startY: 75, head: [['#', 'ID', 'Qual', 'Col', 'Size', 'GSM', 'Kg']], body: tableData });
        
        const totalWt = rolls.reduce((sum, r) => sum + Number(r.net_weight || 0), 0);
        doc.setFontSize(14);
        doc.text(`Total Weight: ${totalWt} kg`, 14, doc.lastAutoTable.finalY + 15);
        
        doc.setFontSize(8);
        doc.text("Authorized Signatory", 150, doc.lastAutoTable.finalY + 40);
        
        doc.save(`GatePass_${new Date().getTime()}.pdf`);
        return true;
    } catch (err) {
        alert("PDF Error: " + err.message);
        return false;
    }
};

// --- COMPONENTS ---

const Header = ({ user, isGuest, deviceName, onLogout, setTab, activeTab, onEditDeviceName }) => (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
    <div className="flex justify-between items-center px-4 h-16">
      <div className="font-bold text-xl cursor-pointer flex items-center gap-3" onClick={() => setTab('dashboard')}>
         <img src="/logo.png" alt="KSF" className="h-10 w-auto object-contain" />
         <span className="text-gray-900 tracking-tight hidden md:block">KSF Inventory</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {!isGuest && <div onClick={onEditDeviceName} className="font-bold cursor-pointer bg-gray-100 px-3 py-1 rounded-full">{deviceName || 'Device'} ✎</div>}
        <button onClick={onLogout} className="text-red-600 font-bold hover:bg-red-50 px-2 py-1 rounded">Logout</button>
      </div>
    </div>
    <div className="flex overflow-x-auto border-t bg-gray-50 hide-scrollbar">
      {[
        { id: 'dashboard', label: 'Dashboard', icon: Activity },
        !isGuest && { id: 'entry', label: 'New Entry', icon: Package },
        { id: 'stock', label: 'Stock', icon: Database },
        { id: 'dispatch', label: 'Dispatch', icon: Truck },
        { id: 'history', label: 'History', icon: Clock },
        { id: 'materials', label: 'Materials', icon: Layers }
      ].filter(Boolean).map(tab => (
        <button key={tab.id} onClick={() => setTab(tab.id)} className={`flex-1 min-w-[80px] p-3 text-xs md:text-sm font-bold border-b-2 flex flex-col items-center gap-1 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500'}`}>
          <tab.icon size={18} />
          {tab.label}
        </button>
      ))}
    </div>
  </header>
);

const DeviceNameModal = ({ onSave, initialName }) => {
    const [name, setName] = useState(initialName || '');
    return (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-sm text-center">
                <h2 className="text-xl font-bold mb-4">Device Name</h2>
                <input className="w-full border p-3 rounded mb-4 text-center" placeholder="e.g. iPhone" value={name} onChange={e => setName(e.target.value)} />
                <button disabled={!name} onClick={() => onSave(name)} className="w-full bg-blue-600 text-white p-3 rounded font-bold">Save</button>
            </div>
        </div>
    );
};

const BarcodeScanner = ({ onScan, onClose }) => {
    useEffect(() => {
        const html5QrCode = new Html5Qrcode("reader");
        html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScan, () => {}).catch(console.error);
        return () => { try { html5QrCode.stop().then(() => html5QrCode.clear()); } catch(e) {} };
    }, [onScan]);
    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
            <div className="text-white font-bold mb-4 text-center">Point camera at barcode</div>
            <div id="reader" className="w-full bg-white rounded overflow-hidden max-w-sm"></div>
            <button onClick={onClose} className="mt-8 bg-red-600 text-white px-8 py-4 rounded-full font-bold text-lg">Close Camera</button>
        </div>
    );
};

// --- UPDATED LABEL PRINT WITH TOGGLE ---
const LabelPrint = ({ data, onClose }) => {
  const canvasRef = useRef(null);
  const [showBrand, setShowBrand] = useState(true);

  useEffect(() => {
      if (data && canvasRef.current) try { JsBarcode(canvasRef.current, data.product_id, { format: "CODE128", displayValue: false }); } catch (e) {}
  }, [data]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-4 rounded-lg w-full max-w-md text-center">
        <h2 className="font-bold mb-4">Label Preview</h2>
        
        {/* Toggle Switch */}
        <div className="flex items-center justify-center gap-2 mb-4">
            <button onClick={() => setShowBrand(!showBrand)} className="flex items-center gap-2 text-sm font-bold text-gray-600">
                {showBrand ? <ToggleRight className="text-blue-600" size={30}/> : <ToggleLeft className="text-gray-400" size={30}/>}
                Show Brand Header
            </button>
        </div>

        <div className="border-2 border-black p-4 text-left font-mono text-sm mb-4 bg-white">
            {/* Conditional Header */}
            {showBrand && <div className="font-bold text-center text-lg mb-2">KSF NON WOVEN</div>}
            
            <div className="grid grid-cols-2 gap-2 text-base">
                <div>Q: {data.quality}</div><div>GSM: {data.gsm}</div>
                <div>Col: {data.color}</div><div>Sz: {data.width_inches} in</div>
                <div>Net: {data.net_weight}kg</div><div>Gr: {data.gross_weight}kg</div>
            </div>
            <div className="flex justify-center mt-4"><canvas ref={canvasRef} className="w-full h-16"></canvas></div>
            <div className="text-center font-bold text-lg">{data.product_id}</div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white p-3 rounded font-bold">Print</button>
            <button onClick={onClose} className="flex-1 bg-gray-200 p-3 rounded font-bold">Close</button>
        </div>
      </div>
    </div>
  );
};

// --- VIEWS ---
const DashboardView = ({ rolls }) => {
    const inStock = rolls.filter(r => r.status === 'in_stock');
    const totalWeight = inStock.reduce((acc, r) => acc + (parseFloat(r.net_weight) || 0), 0);

    const qualityData = useMemo(() => {
        const counts = {};
        inStock.forEach(r => {
            const q = r.quality || 'Unknown';
            counts[q] = (counts[q] || 0) + (parseFloat(r.net_weight) || 0);
        });
        return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
    }, [inStock]);

    const colorData = useMemo(() => {
        const counts = {};
        inStock.forEach(r => {
            const c = r.color || 'Unknown';
            counts[c] = (counts[c] || 0) + (parseFloat(r.net_weight) || 0);
        });
        return Object.keys(counts)
            .map(key => ({ name: key, count: counts[key] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [inStock]);

    return (
        <div className="space-y-6 pb-20">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow border border-blue-100">
                    <div className="text-gray-500 text-xs font-bold uppercase">Total Rolls</div>
                    <div className="text-3xl font-bold text-blue-600">{inStock.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border border-green-100">
                    <div className="text-gray-500 text-xs font-bold uppercase">Total Weight</div>
                    <div className="text-3xl font-bold text-green-600">{formatCurrency(totalWeight)} <span className="text-sm text-gray-400">kg</span></div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow border">
                <h3 className="font-bold mb-4 text-gray-700">Stock by Quality (kg)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={qualityData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {qualityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow border">
                <h3 className="font-bold mb-4 text-gray-700">Top Colors in Stock (kg)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={colorData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                            <RechartsTooltip />
                            <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                {colorData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const NewProductView = ({ formData, setFormData, onSubmit }) => (
    <div className="bg-white p-6 rounded-lg shadow border mt-2">
      <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Package className="text-blue-600"/> New Roll Entry</h2>
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Customer</label><input required className="w-full border-b-2 border-gray-200 bg-gray-50 p-3 rounded focus:border-blue-500 outline-none transition-colors" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} /></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Quality</label><select required className="w-full border p-3 rounded bg-white" value={formData.quality} onChange={e => setFormData({...formData, quality: e.target.value})}><option value="">Select...</option>{QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}</select></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Color</label><select required className="w-full border p-3 rounded bg-white" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}><option value="">Select...</option>{COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="col-span-2 grid grid-cols-3 gap-3">
            <div><label className="text-xs font-bold text-gray-500 uppercase">GSM</label><input type="number" className="w-full border p-3 rounded" value={formData.gsm} onChange={e => setFormData({...formData, gsm: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Width (in)</label><input type="number" className="w-full border p-3 rounded" value={formData.width_inches} onChange={e => setFormData({...formData, width_inches: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Length (m)</label><input type="number" className="w-full border p-3 rounded" value={formData.length_meters} onChange={e => setFormData({...formData, length_meters: e.target.value})} /></div>
        </div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Net Kg</label><input type="number" className="w-full border-2 border-blue-100 p-3 rounded font-bold text-blue-900" value={formData.net_weight} onChange={e => setFormData({...formData, net_weight: e.target.value})} /></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Gross Kg</label><input type="number" className="w-full border p-3 rounded" value={formData.gross_weight} onChange={e => setFormData({...formData, gross_weight: e.target.value})} /></div>
        <button type="submit" className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold mt-4 shadow-lg shadow-blue-200 transition-all transform active:scale-95">Save & Print Label</button>
      </form>
    </div>
);

const EditModal = ({ roll, isGuest, onClose, onSave, onDelete }) => {
    const [editData, setEditData] = useState({ ...roll });
    const handleDelete = () => { if(window.confirm("Delete this roll?")) { onDelete(roll.id); onClose(); } };
    
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between mb-4 items-center border-b pb-2">
                    <h2 className="font-bold text-lg">Edit Roll {roll.product_id}</h2>
                    <button onClick={onClose} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500">Customer</label>
                        <input disabled={isGuest} className="w-full border p-2 rounded" value={editData.customer_name || ''} onChange={e => setEditData({...editData, customer_name: e.target.value})} />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-gray-500">Quality</label>
                        <select disabled={isGuest} className="w-full border p-2 rounded bg-white" value={editData.quality} onChange={e => setEditData({...editData, quality: e.target.value})}>
                            {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500">Color</label>
                        <select disabled={isGuest} className="w-full border p-2 rounded bg-white" value={editData.color} onChange={e => setEditData({...editData, color: e.target.value})}>
                            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500">GSM</label>
                        <input disabled={isGuest} type="number" className="w-full border p-2 rounded" value={editData.gsm} onChange={e => setEditData({...editData, gsm: e.target.value})} />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500">Width (in)</label>
                        <input disabled={isGuest} type="number" className="w-full border p-2 rounded" value={editData.width_inches} onChange={e => setEditData({...editData, width_inches: e.target.value})} />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500">Length (m)</label>
                        <input disabled={isGuest} type="number" className="w-full border p-2 rounded" value={editData.length_meters} onChange={e => setEditData({...editData, length_meters: e.target.value})} />
                    </div>

                    <div className="border-t col-span-2 my-2"></div>

                    <div>
                        <label className="text-xs font-bold text-gray-500">Net Kg</label>
                        <input disabled={isGuest} type="number" className="w-full border-2 border-blue-100 p-2 rounded font-bold" value={editData.net_weight} onChange={e => setEditData({...editData, net_weight: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Gross Kg</label>
                        <input disabled={isGuest} type="number" className="w-full border p-2 rounded" value={editData.gross_weight} onChange={e => setEditData({...editData, gross_weight: e.target.value})} />
                    </div>
                </div>

                {!isGuest && (
                    <div className="flex flex-col gap-2">
                        {roll.status === 'dispatched' && <button onClick={() => onSave({ ...editData, status: 'in_stock', dispatched_at: null })} className="bg-orange-100 text-orange-700 p-3 rounded font-bold">Return to Stock</button>}
                        <button onClick={() => onSave(editData)} className="bg-blue-600 text-white p-3 rounded font-bold">Save Changes</button>
                        <button onClick={handleDelete} className="bg-white border border-red-500 text-red-500 p-3 rounded font-bold">Delete Roll</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const StockView = ({ rolls = [], onPrint, onExport, onSelectRoll }) => {
  const [showFilters, setShowFilters] = useState(false);
  
  // Search States
  const [textSearch, setTextSearch] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterGSM, setFilterGSM] = useState('');
  const [filterWidth, setFilterWidth] = useState('');

  const safeRolls = Array.isArray(rolls) ? rolls : [];
  
  const filtered = useMemo(() => {
      return safeRolls.filter(r => {
          // 1. Check Status
          if (r.status !== 'in_stock') return false;
          
          // 2. SMART TEXT SEARCH (Matches ALL words typed)
          if (textSearch) {
              const searchTerms = textSearch.toLowerCase().split(' ').filter(t => t.trim() !== '');
              const searchableText = `
                ${r.product_id} 
                ${r.customer_name || ''} 
                ${r.quality || ''} 
                ${r.color || ''} 
                ${r.gsm || ''} 
                ${r.width_inches || ''}
              `.toLowerCase();
              
              // Every word typed must appear somewhere
              const allTermsMatch = searchTerms.every(term => searchableText.includes(term));
              if (!allTermsMatch) return false;
          }

          // 3. Check Dropdown Filters (Combined Logic AND)
          if (filterQuality && r.quality !== filterQuality) return false;
          if (filterColor && r.color !== filterColor) return false;
          if (filterGSM && String(r.gsm) !== String(filterGSM)) return false;
          if (filterWidth && String(r.width_inches) !== String(filterWidth)) return false;

          return true;
      });
  }, [safeRolls, textSearch, filterQuality, filterColor, filterGSM, filterWidth]);

  const totalFilteredWeight = filtered.reduce((s, r) => s + (Number(r.net_weight)||0), 0);
  
  const clearFilters = () => {
      setTextSearch('');
      setFilterQuality('');
      setFilterColor('');
      setFilterGSM('');
      setFilterWidth('');
  };

  return (
      <div className="space-y-4 h-full flex flex-col relative">
          
          {/* SEARCH & FILTER BAR */}
          <div className="bg-white p-3 rounded shadow-sm flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="flex-1 flex gap-2 border p-2 rounded bg-gray-50 items-center">
                    <Search className="text-gray-400" size={20} />
                    <input className="w-full outline-none bg-transparent" placeholder="e.g. Reliance Red 40" value={textSearch} onChange={e => setTextSearch(e.target.value)} />
                </div>
                <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded border ${showFilters ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white'}`}>
                    <Filter size={20} />
                </button>
                <button onClick={onExport} className="bg-green-100 text-green-700 px-3 rounded text-sm font-bold flex items-center gap-1"><Download size={14}/> XLS</button>
              </div>

              {/* EXPANDABLE FILTERS */}
              {showFilters && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-2">
                      <select className="border p-2 rounded text-sm" value={filterQuality} onChange={e => setFilterQuality(e.target.value)}>
                          <option value="">All Qualities</option>
                          {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                      <select className="border p-2 rounded text-sm" value={filterColor} onChange={e => setFilterColor(e.target.value)}>
                          <option value="">All Colors</option>
                          {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input className="border p-2 rounded text-sm" placeholder="GSM (e.g. 40)" value={filterGSM} onChange={e => setFilterGSM(e.target.value)} type="number" />
                      <input className="border p-2 rounded text-sm" placeholder="Width (e.g. 63)" value={filterWidth} onChange={e => setFilterWidth(e.target.value)} type="number" />
                      
                      <button onClick={clearFilters} className="col-span-2 md:col-span-4 text-xs text-red-500 font-bold text-center mt-1">Clear All Filters</button>
                  </div>
              )}
          </div>

          <div className="flex-1 overflow-y-auto pb-24">
              {filtered.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">No matching rolls found.</div>
              ) : filtered.map(r => (
                  <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-4 rounded-xl border border-gray-100 mb-2 shadow-sm flex justify-between items-center cursor-pointer active:bg-blue-50">
                      <div>
                          <div className="font-bold text-blue-600 text-lg">{r.product_id}</div> 
                          <div className="font-semibold text-gray-800">{r.customer_name}</div>
                          <div className="text-xs text-gray-500 mt-1 inline-flex gap-2">
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{r.quality}</span>
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{r.color}</span>
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{r.gsm} GSM</span>
                          </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-xl">{r.net_weight} <span className="text-xs font-normal">kg</span></div>
                        <button onClick={(e) => { e.stopPropagation(); onPrint(r); }} className="mt-2 bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100"><Printer size={16}/></button>
                      </div>
                  </div>
              ))}
          </div>

          {/* Sticky Footer Summary */}
          <div className="fixed bottom-20 left-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl flex justify-between items-center z-40 max-w-7xl mx-auto">
             <div>
                <div className="text-gray-400 text-xs uppercase">Found</div>
                <div className="font-bold">{filtered.length} Rolls</div>
             </div>
             <div className="text-right">
                <div className="text-gray-400 text-xs uppercase">Total Weight</div>
                <div className="font-bold text-xl text-yellow-400">{formatCurrency(totalFilteredWeight)} kg</div>
             </div>
          </div>
      </div>
  );
};

// --- DISPATCH VIEW (WITH UNDO) ---
const DispatchView = ({ rolls, isGuest, deviceName, onDispatch, onUndoDispatch }) => {
    const [scanId, setScanId] = useState('');
    const [foundRoll, setFoundRoll] = useState(null);
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
        if (roll) { setFoundRoll(roll); } else { alert('Roll not found or already dispatched.'); }
        setScanId('');
    };

    const handleAdd = async () => {
        await onDispatch(foundRoll.id);
        setSessionList(prev => [foundRoll, ...prev]);
        setFoundRoll(null);
    };

    const handleRemoveFromManifest = async (index, item) => {
        if(confirm("Remove this roll from dispatch and return to stock?")) {
            await onUndoDispatch(item.id); // Reverts DB status
            const newList = [...sessionList];
            newList.splice(index, 1);
            setSessionList(newList);
        }
    };

    const handlePrint = () => {
        if(generateChallan(sessionList, { buyer: customerName, vehicle: vehicleNo, device: deviceName })) {
             if(confirm("Start new batch?")) { setSessionList([]); setCustomerName(''); setVehicleNo(''); }
        }
    };

    // Camera Handler
    const handleCameraScan = (decodedText) => {
        setIsScanning(false);
        handleSearch(decodedText);
    };

    return (
        <div className="space-y-4 pb-24">
            {isScanning && <BarcodeScanner onScan={handleCameraScan} onClose={() => setIsScanning(false)} />}
            
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-xl text-white shadow-lg">
                <h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={20}/> Dispatch Manifest</h3>
                <div className="grid grid-cols-2 gap-2">
                    <input className="w-full p-2 rounded text-black text-sm" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    <input className="w-full p-2 rounded text-black text-sm" placeholder="Vehicle No" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
                </div>
            </div>

            {!foundRoll && (
                <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
                    <div className="flex gap-2 mb-4">
                        <input 
                            className="flex-1 border-2 border-gray-200 p-3 rounded-lg text-center text-lg font-mono tracking-wider focus:border-blue-500 outline-none" 
                            placeholder="Enter / Scan ID" 
                            value={scanId} 
                            onChange={e => setScanId(e.target.value)} 
                        />
                        <button onClick={() => setIsScanning(true)} className="bg-gray-900 text-white p-3 rounded-lg"><Camera size={24}/></button>
                    </div>
                    <button onClick={() => handleSearch()} className="bg-blue-600 text-white w-full py-4 rounded-lg font-bold shadow-lg shadow-blue-200">Search Roll</button>
                </div>
            )}

            {foundRoll && (
                <div className="bg-green-50 p-6 rounded-xl border-2 border-green-500 animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-center mb-2"><CheckCircle className="text-green-600" size={40} /></div>
                    <div className="font-bold text-2xl text-green-800 text-center mb-1">{foundRoll.product_id}</div>
                    <div className="text-center mb-6 text-gray-600">{foundRoll.quality} • {foundRoll.net_weight}kg</div>
                    <div className="flex gap-3">
                        <button onClick={() => setFoundRoll(null)} className="flex-1 bg-white border border-gray-300 py-3 rounded-lg font-bold text-gray-500">Cancel</button>
                        <button onClick={handleAdd} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold shadow-lg shadow-green-200">Confirm Add</button>
                    </div>
                </div>
            )}

            {sessionList.length > 0 && (
                <div className="bg-white rounded-xl shadow border overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b flex justify-between font-bold text-gray-500 text-sm">
                        <span>Items: {sessionList.length}</span>
                        <span>Total: {sessionList.reduce((s,r)=>s+(parseFloat(r.net_weight)||0),0)} kg</span>
                    </div>
                    {sessionList.map((item, i) => (
                        <div key={i} className="p-3 border-b flex justify-between items-center last:border-0 hover:bg-gray-50">
                            <div>
                                <div className="font-mono text-gray-600 text-sm">{item.product_id}</div>
                                <div className="font-bold">{item.net_weight}kg</div>
                            </div>
                            <button 
                                onClick={() => handleRemoveFromManifest(i, item)} 
                                className="bg-red-50 text-red-600 p-2 rounded-full hover:bg-red-100 border border-red-200"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    <div className="p-4">
                        <button onClick={handlePrint} className="w-full bg-black text-white py-4 rounded-xl font-bold flex justify-center gap-2 items-center"><FileText size={20}/> Generate Gate Pass</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const HistoryView = ({ rolls, onExport, onSelectRoll }) => {
    // History Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const history = useMemo(() => {
        let list = (rolls || []).filter(r => r.status === 'dispatched');
        if (startDate) list = list.filter(r => new Date(r.dispatched_at) >= new Date(startDate));
        if (endDate) list = list.filter(r => new Date(r.dispatched_at) <= new Date(endDate + 'T23:59:59')); // Include end of day
        return list;
    }, [rolls, startDate, endDate]);

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-xl">History</h2>
                <button onClick={() => onExport(history)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold text-sm">Export List</button>
            </div>
            
            {/* Date Filters */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-white p-3 rounded shadow-sm">
                <div>
                    <label className="text-xs font-bold text-gray-400">Start Date</label>
                    <input type="date" className="w-full border p-1 rounded text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400">End Date</label>
                    <input type="date" className="w-full border p-1 rounded text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
            </div>

            {history.length === 0 ? <div className="text-center text-gray-400 mt-10">No records found.</div> : 
             history.map(r => (
                <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-3 rounded border mb-2 text-sm shadow-sm hover:bg-gray-50 cursor-pointer">
                    <div className="flex justify-between mb-1">
                        <span className="font-bold text-gray-800">{r.customer_name}</span>
                        <span className="text-green-600 font-bold">{r.net_weight} kg</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-xs">
                        <span>{r.product_id}</span>
                        <span>{new Date(r.dispatched_at).toLocaleDateString()}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const MaterialsView = ({ materials, isGuest, onUpdate, onAdd }) => { 
    const handleUpdate = (id, type) => { const qty = prompt(`Enter Kg to ${type === 'add' ? 'add' : 'remove'}:`); if (qty) onUpdate(id, qty, type === 'add'); };
    const handleAdd = () => { const name = prompt("Name:"); if(name) onAdd(name); };
    return (
        <div className="pb-20">
            {!isGuest && <button onClick={handleAdd} className="w-full border-dashed border-2 border-gray-300 p-4 rounded-xl mb-6 text-gray-500 font-bold hover:bg-gray-50 transition-colors">+ Add New Raw Material</button>}
            {(materials||[]).map(m => (
                <div key={m.id} className="bg-white p-5 rounded-xl shadow-sm border mb-3 flex justify-between items-center">
                    <div>
                        <div className="font-bold text-lg text-gray-800">{m.name}</div>
                        <div className="text-xs text-gray-400">Current Stock</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-blue-600">{m.stock_quantity} <span className="text-sm font-normal text-gray-400">kg</span></span>
                        {!isGuest && (
                            <div className="flex flex-col gap-1">
                                <button onClick={() => handleUpdate(m.id, 'add')} className="bg-green-100 text-green-700 w-8 h-8 rounded flex items-center justify-center font-bold">+</button>
                                <button onClick={() => handleUpdate(m.id, 'sub')} className="bg-red-100 text-red-700 w-8 h-8 rounded flex items-center justify-center font-bold">-</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    ); 
};

// --- MAIN CONTAINER ---
const MainApp = () => {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [deviceName, setDeviceName] = useState(localStorage.getItem('ksf_device_name') || '');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [editRoll, setEditRoll] = useState(null);
  const [isDeviceModalOpen, setDeviceModalOpen] = useState(false);
  const [formData, setFormData] = useState({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' });

  const fetchDataRef = useRef();
  const fetchData = useCallback(async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      const r = await DataService.getStock();
      const m = await DataService.getRawMaterials();
      setRolls(r || []);
      setMaterials(m || []);
      if (!isBackground) setLoading(false);
  }, []);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    const checkSession = async () => { const { data: { session } } = await supabase.auth.getSession(); if (session) { setUser(session.user); setIsGuest(false); fetchData(); } };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); if (session && !user) { setIsGuest(false); fetchData(); } });
    const interval = setInterval(() => { if((user || isGuest) && fetchDataRef.current) fetchDataRef.current(true); }, 10000);
    return () => { subscription.unsubscribe(); clearInterval(interval); };
  }, [fetchData]);

  useEffect(() => { if(user && !isGuest && !deviceName) setDeviceModalOpen(true); }, [user, isGuest, deviceName]);

  const handleLogin = async () => { await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); };
  const handleGuestEntry = () => { setIsGuest(true); fetchData(); };
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setIsGuest(false); setRolls([]); };
  const handleSaveDeviceName = (name) => { localStorage.setItem('ksf_device_name', name); setDeviceName(name); setDeviceModalOpen(false); };
  
  // CHANGED: Use 'R-' prefix instead of 'KSF-'
  const handleSaveRoll = async (e) => { 
      e.preventDefault(); 
      const id = `R-${Math.floor(Math.random() * 1000000)}`; 
      const newRoll = { ...formData, product_id: id, status: 'in_stock' }; 
      try { 
          await DataService.addRoll(newRoll, deviceName); 
          setPrintData(newRoll); 
          fetchData(); 
          setFormData({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' }); 
      } catch (err) { 
          alert('Error: ' + err.message); 
      } 
  };
  
  const handleDispatch = useCallback(async (id) => { await DataService.updateRoll(id, { status: 'dispatched', dispatched_at: new Date() }, deviceName); fetchData(true); }, [deviceName, fetchData]);
  
  const handleUndoDispatch = useCallback(async (id) => { await DataService.updateRoll(id, { status: 'in_stock', dispatched_at: null }, deviceName); fetchData(true); }, [deviceName, fetchData]);

  const handleDeleteRoll = async (id) => { await DataService.deleteRoll(id); fetchData(); };
  const handleEditRoll = useCallback(async (updates) => { await DataService.updateRoll(updates.id, updates, deviceName); setEditRoll(null); fetchData(true); }, [deviceName, fetchData]);
  const handleMaterialUpdate = async (id, qty, isAdd) => { await DataService.updateRawMaterial(id, qty, isAdd, deviceName); fetchData(); };
  const handleAddMaterial = async (name) => { await DataService.addRawMaterial(name); fetchData(); };
  const handleExport = (data = rolls) => { const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sheet1"); XLSX.writeFile(wb, "KSF_Data.xlsx"); };

  if (!user && !isGuest) { return (<div className="h-[100dvh] flex items-center justify-center bg-slate-50 p-6"><div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100"><img src="/logo.png" className="h-24 w-auto mx-auto mb-8 object-contain" alt="KSF" /><h1 className="text-2xl font-bold mb-2 text-gray-900">KSF Inventory</h1><p className="text-gray-500 mb-8">Manage your factory floor efficiently.</p><button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold mb-3 shadow-lg shadow-blue-200">Login with Google</button><button onClick={handleGuestEntry} className="w-full bg-white text-gray-700 py-3.5 rounded-xl font-bold border hover:bg-gray-50">View Only (Guest)</button></div></div>); }

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans pb-10">
      <Header user={user} isGuest={isGuest} deviceName={deviceName} onLogout={handleLogout} setTab={setActiveTab} activeTab={activeTab} onEditDeviceName={() => setDeviceModalOpen(true)} />
      <main className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
        {loading && activeTab !== 'dashboard' ? ( <div className="flex justify-center p-12 text-gray-400">Loading Data...</div> ) : (
            <>
                {activeTab === 'dashboard' && <DashboardView rolls={rolls} />}
                {activeTab === 'entry' && <NewProductView formData={formData} setFormData={setFormData} onSubmit={handleSaveRoll} />}
                {activeTab === 'stock' && <StockView rolls={rolls || []} onPrint={setPrintData} onExport={() => handleExport(rolls)} onSelectRoll={setEditRoll} />}
                {activeTab === 'dispatch' && <DispatchView rolls={rolls || []} isGuest={isGuest} deviceName={deviceName} onDispatch={handleDispatch} onUndoDispatch={handleUndoDispatch} />}
                {activeTab === 'history' && <HistoryView rolls={rolls || []} onSelectRoll={setEditRoll} onExport={handleExport} />}
                {activeTab === 'materials' && <MaterialsView materials={materials || []} isGuest={isGuest} onUpdate={handleMaterialUpdate} onAdd={handleAddMaterial} />}
            </>
        )}
      </main>
      
      {isDeviceModalOpen && <DeviceNameModal onSave={handleSaveDeviceName} initialName={deviceName} onClose={() => setDeviceModalOpen(false)} />}
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
      {editRoll && <EditModal roll={editRoll} isGuest={isGuest} onClose={() => setEditRoll(null)} onSave={handleEditRoll} onDelete={handleDeleteRoll} />}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}