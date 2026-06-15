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
        scale: 4, // Extremely high resolution for thermal clarity
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
          
          // Force the hardware format to strictly 3.9in x 2.4in
          const pdf = new jsPDF({ 
            orientation: 'landscape', 
            unit: 'in', 
            format: [3.9, 2.4] 
          });

          // Map the mathematically perfect pixel canvas directly to the inch-based PDF
          pdf.addImage(base64data, 'JPEG', 0, 0, 3.9, 2.4, undefined, 'SLOW');
          pdf.save(`Label-${data.product_id}.pdf`);
          
          canvas.width = 0;
          canvas.height = 0;
          setIsGenerating(false);
        };
      }, 'image/jpeg', 1.0);

    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Error generating PDF. Please try again.");
      setIsGenerating(false);
    }
  };

  if (!data) return null;

  // JSON payload for third-party scanning
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
      <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        <div className="p-4 border-b flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-800 tracking-tighter uppercase">Label Preview (Landscape)</h2>
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
        
        <div className="flex-1 overflow-auto bg-gray-200/50 p-6 flex justify-center items-center font-sans">
          {/* FIX: Using strict pixels (390x240) instead of inches. Added 16px bottom padding to guarantee Net Weight clearance */}
          <div 
            ref={labelRef} 
            className="flex flex-col bg-white shadow-xl relative" 
            style={{ width: '390px', height: '240px', padding: '10px 10px 16px 10px', boxSizing: 'border-box', fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {/* FULL WIDTH BRAND HEADER */}
            <div className="w-full border-b-2 border-black pb-1 mb-1 shrink-0 flex items-center justify-center">
              {showBrand ? (
                <div className="font-black text-[22px] tracking-tighter leading-none">KSF Non-Woven</div>
              ) : (
                <div className="w-full h-[22px]"></div>
              )}
            </div>

            {/* TWO COLUMN WRAPPER */}
            <div className="flex-1 w-full flex flex-row overflow-hidden">
              {/* LEFT COLUMN: 60% Width for all Text Data */}
              <div className="w-[60%] border-r-2 border-black pr-2 flex flex-col h-full">
                
                {/* Data Grid */}
                <div className="w-full grid grid-cols-2 gap-y-0 text-left flex-1 content-start mt-0.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter">Quality</span>
                    <span className="font-bold text-[15px] block whitespace-nowrap -mt-0.5">{data.quality}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter">Color</span>
                    <span className="font-bold text-[15px] block whitespace-nowrap -mt-0.5">{data.color}</span>
                  </div>
                  
                  <div className="mt-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter">Size (in)</span>
                    <span className="font-bold text-[15px] block whitespace-nowrap -mt-0.5">{data.width_inches}"</span>
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter">Length</span>
                    <span className="font-bold text-[15px] block whitespace-nowrap -mt-0.5">{data.length_meters}m</span>
                  </div>
                </div>

                {/* Bottom section of left column for GSM and Weights */}
                <div className="w-full mt-auto flex flex-col justify-end">
                  <div className="border-t-2 border-black pt-1 mb-1 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter mb-0">GSM</span>
                      <span className="font-bold text-[24px] block leading-none">{data.gsm}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tighter mb-0">Gross Wt</span>
                      <span className="font-bold text-[14px] block leading-none">{data.gross_weight} kg</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block mb-0">Net Weight</span>
                    <span className="text-[26px] font-black text-black block leading-none -mt-1">{data.net_weight}<span className="text-[12px]">kg</span></span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: 40% Width strictly dedicated to QR Code and ID */}
              <div className="w-[40%] pl-2 flex flex-col items-center justify-center h-full overflow-hidden">
                <QRCodeCanvas 
                  value={qrPayload} 
                  size={105} 
                  level="L" 
                  includeMargin={true}
                  className="mb-1.5 bg-white"
                />
                <div className="font-mono font-bold text-[14px] tracking-widest text-center uppercase leading-none">{data.product_id}</div>
                {showDate && (
                  <div className="text-[8px] text-gray-400 font-bold mt-1.5 text-center uppercase leading-none">
                    {data.created_at ? new Date(data.created_at).toLocaleString('en-IN', {dateStyle:'short', timeStyle:'short'}) : new Date().toLocaleString()}
                  </div>
                )}
              </div>
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