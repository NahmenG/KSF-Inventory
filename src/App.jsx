import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// Component Imports
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
 * KSF Non-Woven Factory Management System
 * Core App Controller
 */
export default function App() {
  // --- AUTH & DEVICE STATE ---
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [deviceName, setDeviceName] = useState(() => 
    localStorage.getItem('ksf_device_name') || 'Factory_Main_Station'
  );

  // --- DATA STATES ---
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  
  // --- MODAL & PRINT STATES ---
  const [printData, setPrintData] = useState(null);
  const [editRoll, setEditRoll] = useState(null);

  // --- TAB PERSISTENCE LOGIC ---
  // Remembers which tab you were on if refreshed within 30 minutes
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('ksf_active_tab');
      const lastActivity = localStorage.getItem('ksf_last_activity');
      const now = Date.now();
      const sessionWindow = 30 * 60 * 1000; // 30 mins

      if (savedTab && lastActivity && (now - parseInt(lastActivity) < sessionWindow)) {
        return savedTab;
      }
    } catch (e) {
      console.error("Session restoration error:", e);
    }
    return 'dashboard';
  });

  // Track activity and save tab state
  useEffect(() => {
    localStorage.setItem('ksf_active_tab', activeTab);
    localStorage.setItem('ksf_last_activity', Date.now().toString());
  }, [activeTab]);

  // --- DATA FETCHING (Linear & Paginated) ---
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      // 1. Fetch Rolls using Range Pagination (Protects Mobile Memory)
      let allRolls = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('rolls')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + step - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allRolls = [...allRolls, ...data];
          if (data.length < step) hasMore = false;
          else from += step;
        }
      }
      setRolls(allRolls);

      // 2. Fetch Materials with Category Ordering
      const { data: mats, error: matsError } = await supabase
        .from('raw_materials')
        .select('*')
        .order('category', { ascending: true });
        
      if (matsError) throw matsError;
      setMaterials(mats || []);

    } catch (err) {
      console.error("System Fetch Error:", err.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  // --- AUTH INITIALIZATION ---
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

  // --- ORIGINAL LOGIN SCREEN UI ---
  if (!user && !isGuest) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border border-gray-100 animate-in fade-in zoom-in duration-500">
          
          {/* Company Logo */}
          <div className="bg-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
            <span className="text-white text-3xl font-black">KSF</span>
          </div>
          
          {/* Header Text */}
          <h1 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">Inventory Management</h1>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-10">Factory Access System</p>
          
          {/* Login Buttons */}
          <button 
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black mb-3 shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Google Login
          </button>
          
          <button 
            onClick={() => setIsGuest(true)} 
            className="w-full bg-slate-50 text-gray-500 py-4 rounded-2xl font-black border border-slate-100 hover:bg-slate-100 active:scale-95 transition-all"
          >
            Guest Mode
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN APPLICATION LAYOUT ---
  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-24 font-sans selection:bg-blue-100">
      
      {/* GLOBAL HEADER */}
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
          const n = prompt("Enter Station Name:", deviceName);
          if (n) {
            localStorage.setItem('ksf_device_name', n);
            setDeviceName(n);
          }
        }} 
        onLogoClick={() => setActiveTab('dashboard')} 
      />
      
      {/* VIEW ROUTER */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="animate-in fade-in duration-500">
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

      {/* BOTTOM NAVIGATION */}
      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />
      
      {/* SHARED MODALS */}
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