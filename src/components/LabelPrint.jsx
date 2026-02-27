import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer } from 'lucide-react';

export default function LabelPrint({ data, onClose }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (data && barcodeRef.current) {
      JsBarcode(barcodeRef.current, data.product_id, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: false,
        margin: 0
      });
    }
  }, [data]);

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        
        {/* Header - Hidden on Print */}
        <div className="p-4 border-b flex justify-between items-center print:hidden">
          <h2 className="font-bold text-gray-800">Label Preview</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Label Content */}
        <div className="p-8 flex justify-center bg-gray-50 print:bg-white print:p-0">
          <div 
            id="printable-label"
            className="bg-white border-2 border-black p-4 flex flex-col justify-between items-center text-center print:border-0"
            style={{ width: '2.4in', height: '3.9in', boxSizing: 'border-box' }}
          >
            <div className="w-full border-b-2 border-black pb-2">
              <h1 className="text-xl font-black tracking-tighter uppercase">KSF NON WOVEN</h1>
            </div>

            <div className="flex-1 flex flex-col justify-center w-full gap-2 py-4">
              <div className="flex justify-between text-left">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Quality</div>
                <div className="font-black text-sm">{data.quality}</div>
              </div>
              <div className="flex justify-between text-left border-b border-gray-100 pb-1">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Color</div>
                <div className="font-black text-sm">{data.color}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="text-left">
                  <div className="text-[10px] font-bold text-gray-500">SIZE</div>
                  <div className="font-black text-sm">{data.width_inches}"</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-gray-500">GSM</div>
                  <div className="font-black text-sm">{data.gsm}</div>
                </div>
              </div>
              <div className="mt-4 border-2 border-black p-2 rounded-lg bg-gray-50">
                <div className="text-[10px] font-black uppercase">Net Weight</div>
                <div className="text-3xl font-black">{data.net_weight} kg</div>
              </div>
            </div>

            <div className="w-full flex flex-col items-center pt-2">
              <svg ref={barcodeRef}></svg>
              <div className="font-mono font-bold text-sm tracking-widest mt-1">{data.product_id}</div>
              <div className="text-[8px] font-bold text-gray-400 mt-1 uppercase">
                {new Date(data.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Actions - Hidden on Print */}
        <div className="p-4 bg-white border-t flex gap-3 print:hidden">
          <button 
            onClick={() => window.print()}
            className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
          >
            <Printer size={20} /> PRINT LABEL
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold"
          >
            CLOSE
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #printable-label, #printable-label * { visibility: visible; }
          #printable-label { 
            position: fixed; 
            left: 0; 
            top: 0; 
            width: 2.4in; 
            height: 3.9in; 
            border: none;
          }
          @page { size: 2.4in 3.9in; margin: 0; }
        }
      `}} />
    </div>
  );
}