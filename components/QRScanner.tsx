"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle2, XCircle, Camera, Loader2, AlertCircle } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => Promise<void>;
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error" | "processing" | "loading" | "warning">("idle");
  const [message, setMessage] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let currentScanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        setStatus("loading");
        currentScanner = new Html5Qrcode("qr-reader");
        scannerRef.current = currentScanner;

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0 
        };

        await currentScanner.start(
          { facingMode: "environment" },
          config,
          async (decodedText) => {
            // Success callback
            if (status === "processing") return;
            
            // Stop scanning immediately on success to prevent multiple reads
            try {
              if (currentScanner?.isScanning) {
                await currentScanner.stop();
              }
            } catch (e) {
              console.error("Failed to stop scanner after detection", e);
            }

            setScanning(false);
            setStatus("processing");
            setMessage("Authenticating credential...");
            
            try {
              await onScan(decodedText);
              setStatus("success");
              setMessage("Check-in Successful");
              setTimeout(() => setStatus("idle"), 3000);
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : "Invalid or already used credential";
              if (errMsg.toLowerCase().includes("already checked in")) {
                setStatus("warning");
                setMessage(errMsg);
              } else {
                setStatus("error");
                setMessage(errMsg);
              }
              setTimeout(() => setStatus("idle"), 4000);
            }
          },
          (errorMessage) => {
            // Ignore common scan errors (e.g. no QR in frame)
          }
        );
        
        setStatus("idle");
      } catch (err) {
        console.error("Failed to start scanner", err);
        setScanning(false);
        setStatus("error");
        setMessage("Camera Access Denied or Unavailable");
      }
    };

    if (scanning) {
      startScanner();
    }

    return () => {
      if (currentScanner) {
        if (currentScanner.isScanning) {
          currentScanner.stop().catch(err => console.error("Failed to stop scanner on cleanup", err));
        }
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
        <div className="w-full max-w-md overflow-hidden rounded-[2.5rem] shadow-2xl border-4 border-yellow-400 relative bg-black aspect-square flex items-center justify-center">
          <style dangerouslySetInnerHTML={{ __html: `
            #qr-reader {
              border: none !important;
            }
            #qr-reader video {
              object-fit: cover !important;
              width: 100% !important;
              height: 100% !important;
            }
          `}} />
          <div id="qr-reader" className="w-full h-full"></div>
          
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm z-30 text-white">
               <Loader2 className="animate-spin mb-4" size={48} />
               <p className="text-[10px] font-black uppercase tracking-widest">Waking Camera...</p>
            </div>
          )}

          <button 
            onClick={() => {
              if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().finally(() => setScanning(false));
              } else {
                setScanning(false);
              }
            }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 hover:bg-black text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all z-20 backdrop-blur-md border border-white/10"
          >
            Cancel Session
          </button>
        </div>
      )}

      {(status === "success" || status === "error" || status === "processing" || status === "warning") && (
        <div className={`flex flex-col items-center gap-6 p-12 rounded-[3rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300 ${
          status === "success" ? "bg-green-500 text-white" : 
          status === "error" ? "bg-red-500 text-white" : 
          status === "warning" ? "bg-red-500 text-white" :
          "bg-[#0f172a] text-white"
        }`}>
          {status === "processing" && <Loader2 className="animate-spin" size={64} />}
          {status === "success" && <CheckCircle2 size={64} />}
          {status === "error" && <XCircle size={64} />}
          {status === "warning" && <AlertCircle size={64} />}
          
          <div className="text-center">
             <p className="text-2xl font-black italic uppercase tracking-tighter font-bricolage leading-tight">{message}</p>
             {status !== "processing" && (
               <button 
                 onClick={() => setStatus("idle")}
                 className={`mt-8 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                   status === "warning" ? "bg-white/20 hover:bg-white/30 border-white/10" : "bg-white/20 hover:bg-white/30 border-white/10"
                 }`}
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

