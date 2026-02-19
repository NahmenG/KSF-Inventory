import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// Full Component Imports
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
  // --- AUTH & DEVICE CONFIG ---
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [deviceName, setDeviceName] = useState(() => 
    localStorage.getItem('ksf_device_name') || 'Factory_Main'
  );

  // --- DATA STATES ---
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [editRoll, setEditRoll] = useState(null);

  // --- SESSION TAB PERSISTENCE ---
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('ksf_active_tab');
      const lastActivity = localStorage.getItem('ksf_last_activity');
      const now = Date.now();
      const sessionTimeout = 30 * 60 * 1000;

      if (savedTab && lastActivity && (now - parseInt(lastActivity) < sessionTimeout)) {
        return savedTab;
      }
    } catch (e) {
      console.error("Session restore error", e);
    }
    return 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('ksf_active_tab', activeTab);
    localStorage.setItem('ksf_last_activity', Date.now().toString());
  }, [activeTab]);

  // --- FULL DATA FETCHING LOGIC ---
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      let allRolls = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('rolls')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + step - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allRolls = [...allRolls, ...data];
        if (data.length < step) break;
        from += step;
      }
      setRolls(allRolls);

      const { data: mats } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name');
      setMaterials(mats || []);
    } catch (e) { 
      console.error("Fetch Error:", e);
    } finally { 
      if (!isBackground) setLoading(false); 
    }
  }, []);

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

  // --- THE LOGIN PAGE (EXACT RESTORATION WITH LOGO) ---
  if (!user && !isGuest) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border border-gray-100">
          
          {/* 1. Company Logo on Top (Ensuring visible rendering) */}
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-100 border-4 border-white">
              <span className="text-white text-4xl font-black tracking-tighter">KSF</span>
            </div>
          </div>
          
          {/* 2. Inventory Management Text */}
          <h1 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">Inventory Management</h1>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-10">Factory Control Portal</p>
          
          {/* 3. Two Login Buttons */}
          <div className="space-y-3">
            <button 
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Google Login
            </button>
            
            <button 
              onClick={() => setIsGuest(true)} 
              className="w-full bg-slate-50 text-gray-400 py-4 rounded-2xl font-black border border-slate-100 hover:bg-slate-100 active:scale-95 transition-all"
            >
              Guest Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP UI ---
  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-24 font-sans">
      <Header 
        deviceName={deviceName} 
        loading={loading} 
        onLogout={() => {
          if(window.confirm("Logout and clear session?")) {
            supabase.auth.signOut(); 
            localStorage.clear(); 
            window.location.reload();
          }
        }} 
        onEditDeviceName={() => {
          const n = prompt("Device Name:", deviceName); 
          if(n) {localStorage.setItem('ksf_device_name', n); setDeviceName(n)}
        }} 
        onLogoClick={() => setActiveTab('dashboard')} 
      />
      
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} />}
          {activeTab === 'entry' && <NewProductView rolls={rolls} deviceName={deviceName} onSaved={() => fetchData(true)} onPrint={setPrintData} />}
          {activeTab === 'stock' && <StockView rolls={rolls} onPrint={setPrintData} onSelectRoll={(r) => setEditRoll({...r})} />}
          {activeTab === 'dispatch' && <DispatchView rolls={rolls} deviceName={deviceName} onDispatch={() => fetchData(true)} />}
          {activeTab === 'history' && <HistoryView rolls={rolls} onSelectRoll={(r) => setEditRoll({...r})} />}
          {activeTab === 'materials' && <MaterialsView materials={materials} onUpdate={() => fetchData(true)} />}
        </div>
      </main>

      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />
      
      {editRoll && <EditModal roll={editRoll} onClose={() => setEditRoll(null)} onSave={() => { setEditRoll(null); fetchData(true); }} />}
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
    </div>
  );
}