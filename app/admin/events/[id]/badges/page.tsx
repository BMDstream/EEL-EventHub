"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  ArrowLeft, Printer, Loader2, CheckCircle2, 
  AlertCircle, Search, ToggleLeft, ToggleRight,
  User, Building2, CheckSquare, Square
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function BadgePrintPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [event, setEvent] = useState<any>(null);
  const [registrants, setRegistrants] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [badgeSize, setBadgeSize] = useState<"portrait" | "landscape">("portrait");

  // Load Event and Registrations
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user?.email) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch Event Details
        const eventRes = await fetch(`/api/py/events/id/${id}`, {
          headers: { "x-user-email": session.user.email }
        });
        if (!eventRes.ok) throw new Error("Failed to load event details");
        const eventData = await eventRes.json();
        setEvent(eventData);

        // Fetch Event Registrations
        const regRes = await fetch(`/api/py/events/${id}/registrations`, {
          headers: { "x-user-email": session.user.email }
        });
        if (!regRes.ok) throw new Error("Failed to load registrants");
        const regData = await regRes.json();
        
        // Only include confirmed attendees by default
        const confirmedRegs = regData.filter((r: any) => r.status === "confirmed");
        setRegistrants(confirmedRegs);
        
        // Select all by default
        setSelectedIds(new Set(confirmedRegs.map((r: any) => String(r.id))));
        
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, session, sessionStatus]);

  // Auth checking
  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white space-y-4 flex-col">
        <Loader2 className="animate-spin text-yellow-500" size={48} />
        <p className="font-semibold text-slate-400">Loading attendee badges...</p>
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white flex-col space-y-4">
        <AlertCircle className="text-red-500" size={64} />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-slate-400">Please sign in to access badge printer dashboard.</p>
        <Link href="/login" className="bg-yellow-500 text-slate-900 px-6 py-2 rounded-xl font-bold hover:bg-yellow-400">
          Sign In
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white flex-col space-y-4">
        <AlertCircle className="text-red-500" size={64} />
        <h1 className="text-2xl font-bold">Error Loading Badges</h1>
        <p className="text-slate-400">{error}</p>
        <Link href={`/admin/events/${id}`} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-700">
          Back to Event
        </Link>
      </div>
    );
  }

  // Filtered List
  const filteredRegistrants = registrants.filter((r) => {
    const name = `${r.attendee?.first_name || ""} ${r.attendee?.last_name || ""}`.toLowerCase();
    const company = (r.attendee?.company || "").toLowerCase();
    const email = (r.attendee?.email || "").toLowerCase();
    const pin = (r.pin || "").toLowerCase();
    
    return name.includes(searchTerm.toLowerCase()) || 
           company.includes(searchTerm.toLowerCase()) || 
           email.includes(searchTerm.toLowerCase()) ||
           pin.includes(searchTerm.toLowerCase());
  });

  const toggleSelect = (regId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(regId)) {
      newSelected.delete(regId);
    } else {
      newSelected.add(regId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRegistrants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRegistrants.map(r => String(r.id))));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative">
      {/* ⚠️ PRINT STYLES */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the print container */
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          /* Custom layout styling for portrait 3"x4" labels */
          .badge-card-portrait {
            width: 3in !important;
            height: 4in !important;
            border: 1px solid #e2e8f0 !important;
            padding: 0.25in !important;
            margin: 0 auto !important;
            page-break-after: always !important;
            break-after: page !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
            background: white !important;
            color: black !important;
            box-sizing: border-box !important;
          }
          /* Custom layout styling for landscape 4"x3" labels */
          .badge-card-landscape {
            width: 4in !important;
            height: 3in !important;
            border: 1px solid #e2e8f0 !important;
            padding: 0.25in !important;
            margin: 0 auto !important;
            page-break-after: always !important;
            break-after: page !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            background: white !important;
            color: black !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* DASHBOARD CONTROL PANEL (Hidden on Print) */}
      <div className="max-w-7xl mx-auto space-y-8 no-print">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link 
            href={`/admin/events/${id}`} 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-semibold"
          >
            <ArrowLeft size={18} />
            Back to Command Center
          </Link>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 text-xs font-black text-yellow-500 uppercase tracking-widest">
            Badge Printer Console
          </div>
        </div>

        {/* Title Block */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 md:p-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-yellow-500">Physical Check-In Upgrade</span>
              <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight mt-1 text-white font-bricolage">
                Print Attendees Badges
              </h1>
              <p className="text-slate-400 font-medium mt-1 max-w-xl text-sm">
                Scale layout formats, filter guest list records, and trigger browser print dialogs directly to Zebra or Brother thermal badge label printers.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Size Selector */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-1.5 flex gap-1">
                <button
                  onClick={() => setBadgeSize("portrait")}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${badgeSize === "portrait" ? "bg-yellow-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
                >
                  Portrait (3x4")
                </button>
                <button
                  onClick={() => setBadgeSize("landscape")}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${badgeSize === "landscape" ? "bg-yellow-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
                >
                  Landscape (4x3")
                </button>
              </div>

              {/* Print Trigger */}
              <button
                onClick={handlePrint}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black px-6 py-4 rounded-2xl transition-all shadow-xl shadow-yellow-500/10 uppercase tracking-wider text-xs"
              >
                <Printer size={18} />
                Print Selected ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>

        {/* Content Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List panel (Left 2 columns) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Search and Selection Headers */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Search name, company, email, PIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none text-slate-100 text-sm font-semibold transition-all placeholder:text-slate-600"
                />
              </div>

              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2.5 hover:text-yellow-500 text-slate-400 text-xs font-black uppercase tracking-wider transition-colors"
              >
                {selectedIds.size === filteredRegistrants.length ? (
                  <>
                    <CheckSquare size={18} className="text-yellow-500" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square size={18} />
                    Select All ({filteredRegistrants.length})
                  </>
                )}
              </button>
            </div>

            {/* Attendee Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredRegistrants.length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
                  <User className="text-slate-600 mx-auto mb-3" size={36} />
                  <p className="text-slate-500 font-bold text-sm">No confirmed registrants match search term</p>
                </div>
              ) : (
                filteredRegistrants.map((reg) => {
                  const isSelected = selectedIds.has(String(reg.id));
                  return (
                    <div
                      key={reg.id}
                      onClick={() => toggleSelect(String(reg.id))}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${isSelected ? "bg-slate-900 border-yellow-500/50 shadow-lg shadow-yellow-500/2" : "bg-slate-900/30 border-slate-800/80 hover:border-slate-700"}`}
                    >
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-100 text-sm">
                          {reg.attendee?.first_name} {reg.attendee?.last_name}
                        </h3>
                        <p className="text-slate-500 font-bold text-[10px] flex items-center gap-1.5 uppercase tracking-wide">
                          <Building2 size={12} />
                          {reg.attendee?.company || "No Company"}
                        </p>
                        <p className="text-slate-500 font-semibold text-[10px] uppercase tracking-wide">
                          PIN: <span className="text-slate-300 font-black italic">{reg.pin}</span>
                        </p>
                      </div>
                      <div className="pointer-events-none">
                        {isSelected ? (
                          <CheckCircle2 className="text-yellow-500" size={20} />
                        ) : (
                          <div className="w-5 h-5 border-2 border-slate-800 rounded-full" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Live Preview Sidebar (Right 1 column) */}
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 space-y-6 flex flex-col items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest self-start">Live Badge Mockup</h3>
            
            {/* Live mockup frame */}
            {selectedIds.size > 0 ? (
              (() => {
                const previewReg = registrants.find(r => selectedIds.has(String(r.id)));
                if (!previewReg) return null;
                
                return (
                  <div 
                    className={`bg-white text-slate-950 p-6 rounded-2xl shadow-2xl flex flex-col items-center border border-slate-200 transition-all ${badgeSize === "portrait" ? "w-60 h-80 justify-between" : "w-80 h-60 justify-between flex-row p-8"}`}
                  >
                    {badgeSize === "portrait" ? (
                      <>
                        <div className="text-center space-y-1 mt-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">BMD EventHub</div>
                          <h2 className="text-xl font-black uppercase italic tracking-tight font-bricolage leading-none mt-1">
                            {previewReg.attendee?.first_name} {previewReg.attendee?.last_name}
                          </h2>
                          <div className="text-xs font-bold text-slate-500">{previewReg.attendee?.company || "No Company"}</div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <QRCodeSVG 
                            value={previewReg.pin || String(previewReg.id)} 
                            size={100}
                            level="M"
                          />
                        </div>

                        <div className="text-center mb-2 space-y-0.5">
                          <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Access PIN</div>
                          <div className="text-lg font-black italic tracking-tighter text-slate-800">{previewReg.pin}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2 max-w-[50%]">
                          <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">BMD EventHub</div>
                          <h2 className="text-lg font-black uppercase italic tracking-tight font-bricolage leading-none">
                            {previewReg.attendee?.first_name}<br />{previewReg.attendee?.last_name}
                          </h2>
                          <div className="text-[10px] font-bold text-slate-500">{previewReg.attendee?.company || "No Company"}</div>
                          
                          <div className="pt-2 border-t border-slate-100 mt-2">
                            <div className="text-[7px] font-black uppercase tracking-widest text-slate-400">Access PIN</div>
                            <div className="text-sm font-black italic tracking-tighter text-slate-800">{previewReg.pin}</div>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-center">
                          <QRCodeSVG 
                            value={previewReg.pin || String(previewReg.id)} 
                            size={100}
                            level="M"
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="w-full h-80 rounded-2xl border border-dashed border-slate-850 flex items-center justify-center text-slate-600 text-xs font-bold text-center p-6">
                Select an attendee to preview label mockup
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRINT AREA (Strictly Hidden on Screen, Visible on Print via @media print stylesheet) */}
      <div className="print-area hidden">
        {registrants
          .filter(r => selectedIds.has(String(r.id)))
          .map((reg) => (
            <div 
              key={reg.id} 
              className={badgeSize === "portrait" ? "badge-card-portrait" : "badge-card-landscape"}
            >
              {badgeSize === "portrait" ? (
                <>
                  <div style={{ textAlign: "center", width: "100%" }}>
                    <div style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b" }}>
                      BMD EventHub
                    </div>
                    <h2 style={{ fontSize: "20px", fontWeight: "900", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.05em", color: "#0f172a", margin: "8px 0 2px 0", lineHeight: "1.1" }}>
                      {reg.attendee?.first_name} {reg.attendee?.last_name}
                    </h2>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                      {reg.attendee?.company || "No Company"}
                    </div>
                  </div>

                  <div style={{ border: "1px solid #f1f5f9", padding: "8px", borderRadius: "12px", backgroundColor: "#f8fafc" }}>
                    <QRCodeSVG 
                      value={reg.pin || String(reg.id)} 
                      size={140}
                      level="M"
                    />
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "8px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.2em", color: "#64748b" }}>
                      Access PIN
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: "900", fontStyle: "italic", letterSpacing: "-0.05em", color: "#1e293b", marginTop: "2px" }}>
                      {reg.pin}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", maxWidth: "60%" }}>
                    <div style={{ fontSize: "9px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b" }}>
                      BMD EventHub
                    </div>
                    <h2 style={{ fontSize: "18px", fontWeight: "900", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.05em", color: "#0f172a", margin: "6px 0 2px 0", lineHeight: "1.1" }}>
                      {reg.attendee?.first_name}<br />{reg.attendee?.last_name}
                    </h2>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>
                      {reg.attendee?.company || "No Company"}
                    </div>
                    
                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "6px" }}>
                      <div style={{ fontSize: "7px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b" }}>
                        Access PIN
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "900", fontStyle: "italic", letterSpacing: "-0.05em", color: "#1e293b" }}>
                        {reg.pin}
                      </div>
                    </div>
                  </div>

                  <div style={{ border: "1px solid #f1f5f9", padding: "8px", borderRadius: "12px", backgroundColor: "#f8fafc" }}>
                    <QRCodeSVG 
                      value={reg.pin || String(reg.id)} 
                      size={130}
                      level="M"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
