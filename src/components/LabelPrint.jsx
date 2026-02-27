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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 antialiased">
      <div className="bg-white rounded-lg w-full max-w-sm overflow-hidden flex flex-col max-h-[95vh] shadow-2xl print:shadow-none print:m-0 print:w-full">
        
        {/* UI CONTROLS - HIDDEN DURING PRINT */}
        <div className="p-4 border-b flex flex-col gap-3 print:hidden">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-800 tracking-tighter uppercase">Label Preview</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowBrand(!showBrand)} className={`flex items-center justify-center gap-1 text-xs font-bold p-2 rounded-xl transition-all ${showBrand ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {showBrand ? <ToggleRight size={18} /> : <ToggleLeft size={18} />} Brand
            </button>
            <button onClick={() => setShowDate(!showDate)} className={`flex items-center justify-center gap-1 text-xs font-bold p-2 rounded-xl transition-all ${showDate ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {showDate ? <Eye size={18} /> : <EyeOff size={18} />} Date
            </button>
          </div>
        </div>
        
        {/* THE LABEL - THIS IS THE ONLY PART THAT PRINTS */}
        <div className="flex-1 overflow-auto bg-gray-200/30 p-4 flex justify-center items-start print:bg-white print:p-0">
          <div 
            id="ksf-label"
            className="flex flex-col justify-between items-center text-center bg-white shadow-xl print:shadow-none relative" 
            style={{ 
              width: '2.4in', 
              height: '3.9in', 
              padding: '0.1in', 
              boxSizing: 'border-box',
              backgroundColor: 'white'
            }}
          >
            <div className="w-full border-b-2 border-black pb-1 h-10 flex items-center justify-center">
              {showBrand && <div className="font-black text-xl tracking-tighter uppercase leading-none">KSF NON WOVEN</div>}
            </div>
            
            <div className="w-full grid grid-cols-2 gap-y-1 text-left px-1 flex-1 content-center">
              <div><span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter">Quality</span><span className="font-black text-lg leading-none uppercase">{data.quality}</span></div>
              <div className="text-right"><span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter">Color</span><span className="font-black text-lg leading-none uppercase">{data.color}</span></div>
              <div><span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter">Size (in)</span><span className="font-black text-lg leading-none">{data.width_inches}"</span></div>
              <div className="text-right"><span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter">Length</span><span className="font-black text-lg leading-none">{data.length_meters}m</span></div>
              <div className="col-span-2 text-center mt-1"><span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter">GSM</span><span className="font-black text-3xl leading-none">{data.gsm}</span></div>
            </div>
            
            <div className="w-full border-y-2 border-black py-2 my-1 flex justify-between items-end px-1">
              <div className="text-left"><span className="text-[10px] uppercase font-bold block leading-none">Gross Wt</span><span className="text-sm font-black">{data.gross_weight} kg</span></div>
              <div className="text-right"><span className="text-[10px] uppercase font-bold block text-gray-400 leading-none">Net Weight</span><span className="text-4xl font-black leading-none">{data.net_weight}<span className="text-lg">kg</span></span></div>
            </div>
            
            <div className="w-full flex flex-col items-center overflow-hidden pb-4">
              <canvas ref={canvasRef} className="max-w-full h-10 mb-1"></canvas>
              <div className="font-mono font-black text-lg tracking-widest leading-none mt-1 uppercase">{data.product_id}</div>
              {showDate && <div className="text-[8px] font-bold text-gray-400 mt-1 uppercase leading-none">
                {new Date(data.created_at || new Date()).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
              </div>}
            </div>
          </div>
        </div>

        {/* FOOTER BUTTONS - HIDDEN DURING PRINT */}
        <div className="p-4 bg-white border-t flex gap-2 print:hidden">
          <button 
            onClick={handlePrint} 
            className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 flex justify-center gap-2 items-center active:scale-95 transition-all"
          >
            <Printer size={18} /> OPEN PRINT
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-50 border border-gray-100 text-gray-500 py-4 rounded-2xl font-bold active:scale-95 transition-all uppercase">
            Close
          </button>
        </div>
      </div>

      {/* PRINT STYLES - CRITICAL FOR 2.4x3.9 DIMENSIONS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; background: white !important; }
          #ksf-label, #ksf-label * { visibility: visible; }
          #ksf-label { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            margin: 0 !important;
            padding: 0.1in !important;
            width: 2.4in !important;
            height: 3.9in !important;
            border: none !important;
          }
          @page { size: 2.4in 3.9in; margin: 0; }
        }
      `}} />
    </div>
  );
};

export default LabelPrint;