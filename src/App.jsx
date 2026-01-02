import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import JsBarcode from 'jsbarcode';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// Recharts import
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
// Lucide icons - importing only safe ones
import { 
  Package, Truck, Layers, LogOut, Printer, Search, 
  Download, Database, Calendar, Clock, 
  Pencil, Trash2, X, Camera, Smartphone, Activity, Eye, FileText, CheckCircle
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

// --- CONSTANTS ---
const QUALITIES = ['Virgin', 'Fresh', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = [
  'White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 
  'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 
  'Navy Blue', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'
];

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
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 50);
        doc.text(`Buyer: ${details.buyer}`, 14, 56);
        doc.text(`Vehicle: ${details.vehicle}`, 14, 62);
        
        const tableData = rolls.map((r, i) => [i + 1, r.product_id, r.quality, r.color, r.width_inches, r.gsm, r.net_weight]);
        doc.autoTable({ startY: 75, head: [['#', 'ID', 'Qual', 'Col', 'Size', 'GSM', 'Kg']], body: tableData });
        
        const totalWt = rolls.reduce((sum, r) => sum + Number(r.net_weight || 0), 0);
        doc.text(`Total Weight: ${totalWt} kg`, 14, doc.lastAutoTable.finalY + 10);
        doc.save(`GatePass.pdf`);
        return true;
    } catch (err) {
        alert("PDF Error: " + err.message);
        return false;
    }
};

