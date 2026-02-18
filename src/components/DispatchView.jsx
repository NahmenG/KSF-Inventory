import React, { useState, useEffect } from 'react';
import { Truck, Camera, CheckCircle, X, Trash2, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Html5Qrcode } from 'html5-qrcode';

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

export default function DispatchView({ rolls, deviceName, onDispatch }) {
  const [scanId, setScanId] = useState('');
  const [reviewData, setReviewData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [sessionList, setSessionList] = useState(() => JSON.parse(localStorage.getItem('ksf_disp_session') || '[]'));
  const [customer, setCustomer] = useState(localStorage.getItem('ksf_disp_customer') || '');

  useEffect(() => {
    localStorage.setItem('ksf_disp_session', JSON.stringify(sessionList));
    localStorage.setItem('ksf_disp_customer', customer);
  }, [sessionList, customer]);

  const handleSearch = () => {
    const roll = rolls.find(r => r.product_id === scanId && r.status === 'in_stock');
    if (roll) setReviewData({ ...roll });
    else alert("Roll not in stock!");
    setScanId('');
  };

  const handleConfirm = async () => {
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
      setSessionList([reviewData, ...sessionList]);
      setReviewData(null);
      onDispatch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-600 p-4 rounded-xl text-white shadow-lg">
        <h3 className="font-bold flex items-center gap-2 mb-2"><Truck size={18}/> New Gate Pass</h3>
        <input className="w-full p-2 rounded text-black text-sm outline-none" placeholder="Customer Name" value={customer} onChange={e => setCustomer(e.target.value)} />
      </div>

      {!reviewData ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
          <input className="w-full border-2 p-3 rounded-lg text-center font-mono text-lg mb-4" placeholder="Enter ID" value={scanId} onChange={e => setScanId(e.target.value)} />
          <button onClick={handleSearch} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Search Roll</button>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex justify-between mb-4 border-b pb-2"><h3 className="font-bold text-blue-600">Verification</h3><button onClick={() => setReviewData(null)}><X/></button></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
               <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400">CUSTOMER</label><input className="w-full border p-2 rounded" value={reviewData.customer_name} onChange={e => setReviewData({...reviewData, customer_name: e.target.value})} /></div>
               <div><label className="text-[10px] font-bold text-gray-400">NET WT</label><input type="number" className="w-full border-2 border-green-500 p-2 rounded font-bold" value={reviewData.net_weight} onChange={e => setReviewData({...reviewData, net_weight: e.target.value})} /></div>
               <div><label className="text-[10px] font-bold text-gray-400">QUALITY</label><select className="w-full border p-2 rounded" value={reviewData.quality} onChange={e => setReviewData({...reviewData, quality: e.target.value})}>{QUALITIES.map(q => <option key={q}>{q}</option>)}</select></div>
            </div>
            <button onClick={handleConfirm} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold mt-6">Confirm Dispatch</button>
          </div>
        </div>
      )}
      {/* Manifest list logic... */}
    </div>
  );
}