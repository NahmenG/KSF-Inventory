import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Plus, AlertCircle, CheckCircle2, Loader2, Scale, Package, Ruler, ChevronDown } from 'lucide-react';

const NewProductView = ({ deviceName, onSaved, onPrint }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // 1. FULL FORM PERSISTENCE LOGIC
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('ksf_entry_form');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing form cache:", e);
      }
    }
    return {
      customer_name: '',
      quality: 'Virgin Fresh',
      gsm: '',
      width_inches: '',
      color: 'Milky White',
      net_weight: '',
      gross_weight: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('ksf_entry_form', JSON.stringify(formData));
  }, [formData]);

  // 2. FORM SUBMISSION LOGIC
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
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

      setStatus({ type: 'success', message: `Roll ${product_id} added successfully!` });
      onSaved();
      
      // Speed entry logic: Keep specs, clear weights
      setFormData(prev => ({ 
        ...prev, 
        net_weight: '', 
        gross_weight: '' 
      }));
      
      if (window.confirm("Print Label for this roll?")) {
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
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        
        {/* ORIGINAL COMPACT HEADER */}
        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight">New Production Entry</h2>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Device: {deviceName}</p>
          </div>
          <Plus className="opacity-20" size={40} />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Buyer Name / Stock</label>
              <input 
                required 
                className="w-full bg-gray-50 border-gray-100 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none" 
                value={formData.customer_name} 
                onChange={e => setFormData({...formData, customer_name: e.target.value})} 
                placeholder="e.g. Reliance Industries" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Quality Type</label>
              <div className="relative">
                <select 
                  className="w-full bg-gray-50 border-gray-100 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-100 outline-none appearance-none" 
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

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">GSM</label>
              <input 
                type="number" 
                required 
                className="w-full bg-gray-50 border-gray-100 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-100 outline-none" 
                value={formData.gsm} 
                onChange={e => setFormData({...formData, gsm: e.target.value})} 
                placeholder="e.g. 60" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Width (Inches)</label>
              <input 
                type="number" 
                required 
                className="w-full bg-gray-50 border-gray-100 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-100 outline-none" 
                value={formData.width_inches} 
                onChange={e => setFormData({...formData, width_inches: e.target.value})} 
                placeholder="e.g. 42" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Net Weight (kg)</label>
              <input 
                type="number" 
                step="0.1" 
                required 
                className="w-full bg-gray-50 border-gray-100 rounded-2xl p-4 font-bold text-green-600 text-xl focus:ring-4 focus:ring-green-100 outline-none" 
                value={formData.net_weight} 
                onChange={e => setFormData({...formData, net_weight: e.target.value})} 
                placeholder="00.0" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Gross Weight (kg)</label>
              <input 
                type="number" 
                step="0.1" 
                required 
                className="w-full bg-gray-50 border-gray-100 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-100 outline-none" 
                value={formData.gross_weight} 
                onChange={e => setFormData({...formData, gross_weight: e.target.value})} 
                placeholder="00.0" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Fabric Color</label>
            <input 
              required 
              className="w-full bg-gray-50 border-gray-100 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-100 outline-none" 
              value={formData.color} 
              onChange={e => setFormData({...formData, color: e.target.value})} 
              placeholder="e.g. Milky White" 
            />
          </div>

          {status.message && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-bounce ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <p className="font-bold text-sm">{status.message}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Save size={24} /> SAVE & ADD ROLL</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewProductView;