import React, { useMemo, useState } from 'react';
import { Search, Clock, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

const formatCurrency = (val) => new Intl.NumberFormat('en-IN').format(val);

const HistoryView = React.memo(({ rolls, onSelectRoll, onOpenReports }) => {
  const [search, setSearch] = useState('');
  
  const list = useMemo(() => {
    return rolls
      .filter(r => r.status === 'dispatched' && (!search || `${r.customer_name} ${r.product_id} ${r.quality}`.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => new Date(b.dispatched_at) - new Date(a.dispatched_at));
  }, [rolls, search]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(list);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, "KSF_Dispatch_History.xlsx");
  };

  return (
    <div className="pb-24 px-1">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl">History</h2>
        <div className="flex gap-2">
          {/* RESTORED XLS BUTTON */}
          <button onClick={handleExport} className="bg-green-100 text-green-700 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1 hover:bg-green-200 transition-colors shadow-sm">
            <Download size={16} /> XLS
          </button>
        </div>
      </div>
      {/* ... rest of the component remains the same ... */}