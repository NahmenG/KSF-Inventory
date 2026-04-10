import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

/**
 * MarketRatesModal
 * 
 * Loads current rates from Supabase on mount.
 * Admin edits are saved back via upsert on the `market_rates` table.
 * onUpdate() is called after a successful save so the parent can refresh.
 * 
 * Expected `market_rates` table columns:
 *   id, material_name, rate (numeric), created_at
 */
const MarketRatesModal = ({ onClose, isAdmin, onUpdate }) => {
  const [rates, setRates] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // --- LOAD from Supabase on mount ---
  useEffect(() => {
    const loadRates = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('market_rates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Deduplicate: keep only the latest entry per material_name
        const seen = new Set();
        const latest = [];
        (data || []).forEach(item => {
          if (!seen.has(item.material_name)) {
            latest.push(item);
            seen.add(item.material_name);
          }
        });

        setRates(latest);
      } catch (err) {
        setError('Failed to load rates: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadRates();
  }, []);

  const handleRateChange = (material_name, newRate) => {
    setRates(prev =>
      prev.map(r =>
        r.material_name === material_name
          ? { ...r, rate: parseFloat(newRate) || 0 }
          : r
      )
    );
  };

  // --- SAVE to Supabase ---
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Insert new rows for each updated rate (history-style log)
      const inserts = rates.map(r => ({
        material_name: r.material_name,
        rate: r.rate,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('market_rates').insert(inserts);
      if (error) throw error;

      setEditMode(false);
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      setError('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">

        {/* Header */}
        <div className="bg-slate-800 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-green-400" size={20} />
            <h2 className="text-white font-bold text-lg">Current Market Rates (₹/kg)</h2>
          </div>
          <div className="flex gap-2 items-center">
            {isAdmin && !loading && (
              editMode ? (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center gap-2 text-sm font-semibold transition-all shadow-md disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 text-sm font-semibold transition-all shadow-md"
                >
                  <Edit2 size={16} /> Edit Rates
                </button>
              )
            )}
            <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-red-700 text-sm font-bold">
            {error}
          </div>
        )}

        {/* Rates List */}
        <div className="p-0 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
              <Loader2 size={20} className="animate-spin" /> Loading rates...
            </div>
          ) : rates.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-bold text-sm">
              No market rates found in database.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Raw Material</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Rate (per kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rates.map((rate) => (
                  <tr key={rate.material_name} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-gray-800 font-medium">{rate.material_name}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editMode ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-gray-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={rate.rate}
                            onChange={e => handleRateChange(rate.material_name, e.target.value)}
                            className="w-24 border-2 border-blue-200 rounded px-2 py-1 text-right font-mono font-bold focus:border-blue-500 focus:outline-none bg-blue-50"
                          />
                        </div>
                      ) : (
                        <span className="text-lg font-mono font-bold text-slate-900">
                          ₹{parseFloat(rate.rate).toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 flex justify-between items-center border-t border-gray-200">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
            Last Updated: {rates[0]?.created_at ? new Date(rates[0].created_at).toLocaleDateString('en-IN') : '—'}
          </span>
          {!editMode && isAdmin && (
            <span className="text-[10px] text-blue-500 font-bold italic">
              * Click Edit Rates to modify current pricing
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketRatesModal;
