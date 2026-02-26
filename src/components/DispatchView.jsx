import React, { useState, useEffect } from 'react';
import { Truck, Camera, CheckCircle, X, Trash2, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';

// UPDATED QUALITY LIST FOR DISPATCH VERIFICATION
const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric', 'BOPP Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

// --- INTERNAL GATE PASS GENERATOR (Unchanged) ---
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
      r.length_meters,
      parseFloat(r.gross_weight) || 0,
      parseFloat(r.net_weight) || 0
    ]);

    const totalNet = rolls.reduce((sum, r) => sum + (parseFloat(r.net_weight) || 0), 0);
    const totalGross = rolls.reduce((sum, r) => sum + (parseFloat(r.gross_weight) || 0), 0);

    const footer = [
      [],
      ["", "", "", "", "", "", "TOTALS:", totalGross.toFixed(2), totalNet.toFixed(2)]
    ];

    const finalData = [...header, ...body, ...footer];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    ws['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
    XLSX.utils.book_append_sheet(wb, ws, "GatePass");
    XLSX.writeFile(wb, `GatePass_${details.buyer.replace(/\s/g, '_')}.xlsx`);
    return true;
  } catch (err) { alert("Excel Error: " + err.message); return false; }
};

// --- BARCODE SCANNER (Unchanged) ---
const BarcodeScanner = ({ onScan, onClose }) => {
  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScan, () => {}).catch(console.error);
    return () => { try { html5QrCode.stop().then(() => html5QrCode.clear()); } catch (e) {} };
  }, [onScan]);
  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
      <div id="reader" className="w-full bg-white rounded overflow-hidden max-w-sm shadow-2xl"></div>
      <button onClick={onClose} className="mt-8 bg-red-600 text-white px-8 py-4 rounded-full font-bold shadow-lg">Close</button>
    </div>
  );
};

