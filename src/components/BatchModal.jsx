import React, { useState } from 'react';
import { X, Save, Edit2 } from 'lucide-react';

const BatchModal = ({ isOpen, onClose, isAdmin, initialData, onSave }) => {
  const qualities = ['UV', 'Virgin', 'Fresh', 'Semi-Fresh', 'Semi', 'Semi-2', 'Semi-Star'];
  const [activeTab, setActiveTab] = useState(qualities[0]);
  const [editMode, setEditMode] = useState(false);
  
  // Local state for batch formulations organized by quality
  const [formData, setFormData] = useState(initialData || {
    'UV': [{ material: 'PP Granules', qty: 100 }, { material: 'UV Masterbatch', qty: 5 }],
    'Virgin': [{ material: 'PP Granules', qty: 100 }],
    'Fresh': [{ material: 'PP Granules', qty: 90 }, { material: 'Calcium MB', qty: 10 }],
    'Semi-Fresh': [{ material: 'PP Granules', qty: 80 }, { material: 'Recycled RP', qty: 20 }],
    'Semi': [{ material: 'PP Granules', qty: 60 }, { material: 'Recycled RP', qty: 40 }],
    'Semi-2': [{ material: 'PP Granules', qty: 50 }, { material: 'Recycled RP', qty: 50 }],
    'Semi-Star': [{ material: 'PP Granules', qty: 40 }, { material: 'Recycled RP', qty: 60 }],
  });

  if (!isOpen) return null;

  const handleInputChange = (quality, index, field, value) => {
    const updatedData = { ...formData };
    updatedData[quality][index][field] = field === 'qty' ? parseFloat(value) : value;
    setFormData(updatedData);
  };

  const handleSave = () => {
    onSave(formData);
    setEditMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 p-4 flex justify-between items-center">
          <h2 className="text-white font-bold text-lg">Batch Formulations</h2>
          <div className="flex gap-2">
            {isAdmin && (
              <button 
                onClick={() => editMode ? handleSave() : setEditMode(true)}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 transition-colors"
              >
                {editMode ? <><Save size={18} /> Save</> : <><Edit2 size={18} /> Edit Mode</>}
              </button>
            )}
            <button onClick={onClose} className="text-white hover:text-gray-300">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Quality Tabs */}
        <div className="flex border-b overflow-x-auto bg-gray-50">
          {qualities.map((q) => (
            <button
              key={q}
              onClick={() => setActiveTab(q)}
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

        {/* Content Table */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-2 font-bold text-gray-700">Raw Material</th>
                <th className="py-2 font-bold text-gray-700 w-32 text-right">Quantity (kg)</th>
              </tr>
            </thead>
            <tbody>
              {formData[activeTab].map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3">
                    {editMode ? (
                      <input
                        type="text"
                        value={item.material}
                        onChange={(e) => handleInputChange(activeTab, idx, 'material', e.target.value)}
                        className="w-full border rounded px-2 py-1 focus:outline-blue-500"
                      />
                    ) : (
                      <span className="text-gray-800">{item.material}</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {editMode ? (
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleInputChange(activeTab, idx, 'qty', e.target.value)}
                        className="w-24 border rounded px-2 py-1 text-right focus:outline-blue-500"
                      />
                    ) : (
                      <span className="font-mono font-medium">{item.qty}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {editMode && (
            <button 
              onClick={() => {
                const updated = {...formData};
                updated[activeTab].push({ material: '', qty: 0 });
                setFormData(updated);
              }}
              className="mt-4 text-sm text-blue-600 font-bold hover:underline"
            >
              + Add Material to {activeTab}
            </button>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t text-right text-xs text-gray-400">
          * Editing restricted to Authorized Admin Mode
        </div>
      </div>
    </div>
  );
};

export default BatchModal;