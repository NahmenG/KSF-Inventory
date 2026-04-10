import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

/**
 * BatchModal
 *
 * Loads formulations from Supabase on mount (grouped by quality_name).
 * Admin edits are saved back to the `formulations` table:
 *   - Deletes all existing rows for the active quality
 *   - Re-inserts the updated set
 * onUpdate() is called after a successful save.
 *
 * Expected `formulations` table columns:
 *   id (auto), quality_name (text), material_name (text), quantity_kg (numeric)
 */
const BatchModal = ({ isAdmin, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({});   // { qualityName: [{ material_name, quantity_kg }] }
  const [qualities, setQualities] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // --- LOAD from Supabase ---
  useEffect(() => {
    const loadFormulations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('formulations')
          .select('*')
          .order('quality_name');

        if (error) throw error;

        // Group by quality_name
        const grouped = {};
        (data || []).forEach(row => {
          if (!grouped[row.quality_name]) grouped[row.quality_name] = [];
          grouped[row.quality_name].push({
            id: row.id,
            material_name: row.material_name,
            quantity_kg: row.quantity_kg
          });
        });

        const qualityList = Object.keys(grouped).sort();
        setFormData(grouped);
        setQualities(qualityList);
        setActiveTab(qualityList[0] || '');
      } catch (err) {
        setError('Failed to load formulations: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadFormulations();
  }, []);

  const handleInputChange = (quality, index, field, value) => {
    setFormData(prev => {
      const updated = { ...prev };
      updated[quality] = updated[quality].map((item, i) =>
        i === index ? { ...item, [field]: field === 'quantity_kg' ? parseFloat(value) || 0 : value } : item
      );
      return updated;
    });
  };

  const handleAddRow = () => {
    setFormData(prev => ({
      ...prev,
      [activeTab]: [...(prev[activeTab] || []), { material_name: '', quantity_kg: 0 }]
    }));
  };

  const handleRemoveRow = (index) => {
    setFormData(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((_, i) => i !== index)
    }));
  };

  // --- SAVE to Supabase ---
  // Strategy: delete all rows for the active quality, then re-insert.
  // This avoids stale rows if materials are removed or reordered.
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const rows = (formData[activeTab] || []).filter(r => r.material_name.trim());

      // 1. Delete existing rows for this quality
      const { error: deleteError } = await supabase
        .from('formulations')
        .delete()
        .eq('quality_name', activeTab);

      if (deleteError) throw deleteError;

      // 2. Re-insert updated rows
      if (rows.length > 0) {
        const inserts = rows.map(r => ({
          quality_name: activeTab,
          material_name: r.material_name.trim(),
          quantity_kg: r.quantity_kg
        }));

        const { error: insertError } = await supabase
          .from('formulations')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      setEditMode(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentRows = formData[activeTab] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-slate-800 p-4 flex justify-between items-center">
          <h2 className="text-white font-bold text-lg">Batch Formulations</h2>
          <div className="flex gap-2 items-center">
            {isAdmin && !loading && activeTab && (
              editMode ? (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center gap-2 transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 transition-colors"
                >
                  <Edit2 size={18} /> Edit Mode
                </button>
              )
            )}
            <button onClick={onClose} className="text-white hover:text-gray-300">
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

        {/* Quality Tabs */}
        {!loading && qualities.length > 0 && (
          <div className="flex border-b overflow-x-auto bg-gray-50">
            {qualities.map(q => (
              <button
                key={q}
                onClick={() => { setActiveTab(q); setEditMode(false); }}
                className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === q
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-500 hover:text-blue-500'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
              <Loader2 size={20} className="animate-spin" /> Loading formulations...
            </div>
          ) : qualities.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-bold text-sm">
              No formulations found in database.
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-2 font-bold text-gray-700">Raw Material</th>
                    <th className="py-2 font-bold text-gray-700 w-32 text-right">Quantity (kg)</th>
                    {editMode && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3">
                        {editMode ? (
                          <input
                            type="text"
                            value={item.material_name}
                            onChange={e => handleInputChange(activeTab, idx, 'material_name', e.target.value)}
                            className="w-full border rounded px-2 py-1 focus:outline-blue-500 font-medium"
                            placeholder="Material name"
                          />
                        ) : (
                          <span className="text-gray-800 font-medium">{item.material_name}</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {editMode ? (
                          <input
                            type="number"
                            value={item.quantity_kg}
                            onChange={e => handleInputChange(activeTab, idx, 'quantity_kg', e.target.value)}
                            className="w-24 border rounded px-2 py-1 text-right focus:outline-blue-500 font-mono font-medium"
                          />
                        ) : (
                          <span className="font-mono font-medium">{item.quantity_kg}</span>
                        )}
                      </td>
                      {editMode && (
                        <td className="py-3 pl-2">
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {editMode && (
                <button
                  onClick={handleAddRow}
                  className="mt-4 text-sm text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add Material to {activeTab}
                </button>
              )}
            </>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t text-right text-xs text-gray-400">
          {isAdmin
            ? '* Changes apply only to the currently selected quality tab'
            : '* Editing restricted to Authorized Admin Mode'}
        </div>
      </div>
    </div>
  );
};

export default BatchModal;
