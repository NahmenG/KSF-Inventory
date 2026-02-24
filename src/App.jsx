import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import { db } from './db'; 

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
  const [activeRange, setActiveRange] = useState('current_month'); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
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

  // --- 1. SYNC LOGIC: PREVENT DUPLICATES ---
  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine) return;
    
    const unsyncedRolls = await db.rolls.where({ synced: 0 }).toArray();
    if (unsyncedRolls.length === 0) return;

    for (const roll of unsyncedRolls) {
      const { id, synced, ...dataToUpload } = roll;
      
      const { data: existing } = await supabase
        .from('rolls')
        .select('product_id')
        .eq('product_id', roll.product_id)
        .single();
      
      if (!existing) {
        const { error } = await supabase.from('rolls').insert([dataToUpload]);
        if (!error) await db.rolls.update(id, { synced: 1 });
      } else {
        // If it exists in cloud, update it to match local status
        const { error } = await supabase.from('rolls').update(dataToUpload).eq('product_id', roll.product_id);
        if (!error) await db.rolls.update(id, { synced: 1 });
      }
    }
  }, []);

  // --- 2. CONNECTION MONITOR ---
  useEffect(() => {
    const handleStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) syncOfflineData();
    };
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, [syncOfflineData]);

  // --- 3. REALTIME LISTENER: DEDUPLICATION ---
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rolls' }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const existingLocal = await db.rolls.where('product_id').equals(payload.new.product_id).first();
          if (existingLocal) {
            await db.rolls.update(existingLocal.id, { ...payload.new, synced: 1 });
          } else {
            await db.rolls.put({ ...payload.new, synced: 1 });
          }
        } else if (payload.eventType === 'DELETE') {
          await db.rolls.where('product_id').equals(payload.old.product_id).delete();
        }
        
        const allLocal = await db.rolls.toArray();
        setRolls(allLocal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // --- 4. DATA FETCH (PAGINATED) ---
  const fetchData = useCallback(async () => {
    const cachedRolls = await db.rolls.toArray();
    if (cachedRolls.length > 0) {
      setRolls(cachedRolls.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    }

    if (!navigator.onLine) return;

    setLoading(true);
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);

      let allRemoteData = [];
      let from = 0;
      const step = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('rolls')
          .select('*')
          .or(`status.eq.in_stock,dispatched_at.gte.${startOfMonth.toISOString()}`)
          .range(from, from + step - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRemoteData = [...allRemoteData, ...data];
        if (data.length < step) break;
        from += step;
      }

      if (allRemoteData.length > 0) {
        await db.rolls.clear();
        await db.rolls.bulkPut(allRemoteData.map(r => ({ ...r, synced: 1 })));
        const finalLocal = await db.rolls.toArray();
        setRolls(finalLocal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }
      
      const { data: mats } = await supabase.from('raw_materials').select('*').order('name');
      if (mats) {
        await db.materials.bulkPut(mats);
        setMaterials(mats);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const startUp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !initialFetchDone.current) {
        setUser(session.user);
        initialFetchDone.current = true;
        fetchData();
        syncOfflineData();
      }
    };
    startUp();
  }, [fetchData, syncOfflineData]);

  // FIXED: Using .put to allow status updates from in_stock to dispatched
  const handleLocalSave = async (updatedRoll) => {
    await db.rolls.put({ ...updatedRoll, synced: 0 });
    const updated = await db.rolls.toArray();
    setRolls(updated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    if (navigator.onLine) syncOfflineData();
  };

  useEffect(() => {
    localStorage.setItem('ksf_active_tab', activeTab);
    localStorage.setItem('ksf_last_activity', Date.now().toString());
  }, [activeTab]);

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
      <Header 
        deviceName={deviceName} 
        loading={loading} 
        rolls={rolls} 
        materials={materials} 
        onLogout={() => { supabase.auth.signOut(); localStorage.clear(); db.delete(); window.location.reload(); }} 
        onEditDeviceName={() => { const n = prompt("Device Name:", deviceName); if(n) { localStorage.setItem('ksf_device_name', n); setDeviceName(n); } }} 
        onLogoClick={() => setActiveTab('dashboard')} 
      />
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} />}
        {activeTab === 'entry' && <NewProductView rolls={rolls} deviceName={deviceName} onSaved={handleLocalSave} onPrint={setPrintData} />}
        {activeTab === 'stock' && <StockView rolls={rolls} onPrint={setPrintData} onSelectRoll={(r) => setEditRoll({...r})} />}
        {activeTab === 'dispatch' && <DispatchView rolls={rolls} deviceName={deviceName} onDispatch={handleLocalSave} />}
        {activeTab === 'history' && <HistoryView rolls={rolls.filter(r => r.status === 'dispatched')} onSelectRoll={(r) => setEditRoll({...r})} onFetchRange={fetchData} activeRange={activeRange} />}
        {activeTab === 'materials' && <MaterialsView materials={materials} onUpdate={fetchData} />}
      </main>
      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />
      
      {editRoll && (
        <EditModal 
          roll={editRoll} 
          onClose={() => setEditRoll(null)} 
          onSave={async (updated) => {
            setEditRoll(null);
            await handleLocalSave(updated);
            if (navigator.onLine) {
              await supabase.from('rolls').update(updated).eq('product_id', updated.product_id);
            }
          }} 
          onDelete={async (productId) => {
            setEditRoll(null);
            if (navigator.onLine) {
              await supabase.from('rolls').delete().eq('product_id', productId);
            }
            await db.rolls.where('product_id').equals(productId).delete();
            fetchData();
          }}
        />
      )}
      
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
    </div>
  );
}