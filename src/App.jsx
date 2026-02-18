import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
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

const safeJSONParse = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null') return fallback;
    return JSON.parse(item);
  } catch (e) { return fallback; }
};

function App() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [deviceName, setDeviceName] = useState(localStorage.getItem('ksf_device_name') || '');
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [editRoll, setEditRoll] = useState(null);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ksf_active_tab') || 'dashboard');
  const [offlineCount, setOfflineCount] = useState(0);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      let allRolls = [];
      let from = 0;
      const step = 1000;
      
      // Loop to bypass Supabase 1000 record limit
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

      const offlineData = safeJSONParse('ksf_offline_rolls', []);
      setOfflineCount(offlineData.length);
      const serverIds = new Set(allRolls.map(r => r.product_id));
      const uniqueOffline = offlineData.filter(r => !serverIds.has(r.product_id)).map(r => ({ ...r, isOffline: true }));
      
      setRolls([...uniqueOffline, ...allRolls]);
      
      const { data: mats } = await supabase.from('raw_materials').select('*').order('name');
      setMaterials(mats || []);
    } catch (e) { 
      console.error("Data Fetch Error:", e); 
    } finally { 
      if (!isBackground) setLoading(false); 
    }
  }, []);

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

  const handleMaterialUpdate = async (id, qty, isAdd) => {
    const mat = materials.find(m => m.id === id);
    if (!mat) return;
    const current = parseFloat(mat.stock_quantity) || 0;
    const change = parseFloat(qty);
    const newVal = isAdd ? current + change : current - change;
    const { error } = await supabase.from('raw_materials').update({ stock_quantity: newVal }).eq('id', id);
    if (!error) fetchData(true);
  };

  if (!user && !isGuest) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100">
          <img src="/logo.png" className="h-24 mx-auto mb-8 object-contain" alt="KSF" />
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold mb-3 shadow-lg active:scale-95 transition-all">Login with Google</button>
          <button onClick={() => setIsGuest(true)} className="w-full bg-white text-gray-700 py-4 rounded-xl font-bold border hover:bg-gray-50 active:scale-95 transition-all">View Only (Guest)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-20">
      <Header 
        deviceName={deviceName} 
        offlineCount={offlineCount} 
        onLogout={() => supabase.auth.signOut().then(() => window.location.reload())}
        onEditDeviceName={() => {const n = prompt("Device:"); if(n) {localStorage.setItem('ksf_device_name', n); setDeviceName(n)}}}
        onLogoClick={() => setActiveTab('dashboard')}
      />
      
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {loading && activeTab !== 'dashboard' ? (
          <div className="flex justify-center p-12 text-gray-400 italic">Connecting to factory...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView rolls={rolls} materials={materials} />}
            {activeTab === 'entry' && <NewProductView rolls={rolls} deviceName={deviceName} onSaved={() => fetchData(true)} onPrint={setPrintData} />}
            {activeTab === 'stock' && <StockView rolls={rolls} onPrint={setPrintData} onSelectRoll={(r) => setEditRoll(r)} />}
            {activeTab === 'dispatch' && <DispatchView rolls={rolls} deviceName={deviceName} onDispatch={() => fetchData(true)} />}
            {activeTab === 'history' && <HistoryView rolls={rolls} onSelectRoll={(r) => setEditRoll(r)} />}
            {activeTab === 'materials' && <MaterialsView materials={materials} onUpdate={handleMaterialUpdate} />}
          </>
        )}
      </main>

      <BottomNav activeTab={activeTab} setTab={setActiveTab} isGuest={isGuest} />

      {editRoll && (
        <EditModal 
          roll={editRoll} 
          onClose={() => setEditRoll(null)} 
          onSave={() => { setEditRoll(null); fetchData(true); }} 
        />
      )}

      {printData && <LabelPrint data={printData} onClose={() => setPrintData(null)} />}
    </div>
  );
}

export default App; // THIS WAS MISSING