export default function DispatchView({ rolls, deviceName, onDispatch }) {
  const [scanId, setScanId] = useState('');
  const [reviewData, setReviewData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [sessionList, setSessionList] = useState(() => JSON.parse(localStorage.getItem('ksf_dispatch_list_v12') || '[]'));
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('ksf_dispatch_customer_v11') || '');
  const [vehicleNo, setVehicleNo] = useState(() => localStorage.getItem('ksf_dispatch_vehicle_v11') || '');

  useEffect(() => {
    localStorage.setItem('ksf_dispatch_list_v12', JSON.stringify(sessionList));
    localStorage.setItem('ksf_dispatch_customer_v11', customerName);
    localStorage.setItem('ksf_dispatch_vehicle_v11', vehicleNo);
  }, [sessionList, customerName, vehicleNo]);

  const handlePopupValueChange = (field, value) => {
    const updated = { ...reviewData, [field]: value };
    if (field === 'width_inches' || field === 'gross_weight') {
      const w = parseFloat(field === 'width_inches' ? value : reviewData.width_inches);
      const g = parseFloat(field === 'gross_weight' ? value : reviewData.gross_weight);
      if (!isNaN(w) && !isNaN(g) && w > 0) updated.net_weight = (g - (w / 63)).toFixed(2);
    }
    setReviewData(updated);
  };

  const handleSearch = (idToSearch) => {
    const query = idToSearch || scanId;
    if (!query) return;
    const roll = rolls.find(r => r.product_id.toUpperCase() === query.toUpperCase() && r.status === 'in_stock');
    if (roll) {
      if (sessionList.some(r => r.product_id === roll.product_id)) return alert("Already in manifest!");
      setReviewData({ ...roll });
    } else { alert('Roll not found or already dispatched.'); }
    setScanId('');
  };

  const handleConfirmDispatch = async () => {
    if (!reviewData) return;
    try {
      const updatedRoll = {
        ...reviewData,
        status: 'dispatched',
        dispatched_at: new Date().toISOString(),
        dispatched_by: deviceName,
        synced: 0
      };
      await onDispatch(updatedRoll);
      setSessionList(prev => [updatedRoll, ...prev]);
      setReviewData(null);
    } catch (e) { alert("Action Failed. Please try again."); }
  };

  const handleRemoveFromManifest = async (item) => {
    if (confirm("Return to stock?")) {
      const returned = { ...item, status: 'in_stock', dispatched_at: null, synced: 0 };
      await onDispatch(returned);
      setSessionList(sessionList.filter(r => r.product_id !== item.product_id));
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto">
      {isScanning && <BarcodeScanner onScan={(txt) => { setIsScanning(false); handleSearch(txt); }} onClose={() => setIsScanning(false)} />}
      
      <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg">
        <h3 className="font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">Manifest Details</h3>
        <div className="grid grid-cols-2 gap-2">
          <input className="w-full p-3 rounded-xl text-black font-bold text-sm outline-none" placeholder="Buyer" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <input className="w-full p-3 rounded-xl text-black font-bold text-sm outline-none" placeholder="Vehicle #" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 text-center">
        <div className="flex gap-2 mb-4">
          <input className="flex-1 border-2 border-gray-100 p-4 rounded-2xl text-center font-mono focus:border-blue-500 outline-none font-bold" placeholder="ID (Scan/Type)" value={scanId} onChange={e => setScanId(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearch()} />
          <button onClick={() => setIsScanning(true)} className="bg-slate-900 text-white p-4 rounded-2xl"><Camera size={24} /></button>
        </div>
        <button onClick={() => handleSearch()} className="bg-blue-600 text-white w-full py-5 rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-95 transition-all">IDENTIFY ROLL</button>
      </div>

      {reviewData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white p-6 rounded-[2.5rem] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="font-black text-blue-600 uppercase tracking-tight">Verify & Edit</h3>
              <button onClick={() => setReviewData(null)}><X size={24}/></button>
            </div>
            
            <div className="space-y-4">
              <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Buyer Name</label>
              <input className="w-full p-3 bg-slate-50 border rounded-2xl font-bold" value={reviewData.customer_name} onChange={e => handlePopupValueChange('customer_name', e.target.value)} /></div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Quality</label>
                  <div className="relative">
                    <select 
                      className="w-full p-3 border rounded-2xl font-bold bg-white outline-none appearance-none" 
                      value={reviewData.quality} 
                      onChange={e => handlePopupValueChange('quality', e.target.value)}
                    >
                      {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Color</label>
                  <div className="relative">
                    <select 
                      className="w-full p-3 border rounded-2xl font-bold bg-white outline-none appearance-none" 
                      value={reviewData.color} 
                      onChange={e => handlePopupValueChange('color', e.target.value)}
                    >
                      {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">GSM</label><input type="number" className="w-full p-3 border rounded-2xl font-bold" value={reviewData.gsm} onChange={e => handlePopupValueChange('gsm', e.target.value)} /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Size (in)</label><input type="number" className="w-full p-3 border rounded-2xl font-bold" value={reviewData.width_inches} onChange={e => handlePopupValueChange('width_inches', e.target.value)} /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Len (m)</label><input type="number" className="w-full p-3 border rounded-2xl font-bold" value={reviewData.length_meters} onChange={e => handlePopupValueChange('length_meters', e.target.value)} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Gross (kg)</label>
                <input type="number" step="0.01" className="w-full p-4 border rounded-2xl font-black text-lg bg-slate-50" value={reviewData.gross_weight} onChange={e => handlePopupValueChange('gross_weight', e.target.value)} /></div>
                <div><label className="text-[10px] font-black text-blue-600 uppercase ml-2">Net (kg)</label>
                <input type="number" step="0.01" className="w-full p-4 border-2 border-blue-100 rounded-2xl font-black text-lg text-blue-700 bg-blue-50" value={reviewData.net_weight} readOnly /></div>
              </div>

              <button onClick={handleConfirmDispatch} className="w-full bg-green-600 text-white py-5 rounded-[1.5rem] font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                <CheckCircle size={20} /> ADD TO MANIFEST
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionList.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow border border-gray-100 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between font-black text-gray-500 text-[10px] uppercase">
            <span>Items: {sessionList.length}</span>
            <span>Total: {sessionList.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0).toFixed(1)} kg</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {sessionList.map((item, i) => (
              <div key={i} className="p-4 border-b flex justify-between items-center hover:bg-slate-50">
                <div><div className="font-black text-gray-800">{item.product_id}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">{item.quality} • {item.net_weight}kg</div></div>
                <button onClick={() => handleRemoveFromManifest(item)} className="text-red-400 p-2"><Trash2 size={20}/></button>
              </div>
            ))}
          </div>
          <div className="p-4">
             <button onClick={() => generateChallanExcel(sessionList, { buyer: customerName, vehicle: vehicleNo })} className="w-full bg-green-700 text-white py-5 rounded-2xl font-black flex justify-center gap-2 items-center shadow-lg active:scale-95 transition-all">
                <FileSpreadsheet size={20} /> GENERATE GATE PASS
             </button>
             <button onClick={() => { if(confirm("Clear current list?")) setSessionList([]); }} className="w-full mt-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Clear Manifest</button>
          </div>
        </div>
      )}
    </div>
  );
}