import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { X, Printer, ToggleRight, ToggleLeft, Eye, EyeOff, Loader2 } from 'lucide-react';

const LabelPrint = ({ data, onClose }) => {
  const labelRef = useRef(null);
  const [showBrand, setShowBrand] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    if (!labelRef.current || isGenerating) return;
    setIsGenerating(true); 
    
    // Allow UI to update before blocking the thread
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const canvas = await html2canvas(labelRef.current, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: true
      });
      
      canvas.toBlob(async (blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result;
          const pdf = new jsPDF({ 
            orientation: 'portrait', 
            unit: 'in', 
            format: [2.4, 3.9] 
          });

          pdf.addImage(base64data, 'JPEG', 0, 0, 2.4, 3.9, undefined, 'SLOW');
          pdf.save(`Label-${data.product_id}.pdf`);
          
          canvas.width = 0;
          canvas.height = 0;
          setIsGenerating(false);
        };
      }, 'image/jpeg', 0.8);

    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Error generating PDF. Please try again.");
      setIsGenerating(false);
    }
  };

  if (!data) return null;

  // JSON payload for third-party scanning (Customer Name is excluded)
  const qrPayload = JSON.stringify({
    id: data.product_id,
    q: data.quality,
    gsm: data.gsm,
    c: data.color,
    w: data.width_inches,
    l: data.length_meters,
    nw: data.net_weight,
    gw: data.gross_weight
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        <div className="p-4 border-b flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-800 tracking-tighter uppercase">Label Preview</h2>
            <button onClick={onClose} disabled={isGenerating} className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-20 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowBrand(!showBrand)} className={`flex items-center justify-center gap-2 text-xs font-bold p-2.5 rounded-xl transition-all ${showBrand ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-gray-100 text-gray-500'}`}>
              {showBrand ? <ToggleRight size={18} /> : <ToggleLeft size={18} />} Brand
            </button>
            <button onClick={() => setShowDate(!showDate)} className={`flex items-center justify-center gap-2 text-xs font-bold p-2.5 rounded-xl transition-all ${showDate ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-gray-100 text-gray-500'}`}>
              {showDate ? <Eye size={18} /> : <EyeOff size={18} />} Date
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-gray-200/50 p-6 flex justify-center items-start">
          <div 
            ref={labelRef} 
            className="flex flex-col justify-between items-center text-center bg-white shadow-xl relative" 
            style={{ width: '2.4in', height: '3.9in', padding: '0.1in', boxSizing: 'border-box' }}
          >
            {/* Header: Squeezed height and margins */}
            <div className="w-full border-b-2 border-black pb-0.5 h-8 flex items-center justify-center">
              {showBrand ? (
                <div className="font-black text-xl tracking-tighter uppercase leading-none">KSF NON WOVEN</div>
              ) : (
                <div className="w-full h-full"></div>
              )}
            </div>
            
            {/* Data Grid: Added min-w-0 and block truncate to strictly prevent wrapping */}
            <div className="w-full grid grid-cols-2 gap-y-0.5 text-left px-1 mt-1">
              <div className="min-w-0"><span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter leading-none">Quality</span><span className="font-bold text-lg leading-none block truncate">{data.quality}</span></div>
              <div className="text-right min-w-0"><span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter leading-none">Color</span><span className="font-bold text-lg leading-none block truncate">{data.color}</span></div>
              <div className="min-w-0"><span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter leading-none">Size (in)</span><span className="font-bold text-lg leading-none block truncate">{data.width_inches}"</span></div>
              <div className="text-right min-w-0"><span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter leading-none">Length</span><span className="font-bold text-lg leading-none block truncate">{data.length_meters}m</span></div>
              
              <div className="col-span-2 text-center mt-0.5"><span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter leading-none">GSM</span><span className="font-bold text-2xl leading-none">{data.gsm}</span></div>
            </div>
            
            <div className="w-full border-y-2 border-black py-1 my-0.5 flex justify-between items-end px-1">
              <div className="text-left leading-none"><span className="text-[10px] uppercase font-bold block leading-none">Gross Wt</span><span className="text-sm font-bold">{data.gross_weight} kg</span></div>
              <div className="text-right leading-none"><span className="text-[10px] uppercase font-bold block text-gray-400 leading-none">Net Weight</span><span className="text-3xl font-black leading-none">{data.net_weight}<span className="text-base">kg</span></span></div>
            </div>
            
            {/* QR Section: Contains the robust L-level QR code */}
            <div className="w-full flex flex-col items-center justify-end overflow-hidden pb-2 flex-1">
              <QRCodeCanvas 
                value={qrPayload} 
                size={100} 
                level="L" 
                includeMargin={true}
                className="mb-1 bg-white"
              />
              <div className="font-mono font-bold text-[14px] tracking-widest leading-none mt-1 uppercase">{data.product_id}</div>
              {showDate && (
                <div className="text-[8px] text-gray-400 font-bold mt-1 leading-none uppercase">
                  {data.created_at ? new Date(data.created_at).toLocaleString('en-IN', {dateStyle:'short', timeStyle:'short'}) : new Date().toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t flex gap-3">
          <button 
            onClick={handleDownloadPDF} 
            disabled={isGenerating} 
            className={`flex-1 py-4 rounded-2xl font-black text-sm shadow-lg transition-all flex justify-center gap-2 items-center active:scale-95 ${
              isGenerating ? 'bg-blue-300 cursor-not-allowed text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
            }`}
          >
            {isGenerating ? <><Loader2 size={18} className="animate-spin" /> GENERATING...</> : <><Printer size={18} /> SAVE PDF</>}
          </button>
          <button onClick={onClose} disabled={isGenerating} className="flex-1 bg-gray-50 border border-gray-100 text-gray-500 py-4 rounded-2xl font-bold active:scale-95 transition-all hover:bg-gray-100 disabled:opacity-50 uppercase text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabelPrint;