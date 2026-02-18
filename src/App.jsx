import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// Components
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
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [deviceName, setDeviceName] = useState(() => localStorage.getItem('ksf_device_name') || 'Factory_Station_1');
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [editRoll, setEditRoll] = useState(null);

  // 1. SESSION PERSISTENCE LOGIC (THE FIX)
  // This initializes the state by checking the last activity timestamp
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('ksf_active_tab');
    const lastActivity = localStorage.getItem('ksf_last_activity');
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000; // Time window for "refresh" memory

    // If we have a saved tab and the last activity was less than 30 mins ago
    if (savedTab && lastActivity && (now - parseInt(lastActivity) < thirtyMinutes)) {
      return savedTab;
    }
    // Otherwise, default to dashboard
    return 'dashboard';
  });

  // 2. ACTIVITY TRACKER
  // Every time the tab changes or the component updates, we update the timestamp
  useEffect(() => {
    localStorage.setItem('ksf_active_tab', activeTab);
    localStorage.setItem('ksf_last_activity', Date.now().toString());
  }, [activeTab]);

  // 3. DATA FETCHING LOGIC
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

      const { data: mats, error: matsError } = await supabase
        .from('raw_materials')
        .select('*')
        .order('category', { ascending: true });
        
      if (matsError) throw matsError;
      setMaterials(mats || []);
    } catch (e) {
      console.error("Database Fetch Error:", e.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  // 4. AUTH & INITIALIZATION
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchData();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) fetchData();
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  // 5. RENDER LOGIC
  if (!user && !isGuest) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-gray-100 animate-in fade-in zoom-in duration-500">
          <div className="bg-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-100">
            <span className="text-white text-3xl font-black">KSF</span>
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">Factory Login</h1>
          <p className="text-gray-400 text-sm font-bold mb-8">Access the production management system</p>
          
          <button 
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black mb-3 shadow-xl shadow-blue-100 active:scale-95 transition-all"
          >
            Sign in with Google
          </button>
          
          <button 
            onClick={() => setIsGuest(true)} 
            className="w-full bg-slate-50 text-gray-500 py-4 rounded-2xl font-black border border-slate-100 hover:bg-slate-100 active:scale-95 transition-all"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-24 font-sans selection:bg-blue-100">
      <Header 
        deviceName={deviceName} 
        loading={loading} 
        onLogout={() => {
          supabase.auth.signOut();
          localStorage.clear(); // Clear session on explicit logout
          window.location.reload();
        }} 
        onEditDeviceName={() => {
          const n = prompt("Enter Station Name:", deviceName);
          if (n) {
            localStorage.setItem('ksf_device_name', n);
            setDeviceName(n);
          }
        }} 
        onLogoClick={() => setActiveTab('dashboard')} 
      />
      
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* VIEW ROUTER */}
        {activeTab === 'dashboard' && (
          <DashboardView rolls={rolls} materials={materials} />
        )}
        
        {activeTab === 'entry' && (
          <NewProductView 
            deviceName={deviceName} 
            onSaved={() => fetchData(true)} 
            onPrint={setPrintData} 
          />
        )}
        
        {activeTab === 'stock' && (
          <StockView 
            rolls={rolls} 
            onPrint={setPrintData} 
            onSelectRoll={(r) => setEditRoll({ ...r })} 
          />
        )}
        
        {activeTab === 'dispatch' && (
          <DispatchView 
            rolls={rolls} 
            deviceName={deviceName} 
            onDispatch={() => fetchData(true)} 
          />
        )}
        
        {activeTab === 'history' && (
          <HistoryView 
            rolls={rolls} 
            onSelectRoll={(r) => setEditRoll({ ...r })} 
          />
        )}
        
        {activeTab === 'materials' && (
          <MaterialsView 
            materials={materials} 
            onUpdate={() => fetchData(true)} 
          />
        )}
      </main>

      {/* NAVIGATION BAR */}
      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />
      
      {/* MODALS */}
      {editRoll && (
        <EditModal 
          roll={editRoll} 
          onClose={() => setEditRoll(null)} 
          onSave={() => {
            setEditRoll(null);
            fetchData(true);
          }} 
        />
      )}
      
      {printData && (
        <LabelPrint 
          data={printData} 
          onClose={() => setPrintData(null)} 
        />
      )}
    </div>
  );
}