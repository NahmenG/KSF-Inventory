import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, Hash, User, Clock, RotateCcw, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

const NewProductView = React.memo(({ rolls, deviceName, onSaved, onPrint }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);

  // Barcode Logic: State for Manual Entry & Automatic Increment
  const [rollPrefix, setRollPrefix] = useState(() => localStorage.getItem('ksf_roll_prefix') || 'R');
  const [rollSeq, setRollSeq] = useState(() => localStorage.getItem('ksf_roll_sequence') || '1001');

  // Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    quality: '',
    gsm: '',
    color: '',
    width_inches: '',
    length_meters: '',
    net_weight: '',
    gross_weight: ''
  });

  // Customer Suggestion Logic
  const existingCustomers = useMemo(() => {
    const names = rolls.map(r => r.customer_name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [rolls]);

  const filteredSuggestions = useMemo(() => {
    const typed = formData.customer_name?.toLowerCase() || '';
    if (!typed) return [];
    return existingCustomers.filter(name => 
      name.toLowerCase().includes(typed) && name.toLowerCase() !== typed
    );
  }, [existingCustomers, formData.customer_name]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Weight Calculation Logic
  const handleValueChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    if (field === 'width_inches' || field === 'gross_weight') {
      const width = parseFloat(field === 'width_inches' ? value : formData.width_inches);
      const gross = parseFloat(field === 'gross_weight' ? value : formData.gross_weight);
      if (!isNaN(width) && !isNaN(gross) && width > 0) {
        newFormData.net_weight = (gross - (width / 63)).toFixed(2);
      }
    }
    setFormData(newFormData);
    if (field === 'customer_name') setShowSuggestions(true);
  };

  // FIXED: Added 'async' keyword here to fix the build error
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    
    if (!formData.customer_name || !formData.net_weight) {
      alert("Please enter Customer and Weight.");
      return;
    }

    setIsSaving(true);
    const fullId = `${rollPrefix}-${rollSeq}`;
    const newRoll = { 
      ...formData, 
      product_id: fullId, 
      status: 'in_stock', 
      device_name: deviceName || 'Unknown Device',
      created_at: new Date().toISOString() 
    };

    try {
      if (!navigator.onLine) {
        throw new Error("You are offline. Data cannot be saved.");
      }

      const { error } = await supabase.from('rolls').insert([newRoll]);
      
      if (error) {
        if (error.message.includes('duplicate key')) {
          alert(`Duplicate ID: Roll ${fullId} already exists!`);
          setIsSaving(false);
          return;
        }
        throw error;
      }

      // Successful Save Logic
      const nextSeq = String(Number(rollSeq) + 1);
      setRollSeq(nextSeq);
      localStorage.setItem('ksf_roll_sequence', nextSeq);
      localStorage.setItem('ksf_roll_prefix', rollPrefix);
      
      onPrint(newRoll);
      onSaved();
      
      setFormData(prev => ({ ...prev, net_weight: '', gross_weight: '' }));

    } catch (err) {
      console.error("Save Error:", err);
      alert(err.message === 'Failed to fetch' 
        ? "Network Error: Check internet connection." 
        : "Database Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
          <Package className="text-blue-600" /> New Roll Entry
        </h2>
        <button 
          onClick={() => setFormData({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' })}
          className="text-xs font-bold text-red-500 border border-red-100 bg-red-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
        >
          <RotateCcw size={12} className="inline mr-1"/> Clear
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1">
            <Hash size={12} /> Barcode Number (Prefix - Sequence)
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="w-[35%] border-2 border-blue-100 bg-blue-50 p-3 rounded-xl text-lg font-bold text-blue-900 outline-none uppercase text-center" 
              value={rollPrefix} 
              onChange={(e) => setRollPrefix(e.target.value.toUpperCase())} 
            />
            <input 
              type="number" 
              required 
              className="flex-1 border-2 border-blue-100 bg-blue-50 p-3 rounded-xl text-lg font-bold text-blue-900 outline-none" 
              value={rollSeq} 
              onChange={(e) => setRollSeq(e.target.value)} 
            />
          </div>
        </div>

        <div className="col-span-2 relative" ref={suggestionRef}>
          <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
            <User size={12}/> Customer
          </label>
          <input 
            required 
            autoComplete="off"
            className="w-full border-b-2 border-gray-200 bg-gray-50 p-3 rounded-lg focus:border-blue-500 outline-none transition-all font-semibold" 
            value={formData.customer_name} 
            onChange={e => handleValueChange('customer_name', e.target.value)} 
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-b-xl shadow-2xl max-h-48 overflow-y-auto">
              {filteredSuggestions.map((name, i) => (
                <div 
                  key={i} 
                  onClick={() => { setFormData({ ...formData, customer_name: name }); setShowSuggestions(false); }} 
                  className="p-3 border-b last:border-0 hover:bg-blue-50 cursor-pointer text-sm font-semibold"
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase">Quality</label>
          <select required className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-100" value={formData.quality} onChange={e => handleValueChange('quality', e.target.value)}>
            <option value="">Select...</option>
            {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase">Color</label>
          <select required className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-100" value={formData.color} onChange={e => handleValueChange('color', e.target.value)}>
            <option value="">Select...</option>
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="col-span-2 grid grid-cols-3 gap-3">
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">GSM</label><input type="number" className="w-full border p-2 rounded-lg outline-none" value={formData.gsm} onChange={e => handleValueChange('gsm', e.target.value)} /></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Size (in)</label><input type="number" className="w-full border p-2 rounded-lg outline-none" value={formData.width_inches} onChange={e => handleValueChange('width_inches', e.target.value)} /></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Length (m)</label><input type="number" className="w-full border p-2 rounded-lg outline-none" value={formData.length_meters} onChange={e => handleValueChange('length_meters', e.target.value)} /></div>
        </div>

        <div><label className="text-[10px] font-bold text-gray-500 uppercase">Gross Weight</label><input type="number" step="0.01" className="w-full border p-3 rounded-lg outline-none" value={formData.gross_weight} onChange={e => handleValueChange('gross_weight', e.target.value)} /></div>
        <div><label className="text-[10px] font-bold text-gray-500 uppercase">Net Weight</label><input type="number" step="0.01" className="w-full border-2 border-blue-100 p-3 rounded-lg font-bold text-blue-900 outline-none" value={formData.net_weight} onChange={e => handleValueChange('net_weight', e.target.value)} /></div>

        <button 
          type="submit" 
          disabled={isSaving} 
          className={`col-span-2 p-4 rounded-xl font-bold mt-4 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}
        >
          {isSaving ? <><Loader className="animate-spin" size={20} /> Saving...</> : 'Save & Print Label'}
        </button>
      </form>
    </div>
  );
});

export default NewProductView;