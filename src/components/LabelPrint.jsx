import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer, ToggleRight, ToggleLeft, Eye, EyeOff } from 'lucide-react';

const LabelPrint = ({ data, onClose }) => {
  const canvasRef = useRef(null);
  const [showBrand, setShowBrand] = useState(true);
  const [showDate, setShowDate] = useState(true);

  if (!data) return null;

  useEffect(() => {
    if (data && canvasRef.current) {
      try { 
        JsBarcode(canvasRef.current, data.product_id, { 
          format: "CODE128", 
          displayValue: false, 
          height: 40, 
          width: 2, 
          margin: 0 
        }); 
      } catch (e) { console.error("Barcode Error:", e); }
    }
  }, [data]);

  const handleNativePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 antialiased">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] shadow-2xl print:shadow-none print:max-h-none print:w-full">
        
        {/* UI CONTROLS - AUTOMATICALLY HIDDEN DURING PRINT */}
        <div className="p-4 border-b flex flex-col gap-3 print:hidden">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-black text-lg text-gray-800 tracking-tighter uppercase">Label Preview</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowBrand(!showBrand)} className={`flex items-center justify-center gap-2 text-[11px] font-black p-3 rounded-2xl transition-all ${showBrand ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {showBrand ? <ToggleRight size={18} /> : <ToggleLeft size={18} />} BRAND
            </button>
            <button onClick={() => setShowDate(!showDate)} className={`flex items-center justify-center gap-2 text-[11px] font-black p-3 rounded-2xl transition-all ${showDate ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {showDate ? <Eye size={18} /> : <EyeOff size={18} />} DATE
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-slate-100/50 p-6 flex justify-center items-start print:bg-white print:p-0">
          {/* THE LABEL - EXACT SAME UI AND DIMENSIONS */}
          <div 
            id="ksf-label-printable"
            className="flex flex-col justify-between items-center text-center bg-white shadow-xl relative print:shadow-none print:border-0" 
            style={{ width: '2.4in', height: '3.9in', padding: '0.15in', boxSizing: 'border-box' }}
          >
            <div className="w-full border-b-2 border-black pb-2 h-12 flex items-center justify-center">
              {showBrand && <div className="font-black text-2xl tracking-tighter uppercase leading-none">KSF NON WOVEN</div>}
            </div>
            
            <div className="w-full grid grid-cols-2 gap-y-2 text-left px-1 flex-1 content-center">
              <div><span className="text-[9px] uppercase font-black text-gray-400 block tracking-tight">Quality</span><span className="font-black text-lg leading-none uppercase">{data.quality}</span></div>
              <div className="text-right"><span className="text-[9px] uppercase font-black text-gray-400 block tracking-tight">Color</span><span className="font-black text-lg leading-none uppercase">{data.color}</span></div>
              <div><span className="text-[9px] uppercase font-black text-gray-400 block tracking-tight">Width (in)</span><span className="font-black text-lg leading-none">{data.width_inches}"</span></div>
              <div className="text-right"><span className="text-[9px] uppercase font-black text-gray-400 block tracking-tight">Length</span><span className="font-black text-lg leading-none">{data.length_meters}m</span></div>
              <div className="col-span-2 text-center mt-1 bg-slate-50 py-1 rounded-lg"><span className="text-[9px] uppercase font-black text-gray-400 block tracking-tight">GSM</span><span className="font-black text-4xl leading-none">{data.gsm}</span></div>
            </div>
            
            <div className="w-full border-y-2 border-black py-2 my-2 flex justify-between items-end px-1">
              <div className="text-left"><span className="text-[10px] uppercase font-black block leading-none">Gross</span><span className="text-sm font-black">{data.gross_weight} kg</span></div>
              <div className="text-right"><span className="text-[10px] uppercase font-black block text-gray-400 leading-none">Net Weight</span><span className="text-4xl font-black leading-none">{data.net_weight}<span className="text-lg">kg</span></span></div>
            </div>
            
            <div className="w-full flex flex-col items-center overflow-hidden pb-4">
              <canvas ref={canvasRef} className="max-w-full h-10 mb-1"></canvas>
              <div className="font-mono font-black text-xl tracking-widest leading-none mt-1 uppercase">{data.product_id}</div>
              {showDate && <div className="text-[8px] font-bold text-gray-400 mt-2 uppercase leading-none">
                {new Date(data.created_at || new Date()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>}
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t flex gap-3 print:hidden">
          <button 
            onClick={handleNativePrint} 
            className="flex-1 flex justify-center items-center gap-2 py-4 rounded-2xl font-black text-sm bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-95 transition-all"
          >
            <Printer size={18} /> GENERATE PDF / PRINT
          </button>
          <button onClick={onClose} className="flex-1 bg-slate-50 border border-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all uppercase">
            Close
          </button>
        </div>
      </div>

      {/* PRINT CSS - FORCES 2.4x3.9 INCH OUTPUT */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; background: white !important; }
          #ksf-label-printable, #ksf-label-printable * { visibility: visible; }
          #ksf-label-printable { 
            position: fixed !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 2.4in !important; 
            height: 3.9in !important; 
            margin: 0 !important; 
            padding: 0.15in !important;
            border: none !important;
          }
          @page { size: 2.4in 3.9in; margin: 0; }
        }
      `}} />
    </div>
  );
};

export default LabelPrint;