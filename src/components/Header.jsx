import React, { useState, useMemo } from 'react';
import { Settings, LogOut, Monitor, Database, Download, X, HardDrive } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Header({ deviceName, loading, onLogout, onEditDeviceName, onLogoClick, rolls, materials }) {
  const [showSettings, setShowSettings] = useState(false);

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
              transform: 'scale(1.22)' 
            }} 
          />
        </div>

        {/* RIGHT SIDE: STATUS, DEVICE NAME & SETTINGS */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end border-r border-gray-100 pr-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-[8px] font-black uppercase tracking-widest ${loading ? 'text-orange-500' : 'text-green-600'}`}>
                {loading ? 'Syncing' : 'System Live'}
              </span>
              <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-orange-400 animate-pulse' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.4)]'}`} />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[7px] font-black text-gray-400 uppercase tracking-tighter leading-none">Terminal</span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight leading-tight">{deviceName}</span>
            </div>
          </div>
          
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
              {/* DEVICE SECTION */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                  <Monitor size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Device Identity</span>
                </div>
                <button onClick={onEditDeviceName} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left active:scale-95 transition-all">
                  <span className="block text-[8px] text-gray-400 font-black uppercase mb-1">Rename Terminal</span>
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