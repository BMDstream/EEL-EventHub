"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { CheckCircle2, XCircle, Camera, Loader2 } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => Promise<void>;
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error" | "processing">("idle");
  const [message, setMessage] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (scanning) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scannerRef.current.render(
        async (decodedText) => {
          if (status === "processing") return;
          
          setScanning(false);
          setStatus("processing");
          setMessage("Authenticating credential...");
          
          try {
            await onScan(decodedText);
            setStatus("success");
            setMessage("Check-in Successful");
            setTimeout(() => setStatus("idle"), 3000);
          } catch (err) {
            setStatus("error");
            setMessage(err instanceof Error ? err.message : "Invalid or already used credential");
            setTimeout(() => setStatus("idle"), 4000);
          } finally {
            if (scannerRef.current) {
              scannerRef.current.clear();
            }
          }
        },
        (error) => {
          // ignore scan errors
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [scanning, onScan]);

  return (
    <div className="flex flex-col items-center gap-8 py-10">
      {!scanning && status === "idle" && (
        <button
          onClick={() => setScanning(true)}
          className="flex flex-col items-center gap-6 p-16 rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-200 hover:border-yellow-400 hover:bg-yellow-50/30 transition-all group w-full max-w-md"
        >
          <div className="p-6 bg-white rounded-3xl shadow-xl group-hover:scale-110 transition-transform">
            <Camera size={48} className="text-slate-400 group-hover:text-yellow-500" />
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-[#0f172a] uppercase tracking-tighter italic font-bricolage">Initialize Scanner</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Ready for live check-in</p>
          </div>
        </button>
      )}

      {scanning && (
        <div className="w-full max-w-md overflow-hidden rounded-[2.5rem] shadow-2xl border-4 border-yellow-400 relative">
          <div id="qr-reader" className="w-full"></div>
          <button 
            onClick={() => setScanning(false)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 hover:bg-black text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all z-20"
          >
            Cancel Session
          </button>
        </div>
      )}

      {status !== "idle" && (
        <div className={`flex flex-col items-center gap-6 p-12 rounded-[3rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300 ${
          status === "success" ? "bg-green-500 text-white" : 
          status === "error" ? "bg-red-500 text-white" : 
          "bg-[#0f172a] text-white"
        }`}>
          {status === "processing" && <Loader2 className="animate-spin" size={64} />}
          {status === "success" && <CheckCircle2 size={64} />}
          {status === "error" && <XCircle size={64} />}
          
          <div className="text-center">
             <p className="text-2xl font-black italic uppercase tracking-tighter font-bricolage">{message}</p>
             {status !== "processing" && (
               <button 
                 onClick={() => setStatus("idle")}
                 className="mt-6 px-8 py-3 bg-white/20 hover:bg-white/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
               >
                 Dismiss
               </button>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
