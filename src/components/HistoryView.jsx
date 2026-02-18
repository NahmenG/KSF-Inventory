import React, { useMemo, useState } from 'react';
import { Search, Clock, Calendar } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('en-IN').format(val);

const HistoryView = React.memo(({ rolls, onSelectRoll }) => {
  const [search, setSearch] = useState('');
  
  const list = useMemo(() => {
    return rolls
      .filter(r => r.status === 'dispatched' && (!search || `${r.customer_name} ${r.product_id} ${r.quality}`.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => new Date(b.dispatched_at) - new Date(a.dispatched_at));
  }, [rolls, search]);

  const totalWeight = useMemo(() => {
    return list.reduce((sum, r) => sum + (parseFloat(r.net_weight) || 0), 0);
  }, [list]);

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2 sticky top-0 z-10">
        <Search className="text-gray-400" size={20} />
        <input 
          className="w-full outline-none text-sm bg-transparent" 
          placeholder="Search customer, ID or quality..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div className="bg-gray-100 p-3 rounded-lg flex justify-between items-center text-sm border border-gray-200">
        <span className="font-bold text-gray-600">{list.length} Dispatched Rolls</span>
        <span className="font-bold text-blue-700">{formatCurrency(totalWeight)} kg</span>
      </div>

      <div className="space-y-2">
        {list.length === 0 ? (
          <div className="text-center text-gray-400 py-10 italic">No history found matching search.</div>
        ) : (
          list.map(r => (
            <div 
              key={r.id} 
              onClick={() => onSelectRoll(r)} 
              className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center active:scale-[0.98] transition-all shadow-sm hover:border-blue-200"
            >
              <div>
                <div className="font-bold text-gray-800">{r.customer_name || 'Unknown Buyer'}</div>
                <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                  <Clock size={10} /> {r.product_id} • {new Date(r.dispatched_at).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">{r.quality} • {r.color}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-lg text-green-700">{r.net_weight} kg</div>
                <div className="text-[9px] text-gray-400 uppercase">Tap to Edit</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default HistoryView;