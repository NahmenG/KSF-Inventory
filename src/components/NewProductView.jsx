import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package, Hash, User, Clock, RotateCcw, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';

const QUALITIES = ['Virgin', 'Fresh', 'Semi', 'Semi Fresh', 'Semi 2', 'Semi Star', 'UV Fabric'];
const COLORS = ['White', 'Ivory', 'Red', 'Maroon', 'Orange', 'Lemon Yellow', 'Golden Yellow', 'Parrot Green', 'Bottle Green', 'Sea Green', 'Medical Blue', 'Royal Blue', 'Peacock Blue', 'Navy Blue', 'Pink', 'Baby Pink', 'Beige', 'Coffee Brown', 'Gray', 'Black', 'Colour Change'];

const NewProductView = React.memo(({ rolls, deviceName, onSaved, onPrint }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' });
  const [rollPrefix, setRollPrefix] = useState(() => localStorage.getItem('ksf_roll_prefix') || 'R');
  const [rollSeq, setRollSeq] = useState(() => localStorage.getItem('ksf_roll_sequence') || '1001');

  const customers = useMemo(() => [...new Set(rolls.map(r => r.customer_name).filter(Boolean))].sort(), [rolls]);
  const filtered = useMemo(() => {
    const typed = formData.customer_name?.toLowerCase() || '';
    return typed ? customers.filter(c => c.toLowerCase().includes(typed) && c.toLowerCase() !== typed) : [];
  }, [customers, formData.customer_name]);

  const handleValueChange = (field, value) => {
    const d = { ...formData, [field]: value };
    if (field === 'width_inches' || field === 'gross_weight') {
      const w = parseFloat(field === 'width_inches' ? value : formData.width_inches);
      const g = parseFloat(field === 'gross_weight' ? value : formData.gross_weight);
      if (!isNaN(w) && !isNaN(g) && w > 0) d.net_weight = (g - (w / 63)).toFixed(2);
    }
    setFormData(d); if (field === 'customer_name') setShowSuggestions(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const fullId = `${rollPrefix}-${rollSeq}`;
    const newRoll = { ...formData, product_id: fullId, status: 'in_stock', device_name: deviceName, created_at: new Date().toISOString() };
    
    const { error } = await supabase.from('rolls').insert([newRoll]);
    if (!error) {
      const nextSeq = String(Number(rollSeq) + 1);
      setRollSeq(nextSeq);
      localStorage.setItem('ksf_roll_sequence', nextSeq);
      onPrint(newRoll);
      onSaved();
      setFormData({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' });
    }
    setIsSaving(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
      <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold flex items-center gap-2"><Package className="text-blue-600" /> New Roll</h2><button onClick={() => setFormData({ customer_name: '', quality: '', gsm: '', color: '', width_inches: '', length_meters: '', net_weight: '', gross_weight: '' })} className="text-xs font-bold text-red-500 border border-red-100 bg-red-50 px-2 py-1 rounded"><RotateCcw size={12} /></button></div>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-xs font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><Hash size={12} /> Roll ID</label>
          <div className="flex gap-2">
            <input type="text" className="w-[35%] border-2 border-blue-100 bg-blue-50 p-3 rounded text-lg font-bold outline-none uppercase" value={rollPrefix} onChange={(e) => setRollPrefix(e.target.value.toUpperCase())} />
            <input type="number" required className="flex-1 border-2 border-blue-100 bg-blue-50 p-3 rounded text-lg font-bold outline-none" value={rollSeq} onChange={(e) => setRollSeq(e.target.value)} />
          </div>
        </div>
        <div className="col-span-2 relative">
          <label className="text-xs font-bold text-gray-500 uppercase">Customer</label>
          <input required autoComplete="off" className="w-full border-b-2 border-gray-200 bg-gray-50 p-3 rounded focus:border-blue-500 outline-none" value={formData.customer_name} onChange={e => handleValueChange('customer_name', e.target.value)} onFocus={() => setShowSuggestions(true)} />
          {showSuggestions && filtered.length > 0 && (<div className="absolute z-50 w-full bg-white border shadow-2xl max-h-48 overflow-y-auto rounded-b-lg">{filtered.map((n, i) => (<div key={i} onClick={() => { setFormData({ ...formData, customer_name: n }); setShowSuggestions(false); }} className="p-3 border-b hover:bg-blue-50 cursor-pointer text-sm font-semibold">{n}</div>))}</div>)}
        </div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Quality</label><select required className="w-full border p-3 rounded bg-white outline-none" value={formData.quality} onChange={e => handleValueChange('quality', e.target.value)}><option value="">Select...</option>{QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}</select></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Color</label><select required className="w-full border p-3 rounded bg-white outline-none" value={formData.color} onChange={e => handleValueChange('color', e.target.value)}><option value="">Select...</option>{COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="col-span-2 grid grid-cols-3 gap-3">
          <div><label className="text-xs font-bold text-gray-400 uppercase">GSM</label><input type="number" className="w-full border p-2 rounded outline-none" value={formData.gsm} onChange={e => handleValueChange('gsm', e.target.value)} /></div>
          <div><label className="text-xs font-bold text-gray-400 uppercase">Size</label><input type="number" className="w-full border p-2 rounded outline-none" value={formData.width_inches} onChange={e => handleValueChange('width_inches', e.target.value)} /></div>
          <div><label className="text-xs font-bold text-gray-400 uppercase">Length</label><input type="number" className="w-full border p-2 rounded outline-none" value={formData.length_meters} onChange={e => handleValueChange('length_meters', e.target.value)} /></div>
        </div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Gross Kg</label><input type="number" className="w-full border p-3 rounded outline-none" value={formData.gross_weight} onChange={e => handleValueChange('gross_weight', e.target.value)} /></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Net Kg</label><input type="number" className="w-full border-2 border-blue-100 p-3 rounded font-bold text-blue-900 outline-none" value={formData.net_weight} onChange={e => handleValueChange('net_weight', e.target.value)} /></div>
        <button type="submit" disabled={isSaving} className={`col-span-2 p-4 rounded-xl font-bold mt-4 shadow-lg active:scale-95 transition-all ${isSaving ? 'bg-gray-400' : 'bg-blue-600 text-white'}`}>{isSaving ? <Loader className="animate-spin mx-auto" /> : 'Save & Print Label'}</button>
      </form>
    </div>
  );
});

export default NewProductView;