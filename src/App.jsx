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
  const [deviceName, setDeviceName] = useState(() => 
    localStorage.getItem('ksf_device_name') || 'Factory_Main'
  );

  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [editRoll, setEditRoll] = useState(null);
  const [activeRange, setActiveRange] = useState('15days'); 
  
  const initialFetchDone = useRef(false);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('ksf_active_tab');
      const lastActivity = localStorage.getItem('ksf_last_activity');
      if (savedTab && lastActivity && (Date.now() - parseInt(lastActivity) < 1800000)) {
        return savedTab;
      }
    } catch (e) {}
    return 'dashboard';
  });

  // --- 1. THE REALTIME LISTENER (THE DATA GUARD) ---
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rolls' },
        (payload) => {
          setRolls((currentRolls) => {
            if (payload.eventType === 'INSERT') {
              // Add only the new roll to the existing list in memory
              return [payload.new, ...currentRolls];
            }
            if (payload.eventType === 'UPDATE') {
              // Update only the specific roll that changed
              return currentRolls.map((r) => (r.id === payload.new.id ? payload.new : r));
            }
            if (payload.eventType === 'DELETE') {
              // Remove the deleted roll from memory
              return currentRolls.filter((r) => r.id === payload.old.id);
            }
            return currentRolls;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // --- 2. THE INITIAL FETCH (RUNS ONCE) ---
  const fetchData = useCallback(async (targetTab = activeTab) => {
    // Only fetch if memory is empty OR if specifically requested (like a range change)
    if (rolls.length > 0 && !initialFetchDone.current) return;
    
    setLoading(true);
    try {
      let allStock = [];
      let stockFrom = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('rolls')
          .select('*')
          .eq('status', 'in_stock')
          .order('created_at', { ascending: false })
          .range(stockFrom, stockFrom + step - 1);
        if (error || !data || data.length === 0) break;
        allStock = [...allStock, ...data];
        if (data.length < step) break;
        stockFrom += step;
      }

      let allHistory = [];
      let historyFrom = 0;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);

      while (true) {
        const { data, error } = await supabase
          .from('rolls')
          .select('*')
          .eq('status', 'dispatched')
          .gte('dispatched_at', startOfMonth.toISOString())
          .range(historyFrom, historyFrom + step - 1);
        if (error || !data || data.length === 0) break;
        allHistory = [...allHistory, ...data];
        if (data.length < step) break;
        historyFrom += step;
      }

      setRolls([...allStock, ...allHistory]);
      const { data: mats } = await supabase.from('raw_materials').select('*').order('name');
      setMaterials(mats || []);
      setActiveRange('current_month');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [rolls.length]);

  useEffect(() => {
    localStorage.setItem('ksf_active_tab', activeTab);
    localStorage.setItem('ksf_last_activity', Date.now().toString());
    // No more automatic re-fetch on tab switch! Memory handles it.
  }, [activeTab]);

  useEffect(() => {
    const startUp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !initialFetchDone.current) {
        setUser(session.user);
        initialFetchDone.current = true;
        fetchData();
      }
    };
    startUp();
  }, [fetchData]);

  // Rest of the UI logic remains exactly the same...
  if (!user && !isGuest) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border border-gray-100">
          <img src="/logo.png" alt="Logo" className="w-40 h-40 mx-auto mb-1 object-contain" />
          <h1 className="text-base font-bold text-gray-500 mb-10 tracking-tight">Inventory Manager</h1>
          <div className="space-y-3">
            <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} className="w-full bg-[#1e40af] text-white py-5 rounded-2xl font-black">Google Login</button>
            <button onClick={() => setIsGuest(true)} className="w-full bg-slate-50 text-gray-500 py-4 rounded-2xl font-bold border border-slate-100">Guest Mode</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-24 font-sans text-slate-900">
      <Header deviceName={deviceName} loading={loading} rolls={rolls} materials={materials} onLogout={() => { supabase.auth.signOut(); localStorage.clear(); window.location.reload(); }} onEditDeviceName={() => { const n = prompt("Device Name:", deviceName); if(n) { localStorage.setItem('ksf_device_name', n); setDeviceName(n); } }} onLogoClick={() => setActiveTab('dashboard')} />
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} />}
        {activeTab === 'entry' && <NewProductView rolls={rolls} deviceName={deviceName} onSaved={() => {}} onPrint={setPrintData} />}
        {activeTab === 'stock' && <StockView rolls={rolls} onPrint={setPrintData} onSelectRoll={(r) => setEditRoll({...r})} />}
        {activeTab === 'dispatch' && <DispatchView rolls={rolls} deviceName={deviceName} onDispatch={() => {}} />}
        {activeTab === 'history' && <HistoryView rolls={rolls.filter(r => r.status === 'dispatched')} onSelectRoll={(r) => setEditRoll({...r})} onFetchRange={(s, e) => fetchData('history', s, e)} activeRange={activeRange} />}
        {activeTab === 'materials' && <MaterialsView materials={materials} onUpdate={() => {}} />}
      </main>
      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />
      {editRoll && <EditModal roll={editRoll} onClose={() => setEditRoll(null)} onSave={() => setEditRoll(null)} />}
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
    </div>
  );
}