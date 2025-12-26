import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Barcode from 'react-barcode';
import { Html5QrcodeScanner } from 'html5-qrcode'; // Note: You might need to install html5-qrcode
import * as XLSX from 'xlsx';
import { 
  Package, Truck, Layers, LogOut, Printer, Search, 
  Download, Scan, Plus, User, Database, AlertCircle 
} from 'lucide-react';
import { supabase } from './supabaseClient';

// --- DATA SERVICE ABSTRACTION (Handles Guest vs Cloud) ---
const DataService = {
  isGuest: false,

  async getStock() {
    if (this.isGuest) {
      return JSON.parse(localStorage.getItem('ksf_stock') || '[]');
    }
    const { data, error } = await supabase.from('rolls').select('*').order('created_at', { ascending: false });
    return error ? [] : data;
  },

  async addRoll(roll) {
    if (this.isGuest) {
      const stock = await this.getStock();
      stock.push(roll);
      localStorage.setItem('ksf_stock', JSON.stringify(stock));
      return roll;
    }
    const { data, error } = await supabase.from('rolls').insert([roll]).select();
    if (error) throw error;
    return data[0];
  },

  async updateRoll(id, updates) {
    if (this.isGuest) {
      let stock = await this.getStock();
      const index = stock.findIndex(r => r.id === id);
      if (index !== -1) {
        stock[index] = { ...stock[index], ...updates };
        localStorage.setItem('ksf_stock', JSON.stringify(stock));
      }
      return stock[index];
    }
    const { data, error } = await supabase.from('rolls').update(updates).eq('id', id).select();
    return data ? data[0] : null;
  },

  async getRawMaterials() {
    if (this.isGuest) {
      return JSON.parse(localStorage.getItem('ksf_materials') || '[]'); 
    }
    const { data, error } = await supabase.from('raw_materials').select('*').order('name');
    return error ? [] : data;
  },

  async updateRawMaterial(id, qty, isAddition) {
    // Logic to handle adding/issuing stock
    if (this.isGuest) {
        let mats = await this.getRawMaterials();
        const idx = mats.findIndex(m => m.id === id);
        if (idx >= 0) {
            mats[idx].stock_quantity = parseFloat(mats[idx].stock_quantity) + (isAddition ? parseFloat(qty) : -parseFloat(qty));
            localStorage.setItem('ksf_materials', JSON.stringify(mats));
        }
        return;
    }
    
    // For Supabase, we ideally use an RPC or simple update. Simple update for now:
    const { data } = await supabase.from('raw_materials').select('stock_quantity').eq('id', id).single();
    const newQty = parseFloat(data.stock_quantity) + (isAddition ? parseFloat(qty) : -parseFloat(qty));
    await supabase.from('raw_materials').update({ stock_quantity: newQty }).eq('id', id);
  }
};

// --- COMPONENTS ---

const Header = ({ user, onLogout, setTab, activeTab }) => (
  <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
    <div className="flex justify-between items-center max-w-7xl mx-auto">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setTab('dashboard')}>
        {/* LOGO: Ensure 'logo.png' is in your public folder */}
        <img src="/logo.png" alt="KSF Logo" className="h-12 w-auto bg-white rounded p-1" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">KSF Non-Woven</h1>
          <p className="text-xs text-slate-400">Inventory Management System</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-sm hidden md:block text-slate-300">
          {user ? `Logged in: ${user.email}` : 'Guest Mode (Local Storage)'}
        </span>
        <button onClick={onLogout} className="p-2 hover:bg-slate-700 rounded-full" title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </div>
    
    {/* Navigation Tabs */}
    <nav className="flex gap-2 mt-4 overflow-x-auto pb-2 max-w-7xl mx-auto">
      {[
        { id: 'dashboard', icon: Database, label: 'Dashboard' },
        { id: 'entry', icon: Plus, label: 'New Product' },
        { id: 'stock', icon: Package, label: 'Stock View' },
        { id: 'dispatch', icon: Truck, label: 'Dispatch' },
        { id: 'materials', icon: Layers, label: 'Raw Materials' },
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <tab.icon size={18} />
          {tab.label}
        </button>
      ))}
    </nav>
  </header>
);

