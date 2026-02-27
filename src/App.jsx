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
  const isDeleting = useRef(false);

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

  // --- 1. RESILIENT SYNC LOGIC ---
  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine || loading) return;
    
    const unsyncedRolls = await db.rolls.where({ synced: 0 }).toArray();
    if (unsyncedRolls.length === 0) return;

    setLoading(true);
    console.log(`Syncing ${unsyncedRolls.length} rolls via HTTPS...`);

    for (const roll of unsyncedRolls) {
      const { id, synced, ...dataToUpload } = roll;
      
      // Standard HTTPS push - works even if WebSockets are failing
      const { error } = await supabase
        .from('rolls')
        .upsert(dataToUpload, { onConflict: 'product_id' });
      
      if (!error) {
        await db.rolls.update(roll.product_id, { synced: 1 });
        console.log(`Synced: ${roll.product_id}`);
      } else {
        console.error(`Sync Blocked for ${roll.product_id}:`, error.message);
      }
    }
    
    const refreshedLocal = await db.rolls.toArray();
    setRolls(refreshedLocal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setLoading(false);
  }, [loading]);

  // --- 2. CORE SAVE HANDLER (The Sync Shield) ---
  const handleLocalSave = async (updatedRoll) => {
    try {
      // Step 1: Shield the record locally with synced: 0
      await db.rolls.put({ ...updatedRoll, synced: 0 });
      
      const allLocal = await db.rolls.toArray();
      setRolls(allLocal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

      // Step 2: Push to cloud
      if (navigator.onLine) {
        const { id, synced, ...dataToUpload } = updatedRoll;
        const { error } = await supabase
          .from('rolls')
          .upsert(dataToUpload, { onConflict: 'product_id' });

        if (!error) {
          // Step 3: Mark as synced once cloud confirms
          await db.rolls.update(updatedRoll.product_id, { synced: 1 });
          const syncedLocal = await db.rolls.toArray();
          setRolls(syncedLocal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        }
      }
    } catch (err) {
      console.error("Critical Save Error:", err);
      throw err; 
    }
  };

  // --- 3. CONNECTION MONITOR ---
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

  // --- 4. REALTIME LISTENER (WebSocket Failure Protection) ---
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('db-changes', {
        config: {
          realtime: {
            params: {
              eventsPerSecond: 2, // Throttled for network stability
            },
          },
        },
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rolls' }, async (payload) => {
        const productId = payload.new?.product_id || payload.old?.product_id;
        if (!productId) return;

        const localRecord = await db.rolls.where('product_id').equals(productId).first();
        
        // SHIELD: Ignore cloud update if we have an unsynced local version (Prevents double entry)
        if (localRecord && localRecord.synced === 0) return;

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          await db.rolls.put({ ...payload.new, synced: 1 });
        } else if (payload.eventType === 'DELETE') {
          await db.rolls.where('product_id').equals(productId).delete();
        }
        
        const allLocal = await db.rolls.toArray();
        setRolls(allLocal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      })
      .subscribe((status) => {
        // Log WebSocket issues but don't let them crash the UI or Sync
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn("Realtime WebSocket restricted. App will use HTTPS Sync mode.");
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // --- 5. DATA FETCH ---
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
        const unsyncedCount = await db.rolls.where('synced').equals(0).count();
        if (unsyncedCount === 0) {
          await db.rolls.clear();
          await db.rolls.bulkPut(allRemoteData.map(r => ({ ...r, synced: 1 })));
        }
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

  // --- 6. AUTH & INITIALIZATION ---
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [fetchData, syncOfflineData]);

  // --- 7. UI HELPERS ---
  const handleLogout = async () => {
    if(confirm("Logout and clear local cache?")) {
      await supabase.auth.signOut();
      await db.rolls.clear();
      await db.materials.clear();
      setUser(null);
      setIsGuest(false);
      window.location.reload();
    }
  };

  const handleEditDeviceName = () => {
    const name = prompt("Enter Terminal Name:", deviceName);
    if (name) {
      setDeviceName(name);
      localStorage.setItem('ksf_device_name', name);
    }
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
        onLogout={handleLogout} 
        onEditDeviceName={handleEditDeviceName} 
        onLogoClick={() => setActiveTab('dashboard')}
        onManualSync={syncOfflineData}
        rolls={rolls}
        materials={materials}
      />
      
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} />}
        {activeTab === 'entry' && <NewProductView rolls={rolls} deviceName={deviceName} onSaved={handleLocalSave} onPrint={(roll) => setPrintData(roll)} />}
        {activeTab === 'stock' && <StockView rolls={rolls} onPrint={(roll) => setPrintData(roll)} onSelectRoll={(r) => setEditRoll({...r})} />}
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
          }} 
          onDelete={async (productId) => {
            if (isDeleting.current) return;
            isDeleting.current = true;
            setEditRoll(null);
            try {
              await db.rolls.where('product_id').equals(productId).delete();
              if (navigator.onLine) {
                await supabase.from('rolls').delete().eq('product_id', productId);
              }
              await fetchData();
            } finally {
              isDeleting.current = false;
            }
          }}
        />
      )}
      
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
    </div>
  );
}