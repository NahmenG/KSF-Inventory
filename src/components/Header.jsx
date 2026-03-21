import React, { useState, useMemo, useEffect } from 'react';
import { Settings, LogOut, Monitor, Database, Download, X, HardDrive, CloudOff, RefreshCw, ShieldAlert } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../db'; 

export default function Header({ deviceName, loading, onLogout, onEditDeviceName, onLogoClick, rolls, materials, onManualSync }) {
  const [showSettings, setShowSettings] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // --- POLL PENDING SYNC COUNT ---
  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const count = await db.rolls.where('synced').equals(0).count();
        setPendingCount(count);
      } catch (err) {
        console.error("Sync count error:", err);
      }
    };
    const interval = setInterval(updatePendingCount, 2000);
    updatePendingCount();
    return () => clearInterval(interval);
  }, []);

  // 1. DATA USAGE SUMMARY
  const usageStats = useMemo(() => {
    const rollSize = JSON.stringify(rolls).length;
    const matSize = JSON.stringify(materials).length;
    const kb = ((rollSize + matSize) / 1024).toFixed(1);
    return { kb, rolls: rolls.length, materials: materials.length };
  }, [rolls, materials]);

  // 2. MASTER EXCEL EXPORT
  const downloadMasterData = () => {
    const wb = XLSX.utils.book_new();
    const stockWs = XLSX.utils.json_to_sheet(rolls.filter(r => r.status === 'in_stock'));
    const dispatchWs = XLSX.utils.json_to_sheet(rolls.filter(r => r.status === 'dispatched'));
    const matWs = XLSX.utils.json_to_sheet(materials);
    XLSX.utils.book_append_sheet(wb, stockWs, "Live Inventory");
    XLSX.utils.book_append_sheet(wb, dispatchWs, "Dispatched Records");
    XLSX.utils.book_append_sheet(wb, matWs, "Raw Materials");
    XLSX.writeFile(wb, `KSF_Master_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md h-16 border-b border-gray-100 z-50 flex items-center justify-between px-6">
        
        {/* LEFT SIDE: LARGE LOGO */}
        <div className="flex items-center cursor-pointer" onClick={onLogoClick}>
          <img 
            src="/logo.png" 
            alt="KSF Logo" 
            className="w-14 h-14 object-contain" 
            style={{ 
              imageRendering: 'pixelated', 
              transform: 'scale(1.3)' 
            }} 
          />
        </div>

        {/* RIGHT SIDE: SYNC STATUS & SETTINGS */}
        <div className="flex items-center gap-3">
          
          {/* SYNC BADGE / MANUAL SYNC BUTTON */}
          <button 
            onClick={onManualSync}
            disabled={loading}
            className={`flex flex-col items-end border-r border-gray-100 pr-3 transition-all active:scale-95 ${loading ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-[8px] font-black uppercase tracking-widest transition-colors duration-500 ${
                loading ? 'text-orange-500' : 
                pendingCount > 0 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {loading ? 'Syncing...' : pendingCount > 0 ? `${pendingCount} Pending` : 'All Synced'}
              </span>
              {loading ? (
                <RefreshCw size={8} className="text-orange-500 animate-spin" />
              ) : pendingCount > 0 ? (
                <CloudOff size={8} className="text-orange-600" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.4)]" />
              )}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[7px] font-black text-gray-400 uppercase tracking-tighter leading-none">Terminal</span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight leading-tight">{deviceName}</span>
            </div>
          </button>
          
          <button 
            onClick={() => setShowSettings(true)} 
            className="p-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-100 active:scale-90 transition-all hover:bg-slate-100"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* SETTINGS DRAWER */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-black text-gray-900 uppercase tracking-tight">System Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* SECURITY & ADMIN SECTION */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-red-600">
                  <ShieldAlert size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Security & Admin</span>
                </div>
                <button 
                  onClick={() => {
                    setShowSettings(false); // Close drawer
                    onEditDeviceName();     // Open the main System Settings Modal
                  }} 
                  className="w-full p-4 bg-red-50 rounded-2xl border border-red-100 text-left active:scale-95 transition-all"
                >
                  <span className="block text-[8px] text-red-400 font-black uppercase mb-1">Configuration</span>
                  <span className="font-bold text-red-800 uppercase text-xs tracking-tight">System Settings & Admin</span>
                </button>
              </section>

              {/* DEVICE SECTION */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                  <Monitor size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Device Identity</span>
                </div>
                <button onClick={() => { setShowSettings(false); onEditDeviceName(); }} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left active:scale-95 transition-all">
                  <span className="block text-[8px] text-gray-400 font-black uppercase mb-1">Terminal Details</span>
                  <span className="font-bold text-gray-800">{deviceName}</span>
                </button>
              </section>

              {/* EGRESS & DATA USAGE */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-orange-600">
                  <HardDrive size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Memory & Sync</span>
                </div>
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <div className="text-2xl font-black text-orange-700">{usageStats.kb} <span className="text-xs font-normal">KB</span></div>
                  <div className="text-[9px] font-bold text-orange-600/60 uppercase mt-1">
                    {usageStats.rolls} Rolls currently in sync
                  </div>
                </div>
              </section>

              {/* MASTER EXPORT */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-green-600">
                  <Database size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Master Database</span>
                </div>
                <button onClick={downloadMasterData} className="w-full p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center justify-between active:scale-95 transition-all group">
                  <div className="text-left">
                    <span className="block font-black text-xs uppercase">Full Export</span>
                    <span className="text-[9px] font-bold opacity-60 uppercase tracking-tighter italic">Excel with 3 separate sheets</span>
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