import React from 'react';
import { Plus, Database, Truck, Clock, Layers } from 'lucide-react';

const BottomNav = React.memo(({ activeTab, setTab, isGuest }) => {
  const tabs = [
    !isGuest && { id: 'entry', label: 'Add', icon: Plus },
    { id: 'stock', label: 'Stock', icon: Database },
    { id: 'dispatch', label: 'Disp', icon: Truck },
    { id: 'history', label: 'Hist', icon: Clock },
    { id: 'materials', label: 'Mat', icon: Layers }
  ].filter(Boolean);

  return (
    <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full z-50 h-16 flex justify-around items-center pb-1 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] font-bold">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
});

export default BottomNav;