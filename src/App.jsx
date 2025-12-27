import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Barcode from 'react-barcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { 
  Package, Truck, Layers, LogOut, Printer, Search, 
  Download, Plus, Database, AlertCircle 
} from 'lucide-react';
import { supabase } from './supabaseClient';

// --- DATA SERVICE ---
const DataService = {
  async getStock(isGuest) {
    if (isGuest) return JSON.parse(localStorage.getItem('ksf_stock') || '[]');
    const { data, error } = await supabase.from('rolls').select('*').order('created_at', { ascending: false });
    return error ? [] : data;
  },

  async addRoll(roll, isGuest) {
    if (isGuest) {
      const stock = await this.getStock(true);
      stock.push(roll);
      localStorage.setItem('ksf_stock', JSON.stringify(stock));
      return roll;
    }
    const { data, error } = await supabase.from('rolls').insert([roll]).select();
    if (error) throw error;
    return data[0];
  },

  async updateRoll(id, updates, isGuest) {
    if (isGuest) {
      let stock = await this.getStock(true);
      const index = stock.findIndex(r => r.id === id);
      if (index !== -1) {
        stock[index] = { ...stock[index], ...updates };
        localStorage.setItem('ksf_stock', JSON.stringify(stock));
      }
      return;
    }
    await supabase.from('rolls').update(updates).eq('id', id);
  },

  async getRawMaterials(isGuest) {
    if (isGuest) return JSON.parse(localStorage.getItem('ksf_materials') || '[]'); 
    const { data, error } = await supabase.from('raw_materials').select('*').order('name');
    return error ? [] : data;
  },

  async updateRawMaterial(id, qty, isAddition, isGuest) {
    if (isGuest) {
        let mats = await this.getRawMaterials(true);
        const idx = mats.findIndex(m => m.id === id);
        if (idx >= 0) {
            mats[idx].stock_quantity = parseFloat(mats[idx].stock_quantity) + (isAddition ? parseFloat(qty) : -parseFloat(qty));
            localStorage.setItem('ksf_materials', JSON.stringify(mats));
        }
        return;
    }
    const { data } = await supabase.from('raw_materials').select('stock_quantity').eq('id', id).single();
    const currentQty = data ? parseFloat(data.stock_quantity) : 0;
    const newQty = currentQty + (isAddition ? parseFloat(qty) : -parseFloat(qty));
    await supabase.from('raw_materials').update({ stock_quantity: newQty }).eq('id', id);
  }
};

// --- COMPONENTS ---

