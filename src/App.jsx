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

  // --- FULL DATA FETCHING LOGIC (Restored Benchmark) ---
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

  // --- THE LOGIN PAGE (Benchmark UI) ---
  if (!user && !isGuest) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border border-gray-100 animate-in fade-in duration-500">
          <div className="flex justify-center mb-1">
            <img 
              src="/logo.png" 
              alt="KSF Logo" 
              className="w-40 h-40 md:w-56 md:h-56 object-contain"
              style={{ imageRendering: 'pixelated', transform: 'scale(1.02)' }}
            />
          </div>
          <div className="flex justify-center mb-10">
            <div className="max-w-[140px]">
              <h1 className="text-base font-bold text-gray-400 tracking-tight leading-tight">Inventory Manager</h1>
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

  // --- MAIN APP UI ---
  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-24 font-sans">
      <Header 
        deviceName={deviceName} 
        loading={loading} 
        onLogout={() => { if(window.confirm("Logout?")) { supabase.auth.signOut(); localStorage.clear(); window.location.reload(); } }} 
        onEditDeviceName={() => { const n = prompt("Device Name:", deviceName); if(n) {localStorage.setItem('ksf_device_name', n); setDeviceName(n)} }} 
        onLogoClick={() => setActiveTab('dashboard')} 
      />
      
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} />}
          {activeTab === 'entry' && <NewProductView rolls={rolls} deviceName={deviceName} onSaved={() => fetchData(true)} onPrint={setPrintData} />}
          {activeTab === 'stock' && <StockView rolls={rolls} onPrint={setPrintData} onSelectRoll={(r) => setEditRoll({...r})} />}
          {activeTab === 'dispatch' && <DispatchView rolls={rolls} deviceName={deviceName} onDispatch={() => fetchData(true)} />}
          
          {/* HISTORY TAB: ONLY DISPATCHED ROLLS FROM LAST 30 DAYS BY DEFAULT */}
          {activeTab === 'history' && (
            <HistoryView 
              rolls={rolls.filter(r => {
                if (r.status !== 'dispatched') return false;
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return new Date(r.dispatched_at) >= thirtyDaysAgo;
              })} 
              onSelectRoll={(r) => setEditRoll({...r})} 
            />
          )}
          
          {activeTab === 'materials' && <MaterialsView materials={materials} onUpdate={() => fetchData(true)} />}
        </div>
      </main>

      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />
      {editRoll && <EditModal roll={editRoll} onClose={() => setEditRoll(null)} onSave={() => { setEditRoll(null); fetchData(true); }} />}
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
    </div>
  );
}