import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Edit2, Loader2, Plus, Trash2, Check, Beaker } from 'lucide-react';
import { supabase } from '../supabaseClient';

/**
 * BatchModal — Full CRUD for formulations table.
 *
 * Features:
 *  - Quality tabs are editable: add new quality, rename existing, delete quality
 *  - Materials per quality come from the market_rates table (same master list)
 *  - Quantity (kg) is editable per material per quality
 *  - Save: delete-then-reinsert for the active quality only
 *  - Modal stays open after save. Admin mode unaffected.
 *
 * formulations table: id (auto), quality_name (text), material_name (text), quantity_kg (numeric)
 * market_rates table: material_name (text), rate (numeric)
 */
const BatchModal = ({ isAdmin, onClose, onUpdate }) => {
  // Master materials list from market_rates
  const [masterMaterials, setMasterMaterials] = useState([]);

  // formData: { qualityName: [{ material_name, quantity_kg, enabled }] }
  // 'enabled' tracks whether this material is included in the batch
  const [formData, setFormData] = useState({});
  const [qualities, setQualities] = useState([]);
  const [activeTab, setActiveTab] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState('');

  // For adding/renaming a quality tab
  const [addingQuality, setAddingQuality] = useState(false);
  const [newQualityName, setNewQualityName] = useState('');
  const [renamingTab, setRenamingTab] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Load both market_rates (for master material list) and formulations
  const loadData = useCallback(async () => {
    setError('');
    try {
      const [ratesRes, batchRes] = await Promise.all([
        supabase.from('market_rates').select('*').order('created_at', { ascending: false }),
        supabase.from('formulations').select('*').order('quality_name')
      ]);

      if (ratesRes.error) throw ratesRes.error;
      if (batchRes.error) throw batchRes.error;

      // Deduplicate master materials
      const seen = new Set();
      const materials = [];
      (ratesRes.data || []).forEach(item => {
        if (!seen.has(item.material_name)) {
          materials.push(item.material_name);
          seen.add(item.material_name);
        }
      });
      setMasterMaterials(materials);

      // Group formulations by quality
      const grouped = {};
      (batchRes.data || []).forEach(row => {
        if (!grouped[row.quality_name]) grouped[row.quality_name] = {};
        grouped[row.quality_name][row.material_name] = row.quantity_kg;
      });

      // Build formData: for each quality, include ALL master materials.
      // If a material has a qty in the formulation → enabled=true, qty=that value
      // Otherwise → enabled=false, qty=0 (shown but unchecked)
      const qualityList = Object.keys(grouped).sort();
      const built = {};
      qualityList.forEach(q => {
        built[q] = materials.map(m => ({
          material_name: m,
          quantity_kg: grouped[q][m] ?? 0,
          enabled: grouped[q][m] !== undefined
        }));
      });

      setFormData(built);
      setQualities(qualityList);
      setActiveTab(prev => qualityList.includes(prev) ? prev : (qualityList[0] || ''));

    } catch (err) {
      setError('Failed to load: ' + err.message);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };
    init();
  }, [loadData]);

  // When master materials change (after a loadData), sync existing quality rows
  // to include any newly added materials and remove deleted ones
  const syncMaterialsToQualities = useCallback((materials, existingFormData, qualityList) => {
    const synced = {};
    qualityList.forEach(q => {
      const existing = existingFormData[q] || [];
      const existingMap = {};
      existing.forEach(r => { existingMap[r.material_name] = r; });
      synced[q] = materials.map(m => ({
        material_name: m,
        quantity_kg: existingMap[m]?.quantity_kg ?? 0,
        enabled: existingMap[m]?.enabled ?? false
      }));
    });
    return synced;
  }, []);

  // Toggle a material on/off for the active quality
  const handleToggle = (idx) => {
    setFormData(prev => {
      const rows = [...(prev[activeTab] || [])];
      rows[idx] = { ...rows[idx], enabled: !rows[idx].enabled };
      return { ...prev, [activeTab]: rows };
    });
  };

  const handleQtyChange = (idx, value) => {
    setFormData(prev => {
      const rows = [...(prev[activeTab] || [])];
      rows[idx] = { ...rows[idx], quantity_kg: value };
      return { ...prev, [activeTab]: rows };
    });
  };

  // Add a new quality tab
  const handleAddQuality = () => {
    const name = newQualityName.trim();
    if (!name || qualities.includes(name)) {
      setError(qualities.includes(name) ? 'Quality already exists.' : 'Enter a quality name.');
      return;
    }
    const newRows = masterMaterials.map(m => ({ material_name: m, quantity_kg: 0, enabled: false }));
    setFormData(prev => ({ ...prev, [name]: newRows }));
    setQualities(prev => [...prev, name].sort());
    setActiveTab(name);
    setNewQualityName('');
    setAddingQuality(false);
    setError('');
  };

  // Delete active quality tab
  const handleDeleteQuality = async () => {
    if (!window.confirm(`Delete quality "${activeTab}" and all its formulation data?`)) return;
    setSaving(true);
    try {
      await supabase.from('formulations').delete().eq('quality_name', activeTab);
      const newQualities = qualities.filter(q => q !== activeTab);
      const newFormData = { ...formData };
      delete newFormData[activeTab];
      setFormData(newFormData);
      setQualities(newQualities);
      setActiveTab(newQualities[0] || '');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Delete failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Rename active quality tab
  const handleRenameQuality = async () => {
    const newName = renameValue.trim();
    if (!newName || newName === activeTab) { setRenamingTab(false); return; }
    if (qualities.includes(newName)) { setError('Quality name already exists.'); return; }

    setSaving(true);
    try {
      // Update all formulation rows with the old name
      await supabase.from('formulations').update({ quality_name: newName }).eq('quality_name', activeTab);

      const newFormData = { ...formData, [newName]: formData[activeTab] };
      delete newFormData[activeTab];
      const newQualities = qualities.map(q => q === activeTab ? newName : q).sort();

      setFormData(newFormData);
      setQualities(newQualities);
      setActiveTab(newName);
      setRenamingTab(false);
      setRenameValue('');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Rename failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save the active quality's formulation
  const handleSave = async () => {
    if (!activeTab) return;
    setSaving(true);
    setError('');
    setSavedOk(false);
    try {
      const rows = (formData[activeTab] || []).filter(r => r.enabled && r.material_name);

      // Delete existing rows for this quality
      await supabase.from('formulations').delete().eq('quality_name', activeTab);

      // Re-insert only enabled materials with qty > 0 (allow 0 if explicitly enabled)
      if (rows.length > 0) {
        const inserts = rows.map(r => ({
          quality_name: activeTab,
          material_name: r.material_name,
          quantity_kg: parseFloat(r.quantity_kg) || 0
        }));
        const { error: insertErr } = await supabase.from('formulations').insert(inserts);
        if (insertErr) throw insertErr;
      }

      setEditMode(false);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
      if (onUpdate) onUpdate();

    } catch (err) {
      setError('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentRows = formData[activeTab] || [];
  const enabledCount = currentRows.filter(r => r.enabled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="bg-slate-800 p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Beaker className="text-blue-400" size={20} />
            <h2 className="text-white font-bold text-lg">Batch Formulations</h2>
          </div>
          <div className="flex gap-2 items-center">
            {savedOk && (
              <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
                <Check size={14} /> Saved
              </span>
            )}
            {isAdmin && !loading && activeTab && (
              editMode ? (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold disabled:opacity-60 transition-all"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-all"
                >
                  <Edit2 size={18} /> Edit
                </button>
              )
            )}
            <button onClick={onClose} className="text-white hover:text-gray-300 ml-1"><X size={24} /></button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-b border-red-200 px-5 py-3 text-red-700 text-sm font-bold shrink-0">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 size={22} className="animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* Quality Tabs Row */}
            <div className="flex border-b bg-gray-50 overflow-x-auto shrink-0 items-center">
              {qualities.map(q => (
                <button
                  key={q}
                  onClick={() => { setActiveTab(q); setEditMode(false); setRenamingTab(false); }}
                  className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === q
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-blue-500'
                  }`}
                >
                  {q}
                </button>
              ))}

              {/* Add quality button */}
              {isAdmin && (
                addingQuality ? (
                  <div className="flex items-center gap-1 px-2 shrink-0">
                    <input
                      autoFocus
                      type="text"
                      value={newQualityName}
                      onChange={e => setNewQualityName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddQuality(); if (e.key === 'Escape') setAddingQuality(false); }}
                      placeholder="Quality name"
                      className="border rounded-lg px-2 py-1 text-xs font-bold w-28 focus:outline-blue-500"
                    />
                    <button onClick={handleAddQuality} className="text-green-600 hover:text-green-800 p-1"><Check size={14} /></button>
                    <button onClick={() => setAddingQuality(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={14} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingQuality(true)}
                    className="px-3 py-3 text-gray-400 hover:text-blue-600 transition-colors shrink-0"
                    title="Add quality"
                  >
                    <Plus size={16} />
                  </button>
                )
              )}
            </div>

            {/* Tab actions: rename / delete active quality */}
            {isAdmin && activeTab && (
              <div className="flex items-center gap-3 px-5 py-2 bg-gray-50/60 border-b border-gray-100 shrink-0">
                {renamingTab ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameQuality(); if (e.key === 'Escape') setRenamingTab(false); }}
                      placeholder="New name"
                      className="border rounded-lg px-2 py-1 text-xs font-bold w-32 focus:outline-blue-500"
                    />
                    <button onClick={handleRenameQuality} className="text-green-600 hover:text-green-800"><Check size={14} /></button>
                    <button onClick={() => setRenamingTab(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setRenameValue(activeTab); setRenamingTab(true); }}
                    className="text-[10px] font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
                  >
                    <Edit2 size={11} /> Rename Tab
                  </button>
                )}
                <button
                  onClick={handleDeleteQuality}
                  className="text-[10px] font-black text-red-300 hover:text-red-600 uppercase tracking-widest flex items-center gap-1 transition-colors ml-auto"
                >
                  <Trash2 size={11} /> Delete Quality
                </button>
              </div>
            )}

            {/* Materials Table */}
            <div className="overflow-y-auto flex-1">
              {qualities.length === 0 ? (
                <div className="text-center py-16 text-gray-400 font-bold text-sm">
                  No qualities yet. Click + to add one.
                </div>
              ) : masterMaterials.length === 0 ? (
                <div className="text-center py-16 text-gray-400 font-bold text-sm">
                  No materials in Market Rates. Add materials there first.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      {editMode && <th className="w-10 px-4 py-3" />}
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Raw Material</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Qty (kg per batch)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentRows.map((row, idx) => (
                      <tr
                        key={row.material_name}
                        className={`transition-colors ${
                          row.enabled ? 'bg-white hover:bg-blue-50/20' : 'bg-gray-50/50 opacity-50'
                        }`}
                      >
                        {editMode && (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={row.enabled}
                              onChange={() => handleToggle(idx)}
                              className="w-4 h-4 accent-blue-600 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-5 py-3">
                          <span className={`font-medium text-sm ${row.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                            {row.material_name}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {editMode && row.enabled ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={row.quantity_kg}
                              onChange={e => handleQtyChange(idx, e.target.value)}
                              className="w-24 border border-blue-200 rounded-lg px-2 py-1.5 text-right font-mono font-bold text-sm focus:border-blue-500 focus:outline-none bg-blue-50"
                            />
                          ) : (
                            <span className={`font-mono font-medium text-sm ${row.enabled ? 'text-gray-900' : 'text-gray-300'}`}>
                              {row.enabled ? row.quantity_kg : '—'}
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
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center shrink-0 text-xs text-gray-400 font-medium">
              <span>{enabledCount} of {currentRows.length} materials active in <strong>{activeTab}</strong></span>
              {isAdmin && !editMode && (
                <span className="italic text-blue-400">Click Edit to modify</span>
              )}
              {!isAdmin && (
                <span className="italic">Admin mode required to edit</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BatchModal;