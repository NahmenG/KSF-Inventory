import React, { useState, useEffect } from 'react';
import { Truck, Camera, CheckCircle, X, Trash2, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Html5Qrcode } from 'html5-qrcode';

// Helper for local storage
const safeJSONParse = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null') return fallback;
    return JSON.parse(item);
  } catch (e) { return fallback; }
};

// Internal Barcode Scanner Component
const BarcodeScanner = ({ onScan, onClose }) => {
  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScan, () => { }).catch(console.error);
    return () => { try { html5QrCode.stop().then(() => html5QrCode.clear()); } catch (e) { } };
  }, [onScan]);
  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
      <div className="text-white font-bold mb-4 text-xl">Scan Barcode</div>
      <div id="reader" className="w-full bg-white rounded overflow-hidden max-w-sm shadow-2xl border-4 border-white/20"></div>
      <button onClick={onClose} className="mt-8 bg-red-600 text-white px-8 py-4 rounded-full font-bold active:scale-95 transition-all">Close Scanner</button>
    </div>
  );
};

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

export default function DispatchView({ rolls, deviceName, onDispatch }) {
  const [scanId, setScanId] = useState('');
  const [reviewData, setReviewData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [sessionList, setSessionList] = useState(() => safeJSONParse('ksf_dispatch_list_v10', []));
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('ksf_dispatch_customer_v10') || '');
  const [vehicleNo, setVehicleNo] = useState(() => localStorage.getItem('ksf_dispatch_vehicle_v10') || '');

  useEffect(() => {
    localStorage.setItem('ksf_dispatch_list_v10', JSON.stringify(sessionList));
    localStorage.setItem('ksf_dispatch_customer_v10', customerName);
    localStorage.setItem('ksf_dispatch_vehicle_v10', vehicleNo);
  }, [sessionList, customerName, vehicleNo]);

  const handleSearch = (idToSearch) => {
    const query = idToSearch || scanId;
    if (!query) return;
    const roll = (rolls || []).find(r => r.product_id === query && r.status === 'in_stock');
    if (roll) {
      if (sessionList.some(r => r.id === roll.id)) { 
        alert("This roll is already in your current manifest!"); 
      } else {
        setReviewData({ ...roll }); // Open the Verification Popup
      }
    } else { 
      alert('Roll not found in stock. Check if it was already dispatched.'); 
    }
    setScanId('');
  };

  const handleConfirmDispatch = async () => {
    if (!reviewData) return;
    
    // Update Supabase
    const { error } = await supabase.from('rolls').update({
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
      customer_name: reviewData.customer_name,
      net_weight: reviewData.net_weight,
      quality: reviewData.quality,
      gsm: reviewData.gsm,
      width_inches: reviewData.width_inches,
      device_name: deviceName
    }).eq('id', reviewData.id);

    if (!error) {
      setSessionList(prev => [reviewData, ...prev]);
      setReviewData(null);
      onDispatch(); // Refresh main roll list
    } else {
      alert("Error confirming dispatch: " + error.message);
    }
  };

  const handleUndoDispatch = async (roll) => {
    if (confirm("Move this roll back to available stock?")) {
      const { error } = await supabase.from('rolls').update({
        status: 'in_stock',
        dispatched_at: null
      }).eq('id', roll.id);

      if (!error) {
        setSessionList(sessionList.filter(item => item.id !== roll.id));
        onDispatch();
      }
    }
  };

  return (
    <div className="space-y-4 pb-24 px-1">
      {isScanning && <BarcodeScanner onScan={(txt) => { setIsScanning(false); handleSearch(txt); }} onClose={() => setIsScanning(false)} />}
      
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-xl text-white shadow-lg">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={20} /> Dispatch Manifest</h3>
        <div className="grid grid-cols-2 gap-2">
          <input className="w-full p-2 rounded-lg text-black text-sm outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <input className="w-full p-2 rounded-lg text-black text-sm outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Vehicle No" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
        </div>
      </div>

      {!reviewData ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center border-gray-100">
          <div className="flex gap-2 mb-4">
            <input 
              className="flex-1 border-2 border-gray-200 p-3 rounded-lg text-center text-lg font-mono tracking-wider focus:border-blue-500 outline-none transition-all" 
              placeholder="Enter / Scan ID" 
              value={scanId} 
              onChange={e => setScanId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={() => setIsScanning(true)} className="bg-gray-900 text-white p-3 rounded-lg hover:bg-black transition-colors"><Camera size={24} /></button>
          </div>
          <button onClick={() => handleSearch()} className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all">Identify Roll</button>
        </div>
      ) : (
        /* THE VERIFICATION POPUP */
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg text-blue-600 flex items-center gap-2">Verify Dispatch</h3>
              <button onClick={() => setReviewData(null)} className="p-1 hover:bg-gray-100 rounded-full"><X size={24} /></button>
            </div>
            
            <div className="bg-blue-50 p-3 rounded text-center mb-4 border border-blue-100">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-widest">Roll ID</div>
              <div className="text-xl font-black text-blue-800 tracking-widest">{reviewData.product_id}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Buyer</label>
                <input className="w-full border p-2 rounded bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100" value={reviewData.customer_name} onChange={e => setReviewData({ ...reviewData, customer_name: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Quality</label>
                <select className="w-full border p-2 rounded bg-white text-sm" value={reviewData.quality} onChange={e => setReviewData({ ...reviewData, quality: e.target.value })}>
                  {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Color</label>
                <select className="w-full border p-2 rounded bg-white text-sm" value={reviewData.color} onChange={e => setReviewData({ ...reviewData, color: e.target.value })}>
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">GSM</label>
                <input type="number" className="w-full border p-2 rounded" value={reviewData.gsm} onChange={e => setReviewData({ ...reviewData, gsm: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Size (in)</label>
                <input type="number" className="w-full border p-2 rounded" value={reviewData.width_inches} onChange={e => setReviewData({ ...reviewData, width_inches: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-blue-600 uppercase">Final Net Weight (kg)</label>
                <input type="number" className="w-full border-2 border-blue-200 p-2 rounded font-black text-blue-800 text-lg" value={reviewData.net_weight} onChange={e => setReviewData({ ...reviewData, net_weight: e.target.value })} />
              </div>
            </div>

            <button onClick={handleConfirmDispatch} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
              <CheckCircle size={20} /> Confirm & Add to manifest
            </button>
          </div>
        </div>
      )}

      {sessionList.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b flex justify-between font-bold text-gray-500 text-sm">
            <span>Items: {sessionList.length}</span>
            <span>Total Weight: {sessionList.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0).toFixed(1)} kg</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {sessionList.map((item, i) => (
              <div key={i} className="p-3 border-b flex justify-between items-center last:border-0 hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-mono text-gray-800 font-bold">{item.product_id}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{item.quality} • {item.net_weight}kg</div>
                </div>
                <button onClick={() => handleUndoDispatch(item)} className="text-red-500 p-2 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50 border-t flex flex-col gap-2">
            <button 
              onClick={() => {
                const win = window.confirm("Start new manifest list? This will clear current screen.");
                if(win) { setSessionList([]); setCustomerName(''); setVehicleNo(''); }
              }} 
              className="text-gray-400 text-xs font-bold uppercase hover:text-red-500 transition-colors"
            >
              Clear Manifest
            </button>
          </div>
        </div>
      )}
    </div>
  );
}