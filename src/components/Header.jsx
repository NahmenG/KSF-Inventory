import React from 'react';
import { RefreshCw, Settings, LogOut } from 'lucide-react';

const Header = React.memo(({ deviceName, onLogout, onEditDeviceName, onOpenSettings, onManualSync, isSyncing, offlineCount, onLogoClick }) => (
  <header className="bg-white border-b border-gray-200 fixed top-0 w-full z-50 h-16 shadow-sm px-4 flex justify-between items-center print:hidden">
    <div onClick={onLogoClick} className="flex items-center pl-1 cursor-pointer hover:opacity-80 transition-opacity active:scale-95">
      <img src="/logo.png" alt="KSF" className="h-10 w-auto object-contain" />
    </div>
    <div className="flex items-center gap-2 text-sm">
      <button onClick={onManualSync} disabled={isSyncing} className={`p-2 rounded-full relative ${isSyncing ? 'text-blue-500 bg-blue-50' : (offlineCount > 0 ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-500 hover:bg-gray-100')}`}>
        <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
        {offlineCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{offlineCount}</span>}
      </button>
      <div onClick={onEditDeviceName} className="font-bold cursor-pointer bg-gray-100 px-3 py-1 rounded-full text-xs md:text-sm">
        {deviceName || 'Device'} ✎
      </div>
      <button onClick={onOpenSettings} className="text-gray-600 hover:bg-gray-100 p-2 rounded-full"><Settings size={20} /></button>
      <button onClick={onLogout} className="text-red-600 font-bold hover:bg-red-50 px-2 py-1 rounded"><LogOut size={20} /></button>
    </div>
  </header>
));

export default Header;