const LabelPrint = ({ data, onClose }) => {
  if (!data) return null;
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-6 rounded-xl max-w-md w-full">
        <div id="print-area" className="border-4 border-black p-4 mb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
                <img src="/logo.png" className="h-8" alt="KSF" />
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [printData, setPrintData] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    customer_name: '', quality: '', gsm: '', color: '', 
    width_inches: '', length_meters: '', net_weight: '', gross_weight: ''
  });

  // Init
  useEffect(() => {
    const init = async () => {
        // Check session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUser(session.user);
            DataService.isGuest = false;
        } else {
            // Default to Guest if no session (or waiting for login)
            DataService.isGuest = true;
        }
        refreshData();
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        DataService.isGuest = !session;
        refreshData();
    });
    return () => subscription.unsubscribe();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    const r = await DataService.getStock();
    const m = await DataService.getRawMaterials();
    setRolls(r || []);
    setMaterials(m || []);
    setLoading(false);
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleGuest = () => {
    DataService.isGuest = true;
    setUser(null);
    refreshData();
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rolls);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, "KSF_Stock_Report.xlsx");
  };

  // --- SUB-VIEWS ---

  const NewProductView = () => {
    const handleSubmit = async (e) => {
        e.preventDefault();
        const id = `KSF-${Math.floor(Math.random() * 1000000)}`; // Simple ID gen
        const newRoll = {
            ...formData,
            product_id: id,
            status: 'in_stock',
            id: DataService.isGuest ? crypto.randomUUID() : undefined // UUID for guest
        };
        
        try {
            await DataService.addRoll(newRoll);
            setPrintData(newRoll);
            refreshData();
            setFormData({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' });
        } catch (err) {
            alert('Error adding product: ' + err.message);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Plus className="text-blue-600"/> New Roll Entry</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Customer Name (Internal)" required className="border p-2 rounded" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
                <input placeholder="Quality" required className="border p-2 rounded" value={formData.quality} onChange={e => setFormData({...formData, quality: e.target.value})} />
                <input type="number" placeholder="GSM" required className="border p-2 rounded" value={formData.gsm} onChange={e => setFormData({...formData, gsm: e.target.value})} />
                <input placeholder="Color" required className="border p-2 rounded" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                <input type="number" placeholder="Width (Inches)" required className="border p-2 rounded" value={formData.width_inches} onChange={e => setFormData({...formData, width_inches: e.target.value})} />
                <input type="number" placeholder="Length (Meters)" required className="border p-2 rounded" value={formData.length_meters} onChange={e => setFormData({...formData, length_meters: e.target.value})} />
                <input type="number" placeholder="Net Weight (Kg)" required className="border p-2 rounded" value={formData.net_weight} onChange={e => setFormData({...formData, net_weight: e.target.value})} />
                <input type="number" placeholder="Gross Weight (Kg)" required className="border p-2 rounded" value={formData.gross_weight} onChange={e => setFormData({...formData, gross_weight: e.target.value})} />
                
                <button type="submit" className="col-span-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition-colors">
                    Save & Generate Label
                </button>
            </form>
        </div>
    );
  };

  const StockView = () => {
    const [filter, setFilter] = useState('');
    const filtered = rolls.filter(r => r.status === 'in_stock' && (r.product_id.includes(filter) || r.quality.includes(filter) || r.color.includes(filter)));

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
                    <input className="w-full pl-10 p-2 border rounded-lg" placeholder="Search by ID, Quality, Color..." value={filter} onChange={e => setFilter(e.target.value)} />
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg font-medium border border-green-200">
                    <Download size={18} /> Export Excel
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 uppercase">
                            <tr>
                                <th className="p-3">ID</th>
                                <th className="p-3">Quality</th>
                                <th className="p-3">GSM</th>
                                <th className="p-3">Color</th>
                                <th className="p-3">Size</th>
                                <th className="p-3">Weight</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono font-bold text-blue-600">{r.product_id}</td>
                                    <td className="p-3">{r.quality}</td>
                                    <td className="p-3">{r.gsm}</td>
                                    <td className="p-3">{r.color}</td>
                                    <td className="p-3">{r.width_inches}" / {r.length_meters}m</td>
                                    <td className="p-3">{r.net_weight}kg</td>
                                    <td className="p-3">
                                        <button onClick={() => setPrintData(r)} className="text-blue-600 hover:underline">Reprint</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && <div className="p-8 text-center text-gray-400">No stock found matching filters.</div>}
            </div>
        </div>
    );
  };

  const DispatchView = () => {
    const [scanId, setScanId] = useState('');
    const [foundRoll, setFoundRoll] = useState(null);

    const handleSearch = () => {
        const roll = rolls.find(r => r.product_id === scanId && r.status === 'in_stock');
        if (roll) setFoundRoll(roll);
        else alert('Roll not found or already dispatched.');
    };

    const confirmDispatch = async () => {
        if (!foundRoll) return;
        await DataService.updateRoll(foundRoll.id, { status: 'dispatched', dispatched_at: new Date() });
        setFoundRoll(null);
        setScanId('');
        refreshData();
        alert('Dispatched Successfully');
    };

    return (
        <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="mb-4">
                    <h2 className="text-lg font-bold mb-2">Scan Barcode</h2>
                    <input 
                        className="w-full border-2 border-blue-100 p-4 text-center text-2xl rounded-xl focus:border-blue-500 outline-none" 
                        placeholder="Click here & Scan" 
                        value={scanId}
                        onChange={(e) => setScanId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        autoFocus
                    />
                    <p className="text-xs text-gray-400 mt-2">Use handheld scanner or type ID</p>
                </div>
                <button onClick={handleSearch} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold">Search Product</button>
            </div>

            {foundRoll && (
                <div className="bg-green-50 border border-green-200 p-6 rounded-xl animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2"><Package/> Roll Found</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div><span className="text-gray-500">ID:</span> {foundRoll.product_id}</div>
                        <div><span className="text-gray-500">Customer:</span> {foundRoll.customer_name}</div>
                        <div><span className="text-gray-500">Quality:</span> {foundRoll.quality}</div>
                        <div><span className="text-gray-500">Weight:</span> {foundRoll.net_weight}kg</div>
                    </div>
                    
                    {/* Editable Fields (Simplified for demo) */}
                    <div className="mb-4">
                        <label className="text-xs font-bold text-gray-500 uppercase">Correct Weight (if changed)</label>
                        <input 
                           type="number" 
                           className="w-full p-2 border rounded" 
                           defaultValue={foundRoll.net_weight} 
                           onChange={(e) => setFoundRoll({...foundRoll, net_weight: e.target.value})}
                        />
                    </div>

                    <button onClick={confirmDispatch} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-lg shadow-lg">
                        MARK AS DISPATCHED
                    </button>
                </div>
            )}
        </div>
    );
  };

  const MaterialsView = () => {
    const handleUpdate = async (id, type) => {
        const qty = prompt(`Enter quantity to ${type} (Kg):`);
        if (qty && !isNaN(qty)) {
            await DataService.updateRawMaterial(id, qty, type === 'add');
            refreshData();
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map(m => (
                <div key={m.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-slate-700">{m.name}</h3>
                        <div className="text-3xl font-black text-blue-600 mt-2">{m.stock_quantity} <span className="text-sm font-normal text-gray-400">{m.unit}</span></div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => handleUpdate(m.id, 'issue')} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-bold hover:bg-red-100">Issue</button>
                        <button onClick={() => handleUpdate(m.id, 'add')} className="flex-1 bg-green-50 text-green-600 py-2 rounded-lg text-sm font-bold hover:bg-green-100">Add Stock</button>
                    </div>
                </div>
            ))}
            {/* Add new material button logic would go here */}
        </div>
    );
  };

  const Dashboard = () => {
    const totalRolls = rolls.filter(r => r.status === 'in_stock').length;
    const totalWeight = rolls.filter(r => r.status === 'in_stock').reduce((acc, curr) => acc + parseFloat(curr.net_weight || 0), 0);
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg shadow-blue-200">
                <div className="opacity-80 font-medium mb-1">Total Rolls in Stock</div>
                <div className="text-4xl font-black">{totalRolls}</div>
            </div>
            <div className="bg-purple-600 text-white p-6 rounded-2xl shadow-lg shadow-purple-200">
                <div className="opacity-80 font-medium mb-1">Total Net Weight</div>
                <div className="text-4xl font-black">{totalWeight.toLocaleString()} <span className="text-xl">kg</span></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <div className="text-gray-500 font-medium mb-1">Low Stock Alerts</div>
                {materials.filter(m => m.stock_quantity < 100).length > 0 ? (
                   materials.filter(m => m.stock_quantity < 100).map(m => (
                       <div key={m.id} className="flex items-center gap-2 text-red-600 font-bold mt-2">
                           <AlertCircle size={16}/> {m.name}: {m.stock_quantity}kg
                       </div>
                   ))
                ) : (
                    <div className="text-green-600 font-bold mt-2">All materials healthy</div>
                )}
            </div>
        </div>
    );
  };

  // --- RENDER ---
  
  if (!user && !DataService.isGuest) {
    return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
                <img src="/logo.png" className="h-16 mx-auto mb-6" alt="KSF" />
                <h1 className="text-2xl font-bold mb-2">KSF Inventory</h1>
                <p className="text-gray-500 mb-6">Manage your fabric stock efficiently.</p>
                <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold mb-3 hover:bg-blue-700 transition">
                    Login with Google
                </button>
                <button onClick={handleGuest} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition">
                    Continue as Guest
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-20">
      <Header user={user} onLogout={() => supabase.auth.signOut()} setTab={setActiveTab} activeTab={activeTab} />
      
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {loading ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : (
            <>
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'entry' && <NewProductView />}
                {activeTab === 'stock' && <StockView />}
                {activeTab === 'dispatch' && <DispatchView />}
                {activeTab === 'materials' && <MaterialsView />}
            </>
        )}
      </main>

      {/* Print Modal */}
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
    </div>
  );
}