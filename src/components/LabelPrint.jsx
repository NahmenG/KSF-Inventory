import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { X, Printer } from 'lucide-react';

const LabelPrint = ({ data, onClose }) => {
  const canvasRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    if (data && canvasRef.current) {
      JsBarcode(canvasRef.current, data.product_id, { format: "CODE128", height: 25, width: 2, margin: 0 });
    }
  }, [data]);

  const downloadPDF = async () => {
    const canvas = await html2canvas(labelRef.current, { scale: 4 });
    const pdf = new jsPDF({ format: [2.4, 3.9], unit: 'in' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 2.4, 3.9);
    pdf.save(`Label-${data.product_id}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-4 rounded-xl shadow-2xl space-y-4 max-w-sm w-full">
        <div className="flex justify-between items-center"><h3 className="font-bold">Label Ready</h3><button onClick={onClose}><X/></button></div>
        <div ref={labelRef} className="border p-2 flex flex-col items-center text-center space-y-2">
            <div className="font-black text-xl">KSF NON WOVEN</div>
            <div className="grid grid-cols-2 w-full text-xs border-y py-1">
                <span>QUAL: {data.quality}</span>
                <span>GSM: {data.gsm}</span>
            </div>
            <div className="text-3xl font-black">{data.net_weight} KG</div>
            <canvas ref={canvasRef}></canvas>
            <div className="text-sm font-mono">{data.product_id}</div>
        </div>
        <button onClick={downloadPDF} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex justify-center gap-2"><Printer/> Download PDF for Zebra</button>
      </div>
    </div>
  );
};

export default LabelPrint;