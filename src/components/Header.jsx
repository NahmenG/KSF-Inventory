import React, { useState, useMemo } from 'react';
import { Settings, LogOut, Shield, Monitor, Database, Download, X, HardDrive } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Header({ deviceName, loading, onLogout, onEditDeviceName, onLogoClick, rolls, materials }) {
  const [showSettings, setShowSettings] = useState(false);

  // 1. DATA USAGE SUMMARY
  const usageStats = useMemo(() => {
    const rollSize = JSON.stringify(rolls).length;
    const matSize = JSON.stringify(materials).length;
    const totalBytes = rollSize + matSize;
    const kb = (totalBytes / 1024).toFixed(1);
    return {
      kb,
      rolls: rolls.length,
      materials: materials.length
    };
  }, [rolls, materials]);

  // 2. MASTER EXCEL EXPORT (Multiple Tabs)
  const downloadMasterData = () => {
    const wb = XLSX.utils.book_new();

    // Tab 1: Live Stock
    const stockData = rolls.filter(r => r.status === 'in_stock').map(r => ({
      ID: r.product_id, Quality: r.quality, GSM: r.gsm, Size: r.width_inches, Color: r.color, Weight: r.net_weight, Created: r.created_at
    }));
    const stockWs = XLSX.utils.json_to_sheet(stockData);
    XLSX.utils.book_append_sheet(wb, stockWs, "Live Inventory");

    // Tab 2: Dispatched (Current Range)
    const dispatchData = rolls.filter(r => r.status === 'dispatched').map(r => ({
      ID: r.product_id, Buyer: r.customer_name, Quality: r.quality, Weight: r.net_weight, Dispatched: r.dispatched_at
    }));
    const dispatchWs = XLSX.utils.json_to_sheet(dispatchData);
    XLSX.utils.book_append_sheet(wb, dispatchWs, "Dispatched Records");

    // Tab 3: Raw Materials
    const matData = materials.map(m => ({ Name: m.name, Stock: m.stock_kg, "Last Updated": m.updated_at }));
    const matWs = XLSX.utils.json_to_sheet(matData);
    XLSX.utils.book_append_sheet(wb, matWs, "Raw Materials");

    XLSX.writeFile(wb, `KSF_Master_Database_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md h-16 border-b border-gray-100 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onLogoClick}>
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-xs font-black text-gray-800 uppercase leading-none">{deviceName}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                {loading ? 'Syncing...' : 'System Live'}
              </span>
            </div>
          </div>
        </div>

        <button onClick={() => setShowSettings(true)} className="p-2.5 bg-gray-50 text-gray-400 rounded-2xl border border-gray-100 active:scale-90 transition-all">
          <Settings size={20} />
        </button>
      </header>

      {/* SETTINGS DRAWER */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-black text-gray-900 uppercase tracking-tight">System Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* DEVICE SECTION */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                  <Monitor size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Device Identity</span>
                </div>
                <button onClick={onEditDeviceName} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                  <span className="block text-[8px] text-gray-400 font-black uppercase mb-1">Current Name</span>
                  <span className="font-bold text-gray-800">{deviceName}</span>
                </button>
              </section>

              {/* DATA USAGE SECTION */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-orange-600">
                  <HardDrive size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">App Data Usage</span>
                </div>
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-2xl font-black text-orange-700">{usageStats.kb} <span className="text-xs font-normal">KB</span></span>
                    <span className="text-[10px] font-bold text-orange-400 uppercase">Memory Footprint</span>
                  </div>
                  <div className="text-[9px] font-bold text-orange-600/60 uppercase">
                    Loaded: {usageStats.rolls} Rolls • {usageStats.materials} Materials
                  </div>
                </div>
              </section>

              {/* DATABASE TOOLS */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-green-600">
                  <Database size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Database Tools</span>
                </div>
                <button 
                  onClick={downloadMasterData}
                  className="w-full p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center justify-between group active:scale-95 transition-all"
                >
                  <div className="text-left">
                    <span className="block font-black text-xs uppercase">Master Export</span>
                    <span className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">Download All Loaded Data (3 Tabs)</span>
                  </div>
                  <Download size={20} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>
              </section>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button onClick={onLogout} className="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all">
                <LogOut size={20} /> LOGOUT
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}