// --- COMPONENTS ---
const Header = ({ user, isGuest, deviceName, onLogout, setTab, activeTab, onEditDeviceName }) => (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div className="flex justify-between items-center px-4 h-16">
      <div className="font-bold text-xl cursor-pointer" onClick={() => setTab('dashboard')}>KSF Inventory</div>
      <div className="flex items-center gap-3 text-sm">
        {!isGuest && <div onClick={onEditDeviceName} className="font-bold cursor-pointer">{deviceName || 'Device'} ✎</div>}
        <button onClick={onLogout} className="text-red-600 font-bold">Logout</button>
      </div>
    </div>
    <div className="flex overflow-x-auto border-t">
      {[
        { id: 'dashboard', label: '📊 Dash' },
        !isGuest && { id: 'entry', label: '➕ New' },
        { id: 'stock', label: '📦 Stock' },
        { id: 'dispatch', label: '🚚 Disp' },
        { id: 'history', label: '🕒 Hist' },
        { id: 'materials', label: '🧱 Mat' }
      ].filter(Boolean).map(tab => (
        <button key={tab.id} onClick={() => setTab(tab.id)} className={`flex-1 p-3 text-sm font-bold border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
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
            <div id="reader" className="w-full bg-white rounded overflow-hidden"></div>
            <button onClick={onClose} className="mt-4 bg-red-600 text-white px-6 py-3 rounded font-bold">Close Camera</button>
        </div>
    );
};

const LabelPrint = ({ data, onClose }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
      if (data && canvasRef.current) try { JsBarcode(canvasRef.current, data.product_id, { format: "CODE128", displayValue: false }); } catch (e) {}
  }, [data]);
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-4 rounded-lg w-full max-w-md text-center">
        <h2 className="font-bold mb-4">Label Preview</h2>
        <div className="border-2 border-black p-4 text-left font-mono text-sm mb-4">
            <div className="font-bold text-center text-lg mb-2">KSF NON WOVEN</div>
            <div className="grid grid-cols-2 gap-2">
                <div>Q: {data.quality}</div><div>GSM: {data.gsm}</div>
                <div>Col: {data.color}</div><div>Sz: {data.width_inches} in</div>
                <div>Net: {data.net_weight}kg</div><div>Gr: {data.gross_weight}kg</div>
            </div>
            <div className="flex justify-center mt-2"><canvas ref={canvasRef} className="w-full h-12"></canvas></div>
            <div className="text-center font-bold">{data.product_id}</div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white p-3 rounded font-bold">Print</button>
            <button onClick={onClose} className="flex-1 bg-gray-200 p-3 rounded font-bold">Close</button>
        </div>
      </div>
    </div>
  );
};

const NewProductView = ({ formData, setFormData, onSubmit }) => (
    <div className="bg-white p-4 rounded-lg shadow border mt-2">
      <h2 className="text-lg font-bold mb-4">➕ New Roll Entry</h2>
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Customer</label><input required className="w-full border p-2 rounded" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} /></div>
        <div><label className="text-xs font-bold text-gray-500">Quality</label><select required className="w-full border p-2 rounded" value={formData.quality} onChange={e => setFormData({...formData, quality: e.target.value})}><option value="">Select...</option>{QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}</select></div>
        <div><label className="text-xs font-bold text-gray-500">Color</label><select required className="w-full border p-2 rounded" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}><option value="">Select...</option>{COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="col-span-2 grid grid-cols-3 gap-3">
            <div><label className="text-xs font-bold text-gray-500">GSM</label><input type="number" className="w-full border p-2 rounded" value={formData.gsm} onChange={e => setFormData({...formData, gsm: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-500">Width</label><input type="number" className="w-full border p-2 rounded" value={formData.width_inches} onChange={e => setFormData({...formData, width_inches: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-500">Length</label><input type="number" className="w-full border p-2 rounded" value={formData.length_meters} onChange={e => setFormData({...formData, length_meters: e.target.value})} /></div>
        </div>
        <div><label className="text-xs font-bold text-gray-500">Net Kg</label><input type="number" className="w-full border p-2 rounded font-bold" value={formData.net_weight} onChange={e => setFormData({...formData, net_weight: e.target.value})} /></div>
        <div><label className="text-xs font-bold text-gray-500">Gross Kg</label><input type="number" className="w-full border p-2 rounded" value={formData.gross_weight} onChange={e => setFormData({...formData, gross_weight: e.target.value})} /></div>
        <button type="submit" className="col-span-2 bg-blue-600 text-white p-3 rounded font-bold mt-2">Save & Print</button>
      </form>
    </div>
);

const EditModal = ({ roll, isGuest, onClose, onSave, onDelete }) => {
    const [editData, setEditData] = useState({ ...roll });
    const handleDelete = () => { if(window.confirm("Delete this roll?")) { onDelete(roll.id); onClose(); } };
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                <div className="flex justify-between mb-4"><h2 className="font-bold text-lg">Edit Roll {roll.product_id}</h2><button onClick={onClose}>✕</button></div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="col-span-2"><label className="text-xs font-bold">Customer</label><input disabled={isGuest} className="w-full border p-2 rounded" value={editData.customer_name || ''} onChange={e => setEditData({...editData, customer_name: e.target.value})} /></div>
                    <div><label className="text-xs font-bold">Net Kg</label><input disabled={isGuest} type="number" className="w-full border p-2 rounded" value={editData.net_weight} onChange={e => setEditData({...editData, net_weight: e.target.value})} /></div>
                    <div><label className="text-xs font-bold">Gross Kg</label><input disabled={isGuest} type="number" className="w-full border p-2 rounded" value={editData.gross_weight} onChange={e => setEditData({...editData, gross_weight: e.target.value})} /></div>
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
  const [search, setSearch] = useState('');
  // Use Safe Arrays
  const safeRolls = Array.isArray(rolls) ? rolls : [];
  
  const filtered = useMemo(() => {
      return safeRolls.filter(r => r.status === 'in_stock' && (
          !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
      ));
  }, [safeRolls, search]);
  
  return (
      <div className="space-y-4 h-full flex flex-col">
          <div className="flex gap-2">
              <input className="w-full border p-2 rounded" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              <button onClick={onExport} className="bg-green-100 text-green-700 px-4 rounded font-bold">Exp</button>
          </div>
          <div className="bg-blue-100 p-2 rounded text-blue-800 text-sm font-bold flex justify-between">
              <span>Count: {filtered.length}</span>
              <span>Total: {filtered.reduce((s, r) => s + (Number(r.net_weight)||0), 0)} kg</span>
          </div>
          <div className="flex-1 overflow-y-auto pb-20">
              {filtered.map(r => (
                  <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-3 rounded border mb-2 shadow-sm flex justify-between items-center cursor-pointer">
                      <div>
                          <div className="font-bold text-blue-600">{r.product_id} <span className="text-black font-normal">{r.customer_name}</span></div>
                          <div className="text-sm text-gray-600">{r.quality} • {r.color} • {r.width_inches}" • {r.gsm}GSM</div>
                          <div className="font-bold">{r.net_weight} kg</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); onPrint(r); }} className="bg-gray-100 p-2 rounded">🖨️</button>
                  </div>
              ))}
          </div>
      </div>
  );
};

const DispatchView = ({ rolls, isGuest, deviceName, onDispatch, onUpdateRoll }) => {
    const [scanId, setScanId] = useState('');
    const [foundRoll, setFoundRoll] = useState(null);
    const [sessionList, setSessionList] = useState(() => safeJSONParse('ksf_dispatch_list_v9', []));
    const [customerName, setCustomerName] = useState(() => localStorage.getItem('ksf_dispatch_customer_v9') || '');
    const [vehicleNo, setVehicleNo] = useState(() => localStorage.getItem('ksf_dispatch_vehicle_v9') || '');

    useEffect(() => {
        localStorage.setItem('ksf_dispatch_list_v9', JSON.stringify(sessionList));
        localStorage.setItem('ksf_dispatch_customer_v9', customerName);
        localStorage.setItem('ksf_dispatch_vehicle_v9', vehicleNo);
    }, [sessionList, customerName, vehicleNo]);

    const handleSearch = () => {
        const roll = (rolls || []).find(r => r.product_id === scanId && r.status === 'in_stock');
        if (roll) { setFoundRoll(roll); } else { alert('Not found or dispatched'); }
    };

    const handleAdd = async () => {
        await onDispatch(foundRoll.id);
        setSessionList(prev => [foundRoll, ...prev]);
        setFoundRoll(null);
        setScanId('');
    };

    const handlePrint = () => {
        if(generateChallan(sessionList, { buyer: customerName, vehicle: vehicleNo, device: deviceName })) {
             if(confirm("Start new batch?")) { setSessionList([]); setCustomerName(''); setVehicleNo(''); }
        }
    };

    return (
        <div className="space-y-4 pb-20">
            <div className="bg-blue-600 p-4 rounded text-white">
                <h3 className="font-bold mb-2">Dispatch Manifest</h3>
                <input className="w-full p-2 rounded text-black mb-2" placeholder="Customer" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                <input className="w-full p-2 rounded text-black" placeholder="Vehicle No" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
            </div>
            {!foundRoll && (
                <div className="bg-white p-4 rounded shadow text-center">
                    <input className="w-full border p-3 rounded mb-2 text-center text-lg font-mono" placeholder="Scan Barcode" value={scanId} onChange={e => setScanId(e.target.value)} />
                    <button onClick={handleSearch} className="bg-gray-800 text-white w-full py-3 rounded font-bold">Search</button>
                </div>
            )}
            {foundRoll && (
                <div className="bg-green-100 p-4 rounded border border-green-300">
                    <div className="font-bold text-lg text-green-800 text-center mb-2">Found: {foundRoll.product_id}</div>
                    <div className="text-center mb-4">{foundRoll.quality} - {foundRoll.net_weight}kg</div>
                    <div className="flex gap-2">
                        <button onClick={() => setFoundRoll(null)} className="flex-1 bg-gray-300 py-3 rounded font-bold">Cancel</button>
                        <button onClick={handleAdd} className="flex-1 bg-green-600 text-white py-3 rounded font-bold">Confirm & Add</button>
                    </div>
                </div>
            )}
            {sessionList.length > 0 && (
                <div>
                    <h4 className="font-bold text-gray-500 mb-2">List ({sessionList.length})</h4>
                    {sessionList.map((item, i) => (
                        <div key={i} className="bg-white p-2 border-b flex justify-between">
                            <span>{item.product_id}</span>
                            <span className="font-bold">{item.net_weight}kg</span>
                        </div>
                    ))}
                    <button onClick={handlePrint} className="w-full bg-black text-white py-4 rounded font-bold mt-4">Generate PDF</button>
                </div>
            )}
        </div>
    );
};

const HistoryView = ({ rolls, onExport }) => {
    // FIX: Removed "->" arrow symbol which was causing build crash
    const history = (rolls || []).filter(r => r.status === 'dispatched');
    return (
        <div>
            <div className="flex justify-between items-center mb-4"><h2 className="font-bold">History</h2><button onClick={() => onExport(history)} className="bg-blue-100 px-3 py-1 rounded">Export</button></div>
            {history.map(r => (<div key={r.id} className="bg-white p-3 rounded border mb-2 text-sm"><div>{r.product_id} &rarr; {r.customer_name}</div><div className="text-gray-500">{new Date(r.dispatched_at).toLocaleDateString()}</div></div>))}
        </div>
    );
};

const MaterialsView = ({ materials, isGuest, onUpdate, onAdd }) => { 
    const handleUpdate = (id, type) => { const qty = prompt(`Enter Kg:`); if (qty) onUpdate(id, qty, type === 'add'); };
    const handleAdd = () => { const name = prompt("Name:"); if(name) onAdd(name); };
    return (
        <div className="pb-20">
            {!isGuest && <button onClick={handleAdd} className="w-full border-dashed border-2 border-gray-300 p-3 rounded mb-4 text-gray-500 font-bold">+ New Material</button>}
            {(materials||[]).map(m => (<div key={m.id} className="bg-white p-4 rounded shadow mb-2 flex justify-between items-center"><span className="font-bold">{m.name}</span><div className="flex items-center gap-3"><span className="text-xl font-bold">{m.stock_quantity}</span>{!isGuest && <div className="flex gap-1"><button onClick={() => handleUpdate(m.id, 'sub')} className="bg-red-100 px-3 rounded">-</button><button onClick={() => handleUpdate(m.id, 'add')} className="bg-green-100 px-3 rounded">+</button></div>}</div></div>))}
        </div>
    ); 
};

// --- MAIN CONTAINER (WRAPPED IN ERROR BOUNDARY) ---
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
  
  const handleSaveRoll = async (e) => { e.preventDefault(); const id = `KSF-${Math.floor(Math.random() * 1000000)}`; const newRoll = { ...formData, product_id: id, status: 'in_stock' }; try { await DataService.addRoll(newRoll, deviceName); setPrintData(newRoll); fetchData(); setFormData({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' }); } catch (err) { alert('Error: ' + err.message); } };
  const handleDispatch = useCallback(async (id) => { await DataService.updateRoll(id, { status: 'dispatched', dispatched_at: new Date() }, deviceName); fetchData(true); }, [deviceName, fetchData]);
  const handleDeleteRoll = async (id) => { await DataService.deleteRoll(id); fetchData(); };
  const handleEditRoll = useCallback(async (updates) => { await DataService.updateRoll(updates.id, updates, deviceName); setEditRoll(null); fetchData(true); }, [deviceName, fetchData]);
  const handleMaterialUpdate = async (id, qty, isAdd) => { await DataService.updateRawMaterial(id, qty, isAdd, deviceName); fetchData(); };
  const handleAddMaterial = async (name) => { await DataService.addRawMaterial(name); fetchData(); };
  const handleExport = (data = rolls) => { const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sheet1"); XLSX.writeFile(wb, "KSF_Data.xlsx"); };

  if (!user && !isGuest) { return (<div className="h-[100dvh] flex items-center justify-center bg-slate-50 p-6"><div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100"><img src="/logo.png" className="h-24 w-auto mx-auto mb-8 object-contain" alt="KSF" /><h1 className="text-2xl font-bold mb-2 text-gray-900">KSF Inventory</h1><p className="text-gray-500 mb-8">Manage your factory floor efficiently.</p><button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold mb-3">Login with Google</button><button onClick={handleGuestEntry} className="w-full bg-white text-gray-700 py-3.5 rounded-xl font-bold border">View Only (Guest)</button></div></div>); }

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans pb-10">
      <Header user={user} isGuest={isGuest} deviceName={deviceName} onLogout={handleLogout} setTab={setActiveTab} activeTab={activeTab} onEditDeviceName={() => setDeviceModalOpen(true)} />
      <main className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
        {loading ? ( <div className="flex justify-center p-12">Loading...</div> ) : (
            <>
                {activeTab === 'dashboard' && <div className="p-4 bg-white rounded shadow text-center"><h2 className="text-xl font-bold">Welcome Back</h2><div className="mt-4 text-4xl font-bold text-blue-600">{rolls.filter(r => r.status === 'in_stock').length} Rolls</div><div className="text-gray-500">In Stock</div></div>}
                {activeTab === 'entry' && <NewProductView formData={formData} setFormData={setFormData} onSubmit={handleSaveRoll} />}
                {activeTab === 'stock' && <StockView rolls={rolls || []} onPrint={setPrintData} onExport={() => handleExport(rolls)} onSelectRoll={setEditRoll} />}
                {activeTab === 'dispatch' && <DispatchView rolls={rolls || []} isGuest={isGuest} deviceName={deviceName} onDispatch={handleDispatch} onUpdateRoll={handleEditRoll} />}
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