import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Barcode from 'react-barcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { 
  Package, Truck, Layers, LogOut, Printer, Search, 
  Download, Plus, Database, AlertCircle, Calendar, Clock, 
  Pencil, Trash2, X, Camera, EyeOff, Eye
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

  async deleteRoll(id, isGuest) {
    if (isGuest) {
      let stock = await this.getStock(true);
      stock = stock.filter(r => r.id !== id);
      localStorage.setItem('ksf_stock', JSON.stringify(stock));
      return;
    }
    await supabase.from('rolls').delete().eq('id', id);
  },

  async getRawMaterials(isGuest) {
    if (isGuest) return JSON.parse(localStorage.getItem('ksf_materials') || '[]'); 
    const { data, error } = await supabase.from('raw_materials').select('*').order('name');
    return error ? [] : data;
  },

  async addRawMaterial(name, isGuest) {
      const newMat = { name, stock_quantity: 0, unit: 'kg' };
      if (isGuest) {
          let mats = await this.getRawMaterials(true);
          mats.push({ ...newMat, id: crypto.randomUUID() });
          localStorage.setItem('ksf_materials', JSON.stringify(mats));
          return;
      }
      await supabase.from('raw_materials').insert([newMat]);
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
    <div className="flex justify-between items-center px-4 py-2 max-w-7xl mx-auto h-16">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setTab('dashboard')}>
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
    
    <nav className="flex gap-1 px-2 overflow-x-auto no-scrollbar max-w-7xl mx-auto border-t border-gray-100 md:border-none">
      {[
        { id: 'dashboard', icon: Database, label: 'Dash' },
        { id: 'entry', icon: Plus, label: 'New' },
        { id: 'stock', icon: Package, label: 'Stock' },
        { id: 'dispatch', icon: Truck, label: 'Dispatch' },
        { id: 'history', icon: Calendar, label: 'History' },
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

// --- SCANNER COMPONENT ---
const BarcodeScanner = ({ onScan }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner("reader", { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        }, false);

        scanner.render((text) => {
            scanner.clear();
            onScan(text);
        }, (error) => {
            console.warn(error);
        });

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-xl overflow-hidden p-4">
                 <h3 className="text-center font-bold mb-2">Scan Roll Barcode</h3>
                 <div id="reader" className="w-full"></div>
                 <button onClick={() => onScan(null)} className="w-full mt-4 bg-red-100 text-red-600 py-3 rounded-lg font-bold">Cancel</button>
            </div>
        </div>
    );
};

const EditModal = ({ roll, onClose, onSave, onDelete }) => {
    const [editData, setEditData] = useState({ ...roll });

    const handleDelete = () => {
        if(window.confirm("PERMANENTLY DELETE this roll?")) {
            onDelete(roll.id);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-5 rounded-xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Package size={18} className="text-blue-600"/> Roll Details
                    </h2>
                    <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-red-500"/></button>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg mb-4 text-center">
                    <div className="text-xs text-blue-600 uppercase font-bold">Product ID</div>
                    <div className="text-xl font-mono font-black text-blue-900">{roll.product_id}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="col-span-2">
                         <label className="text-xs font-bold text-gray-500 uppercase">Customer</label>
                         <input className="w-full border p-2.5 rounded-lg bg-gray-50" value={editData.customer_name || ''} onChange={e => setEditData({...editData, customer_name: e.target.value})} />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 uppercase">Quality</label>
                         <input className="w-full border p-2.5 rounded-lg" value={editData.quality} onChange={e => setEditData({...editData, quality: e.target.value})} />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 uppercase">Color</label>
                         <input className="w-full border p-2.5 rounded-lg" value={editData.color} onChange={e => setEditData({...editData, color: e.target.value})} />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 uppercase">Net Kg</label>
                         <input type="number" className="w-full border p-2.5 rounded-lg font-bold" value={editData.net_weight} onChange={e => setEditData({...editData, net_weight: e.target.value})} />
                    </div>
                     <div>
                         <label className="text-xs font-bold text-gray-500 uppercase">Gross Kg</label>
                         <input type="number" className="w-full border p-2.5 rounded-lg" value={editData.gross_weight} onChange={e => setEditData({...editData, gross_weight: e.target.value})} />
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button onClick={() => onSave(editData)} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200">
                        Save Changes
                    </button>
                    <button onClick={handleDelete} className="w-full bg-white border border-red-200 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50">
                        <Trash2 size={18}/> Delete Roll
                    </button>
                </div>
            </div>
        </div>
    );
};

const StockView = ({ rolls, onPrint, onExport, onSelectRoll }) => {
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
                <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 flex justify-between items-center active:bg-blue-50 transition-colors cursor-pointer">
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
                    {/* StopPropagation prevents opening the edit modal when clicking print */}
                    <button onClick={(e) => { e.stopPropagation(); onPrint(r); }} className="p-3 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg">
                        <Printer size={20}/>
                    </button>
                </div>
            ))}
            {filtered.length === 0 && <div className="text-center text-gray-400 py-10">No Stock Found</div>}
          </div>
      </div>
  );
};

