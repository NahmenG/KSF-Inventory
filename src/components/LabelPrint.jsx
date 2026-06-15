import React, { useRef, useState } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import { X, Printer, ToggleRight, ToggleLeft, Eye, EyeOff, Loader2 } from 'lucide-react';

const LabelPrint = ({ data, onClose }) => {
  const labelRef = useRef(null);
  const [showBrand, setShowBrand] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true); 
    
    // Allow UI to update before blocking the thread
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      // 1. Create a strictly formatted 3.9in x 2.4in PDF document
      const doc = new jsPDF({ 
        orientation: 'landscape', 
        unit: 'in', 
        format: [3.9, 2.4] 
      });

      // --- BRAND HEADER ---
      if (showBrand) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("KSF Non-Woven", 1.95, 0.28, { align: "center" });
      }

      // Horizontal Border Under Brand
      doc.setLineWidth(0.015);
      doc.line(0.1, 0.38, 3.8, 0.38);

      // Vertical Splitter Border (60% / 40%)
      doc.line(2.35, 0.38, 2.35, 2.3);

      // --- LEFT COLUMN: DATA GRID ---
      const leftX = 0.15;
      const rightX = 2.25;

      // Row 1: Quality & Color
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("QUALITY", leftX, 0.55);
      doc.text("COLOR", rightX, 0.55, { align: "right" });

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(data.quality || '', leftX, 0.72);
      doc.text(data.color || '', rightX, 0.72, { align: "right" });

      // Row 2: Size & Length
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("SIZE (IN)", leftX, 0.95);
      doc.text("LENGTH", rightX, 0.95, { align: "right" });

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(data.width_inches ? `${data.width_inches}"` : '', leftX, 1.12);
      doc.text(data.length_meters ? `${data.length_meters}m` : '', rightX, 1.12, { align: "right" });

      // Horizontal Partition for Bottom Half
      doc.line(leftX, 1.35, rightX, 1.35);

      // Row 3: GSM & Gross Wt
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("GSM", leftX, 1.55);
      doc.text("GROSS WT", rightX, 1.55, { align: "right" });

      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(data.gsm ? data.gsm.toString() : '', leftX, 1.8);

      doc.setFontSize(12);
      doc.text(data.gross_weight ? `${data.gross_weight} kg` : '', rightX, 1.78, { align: "right" });

      // Row 4: Net Weight
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("NET WEIGHT", 1.2, 2.05, { align: "center" });

      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text(data.net_weight ? `${data.net_weight} kg` : '', 1.2, 2.3, { align: "center" });

      // --- RIGHT COLUMN: QR & ID ---
      const rightCenter = 3.125;

      // Extract the pixel-perfect QR Code from the hidden canvas
      const qrCanvas = document.getElementById('hidden-qr-canvas');
      if (qrCanvas) {
        const qrDataUrl = qrCanvas.toDataURL('image/png');
        // Place 1.1 inch image perfectly centered in right column
        doc.addImage(qrDataUrl, 'PNG', 2.575, 0.45, 1.1, 1.1);
      }

      // Product ID
      doc.setFont("courier", "bold");
      doc.setFontSize(12);
      doc.text(data.product_id || '', rightCenter, 1.8, { align: "center" });

      // Date
      if (showDate) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        const dateStr = data.created_at ? new Date(data.created_at).toLocaleString('en-IN', {dateStyle:'short', timeStyle:'short'}) : new Date().toLocaleString();
        doc.text(dateStr, rightCenter, 2.05, { align: "center" });
      }

      doc.save(`Label-${data.product_id}.pdf`);
      setIsGenerating(false);

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
        
        {/* Hidden high-res canvas strictly for the jsPDF engine to harvest the QR code */}
        <div className="absolute left-[-9999px]">
          <QRCodeCanvas 
            id="hidden-qr-canvas"
            value={qrPayload} 
            size={400} 
            level="L" 
            includeMargin={true}
          />
        </div>

        <div className="flex-1 overflow-auto bg-gray-200/50 p-6 flex justify-center items-center">
          {/* UI Preview wrapper remains entirely untouched */}
          <div 
            ref={labelRef} 
            className="flex flex-col bg-white shadow-xl relative" 
            style={{ width: '3.9in', height: '2.4in', padding: '0.05in 0.1in 0.25in 0.1in', boxSizing: 'border-box' }}
          >
            {/* FULL WIDTH BRAND HEADER */}
            <div className="w-full border-b-2 border-black pb-1.5 mb-1 shrink-0 flex items-center justify-center">
              {showBrand ? (
                <div className="font-black text-xl tracking-tighter">KSF Non-Woven</div>
              ) : (
                <div className="w-full h-7"></div>
              )}
            </div>

            {/* TWO COLUMN WRAPPER */}
            <div className="flex-1 w-full flex flex-row overflow-hidden">
              {/* LEFT COLUMN: 60% Width for all Text Data */}
              <div className="w-[60%] border-r-2 border-black pr-2 flex flex-col h-full">
                
                {/* Data Grid */}
                <div className="w-full grid grid-cols-2 gap-y-0 text-left flex-1 content-start mt-0.5">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-tighter">Quality</span>
                    <span className="font-bold text-sm block whitespace-nowrap -mt-0.5">{data.quality}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-tighter">Color</span>
                    <span className="font-bold text-sm block whitespace-nowrap -mt-0.5">{data.color}</span>
                  </div>
                  
                  <div className="mt-1">
                    <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-tighter">Size (in)</span>
                    <span className="font-bold text-sm block whitespace-nowrap -mt-0.5">{data.width_inches}"</span>
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-tighter">Length</span>
                    <span className="font-bold text-sm block whitespace-nowrap -mt-0.5">{data.length_meters}m</span>
                  </div>
                </div>

                {/* Bottom section of left column for GSM and Weights */}
                <div className="w-full mt-auto flex flex-col justify-end">
                  <div className="border-t-2 border-black pt-1 mb-0.5 flex items-end justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-tighter mb-0">GSM</span>
                      <span className="font-bold text-2xl block -mt-0.5">{data.gsm}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-tighter mb-0">Gross Wt</span>
                      <span className="font-bold text-sm block -mt-0.5">{data.gross_weight} kg</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block mb-0">Net Weight</span>
                    <span className="text-2xl font-black text-black block -mt-1.5">{data.net_weight}<span className="text-xs">kg</span></span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: 40% Width strictly dedicated to QR Code and ID */}
              <div className="w-[40%] pl-2 flex flex-col items-center justify-center h-full overflow-hidden">
                <QRCodeSVG 
                  value={qrPayload} 
                  size={110} 
                  level="L" 
                  includeMargin={true}
                  className="mb-2 bg-white"
                />
                <div className="font-mono font-bold text-[14px] tracking-widest text-center uppercase">{data.product_id}</div>
                {showDate && (
                  <div className="text-[8px] text-gray-400 font-bold mt-1.5 text-center uppercase">
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