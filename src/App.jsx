import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [deviceName, setDeviceName] = useState(() => localStorage.getItem('ksf_device_name') || 'Factory_Main');
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [editRoll, setEditRoll] = useState(null);
  const [activeRange, setActiveRange] = useState('30days'); 
  const fetchLock = useRef(false);

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('ksf_active_tab');
    return saved || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('ksf_active_tab', activeTab);
    localStorage.setItem('ksf_last_activity', Date.now().toString());
  }, [activeTab]);

  // CORE FETCH LOGIC
  const fetchData = useCallback(async (start = null, end = null) => {
    setLoading(true);
    try {
      // 1. STOCK FETCH (Full Pagination)
      let allStock = [];
      let stockFrom = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase.from('rolls').select('*').eq('status', 'in_stock').range(stockFrom, stockFrom + step - 1);
        if (error || !data || data.length === 0) break;
        allStock = [...allStock, ...data];
        if (data.length < step) break;
        stockFrom += step;
      }

      // 2. HISTORY FETCH (Range Aware)
      let allHistory = [];
      let histFrom = 0;
      let query = supabase.from('rolls').select('*').eq('status', 'dispatched').order('dispatched_at', { ascending: false });

      // Determine Dates
      let finalStart = start;
      let finalEnd = end;

      if (!finalStart || !finalEnd) {
        const saved = localStorage.getItem('ksf_history_filters');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.startDate && parsed.endDate) {
            finalStart = parsed.startDate;
            finalEnd = parsed.endDate;
          }
        }
      }

      if (finalStart && finalEnd) {
        query = query.gte('dispatched_at', finalStart).lte('dispatched_at', finalEnd + 'T23:59:59');
        setActiveRange('custom');
      } else {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('dispatched_at', thirtyDaysAgo.toISOString());
        setActiveRange('30days');
      }

      while (true) {
        const { data, error } = await query.range(histFrom, histFrom + step - 1);
        if (error || !data || data.length === 0) break;
        allHistory = [...allHistory, ...data];
        if (data.length < step) break;
        histFrom += step;
      }

      setRolls([...allStock, ...allHistory]);
      const { data: mats } = await supabase.from('raw_materials').select('*').order('name');
      setMaterials(mats || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // AUTH & INITIAL LOAD
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !fetchLock.current) {
        setUser(session.user);
        fetchLock.current = true;
        fetchData();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !fetchLock.current) {
        fetchLock.current = true;
        fetchData();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  if (!user && !isGuest) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6 font-sans text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full border border-gray-100">
          <img src="/logo.png" alt="Logo" className="w-40 h-40 mx-auto mb-1 object-contain" style={{ imageRendering: 'pixelated' }} />
          <h1 className="text-base font-bold text-gray-500 mb-10">Inventory Manager</h1>
          <div className="space-y-3">
            <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} className="w-full bg-[#1e40af] text-white py-5 rounded-2xl font-black shadow-xl">Google Login</button>
            <button onClick={() => setIsGuest(true)} className="w-full bg-slate-50 text-gray-500 py-4 rounded-2xl font-bold border border-slate-100">Guest Mode</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-24 font-sans text-slate-900">
      <Header deviceName={deviceName} loading={loading} onLogout={() => { supabase.auth.signOut(); localStorage.clear(); window.location.reload(); }} onEditDeviceName={() => { const n = prompt("Name:", deviceName); if(n) setDeviceName(n); }} onLogoClick={() => setActiveTab('dashboard')} />
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} />}
        {activeTab === 'entry' && <NewProductView rolls={rolls} deviceName={deviceName} onSaved={() => fetchData(true)} onPrint={setPrintData} />}
        {activeTab === 'stock' && <StockView rolls={rolls} onPrint={setPrintData} onSelectRoll={setEditRoll} />}
        {activeTab === 'dispatch' && <DispatchView rolls={rolls} onDispatch={() => fetchData(true)} />}
        {activeTab === 'history' && <HistoryView rolls={rolls.filter(r => r.status === 'dispatched')} onSelectRoll={setEditRoll} onFetchRange={fetchData} activeRange={activeRange} />}
        {activeTab === 'materials' && <MaterialsView materials={materials} onUpdate={() => fetchData(true)} />}
      </main>
      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />
      {editRoll && <EditModal roll={editRoll} onClose={() => setEditRoll(null)} onSave={() => { setEditRoll(null); fetchData(true); }} />}
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
    </div>
  );
}