import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, Hash, User, Clock, RotateCcw, Loader, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

const NewProductView = React.memo(({ rolls, deviceName, onSaved, onPrint }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const suggestionRef = useRef(null);

  // --- BARCODE LOGIC (Manual Entry + Persistence) ---
  const [rollPrefix, setRollPrefix] = useState(() => localStorage.getItem('ksf_roll_prefix') || 'R');
  const [rollSeq, setRollSeq] = useState(() => localStorage.getItem('ksf_roll_sequence') || '1001');

  // --- FORM PERSISTENCE (Keeps fields on refresh) ---
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('ksf_form_persist');
    return saved ? JSON.parse(saved) : { 
      customer_name: '', 
      quality: '', 
      gsm: '', 
      color: '', 
      width_inches: '', 
      length_meters: '', 
      net_weight: '', 
      gross_weight: '' 
    };
  });

  // Save to local storage on every change
  useEffect(() => {
    localStorage.setItem('ksf_form_persist', JSON.stringify(formData));
  }, [formData]);

  // --- CUSTOMER SUGGESTION ENGINE ---
  const customers = useMemo(() => [...new Set(rolls.map(r => r.customer_name).filter(Boolean))].sort(), [rolls]);
  const filteredSuggestions = useMemo(() => {
    const typed = formData.customer_name?.toLowerCase() || '';
    if (!typed) return [];
    return customers.filter(c => c.toLowerCase().includes(typed) && c.toLowerCase() !== typed);
  }, [customers, formData.customer_name]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- AUTO-CALCULATION LOGIC (Gross - Core Weight) ---
  const handleValueChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    
    // Core weight constant calculation: Width / 63
    if (field === 'width_inches' || field === 'gross_weight') {
      const w = parseFloat(field === 'width_inches' ? value : formData.width_inches);
      const g = parseFloat(field === 'gross_weight' ? value : formData.gross_weight);
      if (!isNaN(w) && !isNaN(g) && w > 0) {
        updatedData.net_weight = (g - (w / 63)).toFixed(2);
      }
    }
    
    setFormData(updatedData);
    if (field === 'customer_name') setShowSuggestions(true);
    if (errorMsg) setErrorMsg('');
  };

  // --- SUBMIT & AUTO-INCREMENT LOGIC ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    
    const fullId = `${rollPrefix}-${rollSeq}`;
    
    // Safety Validation
    if (!formData.customer_name || !formData.net_weight) {
      setErrorMsg("Buyer and Weight are required.");
      return;
    }

    setIsSaving(true);

    // CLEAN PAYLOAD: Only send exactly what the database needs.
    // We remove any extra fields that might cause a "Failed to Fetch" (CORS/DB Error)
    const newRoll = { 
      product_id: String(fullId), 
      customer_name: String(formData.customer_name), 
      quality: String(formData.quality || 'Semi'), 
      color: String(formData.color || 'White'), 
      gsm: parseFloat(formData.gsm) || 0, 
      width_inches: parseFloat(formData.width_inches) || 0, 
      length_meters: parseFloat(formData.length_meters) || 0, 
      net_weight: parseFloat(formData.net_weight) || 0, 
      gross_weight: parseFloat(formData.gross_weight) || 0,
      status: 'in_stock',
      device_name: String(deviceName || 'New_Station'),
      created_at: new Date().toISOString()
    };

    try {
      // Use the .select() at the end to confirm the DB actually received it
      const { data, error } = await supabase
        .from('rolls')
        .insert([newRoll])
        .select();
      
      if (error) {
        console.error("Supabase Error Details:", error);
        if (error.code === '23505') {
          setErrorMsg(`Duplicate ID: ${fullId} already exists!`);
        } else {
          setErrorMsg(`DB Error ${error.code}: ${error.message}`);
        }
        setIsSaving(false);
        return;
      }

      // SUCCESS Logic
      const nextSeq = String(Number(rollSeq) + 1);
      setRollSeq(nextSeq);
      localStorage.setItem('ksf_roll_sequence', nextSeq);
      
      onPrint(newRoll);
      onSaved();
      
      // Clear specific fields
      setFormData(prev => ({ ...prev, net_weight: '', gross_weight: '' }));
      setErrorMsg('');

    } catch (err) {
      console.error("Connection Error:", err);
      setErrorMsg("Network Fail: Check internet or Supabase project status.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <Package className="text-blue-600" /> New Roll Entry
        </h2>
        <button 
          onClick={() => {
            if(confirm("Clear all fields?")) {
              localStorage.removeItem('ksf_form_persist');
              setFormData({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' });
            }
          }}
          className="text-xs font-bold text-red-500 border border-red-100 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 active:scale-95 transition-all"
        >
          <RotateCcw size={14} className="inline mr-1"/> Clear Form
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 font-bold text-sm">
          <AlertTriangle size={18} /> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">
        {/* Barcode / ID Generation Section */}
        <div className="col-span-2">
          <label className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1 block">
            <Hash size={12} className="inline mb-0.5" /> Roll Barcode Number
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="w-[35%] border-2 border-blue-100 bg-blue-50 p-3 rounded-xl font-black text-blue-900 outline-none uppercase text-center focus:border-blue-500 transition-all" 
              value={rollPrefix} 
              onChange={(e) => setRollPrefix(e.target.value.toUpperCase())} 
            />
            <input 
              type="number" 
              required 
              className="flex-1 border-2 border-blue-100 bg-blue-50 p-3 rounded-xl font-black text-blue-900 outline-none focus:border-blue-500 transition-all" 
              value={rollSeq} 
              onChange={(e) => setRollSeq(e.target.value)} 
            />
          </div>
        </div>

        {/* Customer / Buyer with Dropdown */}
        <div className="col-span-2 relative" ref={suggestionRef}>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Buyer / Customer Name</label>
          <input 
            required 
            autoComplete="off"
            className="w-full border-b-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 focus:bg-blue-50/30 outline-none transition-all font-semibold" 
            value={formData.customer_name} 
            onChange={e => handleValueChange('customer_name', e.target.value)} 
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-b-xl shadow-2xl max-h-56 overflow-y-auto mt-1 border-t-0">
              {filteredSuggestions.map((name, i) => (
                <div 
                  key={i} 
                  onClick={() => { setFormData({ ...formData, customer_name: name }); setShowSuggestions(false); }} 
                  className="p-4 border-b last:border-0 hover:bg-blue-50 cursor-pointer text-sm font-bold text-gray-700 flex items-center gap-3 transition-colors"
                >
                  <Clock size={14} className="text-gray-300" /> {name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selectors */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Quality Grade</label>
          <select required className="w-full border p-3 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-100 font-semibold" value={formData.quality} onChange={e => handleValueChange('quality', e.target.value)}>
            <option value="">Select Quality</option>
            {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Fabric Color</label>
          <select required className="w-full border p-3 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-100 font-semibold" value={formData.color} onChange={e => handleValueChange('color', e.target.value)}>
            <option value="">Select Color</option>
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Specs */}
        <div className="col-span-2 grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
          <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">GSM</label><input type="number" className="w-full border p-2 rounded-lg outline-none focus:border-blue-400 font-bold" value={formData.gsm} onChange={e => handleValueChange('gsm', e.target.value)} /></div>
          <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Width (in)</label><input type="number" className="w-full border p-2 rounded-lg outline-none focus:border-blue-400 font-bold" value={formData.width_inches} onChange={e => handleValueChange('width_inches', e.target.value)} /></div>
          <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Length (m)</label><input type="number" className="w-full border p-2 rounded-lg outline-none focus:border-blue-400 font-bold" value={formData.length_meters} onChange={e => handleValueChange('length_meters', e.target.value)} /></div>
        </div>

        {/* Weights */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Gross Weight (kg)</label>
          <input type="number" step="0.01" className="w-full border p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 font-black text-lg" value={formData.gross_weight} onChange={e => handleValueChange('gross_weight', e.target.value)} />
        </div>

        <div>
          <label className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1 block">Net Weight (kg)</label>
          <input type="number" step="0.01" className="w-full border-2 border-blue-100 bg-blue-50/50 p-4 rounded-xl font-black text-blue-900 text-xl outline-none" value={formData.net_weight} onChange={e => handleValueChange('net_weight', e.target.value)} />
        </div>

        {/* Save Button */}
        <button 
          type="submit" 
          disabled={isSaving} 
          className={`col-span-2 p-5 rounded-2xl font-black text-lg mt-2 shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}
        >
          {isSaving ? <><Loader className="animate-spin" size={24} /> Processing...</> : 'Save & Print Label'}
        </button>
      </form>
    </div>
  );
});

export default NewProductView;