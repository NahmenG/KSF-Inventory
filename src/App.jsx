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

/**
 * App Component
 * Manages global state, authentication, session persistence, 
 * and data orchestration for KSF Non-Woven Factory.
 */
export default function App() {
  // --- AUTH & USER STATE ---
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [deviceName, setDeviceName] = useState(() => 
    localStorage.getItem('ksf_device_name') || 'Factory_Main_Station'
  );

  // --- DATA STATES ---
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  
  // --- MODAL & UI STATES ---
  const [printData, setPrintData] = useState(null);
  const [editRoll, setEditRoll] = useState(null);

  // --- SESSION PERSISTENCE LOGIC ---
  // Restores active tab if last activity was within 30 minutes
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('ksf_active_tab');
      const lastActivity = localStorage.getItem('ksf_last_activity');
      const now = Date.now();
      const sessionTimeout = 30 * 60 * 1000; // 30 Minutes

      if (savedTab && lastActivity && (now - parseInt(lastActivity) < sessionTimeout)) {
        return savedTab;
      }
    } catch (err) {
      console.error("Session restoration failed:", err);
    }
    return 'dashboard';
  });

  // Track activity: Update timestamp and tab on every change
  useEffect(() => {
    localStorage.setItem('ksf_active_tab', activeTab);
    localStorage.setItem('ksf_last_activity', Date.now().toString());
  }, [activeTab]);

  // --- DATA FETCHING (SUPABASE) ---
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      // 1. Fetch Rolls using Range Pagination (Handles 1000+ records)
      let allRolls = [];
      let from = 0;
      const rangeStep = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('rolls')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + rangeStep - 1);

        if (error) throw error;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allRolls = [...allRolls, ...data];
          if (data.length < rangeStep) {
            hasMore = false;
          } else {
            from += rangeStep;
          }
        }
      }
      setRolls(allRolls);

      // 2. Fetch Raw Materials
      const { data: mats, error: matsError } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name', { ascending: true });
      
      if (matsError) throw matsError;
      setMaterials(mats || []);

    } catch (e) {
      console.error("Critical Data Fetch Error:", e.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  // --- AUTH SUBSCRIPTION ---
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchData();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        fetchData();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  // --- AUTH SCREEN ---
  if (!user && !isGuest) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 p-6 font-sans">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border border-gray-100 animate-in fade-in zoom-in duration-500">
          <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200">
             <span className="text-white font-black text-3xl tracking-tighter">KSF</span>
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">Factory Portal</h1>
          <p className="text-gray-400 text-sm font-bold mb-10 uppercase tracking-widest">Management System v2.1</p>
          
          <button 
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black mb-4 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            Sign in with Google
          </button>
          
          <button 
            onClick={() => setIsGuest(true)} 
            className="w-full bg-slate-50 text-gray-500 py-4 rounded-2xl font-bold border border-slate-100 hover:bg-slate-100 active:scale-95 transition-all"
          >
            Access as Guest
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN APP LAYOUT ---
  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-24 font-sans selection:bg-blue-100">
      {/* PERSISTENT HEADER */}
      <Header 
        deviceName={deviceName} 
        loading={loading} 
        onLogout={() => {
          if(window.confirm("Logout from system?")) {
            supabase.auth.signOut();
            localStorage.clear();
            window.location.reload();
          }
        }} 
        onEditDeviceName={() => {
          const n = prompt("Update Station/Device Name:", deviceName);
          if (n) {
            localStorage.setItem('ksf_device_name', n);
            setDeviceName(n);
          }
        }} 
        onLogoClick={() => setActiveTab('dashboard')} 
      />
      
      {/* VIEW ROUTER */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="animate-in fade-in duration-700">
          {activeTab === 'dashboard' && (
            <DashboardView rolls={rolls} materials={materials} />
          )}
          
          {activeTab === 'entry' && (
            <NewProductView 
              rolls={rolls} 
              deviceName={deviceName} 
              onSaved={() => fetchData(true)} 
              onPrint={setPrintData} 
            />
          )}
          
          {activeTab === 'stock' && (
            <StockView 
              rolls={rolls} 
              onPrint={setPrintData} 
              onSelectRoll={(r) => setEditRoll({...r})} 
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
              onSelectRoll={(r) => setEditRoll({...r})} 
            />
          )}
          
          {activeTab === 'materials' && (
            <MaterialsView 
              materials={materials} 
              onUpdate={() => fetchData(true)} 
            />
          )}
        </div>
      </main>

      {/* FIXED BOTTOM NAVIGATION */}
      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />
      
      {/* OVERLAY MODALS */}
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