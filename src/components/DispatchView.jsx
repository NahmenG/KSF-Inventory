import React, { useState, useEffect } from 'react';
import { Truck, Camera, CheckCircle, X, Trash2, FileSpreadsheet } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';

// Constants to ensure matching dropdowns
const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

// --- UPDATED GATE PASS GENERATOR ---
const generateChallanExcel = (rolls, details) => {
  try {
    const header = [
      ["KSF NON WOVEN"],
      [],
      ["Date:", new Date().toLocaleDateString(), "Time:", new Date().toLocaleTimeString()],
      ["Buyer:", details.buyer, "Vehicle:", details.vehicle],
      [],
      ["Sr No", "Roll ID", "Quality", "Color", "Size (in)", "GSM", "Length (m)", "Gross (kg)", "Net (kg)"]
    ];

    const body = rolls.map((r, i) => [
      i + 1,
      r.product_id,
      r.quality,
      r.color,
      r.width_inches,
      r.gsm,
      parseFloat(r.length_meters) || 0,
      parseFloat(r.gross_weight) || 0,
      parseFloat(r.net_weight) || 0
    ]);

    const totalNet = rolls.reduce((sum, r) => sum + (parseFloat(r.net_weight) || 0), 0);
    const totalGross = rolls.reduce((sum, r) => sum + (parseFloat(r.gross_weight) || 0), 0);
    const totalMeters = rolls.reduce((sum, r) => sum + (parseFloat(r.length_meters) || 0), 0);

    const footer = [
      [],
      ["", "", "", "", "", "TOTALS:", totalMeters.toFixed(0) + " m", totalGross.toFixed(2), totalNet.toFixed(2)]
    ];

    const finalData = [...header, ...body, ...footer];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    ws['!cols'] = [
      { wch: 6 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
    ];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];

    XLSX.utils.book_append_sheet(wb, ws, "GatePass");
    const fileName = `GatePass_${details.buyer.replace(/\s/g, '_')}_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return true;
  } catch (err) {
    alert("Excel Error: " + err.message);
    return false;
  }
};

// --- BARCODE SCANNER (Unchanged UI) ---
const BarcodeScanner = ({ onScan, onClose }) => {
  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScan, () => {}).catch(console.error);
    return () => {
      try { html5QrCode.stop().then(() => html5QrCode.clear()); } catch (e) {}
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
      <div id="reader" className="w-full bg-white rounded overflow-hidden max-w-sm shadow-2xl"></div>
      <button onClick={onClose} className="mt-8 bg-red-600 text-white px-8 py-4 rounded-full font-bold shadow-lg">Close Camera</button>
    </div>
  );
};

export default function DispatchView({ rolls, deviceName, onDispatch }) {
  const [scanId, setScanId] = useState('');
  const [reviewData, setReviewData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const [sessionList, setSessionList] = useState(() => JSON.parse(localStorage.getItem('ksf_dispatch_list_v11') || '[]'));
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('ksf_dispatch_customer_v11') || '');
  const [vehicleNo, setVehicleNo] = useState(() => localStorage.getItem('ksf_dispatch_vehicle_v11') || '');

  useEffect(() => {
    localStorage.setItem('ksf_dispatch_list_v11', JSON.stringify(sessionList));
    localStorage.setItem('ksf_dispatch_customer_v11', customerName);
    localStorage.setItem('ksf_dispatch_vehicle_v11', vehicleNo);
  }, [sessionList, customerName, vehicleNo]);

  const handleSearch = (idToSearch) => {
    const query = idToSearch || scanId;
    if (!query) return;
    const roll = rolls.find(r => r.product_id.toUpperCase() === query.toUpperCase() && r.status === 'in_stock');
    
    if (roll) {
      if (sessionList.some(r => r.product_id === roll.product_id)) {
        alert("Roll already in manifest!");
        setScanId('');
        return;
      }
      setReviewData({ ...roll }); 
    } else {
      alert('Roll not found or already dispatched.');
    }
    setScanId('');
  };

  const handleConfirmDispatch = async () => {
    if (!reviewData) return;

    // LOCAL-FIRST: Update the roll object for the phone memory
    const updatedRoll = {
      ...reviewData,
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
      dispatched_by: deviceName,
      synced: 0 // Mark for background sync in App.jsx
    };

    // Use the onDispatch prop which we confirmed works for offline sync
    await onDispatch(updatedRoll);
    
    setSessionList(prev => [updatedRoll, ...prev]);
    setReviewData(null);
  };

  const handleRemoveFromManifest = async (item) => {
    if (confirm("Return this roll to stock?")) {
      const returnedRoll = { ...item, status: 'in_stock', dispatched_at: null, synced: 0 };
      await onDispatch(returnedRoll);
      setSessionList(sessionList.filter(r => r.product_id !== item.product_id));
    }
  };

  const handleFinalizeGatePass = () => {
    if (sessionList.length === 0) return alert("Manifest is empty.");
    const success = generateChallanExcel(sessionList, { buyer: customerName, vehicle: vehicleNo });
    if (success && confirm("Gate Pass Generated. Clear list?")) {
      setSessionList([]); setCustomerName(''); setVehicleNo('');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {isScanning && <BarcodeScanner onScan={(txt) => { setIsScanning(false); handleSearch(txt); }} onClose={() => setIsScanning(false)} />}
      
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-xl text-white shadow-lg">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={20} /> Dispatch Manifest</h3>
        <div className="grid grid-cols-2 gap-2">
          <input className="w-full p-2 rounded text-black text-sm outline-none" placeholder="Buyer" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <input className="w-full p-2 rounded text-black text-sm outline-none" placeholder="Vehicle #" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
        </div>
      </div>

      {!reviewData ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
          <div className="flex gap-2 mb-4">
            <input className="flex-1 border-2 border-gray-200 p-3 rounded-lg text-center font-mono focus:border-blue-500 outline-none" placeholder="Enter / Scan ID" value={scanId} onChange={e => setScanId(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} />
            <button onClick={() => setIsScanning(true)} className="bg-gray-900 text-white p-3 rounded-lg"><Camera size={24} /></button>
          </div>
          <button onClick={() => handleSearch()} className="bg-blue-600 text-white w-full py-4 rounded-xl font-bold active:scale-95 transition-all">Identify Roll</button>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg text-blue-600">Verify Dispatch</h3>
              <button onClick={() => setReviewData(null)}><X size={24} /></button>
            </div>
            <div className="bg-blue-50 p-3 rounded text-center mb-4 border border-blue-100">
              <div className="text-xl font-black text-blue-800 tracking-widest">{reviewData.product_id}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Buyer Name</label>
                <input className="w-full border p-2 rounded bg-gray-50 font-bold" value={reviewData.customer_name} onChange={e => setReviewData({ ...reviewData, customer_name: e.target.value })} />
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
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-blue-600 uppercase">Final Net Weight (kg)</label>
                <input type="number" className="w-full border-2 border-blue-500 p-2 rounded font-black text-blue-900 text-lg" value={reviewData.net_weight} onChange={e => setReviewData({ ...reviewData, net_weight: e.target.value })} />
              </div>
            </div>
            <button onClick={handleConfirmDispatch} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
              <CheckCircle size={20} /> Add to Manifest
            </button>
          </div>
        </div>
      )}

      {sessionList.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b flex justify-between font-bold text-gray-500 text-sm">
            <span>Items: {sessionList.length}</span>
            <span>Weight: {sessionList.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0).toFixed(1)} kg</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {sessionList.map((item, i) => (
              <div key={i} className="p-3 border-b flex justify-between items-center hover:bg-gray-50">
                <div>
                  <div className="font-mono text-gray-800 font-bold">{item.product_id}</div>
                  <div className="text-[10px] text-gray-400 uppercase">{item.quality} • {item.net_weight}kg • {item.length_meters}m</div>
                </div>
                <button onClick={() => handleRemoveFromManifest(item)} className="text-red-500 p-2"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50 border-t flex flex-col gap-3">
             <button onClick={handleFinalizeGatePass} className="w-full bg-green-700 text-white py-4 rounded-xl font-bold flex justify-center gap-2 items-center shadow-lg active:scale-95 transition-all">
                <FileSpreadsheet size={20} /> Generate Gate Pass (XLS)
             </button>
          </div>
        </div>
      )}
    </div>
  );
}