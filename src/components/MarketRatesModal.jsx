import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, TrendingUp, Loader2, Plus, Trash2, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';

/**
 * MarketRatesModal — Full CRUD for market_rates table.
 *
 * - Lists the latest rate per material_name
 * - Admin can: rename materials, change rates, add new rows, delete rows
 * - On Save:
 *     1. Hard-deletes all rows whose material_name no longer exists in the list
 *     2. Inserts fresh rows for every remaining/new material (history-log style)
 * - Modal stays open after save. Admin mode is unaffected.
 *
 * market_rates table: id, material_name (text), rate (numeric), created_at
 */
const MarketRatesModal = ({ onClose, isAdmin, onUpdate }) => {
  const [rates, setRates] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState('');

  const loadRates = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('market_rates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const seen = new Set();
      const latest = [];
      (data || []).forEach(item => {
        if (!seen.has(item.material_name)) {
          latest.push({ material_name: item.material_name, rate: item.rate });
          seen.add(item.material_name);
        }
      });
      setRates(latest);
    } catch (err) {
      setError('Failed to load: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRates(); }, []);

  const handleNameChange = (idx, value) =>
    setRates(prev => prev.map((r, i) => i === idx ? { ...r, material_name: value } : r));

  const handleRateChange = (idx, value) =>
    setRates(prev => prev.map((r, i) => i === idx ? { ...r, rate: value } : r));

  const handleAddRow = () =>
    setRates(prev => [...prev, { material_name: '', rate: 0, isNew: true }]);

  const handleRemoveRow = (idx) =>
    setRates(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const validRows = rates.filter(r => r.material_name.trim() !== '');
    if (!validRows.length) { setError('Add at least one material.'); return; }

    setSaving(true);
    setError('');
    setSavedOk(false);
    try {
      // 1. Find names that existed before but are no longer in the list → delete them
      const { data: existing } = await supabase.from('market_rates').select('material_name');
      const existingNames = new Set((existing || []).map(r => r.material_name));
      const keepNames = new Set(validRows.map(r => r.material_name.trim()));
      const toDelete = [...existingNames].filter(n => !keepNames.has(n));

      for (const name of toDelete) {
        await supabase.from('market_rates').delete().eq('material_name', name);
      }

      // 2. Insert new rate rows for every current material
      const now = new Date().toISOString();
      const inserts = validRows.map(r => ({
        material_name: r.material_name.trim(),
        rate: parseFloat(r.rate) || 0,
        created_at: now
      }));
      const { error: insertErr } = await supabase.from('market_rates').insert(inserts);
      if (insertErr) throw insertErr;

      // 3. Reload modal data in place
      await loadRates();
      setEditMode(false);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);

      // 4. Tell RateCalculator to refresh its pricing cards
      if (onUpdate) onUpdate();

    } catch (err) {
      setError('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="bg-slate-800 p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-green-400" size={20} />
            <h2 className="text-white font-bold text-lg">Market Rates (₹/kg)</h2>
          </div>
          <div className="flex gap-2 items-center">
            {savedOk && (
              <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
                <Check size={14} /> Saved
              </span>
            )}
            {isAdmin && !loading && (
              editMode ? (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold disabled:opacity-60 transition-all"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-all"
                >
                  <Edit2 size={16} /> Edit Rates
                </button>
              )
            )}
            <button onClick={onClose} className="text-white hover:text-gray-300 ml-1"><X size={24} /></button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-b border-red-200 px-5 py-3 text-red-700 text-sm font-bold shrink-0">{error}</div>
        )}

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
              <Loader2 size={20} className="animate-spin" /> Loading…
            </div>
          ) : rates.length === 0 && !editMode ? (
            <div className="text-center py-12 text-gray-400 font-bold text-sm">
              No materials yet. Click Edit Rates to add some.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Raw Material</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Rate / kg</th>
                  {editMode && <th className="w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rates.map((rate, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-5 py-3">
                      {editMode ? (
                        <input
                          type="text"
                          value={rate.material_name}
                          onChange={e => handleNameChange(idx, e.target.value)}
                          placeholder="Material name"
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none"
                        />
                      ) : (
                        <span className="text-gray-800 font-medium text-sm">{rate.material_name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {editMode ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-gray-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={rate.rate}
                            onChange={e => handleRateChange(idx, e.target.value)}
                            className="w-24 border border-blue-200 rounded-lg px-2 py-1.5 text-right font-mono font-bold text-sm focus:border-blue-500 focus:outline-none bg-blue-50"
                          />
                        </div>
                      ) : (
                        <span className="text-base font-mono font-bold text-slate-900">
                          ₹{parseFloat(rate.rate).toFixed(2)}
                        </span>
                      )}
                    </td>
                    {editMode && (
                      <td className="px-2 py-3">
                        <button
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center shrink-0">
          {editMode ? (
            <button
              onClick={handleAddRow}
              className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Plus size={16} /> Add Material
            </button>
          ) : (
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              {rates.length} material{rates.length !== 1 ? 's' : ''}
            </span>
          )}
          {!editMode && isAdmin && (
            <span className="text-[10px] text-blue-500 font-bold italic">Click Edit Rates to modify</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketRatesModal;