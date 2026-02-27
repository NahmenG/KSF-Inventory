import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, Hash, User, Clock, RotateCcw, Loader, AlertTriangle, ChevronDown } from 'lucide-react';

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric', 'BOPP Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

const NewProductView = React.memo(({ rolls, deviceName, onSaved, onPrint }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const suggestionRef = useRef(null);

  // BARCODE LOGIC (Manual Entry + Persistence)
  const [rollPrefix, setRollPrefix] = useState(() => localStorage.getItem('ksf_roll_prefix') || '0226N');
  const [rollSeq, setRollSeq] = useState(() => localStorage.getItem('ksf_roll_sequence') || '1462');

  // FORM PERSISTENCE
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('ksf_form_persist');
    return saved ? JSON.parse(saved) : { 
      customer_name: '', quality: '', gsm: '', color: '', 
      width_inches: '', length_meters: '', net_weight: '', gross_weight: '' 
    };
  });

  useEffect(() => {
    localStorage.setItem('ksf_form_persist', JSON.stringify(formData));
  }, [formData]);

  // CUSTOMER SUGGESTIONS
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

  // AUTO-CALCULATION (Net Weight = Gross - (Width / 63))
  const handleValueChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
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

  // SUBMIT & AUTO-INCREMENT
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Prevent double submission
    if (isSaving) return;
    
    const fullId = `${rollPrefix}-${rollSeq}`.trim();
    
    if (!formData.customer_name || !formData.net_weight) {
      setErrorMsg("Buyer and Weight are required.");
      return;
    }

    setIsSaving(true);
    
    const newRoll = { 
      product_id: fullId, 
      customer_name: String(formData.customer_name || 'Stock').trim(), 
      quality: String(formData.quality || 'Semi').trim(), 
      color: String(formData.color || 'White').trim(), 
      gsm: parseFloat(formData.gsm) || 0, 
      width_inches: parseFloat(formData.width_inches) || 0, 
      length_meters: parseFloat(formData.length_meters) || 0, 
      net_weight: parseFloat(formData.net_weight) || 0, 
      gross_weight: parseFloat(formData.gross_weight) || 0,
      status: 'in_stock',
      device_name: String(deviceName || 'Station_Main'),
      created_at: new Date().toISOString(),
      synced: 0 
    };

    try {
      // Execute save and print sequentially
      await onSaved(newRoll);
      onPrint(newRoll);

      // Auto-increment sequence only after success
      const nextSeq = String(Number(rollSeq) + 1);
      setRollSeq(nextSeq);
      localStorage.setItem('ksf_roll_sequence', nextSeq);
      localStorage.setItem('ksf_roll_prefix', rollPrefix);

      // Reset specific fields
      setFormData(prev => ({ ...prev, net_weight: '', gross_weight: '' }));
      
    } catch (err) {
      setErrorMsg("Local Save Error: Failed to save to phone memory.");
      console.error(err);
    } finally {
      // Re-enable button
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <Package className="text-blue-600" /> New Roll Entry
        </h2>
        <button 
          type="button"
          onClick={() => { if(confirm("Clear form?")) setFormData({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' }); }}
          className="text-xs font-bold text-red-500 border border-red-100 bg-red-50 px-3 py-2 rounded-lg active:scale-95 transition-all"
        >
          <RotateCcw size={14} className="inline mr-1"/> Clear
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 font-bold text-sm">
          <AlertTriangle size={18} /> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">
        <div className="col-span-2">
          <label className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1 block">
            Roll ID Setup (Prefix - Number)
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="w-1/2 border-2 border-blue-100 bg-blue-50 p-3 rounded-xl font-black text-blue-900 outline-none uppercase text-center focus:border-blue-500 transition-all shadow-inner" 
              value={rollPrefix} 
              onChange={(e) => setRollPrefix(e.target.value)} 
            />
            <input 
              type="number" 
              required 
              className="w-1/2 border-2 border-blue-100 bg-blue-50 p-3 rounded-xl font-black text-blue-900 outline-none focus:border-blue-500 text-center shadow-inner" 
              value={rollSeq} 
              onChange={(e) => setRollSeq(e.target.value)} 
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold">
            Generated ID: <span className="text-blue-600">{rollPrefix}-{rollSeq}</span>
          </p>
        </div>

        <div className="col-span-2 relative" ref={suggestionRef}>
          <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Buyer / Customer</label>
          <input 
            required autoComplete="off"
            className="w-full border-b-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 focus:bg-blue-50/30 outline-none transition-all font-semibold" 
            value={formData.customer_name} 
            onChange={e => handleValueChange('customer_name', e.target.value)} 
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-b-xl shadow-2xl max-h-56 overflow-y-auto mt-1">
              {filteredSuggestions.map((name, i) => (
                <div 
                  key={i} 
                  onClick={() => { setFormData({ ...formData, customer_name: name }); setShowSuggestions(false); }} 
                  className="p-4 border-b last:border-0 hover:bg-blue-50 cursor-pointer text-sm font-bold text-gray-700"
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Quality</label>
          <div className="relative">
            <select required className="w-full border p-3 rounded-xl bg-white outline-none appearance-none focus:ring-2 focus:ring-blue-100 font-semibold" value={formData.quality} onChange={e => handleValueChange('quality', e.target.value)}>
              <option value="">Select...</option>
              {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Color</label>
          <div className="relative">
            <select required className="w-full border p-3 rounded-xl bg-white outline-none appearance-none focus:ring-2 focus:ring-blue-100 font-semibold" value={formData.color} onChange={e => handleValueChange('color', e.target.value)}>
              <option value="">Select...</option>
              {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="col-span-2 grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-inner">
          <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">GSM</label><input type="number" className="w-full border p-2 rounded-lg outline-none font-bold" value={formData.gsm} onChange={e => handleValueChange('gsm', e.target.value)} /></div>
          <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Size (in)</label><input type="number" className="w-full border p-2 rounded-lg outline-none font-bold" value={formData.width_inches} onChange={e => handleValueChange('width_inches', e.target.value)} /></div>
          <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Length (m)</label><input type="number" className="w-full border p-2 rounded-lg outline-none font-bold" value={formData.length_meters} onChange={e => handleValueChange('length_meters', e.target.value)} /></div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase mb-1 block">Gross Weight (kg)</label>
          <input type="number" step="0.01" className="w-full border p-4 rounded-xl outline-none font-black text-lg focus:ring-2 focus:ring-blue-100 transition-all shadow-inner" value={formData.gross_weight} onChange={e => handleValueChange('gross_weight', e.target.value)} />
        </div>

        <div>
          <label className="text-[11px] font-bold text-blue-600 uppercase mb-1 block">Net Weight (kg)</label>
          <input type="number" step="0.01" className="w-full border-2 border-blue-100 bg-blue-50/50 p-4 rounded-xl font-black text-blue-900 text-xl outline-none shadow-inner" value={formData.net_weight} readOnly />
        </div>

        <button 
          type="submit" 
          disabled={isSaving} 
          className={`col-span-2 p-5 rounded-2xl font-black text-lg mt-2 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${isSaving ? 'bg-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
        >
          {isSaving ? <Loader className="animate-spin" size={24} /> : 'Save & Print Label'}
        </button>
      </form>
    </div>
  );
});

export default NewProductView;