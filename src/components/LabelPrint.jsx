import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { X, Printer, ToggleRight, ToggleLeft, Eye, EyeOff } from 'lucide-react';

const LabelPrint = ({ data, onClose }) => {
  const canvasRef = useRef(null);
  const labelRef = useRef(null);
  const [showBrand, setShowBrand] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (data && canvasRef.current) {
      try { 
        JsBarcode(canvasRef.current, data.product_id, { 
          format: "CODE128", 
          displayValue: false, 
          height: 25, 
          width: 2, 
          margin: 0 
        }); 
      } catch (e) { console.error(e); }
    }
  }, [data]);

  const handleDownloadPDF = async () => {
    if (!labelRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(labelRef.current, { 
        scale: 4, 
        useCORS: true, 
        backgroundColor: '#ffffff' 
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [2.4, 3.9] });
      pdf.addImage(imgData, 'PNG', 0, 0, 2.4, 3.9);
      pdf.save(`Label-${data.product_id}.pdf`);
    } catch (error) {
      alert("Failed to generate PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-sm overflow-hidden flex flex-col max-h-screen shadow-2xl">
        <div className="p-4 border-b flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-800">Label Preview</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowBrand(!showBrand)} className={`flex items-center justify-center gap-1 text-xs font-bold p-2 rounded ${showBrand ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              {showBrand ? <ToggleRight size={18} /> : <ToggleLeft size={18} />} Brand
            </button>
            <button onClick={() => setShowDate(!showDate)} className={`flex items-center justify-center gap-1 text-xs font-bold p-2 rounded ${showDate ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              {showDate ? <Eye size={18} /> : <EyeOff size={18} />} Date
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center">
          {/* THE EXACT ORIGINAL LABEL TEMPLATE */}
          <div ref={labelRef} className="flex flex-col justify-between items-center text-center bg-white shadow-xl relative" style={{ width: '2.4in', height: '3.9in', padding: '0.1in', boxSizing: 'border-box' }}>
            <div className="w-full border-b-2 border-black pb-1 h-10 flex items-center justify-center">
              {showBrand && <div className="font-black text-xl tracking-tighter uppercase">KSF NON WOVEN</div>}
            </div>
            
            <div className="w-full grid grid-cols-2 gap-y-1 text-left px-1 flex-1 content-center">
              <div><span className="text-[10px] uppercase font-bold text-gray-500 block">Quality</span><span className="font-bold text-lg leading-none">{data.quality}</span></div>
              <div className="text-right"><span className="text-[10px] uppercase font-bold text-gray-500 block">Color</span><span className="font-bold text-lg leading-none">{data.color}</span></div>
              <div><span className="text-[10px] uppercase font-bold text-gray-500 block">Size (in)</span><span className="font-bold text-lg leading-none">{data.width_inches}"</span></div>
              <div className="text-right"><span className="text-[10px] uppercase font-bold text-gray-500 block">Length</span><span className="font-bold text-lg leading-none">{data.length_meters}m</span></div>
              <div className="col-span-2 text-center mt-1"><span className="text-[10px] uppercase font-bold text-gray-500 block">GSM</span><span className="font-bold text-2xl leading-none">{data.gsm}</span></div>
            </div>
            
            <div className="w-full border-y-2 border-black py-2 my-1 flex justify-between items-end px-1">
              <div className="text-left"><span className="text-[10px] uppercase font-bold block">Gross Wt</span><span className="text-sm font-bold">{data.gross_weight} kg</span></div>
              <div className="text-right"><span className="text-[10px] uppercase font-bold block text-gray-500">Net Weight</span><span className="text-4xl font-black leading-none">{data.net_weight}<span className="text-lg">kg</span></span></div>
            </div>
            
            <div className="w-full flex flex-col items-center overflow-hidden pb-6">
              <canvas ref={canvasRef} className="max-w-full h-8 mb-1"></canvas>
              <div className="font-mono font-bold text-lg tracking-widest leading-none mt-1">{data.product_id}</div>
              {showDate && <div className="text-[8px] text-gray-500 mt-1 leading-none">{new Date().toLocaleString()}</div>}
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex gap-2 border-t">
          <button onClick={handleDownloadPDF} disabled={isGenerating} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold shadow flex justify-center gap-2 items-center">
            {isGenerating ? 'Saving...' : <><Printer size={18} /> Save PDF</>}
          </button>
          <button onClick={onClose} className="flex-1 bg-white border text-gray-700 py-3 rounded-lg font-bold">Close</button>
        </div>
      </div>
    </div>
  );
};

export default LabelPrint;