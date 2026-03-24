import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import { db } from './db'; 

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

// Icons
import { X, Lock, ShieldCheck, KeyRound, LogOut, ShieldAlert, WifiOff, CheckCircle2, TrendingUp } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [deviceName, setDeviceName] = useState(() => localStorage.getItem('ksf_device_name') || 'Factory_Main');

  const [isAdmin, setIsAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false); 
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('ksf_admin_password') || '1234');
  
  const [passInput, setPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [verifyOldPassInput, setVerifyOldPassInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [unsyncedRolls, setUnsyncedRolls] = useState([]);
  const [showUnsyncedList, setShowUnsyncedList] = useState(false);

  const [printData, setPrintData] = useState(null);
  const [editRoll, setEditRoll] = useState(null);
  const [activeRange, setActiveRange] = useState('current_month'); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const initialFetchDone = useRef(false);
  const isDeleting = useRef(false);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('ksf_active_tab');
      if (savedTab) return savedTab;
    } catch (e) {}
    return 'dashboard';
  });

  const handleAdminLogin = () => {
    if (passInput === adminPassword) { setIsAdmin(true); setPassInput(''); setShowAdminLogin(false); setShowSettings(false); }
    else { alert("Incorrect Admin Password"); }
  };

  const handleExitAdmin = () => { setIsAdmin(false); setIsChangingPass(false); setShowSettings(false); };

  const handleChangePassword = () => {
    if (verifyOldPassInput !== adminPassword) return alert("Current password is incorrect.");
    if (newPassInput.length < 4) return alert("New password must be at least 4 digits");
    setAdminPassword(newPassInput); localStorage.setItem('ksf_admin_password', newPassInput);
    setNewPassInput(''); setVerifyOldPassInput(''); setIsChangingPass(false); alert("Admin password updated!");
  };

  // --- REINFORCED SYNC LOGIC (Matches Original Schema) ---
  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine || loading) return;
    const pending = await db.rolls.where({ synced: 0 }).toArray();
    setUnsyncedRolls(pending);
    if (pending.length === 0) return;

    setLoading(true);
    try {
      for (const roll of pending) {
        // We REMOVE 'id' and 'synced' before sending to Supabase if you haven't added the columns yet.
        // If you HAVE added them, Supabase will just accept them.
        const { id, synced, ...dataToUpload } = roll;

        const { error } = await supabase.from('rolls').upsert(dataToUpload, { onConflict: 'product_id' });
        
        if (!error || error.code === '23505') {
          await db.rolls.update(roll.product_id, { synced: 1 });
        }
      }
    } finally {
      const finalPending = await db.rolls.where({ synced: 0 }).toArray();
      setUnsyncedRolls(finalPending);
      const refreshed = await db.rolls.toArray();
      setRolls(refreshed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setLoading(false);
    }
  }, [loading]);

  const handleLocalSave = async (updatedRoll) => {
    await db.rolls.put({ ...updatedRoll, synced: 0 });
    const allLocal = await db.rolls.toArray();
    setRolls(allLocal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    if (navigator.onLine) syncOfflineData();
  };

  useEffect(() => {
    const handleStatus = () => { setIsOnline(navigator.onLine); if(navigator.onLine) syncOfflineData(); };
    window.addEventListener('online', handleStatus); window.addEventListener('offline', handleStatus);
    return () => { window.removeEventListener('online', handleStatus); window.removeEventListener('offline', handleStatus); };
  }, [syncOfflineData]);

  // --- FIXED FETCH DATA: Pulls everything up to Roll 1205 ---
  const fetchData = useCallback(async () => {
    const cached = await db.rolls.toArray();
    const pendingCount = await db.rolls.where({ synced: 0 }).toArray();
    setUnsyncedRolls(pendingCount);
    if (cached.length > 0) setRolls(cached.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    
    if (!navigator.onLine) return;
    setLoading(true);

    try {
      // We look back 48 hours for production to ensure we don't miss rolls like 1205
      const recentBuffer = new Date(); 
      recentBuffer.setHours(recentBuffer.getHours() - 48);

      const startOfMonth = new Date(); 
      startOfMonth.setDate(1); 
      startOfMonth.setHours(0,0,0,0);

      // 1. Fetch ALL In-Stock rolls + Recent Production + Month History
      const { data, error } = await supabase.from('rolls').select('*')
        .or(`status.eq.in_stock,created_at.gte.${recentBuffer.toISOString()},dispatched_at.gte.${startOfMonth.toISOString()}`);
      
      if (!error && data) {
        await db.rolls.bulkPut(data.map(r => ({ ...r, synced: 1 })));
        const final = await db.rolls.toArray();
        setRolls(final.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        
        const cleanPending = await db.rolls.where({ synced: 0 }).toArray();
        setUnsyncedRolls(cleanPending);
      }
      
      const { data: mats } = await supabase.from('raw_materials').select('*').order('name');
      if (mats) { await db.materials.bulkPut(mats); setMaterials(mats); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const startUp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !initialFetchDone.current) { setUser(session.user); initialFetchDone.current = true; fetchData(); }
    };
    startUp();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  const handleLogout = async () => {
    if(confirm("Logout and clear local cache?")) { await supabase.auth.signOut(); await db.rolls.clear(); await db.materials.clear(); setUser(null); setIsGuest(false); window.location.reload(); }
  };

  useEffect(() => { localStorage.setItem('ksf_active_tab', activeTab); }, [activeTab]);

  if (!user && !isGuest) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border border-gray-100">
          <img src="/logo.png" alt="Logo" className="w-40 h-40 mx-auto mb-1 object-contain" />
          <h1 className="text-base font-bold text-gray-500 mb-10 tracking-tight">Inventory Manager</h1>
          <div className="space-y-3">
            <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })} className="w-full bg-[#1e40af] text-white py-5 rounded-2xl font-black">Google Login</button>
            <button onClick={() => setIsGuest(true)} className="w-full bg-slate-50 text-gray-500 py-4 rounded-2xl font-bold border border-slate-100">Guest Mode</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-24 font-sans text-slate-900">
      <Header 
        deviceName={deviceName} loading={loading} onLogout={handleLogout}
        onEditDeviceName={() => setShowSettings(true)} 
        onRenameTerminal={(name) => { setDeviceName(name); localStorage.setItem('ksf_device_name', name); }}
        onLogoClick={() => setActiveTab('dashboard')} onManualSync={syncOfflineData}
        rolls={rolls} materials={materials}
        unsyncedCount={unsyncedRolls.length}
      />
      
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} isAdmin={isAdmin} fetchData={fetchData} onOpenSyncList={() => setShowUnsyncedList(true)} />}
        {activeTab === 'entry' && <NewProductView rolls={rolls} deviceName={deviceName} onSaved={handleLocalSave} onPrint={setPrintData} />}
        {activeTab === 'stock' && <StockView rolls={rolls} isAdmin={isAdmin} onPrint={setPrintData} onSelectRoll={setEditRoll} />}
        {activeTab === 'dispatch' && <DispatchView rolls={rolls} deviceName={deviceName} onDispatch={handleLocalSave} />}
        {activeTab === 'history' && <HistoryView rolls={rolls.filter(r => r.status === 'dispatched')} isAdmin={isAdmin} onSelectRoll={setEditRoll} onFetchRange={fetchData} activeRange={activeRange} />}
        {activeTab === 'materials' && <MaterialsView materials={materials} onUpdate={fetchData} />}
      </main>

      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />
      
      {showUnsyncedList && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <WifiOff size={18} className="text-amber-500"/> Unsynced Data
              </h3>
              <button onClick={() => setShowUnsyncedList(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 max-h-60 overflow-y-auto pr-1 scrollbar-hide">
              <div className="grid grid-cols-2 gap-2">
                {unsyncedRolls.map(r => (
                  <div key={r.product_id} className="bg-white border border-slate-200 py-2 px-3 rounded-xl text-center text-[10px] font-mono font-black text-slate-600">
                    {r.product_id}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setShowUnsyncedList(false)} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Close</button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-gray-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">System Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className={`p-5 rounded-[2rem] border transition-all duration-300 ${isAdmin ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                {!isAdmin ? (
                  <button onClick={() => setShowAdminLogin(true)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Enter Admin Mode</button>
                ) : (
                  <div className="space-y-3">
                    <button onClick={handleExitAdmin} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><LogOut size={16} /> Exit Admin</button>
                    <button onClick={() => setIsChangingPass(true)} className="w-full py-3 border-2 border-dashed border-blue-200 text-blue-700 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-100/50 transition-colors"><KeyRound size={14} /> Change Password</button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl border border-slate-200">
            <h3 className="text-xs font-black uppercase mb-4 text-slate-800 flex items-center gap-2"><Lock size={14}/> Unlock Admin</h3>
            <input autoFocus type="password" placeholder="Password" className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-bold text-center text-lg focus:border-blue-500" value={passInput} onChange={e => setPassInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAdminLogin()} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowAdminLogin(false); setPassInput(''); }} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400">Cancel</button>
              <button onClick={handleAdminLogin} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase text-center shadow-lg">Unlock</button>
            </div>
          </div>
        </div>
      )}

      {editRoll && (
        <EditModal roll={editRoll} isAdmin={isAdmin} onClose={() => setEditRoll(null)} onSave={async (updated) => { setEditRoll(null); await handleLocalSave(updated); }} 
          onDelete={async (productId) => {
            if (isDeleting.current) return; isDeleting.current = true; setEditRoll(null);
            try {
              await db.rolls.where('product_id').equals(productId).delete();
              if (navigator.onLine) await supabase.from('rolls').delete().eq('product_id', productId);
              await fetchData();
            } finally { isDeleting.current = false; }
          }}
        />
      )}
      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
    </div>
  );
}