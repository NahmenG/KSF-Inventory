import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';

// Benchmark Component Imports
import Header from './components/Header.jsx';
import BottomNav from './components/BottomNav.jsx';
import DashboardView from './components/DashboardView.jsx';
import NewProductView from './components/NewProductView.jsx';
import StockView from './components/StockView.jsx';
import DispatchView from './components/DispatchView.jsx';
import HistoryView from './components/HistoryView.jsx';
import MaterialsView from './components/MaterialsView.jsx';
import EditModal from './components/EditModal.jsx';
import LabelPrint from './components/LabelPrint.jsx';

export default function App() {
  // --- AUTH & DEVICE CONFIG (Restored) ---
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [deviceName, setDeviceName] = useState(() => localStorage.getItem('ksf_device_name') || 'Factory_Main');
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editRoll, setEditRoll] = useState(null);
  const [printData, setPrintData] = useState(null);

  // --- DATA FETCHING (Benchmark Processor + Selective History) ---
  const fetchData = useCallback(async (rangeType = 'default') => {
    setLoading(true);
    try {
      // 1. Fetch Materials (Restored)
      const { data: mats } = await supabase.from('raw_materials').select('*').order('name');
      setMaterials(mats || []);

      // 2. Fetch ALL In-Stock Rolls (Required for Stock Tab)
      const { data: stockData } = await supabase
        .from('rolls')
        .select('*')
        .eq('status', 'in_stock');

      // 3. Fetch History based on User Preference (To save 5GB Data Limit)
      let historyQuery = supabase.from('rolls')
        .select('*')
        .eq('status', 'dispatched')
        .order('dispatched_at', { ascending: false });

      if (rangeType === 'default') {
        historyQuery = historyQuery.limit(200); // Only 200 to save data
      } else {
        const start = new Date(rangeType);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
        historyQuery = historyQuery.gte('dispatched_at', start.toISOString()).lte('dispatched_at', end.toISOString());
      }

      const { data: historyData } = await historyQuery;
      
      // Combine for the Benchmark Data Processor
      setRolls([...(stockData || []), ...(historyData || [])]);
    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- MASTER EXPORT (Requested Sheet-per-Tab logic) ---
  const downloadMasterExcel = () => {
    const wb = XLSX.utils.book_new();
    // Sheet 1: All Rolls currently in state
    const wsRolls = XLSX.utils.json_to_sheet(rolls);
    XLSX.utils.book_append_sheet(wb, wsRolls, "Rolls_Report");
    // Sheet 2: Materials
    const wsMats = XLSX.utils.json_to_sheet(materials);
    XLSX.utils.book_append_sheet(wb, wsMats, "Materials_Inventory");
    
    XLSX.writeFile(wb, `KSF_Master_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- AUTH SUBSCRIPTION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); fetchData(); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) fetchData();
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  // --- LOGIN PAGE (Strictly Maintained) ---
  if (!user && !isGuest) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border border-gray-100">
          <div className="flex justify-center mb-1">
            <img src="/logo.png" alt="KSF Logo" className="w-40 h-40 object-contain" style={{ imageRendering: 'pixelated' }} />
          </div>
          <div className="flex justify-center mb-10">
            <div className="max-w-[140px]">
              <h1 className="text-base font-bold text-gray-500 tracking-tight leading-tight">Inventory Manager</h1>
              <div className="w-6 h-0.5 bg-[#1e40af] mx-auto mt-2 rounded-full opacity-30"></div>
            </div>
          </div>
          <div className="space-y-3">
            <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} className="w-full bg-[#1e40af] text-white py-5 rounded-2xl font-black shadow-xl">Google Login</button>
            <button onClick={() => setIsGuest(true)} className="w-full bg-slate-50 text-gray-500 py-4 rounded-2xl font-bold border border-slate-100">Guest Mode</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-24">
      <Header 
        deviceName={deviceName} 
        loading={loading} 
        onLogout={() => { supabase.auth.signOut(); localStorage.clear(); window.location.reload(); }}
        onRefreshRange={(type) => fetchData(type)}
        onDownloadMaster={downloadMasterExcel}
        onEditDeviceName={() => {
          const n = prompt("Device Name:", deviceName); 
          if(n) {localStorage.setItem('ksf_device_name', n); setDeviceName(n)}
        }}
        onLogoClick={() => setActiveTab('dashboard')}
      />
      
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} />}
        {activeTab === 'entry' && <NewProductView rolls={rolls} deviceName={deviceName} onSaved={() => fetchData()} onPrint={setPrintData} />}
        {activeTab === 'stock' && <StockView rolls={rolls} onPrint={setPrintData} onSelectRoll={setEditRoll} />}
        {activeTab === 'dispatch' && <DispatchView rolls={rolls} deviceName={deviceName} onDispatch={() => fetchData()} />}
        {activeTab === 'history' && <HistoryView rolls={rolls} onSelectRoll={setEditRoll} />}
        {activeTab === 'materials' && <MaterialsView materials={materials} onUpdate={() => fetchData()} />}
      </main>

      <BottomNav activeTab={activeTab} setTab={setActiveTab} />
      
      {editRoll && <EditModal roll={editRoll} onClose={() => setEditRoll(null)} onSave={() => { setEditRoll(null); fetchData(); }} />}
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
    </div>
  );
}