import React, { useState, useEffect } from 'react';
import { Truck, Camera, CheckCircle, X, Trash2, FileSpreadsheet, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];

const generateChallanExcel = (rolls, details) => {
  const header = [["KSF NON WOVEN"], [], ["Buyer:", details.buyer, "Date:", new Date().toLocaleDateString()], [], ["Sr No", "Roll ID", "Quality", "GSM", "Size", "Net Kg"]];
  const body = rolls.map((r, i) => [i + 1, r.product_id, r.quality, r.gsm, r.width_inches, parseFloat(r.net_weight)]);
  const footer = [[], ["", "", "", "", "TOTAL:", rolls.reduce((s, r) => s + (parseFloat(r.net_weight) || 0), 0).toFixed(1)]];
  const ws = XLSX.utils.aoa_to_sheet([...header, ...body, ...footer]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "GatePass");
  XLSX.writeFile(wb, `GatePass_${details.buyer.replace(/\s/g, '_')}.xlsx`);
  return true;
};

export default function DispatchView({ rolls, deviceName, onDispatch }) {
  const [scanId, setScanId] = useState('');
  const [reviewData, setReviewData] = useState(null);
  const [sessionList, setSessionList] = useState(() => JSON.parse(localStorage.getItem('ksf_disp_session') || '[]'));
  const [customer, setCustomer] = useState(localStorage.getItem('ksf_disp_customer') || '');

  useEffect(() => {
    localStorage.setItem('ksf_disp_session', JSON.stringify(sessionList));
    localStorage.setItem('ksf_disp_customer', customer);
  }, [sessionList, customer]);

  const handleSearch = () => {
    const roll = rolls.find(r => r.product_id.toLowerCase() === scanId.toLowerCase() && r.status === 'in_stock');
    if (roll) setReviewData({ ...roll });
    else alert("Not in stock!");
    setScanId('');
  };

  const handleConfirm = async () => {
    const { error } = await supabase.from('rolls').update({
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
      customer_name: reviewData.customer_name,
      net_weight: reviewData.net_weight,
      quality: reviewData.quality,
      device_name: deviceName
    }).eq('id', reviewData.id);

    if (!error) {
      setSessionList([reviewData, ...sessionList]);
      setReviewData(null);
      onDispatch();
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-blue-600 p-4 rounded-xl text-white shadow-lg"><h3 className="font-bold mb-2">Gate Pass Setup</h3><input className="w-full p-2 rounded text-black text-sm outline-none" placeholder="Enter Buyer Name" value={customer} onChange={e => setCustomer(e.target.value)} /></div>

      {!reviewData ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center border-gray-100">
          <input className="w-full border-2 border-gray-200 p-3 rounded-lg text-center font-mono text-lg mb-4 focus:border-blue-500 outline-none" placeholder="Scan or Type Roll ID" value={scanId} onChange={e => setScanId(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} />
          <button onClick={handleSearch} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg">Verify Roll</button>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl border transition-all scale-in">
            <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-blue-600">Verification</h3><button onClick={() => setReviewData(null)}><X/></button></div>
            <div className="space-y-4">
               <div className="bg-gray-50 p-2 rounded"><label className="text-[10px] font-bold text-gray-400 block uppercase tracking-widest">Selected ID</label><div className="text-xl font-black">{reviewData.product_id}</div></div>
               <div><label className="text-[10px] font-bold text-gray-400 uppercase">Weight Adjustment (kg)</label><input type="number" className="w-full border-2 border-green-500 p-3 rounded-lg font-black text-xl text-green-700 outline-none" value={reviewData.net_weight} onChange={e => setReviewData({...reviewData, net_weight: e.target.value})} /></div>
               <div><label className="text-[10px] font-bold text-gray-400 uppercase">Quality Grade</label><select className="w-full border p-3 rounded-lg bg-white" value={reviewData.quality} onChange={e => setReviewData({...reviewData, quality: e.target.value})}>{QUALITIES.map(q => <option key={q}>{q}</option>)}</select></div>
               <button onClick={handleConfirm} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-100"><CheckCircle/> Add to Gate Pass</button>
            </div>
          </div>
        </div>
      )}

      {sessionList.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b flex justify-between items-center"><span className="font-black text-gray-500 text-sm tracking-tighter uppercase">Manifest ({sessionList.length})</span><span className="font-black text-blue-600 text-lg">{sessionList.reduce((s,i)=>s+(parseFloat(i.net_weight)||0),0).toFixed(1)} kg</span></div>
          <div className="max-h-64 overflow-y-auto">
            {sessionList.map((item, i) => (
              <div key={i} className="p-3 border-b flex justify-between items-center last:border-0 hover:bg-gray-50 transition-colors">
                <div><div className="font-mono text-gray-800 font-bold">{item.product_id}</div><div className="text-[10px] text-gray-400 uppercase font-bold">{item.quality} • {item.net_weight}kg</div></div>
                <button onClick={() => { if(confirm("Undo dispatch?")) setSessionList(sessionList.filter((_, idx)=>idx!==i)); }} className="text-red-500 p-2"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50 border-t"><button onClick={() => { if(generateChallanExcel(sessionList, { buyer: customer })) { if(confirm("Clear Manifest?")) { setSessionList([]); setCustomer(''); } } }} className="w-full bg-green-700 text-white py-4 rounded-xl font-bold flex justify-center gap-2 items-center shadow-lg hover:bg-green-800 active:scale-95 transition-all"><FileSpreadsheet size={20}/> Download Gate Pass (XLS)</button></div>
        </div>
      )}
    </div>
  );
}