const HistoryView = ({ rolls }) => {
    const history = rolls
        .filter(r => r.status === 'dispatched')
        .sort((a, b) => new Date(b.dispatched_at) - new Date(a.dispatched_at));

    const totalDispatchedWeight = history.reduce((acc, curr) => acc + parseFloat(curr.net_weight || 0), 0);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="bg-slate-800 text-white p-5 rounded-xl shadow-md">
                <div className="flex items-center gap-2 mb-2 text-slate-300 text-sm uppercase font-bold tracking-wider">
                    <Clock size={16}/> Dispatch Log
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-3xl font-black">{history.length}</div>
                        <div className="text-xs text-slate-400">Rolls Sent</div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-green-400">{totalDispatchedWeight.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">Total Kg</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-20">
                {history.map(r => (
                    <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 relative">
                        <div className="absolute top-4 right-4 text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            {new Date(r.dispatched_at).toLocaleDateString()}
                        </div>
                        <div className="mb-2">
                             <span className="font-mono font-bold text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{r.product_id}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 text-sm text-gray-600">
                             <div>To: <span className="font-bold text-gray-900">{r.customer_name || 'Unknown'}</span></div>
                             <div>Wt: <span className="font-bold text-gray-900">{r.net_weight} kg</span></div>
                             <div>Qual: {r.quality}</div>
                             <div>Size: {r.width_inches}" / {r.length_meters}m</div>
                        </div>
                    </div>
                ))}
                {history.length === 0 && <div className="text-center text-gray-400 py-10">No dispatch history yet.</div>}
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
    const [showScanner, setShowScanner] = useState(false);

    const handleSearch = (idOverride) => {
        const query = idOverride || scanId;
        const roll = rolls.find(r => r.product_id === query && r.status === 'in_stock');
        if (roll) {
            setFoundRoll(roll);
            setScanId(query);
            setShowScanner(false);
        }
        else alert('Roll not found or already dispatched.');
    };

    return (
        <div className="max-w-xl mx-auto space-y-4">
            {showScanner && <BarcodeScanner onScan={(text) => { if(text) handleSearch(text); else setShowScanner(false); }} />}
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="mb-4">
                    <h2 className="text-lg font-bold mb-2 text-gray-800">Scan Barcode</h2>
                    <input 
                        className="w-full bg-gray-50 border-2 border-gray-200 p-4 text-center text-xl font-mono tracking-widest rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all" 
                        placeholder="Type or Scan" 
                        value={scanId}
                        onChange={(e) => setScanId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowScanner(true)} className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                        <Camera size={20}/> Camera
                    </button>
                    <button onClick={() => handleSearch()} className="bg-gray-900 text-white py-3 rounded-xl font-bold">
                        Search
                    </button>
                </div>
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

const MaterialsView = ({ materials, onUpdate, onAdd }) => {
    const handleUpdate = (id, type) => {
        const qty = prompt(`Enter quantity to ${type} (Kg):`);
        if (qty && !isNaN(qty)) {
            onUpdate(id, qty, type === 'add');
        }
    };

    const handleAdd = () => {
        const name = prompt("Enter Material Name (e.g. Vistamaxx, Omega, Red MB):");
        if(name) onAdd(name);
    };

    return (
        <div className="pb-20">
            <button onClick={handleAdd} className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-500 py-3 rounded-xl font-bold mb-4 hover:border-blue-400 hover:text-blue-500 transition-colors">
                + Add New Material
            </button>
            <div className="grid grid-cols-1 gap-3">
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
        </div>
    );
};

const LabelPrint = ({ data, onClose }) => {
  const [showLogo, setShowLogo] = useState(true);
  if (!data) return null;
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-6 rounded-xl max-w-md w-full">
        
        {/* Print Preview Area */}
        <div id="print-area" className="border-4 border-black p-4 mb-4 text-center bg-white">
            {showLogo && (
                <div className="flex items-center justify-center gap-2 mb-2">
                    <img src="/logo.png" className="h-8 object-contain" alt="KSF" />
                    <h2 className="text-2xl font-bold">KSF Non-Woven</h2>
                </div>
            )}
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

        {/* Controls */}
        <div className="mb-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
             <span className="text-sm font-bold text-gray-600">Include Logo?</span>
             <button onClick={() => setShowLogo(!showLogo)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${showLogo ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                 {showLogo ? 'YES' : 'NO'}
             </button>
        </div>

        <div className="flex gap-3 no-print">
          <button onClick={handlePrint} className="flex-1 bg-blue-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-200">
            <Printer size={20} /> Print
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">Close</button>
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
  
  // Modals state
  const [printData, setPrintData] = useState(null);
  const [editRoll, setEditRoll] = useState(null);
  
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

  const handleDeleteRoll = async (id) => {
      await DataService.deleteRoll(id, isGuest);
      fetchData(isGuest);
  };

  const handleEditRoll = async (updates) => {
      await DataService.updateRoll(updates.id, updates, isGuest);
      setEditRoll(null);
      fetchData(isGuest);
  };

  const handleMaterialUpdate = async (id, qty, isAdd) => {
      await DataService.updateRawMaterial(id, qty, isAdd, isGuest);
      fetchData(isGuest);
  };

  const handleAddMaterial = async (name) => {
      await DataService.addRawMaterial(name, isGuest);
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
                    <StockView 
                        rolls={rolls} 
                        onPrint={setPrintData} 
                        onExport={handleExport} 
                        onSelectRoll={setEditRoll}
                    />
                )}
                {activeTab === 'dispatch' && (
                    <DispatchView rolls={rolls} onDispatch={handleDispatch} />
                )}
                {activeTab === 'history' && (
                    <HistoryView rolls={rolls} />
                )}
                {activeTab === 'materials' && (
                    <MaterialsView 
                        materials={materials} 
                        onUpdate={handleMaterialUpdate} 
                        onAdd={handleAddMaterial}
                    />
                )}
            </>
        )}
      </main>

      {/* Modals */}
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
      {editRoll && <EditModal roll={editRoll} onClose={() => setEditRoll(null)} onSave={handleEditRoll} onDelete={handleDeleteRoll} />}
    </div>
  );
}