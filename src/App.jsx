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

// Icons
import { X, Lock, ShieldCheck, KeyRound, LogOut, ShieldAlert, Database, RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [deviceName, setDeviceName] = useState(() => localStorage.getItem('ksf_device_name') || 'Factory_Main');

  // --- ADMIN MODE STATE ---
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
      if (savedTab && lastActivity && (Date.now() - parseInt(lastActivity) < 1800000)) return savedTab;
    } catch (e) {}
    return 'dashboard';
  });

  // --- EMERGENCY DATA RESTORATION LOGIC ---
  const runGhostRollFix = async () => {
    if (!confirm("This will move 634 rolls (approx 38.7T) from Stock to History. Continue?")) return;
    
    setLoading(true);
    // These IDs were identified as being in stock on Mar 22 but previously dispatched on Mar 20.
    const ghostIds = ["0226D-2893", "0226D-2891", "0226D-2890", "0226D-2889", "0226D-2888", "0226D-2887", "0326N-725", "0326N-724", "0326N-723", "0326N-722", "0326N-721", "0326N-720", "0326N-719", "0326N-718", "0326N-717", "0326N-716", "0326N-715", "0326N-714", "0326N-713", "0326N-712", "0326N-709", "0326N-708", "0326N-694", "0326N-693", "0326N-692", "0326N-691", "0326N-690", "0326N-689", "0326N-688", "0326N-687", "0326N-686", "0326N-685", "0326N-684", "0326N-683", "0326N-682", "0326N-681", "0326N-680", "0326N-679", "0326N-678", "0326N-677", "0326N-676", "0326N-675", "0326N-674", "0326N-673", "0326N-672", "0326N-671", "0326N-670", "0326N-669", "0326N-668", "0326N-667", "0326N-666", "0326N-665", "0326N-664", "0326N-663", "0326N-662", "0326N-661", "0326N-660", "0326N-659", "0326N-658", "0326N-657", "0326N-656", "0326N-655", "0326N-654", "0326N-653", "0326N-652", "0326N-651", "0326N-650", "0326N-649", "0326N-648", "0326N-647", "0326N-646", "0326N-645", "0326N-644", "0326N-643", "0326N-642", "0326N-641", "0326N-640", "0326N-639", "0326N-638", "0326N-637", "0326N-636", "0326N-635", "0326N-634", "0326N-633", "0326N-632", "0326N-631", "0326N-630", "0326N-629", "0326D-628", "0326D-627", "0326D-626", "0326D-625", "0326D-624", "0326D-623", "0326D-622", "0326D-621", "0326D-620", "0326D-619", "0326D-618", "0326D-617", "0326D-616", "0326D-615", "0326D-614", "0326D-613", "0326D-612", "0326D-611", "0326D-610", "0326D-609", "0326D-608", "0326D-607", "0326D-606", "0326D-605", "0326D-601", "0326D-600", "0326D-599", "0326D-589", "0326D-588", "0326D-583", "0326D-582", "0326D-580", "0326D-577", "0326D-576", "0326D-574", "0326D-573", "0326D-571", "0326D-545", "0326D-544", "0326D-543", "0326D-542", "0326D-541", "0326D-540", "0326D-539", "0326D-538", "0326D-537", "0326D-536", "0326N-532", "0326N-531", "0326N-530", "0326N-529", "0326N-528", "0326N-527", "0326N-526", "0326N-525", "0326N-524", "0326N-523", "0326N-522", "0326N-521", "0326N-520", "0326N-519", "0326N-518", "0326N-517", "0326N-516", "0326N-515", "0326N-514", "0326N-513", "0326N-512", "0326N-511", "0326N-510", "0326N-509", "0326N-508", "0326N-507", "0326N-506", "0326N-505", "0326N-504", "0326N-503", "0326N-502", "0326N-501", "0326N-500", "0326N-499", "0326N-498", "0326N-497", "0326N-496", "0326N-495", "0326N-494", "0326N-493", "0326N-492", "0326N-491", "0326N-490", "0326N-489", "0326N-488", "0326N-487", "0326N-486", "0326N-485", "0326N-484", "0326N-483", "0326N-482", "0326N-481", "0326N-480", "0326N-479", "0326N-478", "0326N-477", "0326N-476", "0326N-475", "0326N-474", "0326N-473", "0326N-472", "0326N-471", "0326N-470", "0326N-469", "0326N-468", "0326N-467", "0326N-466", "0326N-465", "0326N-464", "0326N-463", "0326N-462", "0326N-461", "0326N-460", "0326N-459", "0326N-458", "0326N-457", "0326N-456", "0326N-455", "0326N-454", "0326N-453", "0326N-452", "0326N-451", "0326D-450", "0326D-449", "0326D-448", "0326D-447", "0326D-446", "0326D-445", "0326D-444", "0326D-443", "0326D-442", "0326D-441", "0326D-440", "0326D-439", "0326D-438", "0326D-437", "0326D-436", "0326D-435", "0326D-434", "0326D-433", "0326D-432", "0326D-431", "0326D-430", "0326D-429", "0326D-428", "0326D-427", "0326D-426", "0326D-425", "0326D-424", "0326D-423", "0326D-422", "0326D-421", "0326D-420", "0326D-419", "0326D-418", "0326D-417", "0326D-416", "0326D-415", "0326D-414", "0326D-413", "0326D-412", "0326D-411", "0326D-410", "0326D-409", "0326D-406", "0326D-408", "0326D-407", "0326D-405", "0326D-404", "0326D-403", "0326D-402", "0326D-401", "0326D-400", "0326D-399", "0326D-398", "0326D-397", "0326D-396", "0326D-395", "0326D-394", "0326D-393", "0326D-392", "0326D-391", "0326D-390", "0326D-389", "0326D-388", "0326D-387", "0326D-386", "0326D-385", "0326D-384", "0326D-383", "0326D-382", "0326D-380", "0326D-379", "0326D-378", "0326D-377", "0326D-376", "0326D-375", "0326D-374", "0326D-373", "0326D-372", "0326N-333", "0326N-332", "0326N-331", "0326N-330", "0326N-329", "0326N-328", "0326N-327", "0326N-326", "0326N-325", "0326N-324", "0326N-323", "0326N-322", "0326N-321", "0326N-320", "0326N-319", "0326N-318", "0326N-317", "0326N-316", "0326N-315", "0326N-314", "0326N-313", "0326N-312", "0326N-311", "0326N-310", "0326N-309", "0326N-308", "0326N-307", "0326N-306", "0326N-305", "0326N-304", "0326N-303", "0326N-302", "0326N-301", "0326N-300", "0326N-299", "0326N-298", "0326N-297", "0326N-296", "0326N-295", "0326N-294", "0326N-293", "0326N-292", "0326N-291", "0326N-290", "0326N-289", "0326N-288", "0326N-287", "0326N-286", "0326N-285", "0326N-284", "0326N-283", "0326D-282", "0326D-281", "0326D-280", "0326D-279", "0326D-278", "0326D-277", "0326D-276", "0326D-275", "0326D-274", "0326D-273", "0326D-272", "0326D-271", "0326D-270", "0326D-269", "0326D-268", "0326D-267", "0326D-266", "0326D-265", "0326D-264", "0326D-263", "0326D-262", "0326D-261", "0326D-260", "0326D-259", "0326D-258", "0326D-257", "0326D-256", "0326D-255", "0326D-254", "0326D-253", "0326D-221", "0326D-220", "0326D-219", "0326D-218", "0326D-216", "0326D-214", "0326D-213", "0326D-210", "0326N-91", "0326N-90", "0326N-89", "0326N-87", "0326N-86", "0326N-85", "0326N-83", "0326N-82", "0326N-81", "0326N-79", "0326N-78", "0326N-77", "0326N-75", "0326N-74", "0326N-73", "0326N-71", "0326N-70", "0326N-69", "0326N-67", "0326N-66", "0326N-65", "0326N-63", "0326N-62", "0326N-61", "0326D-55", "0326D-54", "0326D-53", "0326N-59", "0326N-58", "0326N-57", "0326D-51", "0326D-50", "0326D-49", "0326D-46", "0326D-45", "0326D-44", "0326D-39", "0326D-38", "0326D-37", "0326D-29", "0326D-28", "0326D-27", "0326D-35", "0326D-34", "0326D-36", "0326D-32", "0326D-31", "0326D-30", "0326D-26", "0326D-25", "0326D-24", "0326D-23", "0326D-22", "0326D-21", "0326D-19", "0326D-18", "0326D-17", "0326D-16", "0326D-15", "0326D-14", "0326D-13", "0326D-12", "0326D-11", "0326D-06", "0326D-5", "0326D-4", "0326D-3", "0326D-02", "0326D-01", "0326D-3195", "0226D-3199", "0226D-3198", "0226D-3197", "0226D-3196", "0226D-3195", "0226N-3194", "0226N-3193", "0226N-3192", "0226N-3191", "0226N-3190", "0226N-3189", "0226N-3188", "0226N-3187", "0226N-3186", "0226N-3185", "0226N-3184", "0226N-3183", "0226N-3182", "0226N-3181", "0226N-3180", "0226N-3179", "0226N-3178", "0226N-3177", "0226N-3176", "0226N-3175", "0226N-3174", "0226N-3173", "0226N-3172", "0226N-3171", "0226N-3170", "0226N-3169", "0226N-3168", "0226N-3167", "0226N-3166", "0226N-3165", "0226N-3164", "0226N-3163", "0226N-3162", "0226N-3161", "0226N-3160", "0226N-3159", "0226N-3158", "0226N-3157", "0226N-3156", "0226N-3155", "0226N-3130", "0226N-3129", "0226N-3128", "0226N-3127", "0226N-3126", "0226N-3125", "0226N-3124", "0226N-3123", "0226N-3122", "0226N-3121", "0226N-3120", "0226N-3119", "0226N-3118", "0226N-3117", "0226N-3116", "0226N-3115", "0226N-3114", "0226N-3113", "0226N-3112", "0226N-3111", "0226N-3110", "0226N-3109", "0226N-3108", "0226N-3107", "0226N-3106", "0226N-3105", "0226N-3104", "0226N-3103", "0226N-3102", "0226N-3101", "0226N-3100", "0226N-3099", "0226N-3098", "0226N-3097", "0226N-3096", "0226N-3095", "0226N-3094", "0226N-3093", "0226N-3092", "0226N-3091", "0226N-3090", "0226N-3089", "0226D-3088", "0226D-3087", "0226D-3086", "0226D-3085", "0226D-3084", "0226D-3083", "0226D-3082", "0226D-3081", "0226D-3078", "0226D-3077", "0226D-3032", "0226D-3031", "0226D-3030", "0226D-3026", "0226D-3025", "0226D-3024", "0226D-3023", "0226D-3022", "0226D-3021", "0226D-3008", "0226D-3007", "0226D-3006", "0226N-3001", "0226N-3000", "0226N-2999", "0226N-2998", "0226N-2997", "0226N-2996", "0226N-2995", "0226N-2994", "0226N-2993", "0226N-2992", "0226N-2991", "0226N-2990", "0226N-2989", "0226N-2988", "0226N-2987", "0226N-2986", "0226N-2985", "0226N-2984", "0226N-2983", "0226N-2982", "0226N-2981", "0226N-2980", "0226N-2963", "0226N-2962", "0226N-2961", "0226N-2960", "0226N-2959", "0226N-2958", "0226N-2957", "0226N-2956", "0226N-2955", "0226N-2954", "0226N-2953", "0226N-2952", "0226N-2951", "0226N-2950", "0226N-2949", "0226N-2948", "0226N-2947", "0226N-2946", "0226N-2943", "0226N-2945", "0226N-2944", "0226N-2942", "0226N-2941", "0226N-2940", "0226N-2939", "0226N-2938", "0226N-2937", "0226N-2936", "0226N-2935", "0226N-2934", "0226N-2933", "0226N-2932", "0226N-2931", "0226N-2930", "0226N-2929", "0226N-2928", "0226N-2927", "0226N-2926", "0226N-2925", "0226N-2924", "0226N-2923", "0226N-2922", "0226D-2906", "0226D-2905", "0226D-2904", "0226D-2903", "0226D-2902", "0226D-2901", "0226D-2900", "0226D-2899", "0226D-2898", "0226D-2897", "0226D-2896", "0226D-2895", "0226D-2894"];

    try {
      // Use the internal Supabase client to update the database
      const { error } = await supabase
        .from('rolls')
        .update({ 
          status: 'dispatched',
          dispatched_at: '2026-03-21T10:00:00+00:00', // Restore to time of dispatch
          synced: 1 
        })
        .in('product_id', ghostIds);

      if (error) throw error;
      
      alert("Success! 634 rolls (38.71T) moved back to history. Page will refresh.");
      window.location.reload();
    } catch (err) {
      alert("Restoration Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ADMIN FUNCTIONS ---
  const handleAdminLogin = () => {
    if (passInput === adminPassword) {
      setIsAdmin(true);
      setPassInput('');
      setShowAdminLogin(false);
      setShowSettings(false);
    } else {
      alert("Incorrect Admin Password");
    }
  };

  const handleExitAdmin = () => {
    setIsAdmin(false);
    setIsChangingPass(false);
    setShowSettings(false);
  };

  const handleChangePassword = () => {
    if (verifyOldPassInput !== adminPassword) return alert("Current password is incorrect.");
    if (newPassInput.length < 4) return alert("New password must be at least 4 digits");
    setAdminPassword(newPassInput);
    localStorage.setItem('ksf_admin_password', newPassInput);
    setNewPassInput(''); setVerifyOldPassInput(''); 
    setIsChangingPass(false);
    alert("Admin password updated!");
  };

  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine || loading) return;
    const unsyncedRolls = await db.rolls.where({ synced: 0 }).toArray();
    if (unsyncedRolls.length === 0) return;
    setLoading(true);
    for (const roll of unsyncedRolls) {
      const { id, synced, ...dataToUpload } = roll;
      const { error } = await supabase.from('rolls').upsert(dataToUpload, { onConflict: 'product_id' });
      if (!error || error.code === '23505' || error.message?.includes('already exists')) {
        await db.rolls.update(roll.product_id, { synced: 1 });
      }
    }
    const refreshedLocal = await db.rolls.toArray();
    setRolls(refreshedLocal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setLoading(false);
  }, [loading]);

  const handleLocalSave = async (updatedRoll) => {
    try {
      await db.rolls.put({ ...updatedRoll, synced: 0 });
      const allLocal = await db.rolls.toArray();
      setRolls(allLocal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      if (navigator.onLine) {
        const { id, synced, ...dataToUpload } = updatedRoll;
        const { error } = await supabase.from('rolls').upsert(dataToUpload, { onConflict: 'product_id' });
        if (!error || error.code === '23505') {
          await db.rolls.update(updatedRoll.product_id, { synced: 1 });
          const syncedLocal = await db.rolls.toArray();
          setRolls(syncedLocal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        }
      }
    } catch (err) { console.error(err); throw err; }
  };

  useEffect(() => {
    const handleStatus = () => { setIsOnline(navigator.onLine); if (navigator.onLine) syncOfflineData(); };
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => { window.removeEventListener('online', handleStatus); window.removeEventListener('offline', handleStatus); };
  }, [syncOfflineData]);

  const fetchData = useCallback(async () => {
    const cachedRolls = await db.rolls.toArray();
    if (cachedRolls.length > 0) setRolls(cachedRolls.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    if (!navigator.onLine) return;
    setLoading(true);
    try {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
      let allRemoteData = []; let from = 0; const step = 1000;
      while (true) {
        const { data, error } = await supabase.from('rolls').select('*').or(`status.eq.in_stock,dispatched_at.gte.${startOfMonth.toISOString()}`).range(from, from + step - 1);
        if (error) throw error; if (!data || data.length === 0) break;
        allRemoteData = [...allRemoteData, ...data];
        if (data.length < step) break; from += step;
      }
      if (allRemoteData.length > 0) {
        const unsynced = await db.rolls.where('synced').equals(0).toArray();
        const unsyncedIds = new Set(unsynced.map(r => r.product_id));
        for (const remoteRoll of allRemoteData) { if (unsyncedIds.has(remoteRoll.product_id)) await db.rolls.update(remoteRoll.product_id, { synced: 1 }); }
        await db.rolls.bulkPut(allRemoteData.map(r => ({ ...r, synced: 1 })));
        const finalLocal = await db.rolls.toArray();
        setRolls(finalLocal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }
      const { data: mats } = await supabase.from('raw_materials').select('*').order('name');
      if (mats) { await db.materials.bulkPut(mats); setMaterials(mats); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const startUp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !initialFetchDone.current) { setUser(session.user); initialFetchDone.current = true; fetchData(); syncOfflineData(); }
    };
    startUp();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); });
    return () => subscription.unsubscribe();
  }, [fetchData, syncOfflineData]);

  const handleLogout = async () => {
    if(confirm("Logout and clear local cache?")) { await supabase.auth.signOut(); await db.rolls.clear(); await db.materials.clear(); setUser(null); setIsGuest(false); window.location.reload(); }
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
      />
      
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} isAdmin={isAdmin} fetchData={fetchData} />}
        {activeTab === 'entry' && <NewProductView rolls={rolls} deviceName={deviceName} onSaved={handleLocalSave} onPrint={(roll) => setPrintData(roll)} />}
        {activeTab === 'stock' && <StockView rolls={rolls} isAdmin={isAdmin} onPrint={(roll) => setPrintData(roll)} onSelectRoll={(r) => setEditRoll({...r})} />}
        {activeTab === 'dispatch' && <DispatchView rolls={rolls} deviceName={deviceName} onDispatch={handleLocalSave} />}
        {activeTab === 'history' && <HistoryView rolls={rolls.filter(r => r.status === 'dispatched')} isAdmin={isAdmin} onSelectRoll={(r) => setEditRoll({...r})} onFetchRange={fetchData} activeRange={activeRange} />}
        {activeTab === 'materials' && <MaterialsView materials={materials} onUpdate={fetchData} />}
      </main>

      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />
      
      {showSettings && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Admin Mode Access</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className={`p-5 rounded-2xl border transition-all duration-300 ${isAdmin ? 'bg-green-50 border-green-100 shadow-inner' : 'bg-red-50 border-red-100 shadow-sm'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className={isAdmin ? "text-green-600" : "text-red-500"} size={18} />
                  <span className={`text-[11px] font-black uppercase tracking-widest ${isAdmin ? "text-green-700" : "text-red-700"}`}>
                    {isAdmin ? "Admin Access Active" : "Admin Restrictions"}
                  </span>
                </div>

                {!isAdmin ? (
                  <button onClick={() => setShowAdminLogin(true)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-red-100 active:scale-95 transition-all">Enter Admin Mode</button>
                ) : (
                  <div className="space-y-3">
                    <button onClick={handleExitAdmin} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><LogOut size={16} /> Exit Admin Mode</button>
                    
                    {/* EMERGENCY DATA FIX BUTTON */}
                    <button 
                      onClick={runGhostRollFix} 
                      disabled={loading}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                      {loading ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />} 
                      Restore 40T History (Emergency)
                    </button>

                    <button onClick={() => setIsChangingPass(true)} className="w-full py-3 border-2 border-dashed border-green-200 text-green-700 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-green-100/50"><KeyRound size={14} /> Change Password</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl border border-slate-200">
            <h3 className="text-xs font-black uppercase mb-4 text-slate-800 flex items-center gap-2"><Lock size={14}/> Enter Admin Password</h3>
            <input autoFocus type="password" placeholder="Password" className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-bold text-center text-lg focus:border-blue-500 transition-all" value={passInput} onChange={e => setPassInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAdminLogin()} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowAdminLogin(false); setPassInput(''); }} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400">Cancel</button>
              <button onClick={handleAdminLogin} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase text-center">Unlock</button>
            </div>
          </div>
        </div>
      )}

      {isChangingPass && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl border border-slate-200">
            <h3 className="text-xs font-black uppercase mb-4 text-slate-800 flex items-center gap-2"><KeyRound size={14}/> Update Security Key</h3>
            <div className="space-y-3">
              <input type="password" placeholder="Current Password" className="w-full p-3 rounded-xl border bg-slate-50 font-bold" value={verifyOldPassInput} onChange={e => setVerifyOldPassInput(e.target.value)} />
              <input type="password" placeholder="New Password" className="w-full p-3 rounded-xl border bg-slate-50 font-bold" value={newPassInput} onChange={e => setNewPassInput(e.target.value)} />
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setIsChangingPass(false); setVerifyOldPassInput(''); setNewPassInput(''); }} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400">Cancel</button>
              <button onClick={handleChangePassword} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase text-center">Save</button>
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