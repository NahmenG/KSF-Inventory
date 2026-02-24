import React, { useState, useEffect } from 'react';
import { Truck, Camera, CheckCircle, X, Trash2, FileSpreadsheet } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';

// Constants for dropdowns
const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

// --- INTERNAL GATE PASS GENERATOR ---
const generateChallanExcel = (rolls, details) => {
  try {
    const header = [
      ["KSF NON WOVEN"],
      [],
      ["Date:", new Date().toLocaleDateString(), "Time:", new Date().toLocaleTimeString()],
      ["Buyer:", details.buyer, "Vehicle:", details.vehicle],
      [],
      ["Sr No", "Roll ID", "Quality", "Color", "Size (in)", "GSM", "Length (m)", "Gross Kg", "Net Kg"]
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
    const totalLength = rolls.reduce((sum, r) => sum + (parseFloat(r.length_meters) || 0), 0);

    const footer = [
      [],
      ["", "", "", "", "", "Totals:", totalLength.toFixed(0) + " m", totalGross.toFixed(2), totalNet.toFixed(2)]
    ];

    const finalData = [...header, ...body, ...footer];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    
    // Auto-width columns
    ws['!cols'] = [
      { wch: 6 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
    ];
    
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
    XLSX.utils.book_append_sheet(wb, ws, "GatePass");
    const fileName = `GatePass_${details.buyer.replace(/\s/g, '_')}_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return true;
  } catch (err) {
    console.error(err);
    alert("Excel Error: " + err.message);
    return false;
  }
};

// --- BARCODE SCANNER COMPONENT (Unchanged) ---
const BarcodeScanner = ({ onScan, onClose }) => {
  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
      { facingMode: "environment" }, 
      { fps: 10, qrbox: 250 }, 
      onScan, 
      () => { }
    ).catch(console.error);
    return () => {
      try {
        html5QrCode.stop().then(() => html5QrCode.clear());
      } catch (e) { }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
      <div className="text-white font-bold mb-4 text-lg">Scan Roll Barcode</div>
      <div id="reader" className="w-full bg-white rounded overflow-hidden max-w-sm shadow-2xl"></div>
      <button onClick={onClose} className="mt-8 bg-red-600 text-white px-8 py-4 rounded-full font-bold shadow-lg active:scale-95 transition-all">Close Camera</button>
    </div>
  );
};

export default function DispatchView({ rolls, deviceName, onDispatch }) {
  const [scanId, setScanId] = useState('');
  const [reviewData, setReviewData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const [sessionList, setSessionList] = useState(() => JSON.parse(localStorage.getItem('ksf_dispatch_list_v10') || '[]'));
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
    const roll = rolls.find(r => r.product_id.toUpperCase() === query.toUpperCase() && r.status === 'in_stock');
    
    if (roll) {
      if (sessionList.some(r => r.product_id === roll.product_id)) {
        alert("Roll already added to manifest!");
        setScanId('');
        return;
      }
      setReviewData({ ...roll }); 
    } else {
      alert('Roll not found in available stock.');
    }
    setScanId('');
  };

  const handleConfirmDispatch = async () => {
    if (!reviewData) return;

    const updatedRoll = {
      ...reviewData,
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
      dispatched_by: deviceName,
      synced: 0 
    };

    // FIXED: Using product_id as the primary identifier to ensure local storage updates
    try {
      await onDispatch(updatedRoll);
      setSessionList(prev => [updatedRoll, ...prev]);
      setReviewData(null);
    } catch (err) {
      alert("Error adding to manifest. Please try again.");
    }
  };

  const handleRemoveFromManifest = async (item) => {
    if (confirm("Return this roll to stock?")) {
      const returnedRoll = {
        ...item,
        status: 'in_stock',
        dispatched_at: null,
        synced: 0
      };

      await onDispatch(returnedRoll);
      setSessionList(sessionList.filter(r => r.product_id !== item.product_id));
    }
  };

  const handleFinalizeGatePass = () => {
    if (sessionList.length === 0) {
        alert("Manifest is empty.");
        return;
    }
    const success = generateChallanExcel(sessionList, { 
      buyer: customerName, 
      vehicle: vehicleNo 
    });
    
    if (success) {
      if (confirm("Gate Pass Generated. Clear manifest and start new load?")) {
        setSessionList([]);
        setCustomerName('');
        setVehicleNo('');
      }
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {isScanning && <BarcodeScanner onScan={(txt) => { setIsScanning(false); handleSearch(txt); }} onClose={() => setIsScanning(false)} />}
      
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-xl text-white shadow-lg">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={20} /> Dispatch Manifest</h3>
        <div className="grid grid-cols-2 gap-2">
          <input className="w-full p-2 rounded text-black text-sm outline-none" placeholder="Buyer / Customer" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <input className="w-full p-2 rounded text-black text-sm outline-none" placeholder="Vehicle Number" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
        </div>
      </div>

      {!reviewData ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
          <div className="flex gap-2 mb-4">
            <input 
              className="flex-1 border-2 border-gray-200 p-3 rounded-lg text-center text-lg font-mono tracking-wider focus:border-blue-500 outline-none" 
              placeholder="Enter / Scan ID" 
              value={scanId} 
              onChange={e => setScanId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={() => setIsScanning(true)} className="bg-gray-900 text-white p-3 rounded-lg"><Camera size={24} /></button>
          </div>
          <button onClick={() => handleSearch()} className="bg-blue-600 text-white w-full py-4 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all">Identify Roll</button>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border transition-all">
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
                <label className="text-[10px] font-bold text-gray-500 uppercase">Buyer Name</label>
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
                <label className="text-[10px] font-bold text-gray-500 uppercase">Width (in)</label>
                <input type="number" className="w-full border p-2 rounded" value={reviewData.width_inches} onChange={e => setReviewData({ ...reviewData, width_inches: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-blue-600 uppercase">Final Net Weight (kg)</label>
                <input type="number" className="w-full border-2 border-blue-500 p-2 rounded font-black text-blue-900 text-lg" value={reviewData.net_weight} onChange={e => setReviewData({ ...reviewData, net_weight: e.target.value })} />
              </div>
            </div>

            <button onClick={handleConfirmDispatch} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
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
              <div key={i} className="p-3 border-b flex justify-between items-center last:border-0 hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-mono text-gray-800 font-bold">{item.product_id}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{item.quality} • {item.net_weight}kg</div>
                </div>
                <button onClick={() => handleRemoveFromManifest(item)} className="text-red-500 p-2 transition-colors hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50 border-t flex flex-col gap-3">
             <button onClick={handleFinalizeGatePass} className="w-full bg-green-700 text-white py-4 rounded-xl font-bold flex justify-center gap-2 items-center shadow-lg active:scale-95 transition-all">
                <FileSpreadsheet size={20} /> Generate Gate Pass (XLS)
             </button>
             <button onClick={() => { if(confirm("Clear manifest list?")) { setSessionList([]); setCustomerName(''); setVehicleNo(''); } }} className="text-[10px] font-bold text-gray-400 uppercase text-center hover:text-red-500">Clear Current List</button>
          </div>
        </div>
      )}
    </div>
  );
}