import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Printer, Plus, AlertCircle, CheckCircle2, Loader2, Scale, Package, Ruler } from 'lucide-react';

const NewProductView = ({ deviceName, onSaved, onPrint }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // 1. FULL FORM PERSISTENCE LOGIC
  // Restores every field from localStorage so data isn't lost on refresh/crash
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('ksf_entry_form');
    return saved ? JSON.parse(saved) : {
      customer_name: '',
      quality: 'Virgin Fresh',
      gsm: '',
      width_inches: '',
      color: 'Milky White',
      net_weight: '',
      gross_weight: ''
    };
  });

  // Sync form data to local cache on every change
  useEffect(() => {
    localStorage.setItem('ksf_entry_form', JSON.stringify(formData));
  }, [formData]);

  // 2. FORM SUBMISSION LOGIC
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // Generate a unique KSF ID based on current timestamp
      const product_id = `KSF-${Date.now().toString().slice(-6)}`;
      
      const { data, error } = await supabase
        .from('rolls')
        .insert([{
          ...formData,
          product_id,
          device_name: deviceName,
          status: 'in_stock',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      setStatus({ type: 'success', message: `Roll ${product_id} registered successfully!` });
      onSaved();
      
      // LOGIC: Clear weights for the next roll but KEEP customer/specs 
      // This allows the operator to add multiple rolls for the same order quickly
      setFormData(prev => ({ 
        ...prev, 
        net_weight: '', 
        gross_weight: '' 
      }));
      
      // Direct prompt for thermal printing
      if (window.confirm(`Roll ${product_id} Saved. Print label now?`)) {
        onPrint(data[0]);
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* FORM CARD */}
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        
        {/* HEADER SECTION */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Package size={28} /> New Production Entry
            </h2>
            <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-80">
              Station ID: {deviceName}
            </p>
          </div>
          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
            <Plus className="text-white" size={32} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* PRIMARY INFO SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Buyer Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">Buyer Name / Stock</label>
              <div className="relative">
                <input 
                  required 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-800 focus:ring-4 focus:ring-blue-100 transition-all outline-none placeholder:text-gray-300 shadow-inner" 
                  value={formData.customer_name} 
                  onChange={e => setFormData({...formData, customer_name: e.target.value})} 
                  placeholder="e.g. Reliance / Stock" 
                />
              </div>
            </div>

            {/* Quality Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">Quality Category</label>
              <div className="relative">
                <select 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-800 focus:ring-4 focus:ring-blue-100 outline-none appearance-none shadow-inner" 
                  value={formData.quality} 
                  onChange={e => setFormData({...formData, quality: e.target.value})}
                >
                  <option value="Virgin Fresh">Virgin Fresh</option>
                  <option value="Semi Virgin">Semi Virgin</option>
                  <option value="Second">Second Quality</option>
                  <option value="Trial Roll">Trial Roll</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* GSM Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">GSM Spec</label>
              <input 
                type="number" 
                required 
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-800 focus:ring-4 focus:ring-blue-100 outline-none shadow-inner" 
                value={formData.gsm} 
                onChange={e => setFormData({...formData, gsm: e.target.value})} 
                placeholder="e.g. 60" 
              />
            </div>

            {/* Width Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider flex items-center gap-1">
                <Ruler size={10} /> Width (Inches)
              </label>
              <input 
                type="number" 
                required 
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-800 focus:ring-4 focus:ring-blue-100 outline-none shadow-inner" 
                value={formData.width_inches} 
                onChange={e => setFormData({...formData, width_inches: e.target.value})} 
                placeholder="e.g. 42" 
              />
            </div>

            {/* Net Weight - HIGHLIGHTED */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-wider flex items-center gap-1">
                <Scale size={10} /> Net Weight (kg)
              </label>
              <input 
                type="number" 
                step="0.1" 
                required 
                className="w-full bg-blue-50/50 border-2 border-blue-100 rounded-2xl p-4 font-black text-blue-700 text-2xl focus:ring-4 focus:ring-blue-200 outline-none shadow-inner transition-all" 
                value={formData.net_weight} 
                onChange={e => setFormData({...formData, net_weight: e.target.value})} 
                placeholder="00.0" 
              />
            </div>

            {/* Gross Weight */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">Gross Weight (kg)</label>
              <input 
                type="number" 
                step="0.1" 
                required 
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-800 focus:ring-4 focus:ring-blue-100 outline-none shadow-inner" 
                value={formData.gross_weight} 
                onChange={e => setFormData({...formData, gross_weight: e.target.value})} 
                placeholder="00.0" 
              />
            </div>
          </div>

          {/* STATUS NOTIFICATIONS */}
          {status.message && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-pulse border-2 ${
              status.type === 'success' 
                ? 'bg-green-50 text-green-700 border-green-100' 
                : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <p className="font-black text-sm uppercase tracking-tight">{status.message}</p>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 active:scale-[0.97] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-b-4 border-blue-800"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={28} />
            ) : (
              <><Save size={28} /> SAVE & ADD TO STOCK</>
            )}
          </button>
        </form>
      </div>

      {/* QUICK HELP FOOTER */}
      <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
        <p className="text-[10px] text-slate-500 font-bold text-center leading-relaxed">
          TIP: Specs like Buyer, Quality, GSM, and Size are preserved after saving for faster entry of the next roll in the same batch.
        </p>
      </div>

    </div>
  );
};

export default NewProductView;