const Header = ({ user, onLogout, setTab, activeTab }) => (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm safe-area-inset-top">
    {/* Top Bar */}
    <div className="flex justify-between items-center px-4 py-2 max-w-7xl mx-auto h-16">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setTab('dashboard')}>
        {/* LOGO FIX: Added flex-shrink-0 to prevent squashing */}
        <img 
            src="/logo.png" 
            alt="KSF Logo" 
            className="h-12 w-auto object-contain flex-shrink-0" 
        />
        <div className="hidden sm:block leading-tight">
          <h1 className="text-lg font-bold text-gray-900">KSF Non-Woven</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Inventory System</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full hidden md:block">
          {user ? user.email : 'Guest Mode'}
        </span>
        <button onClick={onLogout} className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
          <LogOut size={20} />
        </button>
      </div>
    </div>
    
    {/* Navigation Tabs */}
    <nav className="flex gap-1 px-2 overflow-x-auto no-scrollbar max-w-7xl mx-auto border-t border-gray-100 md:border-none">
      {[
        { id: 'dashboard', icon: Database, label: 'Dash' },
        { id: 'entry', icon: Plus, label: 'New' },
        { id: 'stock', icon: Package, label: 'Stock' },
        { id: 'dispatch', icon: Truck, label: 'Dispatch' },
        { id: 'materials', icon: Layers, label: 'Materials' },
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-3 py-3 md:py-3 rounded-t-lg text-[10px] md:text-sm font-medium transition-all min-w-[65px] flex-1 md:flex-none border-b-2 ${
            activeTab === tab.id 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <tab.icon size={18} className={activeTab === tab.id ? "text-blue-600" : "text-gray-400"} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  </header>
);

const NewProductView = ({ formData, setFormData, onSubmit }) => {
  return (
    <div className="max-w-xl mx-auto bg-white p-5 rounded-xl shadow-sm border border-gray-100 mt-2">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800 border-b pb-2">
          <Plus className="text-blue-600" size={20}/> New Roll Entry
      </h2>
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Customer</label>
            <input placeholder="Internal Name" required className="w-full bg-gray-50 border-gray-200 border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
        </div>

        <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Quality</label>
            <input placeholder="Type" required className="w-full bg-gray-50 border-gray-200 border p-2.5 rounded-lg" value={formData.quality} onChange={e => setFormData({...formData, quality: e.target.value})} />
        </div>
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Color</label>
            <input placeholder="Color" required className="w-full bg-gray-50 border-gray-200 border p-2.5 rounded-lg" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
        </div>

        <div className="col-span-2 grid grid-cols-3 gap-3">
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">GSM</label>
                <input type="number" className="w-full bg-gray-50 border-gray-200 border p-2.5 rounded-lg" value={formData.gsm} onChange={e => setFormData({...formData, gsm: e.target.value})} />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Width (In)</label>
                <input type="number" className="w-full bg-gray-50 border-gray-200 border p-2.5 rounded-lg" value={formData.width_inches} onChange={e => setFormData({...formData, width_inches: e.target.value})} />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Length (m)</label>
                <input type="number" className="w-full bg-gray-50 border-gray-200 border p-2.5 rounded-lg" value={formData.length_meters} onChange={e => setFormData({...formData, length_meters: e.target.value})} />
            </div>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
             <div>
                <label className="text-xs font-bold text-blue-800 uppercase ml-1">Net Kg</label>
                <input type="number" className="w-full bg-white border-blue-200 border p-2.5 rounded-lg font-bold text-blue-900" value={formData.net_weight} onChange={e => setFormData({...formData, net_weight: e.target.value})} />
            </div>
             <div>
                <label className="text-xs font-bold text-blue-800 uppercase ml-1">Gross Kg</label>
                <input type="number" className="w-full bg-white border-blue-200 border p-2.5 rounded-lg" value={formData.gross_weight} onChange={e => setFormData({...formData, gross_weight: e.target.value})} />
            </div>
        </div>
        
        <button type="submit" className="col-span-2 mt-2 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-blue-200">
          Save & Print Label
        </button>
      </form>
    </div>
  );
};

const StockView = ({ rolls, onPrint, onExport }) => {
  const [filter, setFilter] = useState('');
  const filtered = rolls.filter(r => r.status === 'in_stock' && (
      (r.product_id || '').toLowerCase().includes(filter.toLowerCase()) || 
      (r.quality || '').toLowerCase().includes(filter.toLowerCase()) || 
      (r.color || '').toLowerCase().includes(filter.toLowerCase())
  ));

  return (
      <div className="space-y-4 h-full flex flex-col">
          <div className="flex gap-2 sticky top-0 bg-slate-50 z-10 py-2">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
                  <input className="w-full pl-10 p-2.5 bg-white border-gray-200 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Search..." value={filter} onChange={e => setFilter(e.target.value)} />
              </div>
              <button onClick={onExport} className="bg-white border border-green-200 text-green-700 p-2.5 rounded-xl shadow-sm">
                  <Download size={20} />
              </button>
          </div>

          <div className="flex-1 overflow-y-auto pb-20">
            {filtered.map(r => (
                <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{r.product_id}</span>
                            <span className="text-xs font-bold text-gray-500 uppercase">{r.quality}</span>
                        </div>
                        <div className="text-gray-900 font-medium">
                            {r.color} • {r.width_inches}" • {r.gsm} GSM
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            Wt: <strong>{r.net_weight}kg</strong> • Len: {r.length_meters}m
                        </div>
                    </div>
                    <button onClick={() => onPrint(r)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg">
                        <Printer size={20}/>
                    </button>
                </div>
            ))}
            {filtered.length === 0 && <div className="text-center text-gray-400 py-10">No Stock Found</div>}
          </div>
      </div>
  );
};

const Dashboard = ({ rolls, materials }) => {
    const totalRolls = rolls.filter(r => r.status === 'in_stock').length;
    const totalWeight = rolls.filter(r => r.status === 'in_stock').reduce((acc, curr) => acc + parseFloat(curr.net_weight || 0), 0);
    
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-5 rounded-2xl shadow-lg shadow-blue-200">
                    <div className="text-blue-100 text-xs font-bold uppercase tracking-wide mb-1">Total Stock</div>
                    <div className="text-3xl font-black">{totalRolls}</div>
                    <div className="text-blue-200 text-xs mt-1">Rolls Available</div>
                </div>
                <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-5 rounded-2xl shadow-lg shadow-purple-200">
                    <div className="text-purple-100 text-xs font-bold uppercase tracking-wide mb-1">Total Weight</div>
                    <div className="text-3xl font-black">{totalWeight.toLocaleString()}</div>
                    <div className="text-purple-200 text-xs mt-1">Kilograms</div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="text-gray-900 font-bold mb-3 flex items-center gap-2">
                    <AlertCircle size={18} className="text-orange-500"/> Low Material Alerts
                </div>
                <div className="space-y-2">
                {materials.filter(m => m.stock_quantity < 100).length > 0 ? (
                   materials.filter(m => m.stock_quantity < 100).map(m => (
                       <div key={m.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100">
                           <span className="text-red-900 font-medium text-sm">{m.name}</span>
                           <span className="text-red-700 font-bold text-sm">{m.stock_quantity} kg</span>
                       </div>
                   ))
                ) : (
                    <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100 text-center">All materials sufficient</div>
                )}
                </div>
            </div>
        </div>
    );
};

const DispatchView = ({ rolls, onDispatch }) => {
    const [scanId, setScanId] = useState('');
    const [foundRoll, setFoundRoll] = useState(null);

    const handleSearch = () => {
        const roll = rolls.find(r => r.product_id === scanId && r.status === 'in_stock');
        if (roll) setFoundRoll(roll);
        else alert('Roll not found or already dispatched.');
    };

    return (
        <div className="max-w-xl mx-auto space-y-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="mb-4">
                    <h2 className="text-lg font-bold mb-2 text-gray-800">Scan Barcode</h2>
                    <input 
                        className="w-full bg-gray-50 border-2 border-gray-200 p-4 text-center text-xl font-mono tracking-widest rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all" 
                        placeholder="TAP TO SCAN" 
                        value={scanId}
                        onChange={(e) => setScanId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        autoFocus
                    />
                </div>
                <button onClick={handleSearch} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold">Find Product</button>
            </div>

            {foundRoll && (
                <div className="bg-green-50 border border-green-200 p-5 rounded-xl animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2"><Package size={20}/> Ready to Dispatch</h3>
                    <div className="bg-white/50 p-3 rounded-lg grid grid-cols-2 gap-y-2 text-sm mb-4">
                        <div className="text-gray-500">ID</div><div className="font-mono font-bold">{foundRoll.product_id}</div>
                        <div className="text-gray-500">Quality</div><div className="font-bold">{foundRoll.quality}</div>
                        <div className="text-gray-500">Weight</div><div className="font-bold">{foundRoll.net_weight} kg</div>
                    </div>
                    <button onClick={() => { onDispatch(foundRoll.id); setFoundRoll(null); setScanId(''); }} className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-green-200">
                        CONFIRM DISPATCH
                    </button>
                </div>
            )}
        </div>
    );
};

const MaterialsView = ({ materials, onUpdate }) => {
    const handleUpdate = (id, type) => {
        const qty = prompt(`Enter quantity to ${type} (Kg):`);
        if (qty && !isNaN(qty)) {
            onUpdate(id, qty, type === 'add');
        }
    };

    return (
        <div className="grid grid-cols-1 gap-3 pb-20">
            {materials.map(m => (
                <div key={m.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-700 text-sm">{m.name}</h3>
                        <div className="text-2xl font-black text-gray-900">{m.stock_quantity} <span className="text-xs font-medium text-gray-400">{m.unit}</span></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleUpdate(m.id, 'issue')} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-lg font-bold border border-red-100">-</button>
                        <button onClick={() => handleUpdate(m.id, 'add')} className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 rounded-lg font-bold border border-green-100">+</button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const LabelPrint = ({ data, onClose }) => {
  if (!data) return null;
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-6 rounded-xl max-w-md w-full">
        <div id="print-area" className="border-4 border-black p-4 mb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
                <img src="/logo.png" className="h-8 object-contain" alt="KSF" />
                <h2 className="text-2xl font-bold">KSF Non-Woven</h2>
            </div>
            <div className="grid grid-cols-2 text-left gap-y-1 text-sm border-t-2 border-black pt-2 mb-2 font-mono">
                <div><strong>Quality:</strong> {data.quality}</div>
                <div><strong>GSM:</strong> {data.gsm}</div>
                <div><strong>Color:</strong> {data.color}</div>
                <div><strong>Width:</strong> {data.width_inches}"</div>
                <div><strong>Length:</strong> {data.length_meters}m</div>
                <div><strong>Net Wt:</strong> {data.net_weight}kg</div>
                <div><strong>Gross Wt:</strong> {data.gross_weight}kg</div>
            </div>
            <div className="flex justify-center py-2">
                <Barcode value={data.product_id} width={2} height={50} fontSize={14} />
            </div>
        </div>
        <div className="flex gap-3 no-print">
          <button onClick={handlePrint} className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2">
            <Printer size={20} /> Print Label
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg">Close</button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [printData, setPrintData] = useState(null);
  
  const [formData, setFormData] = useState({
    customer_name: '', quality: '', gsm: '', color: '', 
    width_inches: '', length_meters: '', net_weight: '', gross_weight: ''
  });

  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUser(session.user);
            setIsGuest(false);
            fetchData(false);
        }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session) {
            setIsGuest(false);
            fetchData(false);
        }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (guestMode) => {
    setLoading(true);
    const r = await DataService.getStock(guestMode);
    const m = await DataService.getRawMaterials(guestMode);
    setRolls(r || []);
    setMaterials(m || []);
    setLoading(false);
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ 
        provider: 'google', 
        options: { redirectTo: window.location.origin } 
    });
  };

  const handleGuestEntry = () => {
    setIsGuest(true);
    fetchData(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    setRolls([]);
  };

  const handleSaveRoll = async (e) => {
    e.preventDefault();
    const id = `KSF-${Math.floor(Math.random() * 1000000)}`;
    const newRoll = {
        ...formData,
        product_id: id,
        status: 'in_stock',
        id: isGuest ? crypto.randomUUID() : undefined
    };
    try {
        await DataService.addRoll(newRoll, isGuest);
        setPrintData(newRoll);
        fetchData(isGuest);
        setFormData({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' });
    } catch (err) {
        alert('Error: ' + err.message);
    }
  };

  const handleDispatch = async (id) => {
      await DataService.updateRoll(id, { status: 'dispatched', dispatched_at: new Date() }, isGuest);
      alert('Dispatched Successfully');
      fetchData(isGuest);
  };

  const handleMaterialUpdate = async (id, qty, isAdd) => {
      await DataService.updateRawMaterial(id, qty, isAdd, isGuest);
      fetchData(isGuest);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rolls);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, "KSF_Stock_Report.xlsx");
  };

  if (!user && !isGuest) {
    return (
        <div className="h-[100dvh] flex items-center justify-center bg-slate-50 p-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100">
                {/* LOGO FIX: Added object-contain for login screen */}
                <img src="/logo.png" className="h-24 w-auto mx-auto mb-8 object-contain" alt="KSF" />
                <h1 className="text-2xl font-bold mb-2 text-gray-900">KSF Inventory</h1>
                <p className="text-gray-500 mb-8">Manage your factory floor efficiently.</p>
                <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold mb-3 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">
                    Login with Google
                </button>
                <button onClick={handleGuestEntry} className="w-full bg-white text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-50 transition border border-gray-200">
                    Continue as Guest
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans pb-10">
      <Header user={user} onLogout={handleLogout} setTab={setActiveTab} activeTab={activeTab} />
      
      <main className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
        {loading ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
        ) : (
            <>
                {activeTab === 'dashboard' && <Dashboard rolls={rolls} materials={materials} />}
                {activeTab === 'entry' && (
                    <NewProductView formData={formData} setFormData={setFormData} onSubmit={handleSaveRoll} />
                )}
                {activeTab === 'stock' && (
                    <StockView rolls={rolls} onPrint={setPrintData} onExport={handleExport} />
                )}
                {activeTab === 'dispatch' && (
                    <DispatchView rolls={rolls} onDispatch={handleDispatch} />
                )}
                {activeTab === 'materials' && (
                    <MaterialsView materials={materials} onUpdate={handleMaterialUpdate} />
                )}
            </>
        )}
      </main>

      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
    </div>
  );
}