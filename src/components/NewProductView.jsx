import React, { useState } from 'react';
import { Save, CheckCircle, Printer, Wifi, WifiOff } from 'lucide-react';

export default function NewProductView({ rolls, deviceName, onSaved, onPrint }) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    quality: 'Virgin',
    gsm: '',
    width_inches: '',
    net_weight: '',
    gross_weight: '',
    color: 'White',
    length_meters: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);

    // 1. GENERATE ROLL DATA IMMEDIATELY
    // We generate the ID and timestamp locally so the label can be printed without WiFi
    const newRoll = {
      ...formData,
      product_id: `R-${Math.floor(100000 + Math.random() * 900000)}`, 
      status: 'in_stock',
      created_at: new Date().toISOString(),
      created_by: deviceName,
      gsm: parseInt(formData.gsm) || 0,
      width_inches: parseFloat(formData.width_inches) || 0,
      net_weight: parseFloat(formData.net_weight) || 0,
      gross_weight: parseFloat(formData.gross_weight) || 0,
      length_meters: parseFloat(formData.length_meters) || 0,
      synced: 0 
    };

    try {
      // 2. TRIGGER PRINT MODAL IMMEDIATELY
      // By calling onPrint first with the local object, the label pops up instantly
      if (onPrint) {
        onPrint(newRoll);
      }

      // 3. SAVE TO LOCAL DATABASE (IndexedDB via App.jsx)
      // We 'await' this to ensure it's in the phone memory before clearing the form
      await onSaved(newRoll);

      // 4. UI SUCCESS FEEDBACK
      setShowSuccess(true);
      
      // Reset form after a short delay
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({
          customer_name: '',
          quality: 'Virgin',
          gsm: '',
          width_inches: '',
          net_weight: '',
          gross_weight: '',
          color: 'White',
          length_meters: ''
        });
        setIsSaving(false);
      }, 1500);

    } catch (error) {
      console.error("Local save failed:", error);
      alert("Error: Could not save to phone storage.");
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">New Production</h2>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Terminal: {deviceName}</p>
        </div>
        <div className={`p-3 rounded-2xl transition-all duration-500 ${showSuccess ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
          <CheckCircle size={24} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Customer / Buyer</label>
            <input 
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Enter Buyer Name"
              value={formData.customer_name}
              onChange={e => setFormData({...formData, customer_name: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">GSM</label>
              <input 
                type="number" required
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="00"
                value={formData.gsm}
                onChange={e => setFormData({...formData, gsm: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Size (Inches)</label>
              <input 
                type="number" step="0.1" required
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="00.0"
                value={formData.width_inches}
                onChange={e => setFormData({...formData, width_inches: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-50">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-600 uppercase ml-2">Net Weight (KG)</label>
            <input 
              type="number" step="0.01" required
              className="w-full p-5 bg-blue-50/30 border border-blue-100 rounded-2xl font-black text-xl text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="00.00"
              value={formData.net_weight}
              onChange={e => setFormData({...formData, net_weight: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Gross Weight</label>
            <input 
              type="number" step="0.01" required
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xl text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="00.00"
              value={formData.gross_weight}
              onChange={e => setFormData({...formData, gross_weight: e.target.value})}
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={isSaving}
          className={`w-full py-6 rounded-[2rem] font-black text-white shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${
            showSuccess ? 'bg-green-500' : 'bg-gray-900 hover:bg-black'
          }`}
        >
          {isSaving ? (
            <span className="animate-pulse">RECORDING...</span>
          ) : showSuccess ? (
            <><CheckCircle size={20}/> ENTRY RECORDED</>
          ) : (
            <><Save size={20}/> SAVE & PRINT LABEL</>
          )}
        </button>

        <div className="flex items-center justify-center gap-2 py-2">
          {navigator.onLine ? (
            <span className="flex items-center gap-1.5 text-[9px] font-black text-green-600 uppercase tracking-widest">
              <Wifi size={12} /> Sync Mode: Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[9px] font-black text-orange-500 uppercase tracking-widest">
              <WifiOff size={12} /> Sync Mode: Offline (Queued)
            </span>
          )}
        </div>
      </form>
    </div>
  );
}