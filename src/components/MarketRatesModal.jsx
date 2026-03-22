import React, { useState } from 'react';
import { X, Save, Edit2, TrendingUp, TrendingDown } from 'lucide-react';

const MarketRatesModal = ({ isOpen, onClose, isAdmin, initialRates, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  
  // Local state for market rates
  const [rates, setRates] = useState(initialRates || [
    { id: 1, material: 'PP Granules (Virgin)', price: 92.50, trend: 'up' },
    { id: 2, material: 'Calcium Masterbatch', price: 18.00, trend: 'down' },
    { id: 3, material: 'Color Masterbatch (Standard)', price: 145.00, trend: 'stable' },
    { id: 4, material: 'UV Additive', price: 320.00, trend: 'up' },
    { id: 5, material: 'Recycled RP (Semi)', price: 62.00, trend: 'stable' },
    { id: 6, material: 'Recycled RP (Fresh)', price: 74.50, trend: 'down' },
  ]);

  if (!isOpen) return null;

  const handlePriceChange = (id, newPrice) => {
    const updatedRates = rates.map(rate => 
      rate.id === id ? { ...rate, price: parseFloat(newPrice) || 0 } : rate
    );
    setRates(updatedRates);
  };

  const handleSave = () => {
    onSave(rates);
    setEditMode(false);
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
          <div className="flex gap-2">
            {isAdmin && (
              <button 
                onClick={() => editMode ? handleSave() : setEditMode(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 text-sm font-semibold transition-all shadow-md"
              >
                {editMode ? <><Save size={16} /> Save Changes</> : <><Edit2 size={16} /> Edit Rates</>}
              </button>
            )}
            <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Rates List */}
        <div className="p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Raw Material</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Rate (per kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rates.map((rate) => (
                <tr key={rate.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {rate.trend === 'up' && <TrendingUp size={14} className="text-red-500" />}
                      {rate.trend === 'down' && <TrendingDown size={14} className="text-green-500" />}
                      <span className="text-gray-800 font-medium">{rate.material}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editMode ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={rate.price}
                          onChange={(e) => handlePriceChange(rate.id, e.target.value)}
                          className="w-24 border-2 border-blue-200 rounded px-2 py-1 text-right font-mono font-bold focus:border-blue-500 focus:outline-none bg-blue-50"
                        />
                      </div>
                    ) : (
                      <span className="text-lg font-mono font-bold text-slate-900">
                        ₹{rate.price.toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-gray-50 flex justify-between items-center border-t border-gray-200">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
            Last Updated: {new Date().toLocaleDateString('en-IN')}
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