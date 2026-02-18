import React, { useMemo, useState } from 'react';
import { Search, Calendar } from 'lucide-react';

const HistoryView = React.memo(({ rolls, onSelectRoll }) => {
  const [search, setSearch] = useState('');
  const list = useMemo(() => {
    return rolls.filter(r => r.status === 'dispatched' && (!search || `${r.customer_name} ${r.product_id}`.toLowerCase().includes(search.toLowerCase())))
    .sort((a,b) => new Date(b.dispatched_at) - new Date(a.dispatched_at));
  }, [rolls, search]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-2">
        <Search className="text-gray-400" size={20}/>
        <input className="w-full outline-none text-sm" placeholder="Search history..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="space-y-2">
        {list.map(r => (
          <div key={r.id} onClick={() => onSelectRoll(r)} className="bg-white p-3 rounded-xl border flex justify-between items-center active:scale-95 transition-all shadow-sm">
            <div>
              <div className="font-bold text-gray-800">{r.customer_name}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">{r.product_id} • {new Date(r.dispatched_at).toLocaleDateString()}</div>
            </div>
            <div className="font-black text-green-700">{r.net_weight} kg</div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default HistoryView;