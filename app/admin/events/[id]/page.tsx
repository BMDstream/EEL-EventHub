"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  ArrowLeft, 
  Users, 
  UserX,
  Search,
  Download, 
  Trash2, 
  Calendar, 
  MapPin, 
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  Settings,
  Sparkles,
  ArrowUpRight,
  Eye,
  Upload,
  X,
  RefreshCw
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import FormBuilder from "@/components/FormBuilder";
import QRScanner from "@/components/QRScanner";
import StaffAssignment from "@/components/StaffAssignment";

interface Attendee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company: string | null;
}

interface Registration {
  id: string;
  status: string;
  checked_in: boolean;
  created_at: string;
  custom_answers?: Record<string, any>;
  pin?: string;
  attendee: Attendee;
  checked_in_days?: number[];
}

interface Event {
  id: number;
  slug: string;
  title: string;
  description: string;
  start_date: string;
  location: string;
  address?: string;
  capacity: number;
  custom_fields_schema: any[];
  client?: any;
  duration_days?: number;
}

export default function EventDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "form" ? "form" : "registrants";
  
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";
  const [activeTab, setActiveTab] = useState<"registrants" | "form" | "scanner" | "communications" | "staff">(initialTab as any || "registrants");
  const [pin, setPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinStatus, setPinStatus] = useState<"idle" | "success" | "error" | "processing" | "warning">("idle");
  const [pinMessage, setPinMessage] = useState("");
  const [resendingRegId, setResendingRegId] = useState<string | null>(null);
  const [bulkResending, setBulkResending] = useState(false);
  const [selectedScanDay, setSelectedScanDay] = useState<number | "auto">("auto");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedRegistrants, setParsedRegistrants] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<"date" | "venue" | "enrollment" | "declined" | "checked_in" | null>(null);

  const downloadRegistrantTemplate = () => {
    import("xlsx").then((XLSX) => {
      const customFields = event?.custom_fields_schema || [];
      const customHeaders = customFields.map(f => f.label || f.id);
      const headers = ["first_name", "last_name", "email", "company", ...customHeaders];
      
      const sampleRow1: any = {
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        company: "Acme Corp"
      };
      
      const sampleRow2: any = {
        first_name: "Jane",
        last_name: "Smith",
        email: "jane.smith@example.com",
        company: "Innovate LLC"
      };
      
      // Add blank or option hints for custom questions
      customFields.forEach(f => {
        const headerName = f.label || f.id;
        if (f.type === "select" && f.options && f.options.length > 0) {
          sampleRow1[headerName] = f.options[0];
          sampleRow2[headerName] = f.options[1] || f.options[0];
        } else if (f.type === "checkbox") {
          sampleRow1[headerName] = "True";
          sampleRow2[headerName] = "False";
        } else {
          sampleRow1[headerName] = "";
          sampleRow2[headerName] = "";
        }
      });
      
      const data = [sampleRow1, sampleRow2];
      
      const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "RegistrantsTemplate");
      
      const cols = [
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 }
      ];
      customHeaders.forEach(() => {
        cols.push({ wch: 25 });
      });
      worksheet["!cols"] = cols;
      
      XLSX.writeFile(workbook, `registrants_import_template.xlsx`);
    });
  };

  const handleImportFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        import("xlsx").then((XLSX) => {
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

          const customFields = event?.custom_fields_schema || [];

          const parsed = jsonData.map((row: any) => {
            const email = row.email || row.Email || row.EMAIL || "";
            const first_name = row.first_name || row.First_Name || row.first_name || row.firstName || row.FirstName || "";
            const last_name = row.last_name || row.Last_Name || row.last_name || row.lastName || row.LastName || "";
            const company = row.company || row.Company || row.COMPANY || "";
            
            // Gather custom field answers, mapping the spreadsheet headers to standard schema field IDs
            const standardKeys = ["email", "first_name", "last_name", "company", "Email", "First_Name", "Last_Name", "Company", "EMAIL", "COMPANY", "firstName", "lastName", "FirstName", "LastName"];
            const custom_answers: Record<string, any> = {};
            Object.keys(row).forEach(key => {
              if (!standardKeys.includes(key)) {
                // Check if key matches a label or ID in event.custom_fields_schema
                const matchedField = customFields.find(
                  f => (f.label || "").toLowerCase().trim() === key.toLowerCase().trim() ||
                       f.id.toLowerCase().trim() === key.toLowerCase().trim()
                );
                if (matchedField) {
                  custom_answers[matchedField.id] = row[key];
                } else {
                  custom_answers[key] = row[key];
                }
              }
            });

            return {
              email: email.toString().trim(),
              first_name: first_name.toString().trim(),
              last_name: last_name.toString().trim(),
              company: company.toString().trim(),
              custom_answers
            };
          }).filter(u => u.email !== "");

          if (parsed.length === 0) {
            alert("No valid rows found. Make sure headers are: email, first_name, last_name, company.");
            return;
          }

          setParsedRegistrants(parsed);
        });
      } catch (err) {
        console.error(err);
        alert("Failed to parse file. Make sure it is a valid CSV or Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkRegistrantsImport = async () => {
    if (!parsedRegistrants.length || !event) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/py/events/${event.id}/registrations/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify(parsedRegistrants)
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Successfully imported ${result.created.length} registrants! Errors: ${result.errors.length}`);
        
        // Refresh registrants list
        const regRes = await fetch(`/api/py/events/${id}/registrations`, {
          headers: { "x-user-email": session?.user?.email || "" }
        });
        const regData = await regRes.json();
        setRegistrations(regData);
        
        setIsImportModalOpen(false);
        setParsedRegistrants([]);
      } else {
        const err = await res.json();
        alert(`Import failed: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error importing registrants");
    } finally {
      setImporting(false);
    }
  };

  const handleResendEmail = async (regId: string) => {
    setResendingRegId(regId);
    try {
      const res = await fetch(`/api/py/registrations/${regId}/resend-email`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Confirmation email containing PIN and QR code has been resent!");
      } else {
        const err = await res.json();
        alert(`Failed to resend: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      alert("Error resending email");
    } finally {
      setResendingRegId(null);
    }
  };

  const handleBulkResend = async () => {
    if (!event) return;
    const confirmedCount = registrations.filter(r => r.status === "confirmed").length;
    if (confirmedCount === 0) {
      alert("There are no confirmed registrants to send tickets to.");
      return;
    }
    if (!confirm(`Are you sure you want to resend credentials & QR codes to all ${confirmedCount} confirmed attendees? This will run in the background.`)) {
      return;
    }
    
    setBulkResending(true);
    try {
      const res = await fetch(`/api/py/events/${event.id}/resend-all-tickets`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Bulk ticket dispatch started successfully in the background.");
      } else {
        const err = await res.json();
        alert(`Failed to start bulk dispatch: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      alert("Error starting bulk ticket dispatch");
    } finally {
      setBulkResending(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);

  const fetchRegistrations = async () => {
    if (!session?.user?.email) return;
    setRefreshing(true);
    try {
      const regRes = await fetch(`/api/py/events/${id}/registrations`, {
        headers: { "x-user-email": session.user.email || "" }
      });
      const regData = await regRes.json();
      setRegistrations(regData);
    } catch (err) {
      console.error("Failed to refresh registrations", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.email) return;
    const fetchData = async () => {
      try {
        const eventRes = await fetch(`/api/py/events/id/${id}`, {
          headers: { "x-user-email": session.user.email || "" }
        });
        if (!eventRes.ok) throw new Error("Event not found");
        const eventData = await eventRes.json();
        setEvent(eventData);

        const regRes = await fetch(`/api/py/events/${id}/registrations`, {
          headers: { "x-user-email": session.user.email || "" }
        });
        const regData = await regRes.json();
        setRegistrations(regData);
      } catch (err) {
        console.error("Failed to fetch event details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, session]);

  const handleDeleteRegistration = async (regId: string) => {
    if (!confirm("Are you sure you want to remove this registrant?")) return;
    setDeletingId(regId);
    try {
      const res = await fetch(`/api/py/registrations/${regId}`, { 
        method: "DELETE",
        headers: {
          "x-user-email": session?.user?.email || ""
        }
      });
      if (res.ok) {
        setRegistrations(prev => prev.filter(r => r.id !== regId));
      }
    } catch (err) {
      console.error("Failed to delete registration", err);
    } finally {
      setDeletingId(null);
    }
  };

  const exportToExcel = () => {
    if (registrations.length === 0) return;
    
    // Define headers
    const headers = [
      "First Name", 
      "Last Name", 
      "Email", 
      "Organization", 
      "Status", 
      "Clearance PIN",
      "QR Code Link",
      "Checked In (Any)", 
      ...(event?.duration_days && event.duration_days > 1
        ? ["Checked In Days", ...Array.from({ length: event.duration_days }, (_, i) => `Day ${i + 1} Check In`)]
        : []
      ),
      "Registered At",
      ...(event?.custom_fields_schema || []).map(f => f.label)
    ];

    // Helper to escape CSV values (wrap in quotes, escape existing quotes)
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return "";
      let str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = registrations.map(reg => {
      const checkedInDaysStr = reg.checked_in_days && reg.checked_in_days.length > 0
        ? reg.checked_in_days.map(d => `Day ${d}`).join(", ")
        : "None";

      const dailyCheckIns = event?.duration_days && event.duration_days > 1
        ? Array.from({ length: event.duration_days }, (_, i) => {
            const dayNum = i + 1;
            return reg.checked_in_days?.includes(dayNum) ? "Yes" : "No";
          })
        : [];

      const pinVal = reg.pin || reg.id.substring(0, 8);
      const qrLinkVal = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${pinVal}`;

      const basicInfo = [
        escapeCSV(reg.attendee.first_name),
        escapeCSV(reg.attendee.last_name),
        escapeCSV(reg.attendee.email),
        escapeCSV(reg.attendee.company || ""),
        escapeCSV(reg.status),
        escapeCSV(pinVal),
        escapeCSV(qrLinkVal),
        escapeCSV(reg.checked_in ? "Yes" : "No"),
        ...(event?.duration_days && event.duration_days > 1
          ? [escapeCSV(checkedInDaysStr), ...dailyCheckIns]
          : []
        ),
        escapeCSV(new Date(reg.created_at).toLocaleString()),
      ];

      const customInfo = (event?.custom_fields_schema || []).map(f => {
        const val = reg.custom_answers?.[f.id];
        if (typeof val === "boolean") return val ? "Yes" : "No";
        if (Array.isArray(val)) return escapeCSV(val.join(", "));
        return escapeCSV(val || "");
      });

      return [...basicInfo, ...customInfo];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `registrants_${event?.title?.replace(/\s+/g, '_') || 'event'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const declinedCount = registrations.filter(r => r.status === "declined").length;
  const confirmedCount = registrations.filter(r => r.status === "confirmed").length;
  const checkedInCount = registrations.filter(r => r.checked_in).length;

  const filteredRegistrations = registrations.filter(reg => {
    const search = searchTerm.toLowerCase();
    return (
      reg.attendee.first_name.toLowerCase().includes(search) ||
      reg.attendee.last_name.toLowerCase().includes(search) ||
      reg.attendee.email.toLowerCase().includes(search) ||
      (reg.attendee.company || "").toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-[#0f172a]" size={48} />
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Event not found</h1>
          <Link href="/admin/events" className="text-blue-600 hover:underline">Return to Catalog</Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto font-outfit">
        <Link 
          href="/admin/events" 
          className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-[#0f172a] transition-colors mb-4 block"
        >
          ← Back to Catalog
        </Link>

        {/* Event Header Card */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mb-8">
          <div className="p-10 lg:p-14">
            <div className="flex flex-col md:flex-row justify-between items-start gap-12 min-w-0">
              <div className="flex-1 min-w-0 w-full">
                 <div className="flex flex-wrap items-center gap-3 mb-6">
                    {event.client?.logo_url && (
                      <div className="h-6 w-6 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={event.client.logo_url} alt={event.client.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span className="px-3 py-1 bg-yellow-400/10 text-yellow-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-yellow-400/20">
                      {event.client?.name || "Command Panel"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-300">ID: {id}</span>
                 </div>
                <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black text-[#0f172a] tracking-tighter italic font-bricolage leading-[1.1] ${(userRole === "admin" || userRole === "manager") ? "mb-6" : "mb-10"}`}>{event.title}</h1>
                {(userRole === "admin" || userRole === "manager") && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-10 bg-slate-50 p-4 rounded-2xl border border-slate-100 group min-w-0">
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 shrink-0">Public Link:</p>
                     <code className="text-xs font-bold text-[#0f172a] bg-white px-3 py-1 rounded-lg border border-slate-100 flex-1 min-w-0 truncate">
                       {typeof window !== 'undefined' ? `${window.location.origin}/register/${event.slug}` : `/register/${event.slug}`}
                     </code>
                     <button 
                       onClick={() => {
                         const url = `${window.location.origin}/register/${event.slug}`;
                         navigator.clipboard.writeText(url);
                         alert("Link copied!");
                       }}
                       className="px-4 py-2 bg-[#0f172a] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shrink-0"
                     >
                       Copy Link
                     </button>
                     <a 
                       href={`/register/${event.slug}`} 
                       target="_blank" 
                       className="p-2 text-slate-400 hover:text-[#0f172a] transition-all shrink-0"
                     >
                       <ArrowUpRight size={16} />
                     </a>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5 gap-y-8 gap-x-4 sm:gap-x-6">
                  {/* Date Button */}
                  <button 
                    onClick={() => setSelectedMetric("date")}
                    className="flex items-center gap-3 sm:gap-4 min-w-0 text-left hover:bg-slate-50/50 p-2 -m-2 rounded-2xl transition-all active:scale-[0.98] w-full"
                  >
                    <div className="p-2.5 sm:p-3 bg-slate-50 text-[#0f172a] rounded-2xl shrink-0">
                      <Calendar size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">Date</p>
                      <p className="font-bold text-[#0f172a] text-sm sm:text-base whitespace-nowrap">{new Date(event.start_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                    </div>
                  </button>

                  {/* Venue Button */}
                  <button 
                    onClick={() => setSelectedMetric("venue")}
                    className="flex items-center gap-3 sm:gap-4 min-w-0 text-left hover:bg-slate-50/50 p-2 -m-2 rounded-2xl transition-all active:scale-[0.98] w-full"
                  >
                    <div className="p-2.5 sm:p-3 bg-slate-50 text-[#0f172a] rounded-2xl shrink-0">
                      <MapPin size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">Venue</p>
                      <p className="font-bold text-[#0f172a] text-sm sm:text-base truncate" title={event.location}>{event.location}</p>
                      {event.address && (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate" title={event.address}>{event.address}</p>
                      )}
                    </div>
                  </button>

                  {/* Enrollment Button */}
                  <button 
                    onClick={() => setSelectedMetric("enrollment")}
                    className="flex items-center gap-3 sm:gap-4 min-w-0 text-left hover:bg-slate-50/50 p-2 -m-2 rounded-2xl transition-all active:scale-[0.98] w-full"
                  >
                    <div className="p-2.5 sm:p-3 bg-slate-50 text-[#0f172a] rounded-2xl shrink-0">
                      <Users size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">Enrollment</p>
                      <p className="font-bold text-[#0f172a] text-sm sm:text-base whitespace-nowrap">{confirmedCount} / {event.capacity}</p>
                    </div>
                  </button>

                  {/* Declined Button */}
                  <button 
                    onClick={() => setSelectedMetric("declined")}
                    className="flex items-center gap-3 sm:gap-4 min-w-0 text-left hover:bg-slate-50/50 p-2 -m-2 rounded-2xl transition-all active:scale-[0.98] w-full"
                  >
                    <div className="p-2.5 sm:p-3 bg-red-50 text-red-500 rounded-2xl shrink-0">
                      <UserX size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">Declined</p>
                      <p className="font-bold text-red-500 text-sm sm:text-base whitespace-nowrap">{declinedCount}</p>
                    </div>
                  </button>

                  {/* Checked In Button */}
                  <button 
                    onClick={() => setSelectedMetric("checked_in")}
                    className="flex items-center gap-3 sm:gap-4 min-w-0 text-left hover:bg-slate-50/50 p-2 -m-2 rounded-2xl transition-all active:scale-[0.98] w-full col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-1 2xl:col-span-1"
                  >
                    <div className="p-2.5 sm:p-3 bg-green-50 text-green-600 rounded-2xl shrink-0">
                      <CheckCircle2 size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">Checked In</p>
                      <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                        <p className="font-bold text-green-600 text-sm sm:text-base whitespace-nowrap">{checkedInCount}</p>
                        {event.duration_days && event.duration_days > 1 && (
                          <span className="text-[9px] text-slate-400 font-bold uppercase whitespace-nowrap">(Unique)</span>
                        )}
                      </div>
                      {event.duration_days && event.duration_days > 1 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Array.from({ length: event.duration_days }, (_, i) => i + 1).map(d => (
                            <span key={d} className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[8px] font-bold rounded border border-green-200/50 shrink-0">
                              Day {d}: {registrations.filter(r => r.checked_in_days?.includes(d)).length}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
              {(userRole === "admin" || userRole === "manager") && (
                <div className="flex flex-col gap-4 w-full md:w-auto">
                  <button
                    onClick={exportToExcel}
                    disabled={registrations.length === 0}
                    className="flex items-center justify-center gap-3 bg-[#0f172a] hover:bg-black disabled:bg-slate-200 text-white px-8 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs"
                  >
                    <Download size={20} />
                    Export to Excel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/py/events/${event.id}/qrcodes/zip`, {
                          headers: { "x-user-email": session?.user?.email || "" }
                        });
                        if (!res.ok) {
                          const errData = await res.json();
                          throw new Error(errData.detail || "Failed to download ZIP");
                        }
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${event.slug}_qrcodes.zip`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      } catch (err: any) {
                        alert(`Error: ${err.message}`);
                      }
                    }}
                    disabled={registrations.length === 0}
                    className="flex items-center justify-center gap-3 bg-[#eab308] hover:bg-[#ca8a04] disabled:bg-slate-200 text-[#0f172a] px-8 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-yellow-500/10 uppercase tracking-widest text-xs"
                  >
                    <Download size={20} />
                    Download QR Codes (ZIP)
                  </button>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/view/${event.slug}`;
                      navigator.clipboard.writeText(url);
                      alert("Client dashboard link copied to clipboard!");
                    }}
                    className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-[#0f172a] px-8 py-5 rounded-2xl font-black transition-all border border-slate-200 uppercase tracking-widest text-xs"
                  >
                    <Eye size={20} />
                    Share Client Link
                  </button>
                  <Link
                    href={`/admin/events/${id}/edit`}
                    className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-[#0f172a] px-8 py-5 rounded-2xl font-black transition-all border border-slate-200 uppercase tracking-widest text-xs"
                  >
                    Edit Configuration
                  </Link>
                  {userRole === "admin" && (
                    <button
                      onClick={async () => {
                        const email = prompt("Enter test email address:");
                        if (!email) return;
                        try {
                          const res = await fetch(`/api/py/events/${id}/test-email`, {
                            method: "POST",
                            headers: { 
                              "Content-Type": "application/json",
                              "x-user-email": session?.user?.email || ""
                            },
                            body: JSON.stringify({ email })
                          });
                          if (res.ok) alert("Test email dispatched!");
                          else {
                            const err = await res.json();
                            alert(`Failed: ${err.detail || "Unknown error"}`);
                          }
                        } catch (err) {
                          alert("Error sending test email");
                        }
                      }}
                      className="flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 text-[#0f172a] px-8 py-5 rounded-2xl font-black transition-all border border-slate-100 uppercase tracking-widest text-xs"
                    >
                      Test Email Service
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="px-10 flex border-t border-slate-50 bg-slate-50/20 overflow-x-auto whitespace-nowrap scrollbar-hide">
             <button 
               onClick={() => setActiveTab("registrants")}
               className={`px-6 md:px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 shrink-0 ${activeTab === "registrants" ? "border-yellow-400 text-[#0f172a]" : "border-transparent text-slate-400"}`}
             >
                Registrants
             </button>
             {(userRole === "admin" || userRole === "manager") && (
                <button 
                  onClick={() => setActiveTab("form")}
                  className={`px-6 md:px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 shrink-0 ${activeTab === "form" ? "border-yellow-400 text-[#0f172a]" : "border-transparent text-slate-400"}`}
                >
                  Form Studio
               </button>
             )}
              <button 
                onClick={() => setActiveTab("scanner")}
                className={`px-6 md:px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 shrink-0 ${activeTab === "scanner" ? "border-yellow-400 text-[#0f172a]" : "border-transparent text-slate-400"}`}
              >
                Live Scanner
             </button>
             {(userRole === "admin" || userRole === "manager") && (
                <button 
                  onClick={() => setActiveTab("communications")}
                  className={`px-6 md:px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 shrink-0 ${activeTab === "communications" ? "border-yellow-400 text-[#0f172a]" : "border-transparent text-slate-400"}`}
                >
                  Communications
               </button>
             )}
             {(userRole === "admin" || userRole === "manager") && (
                <button 
                  onClick={() => setActiveTab("staff")}
                  className={`px-6 md:px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 shrink-0 ${activeTab === "staff" ? "border-yellow-400 text-[#0f172a]" : "border-transparent text-slate-400"}`}
                >
                  Staff Assignment
               </button>
             )}
          </div>
        </div>

        {activeTab === "registrants" ? (
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by name, email or company..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-16 pr-8 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] placeholder-slate-300 transition-all"
                  />
               </div>
               <div className="flex items-center gap-3">
                   <button 
                     onClick={fetchRegistrations}
                     disabled={refreshing}
                     className="px-5 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-[#0f172a] disabled:text-slate-400 flex items-center justify-center border border-slate-100 hover:border-slate-200"
                     title="Refresh List"
                   >
                      <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                   </button>
                   <div className="flex items-center gap-4 px-6 py-4 bg-slate-50 rounded-2xl">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Showing:</span>
                      <span className="text-xs font-black text-[#0f172a]">{filteredRegistrations.length} Registrants</span>
                   </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h2 className="text-xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">Active <span className="text-slate-300">Registrants</span></h2>
                {userRole === "admin" && (
                  <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 bg-[#0f172a] hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    <Upload size={14} />
                    Import Registrants
                  </button>
                )}
              </div>
              <div className="overflow-x-auto pb-4">
                <table className="w-full text-left min-w-[1100px]">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    <th className="px-10 py-6">Attendee Details</th>
                    <th className="px-10 py-6">Organization</th>
                    <th className="px-10 py-6">Status</th>
                    <th className="px-10 py-6">Verified On</th>
                    <th className="px-10 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-10 py-24 text-center">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Users className="text-slate-200" size={32} />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No matching registrations found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-[#0f172a] text-white rounded-xl flex items-center justify-center font-bold text-xs uppercase">
                                {reg.attendee.first_name[0]}{reg.attendee.last_name[0]}
                             </div>
                             <div>
                                <p className="font-bold text-[#0f172a]">{reg.attendee.first_name} {reg.attendee.last_name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{reg.attendee.email}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-slate-600 font-bold text-xs">
                          {reg.attendee.company || "—"}
                        </td>
                        <td className="px-10 py-8">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                            reg.status === "confirmed" 
                              ? "bg-green-50 text-green-600 border-green-100" 
                              : reg.status === "declined"
                                ? "bg-red-50 text-red-600 border-red-100"
                                : "bg-yellow-50 text-yellow-600 border-yellow-100"
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              reg.status === "confirmed" ? "bg-green-500" : reg.status === "declined" ? "bg-red-500" : "bg-yellow-500"
                            }`}></div>
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(reg.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                          {event.duration_days && event.duration_days > 1 ? (
                            <div className="flex gap-1.5">
                              {Array.from({ length: event.duration_days }, (_, i) => i + 1).map(dayNum => {
                                const isCheckedInForDay = reg.checked_in_days?.includes(dayNum);
                                return (
                                  <button
                                    key={dayNum}
                                    disabled={reg.status === "declined"}
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/py/registrations/${reg.id}/checkin?day=${dayNum}`, { method: "PUT" });
                                        if (res.ok) {
                                          const updated = await res.json();
                                          setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, checked_in: updated.checked_in, checked_in_days: updated.checked_in_days ?? [] } : r));
                                        }
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                      reg.status === "declined"
                                        ? "bg-slate-100 text-slate-300 cursor-not-allowed opacity-55"
                                        : isCheckedInForDay 
                                          ? "bg-green-500 text-white shadow-sm shadow-green-500/20" 
                                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                    }`}
                                  >
                                    Day {dayNum}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <button
                              disabled={reg.status === "declined"}
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/py/registrations/${reg.id}/checkin`, { method: "PUT" });
                                  if (res.ok) {
                                    const updated = await res.json();
                                    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, checked_in: updated.checked_in, checked_in_days: updated.checked_in_days ?? [] } : r));
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                reg.status === "declined"
                                  ? "bg-slate-100 text-slate-300 cursor-not-allowed opacity-55"
                                  : reg.checked_in 
                                    ? "bg-green-500 text-white shadow-lg shadow-green-500/20" 
                                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                              }`}
                            >
                              {reg.checked_in ? "Checked In" : "Check In"}
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedReg(reg)}
                            className="p-2 text-slate-300 hover:text-[#0f172a] transition-all"
                          >
                            <MoreVertical size={18} />
                          </button>
                          {(userRole === "admin" || userRole === "manager") && (
                            <button
                              onClick={() => handleDeleteRegistration(reg.id)}
                              disabled={deletingId === reg.id}
                              className="text-slate-300 hover:text-red-500 p-2 transition-all"
                            >
                              {deletingId === reg.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ) : activeTab === "form" ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-14">
             <FormBuilder 
               eventId={id as string} 
               initialSchema={event.custom_fields_schema} 
               onSave={(newSchema) => setEvent({ ...event, custom_fields_schema: newSchema })} 
             />
          </div>
        ) : activeTab === "scanner" ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-24">
             <div className="max-w-2xl mx-auto text-center mb-10">
                <h2 className="text-5xl font-black text-[#0f172a] mb-6 tracking-tight font-bricolage italic uppercase">LIVE <span className="text-slate-300">SCANNER</span></h2>
                <p className="text-slate-500 font-medium">Scan attendee QR codes or enter their Unique Clearance ID for instantaneous verification.</p>
             </div>
             
             {event.duration_days && event.duration_days > 1 && (
               <div className="max-w-md mx-auto mb-16 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="text-center sm:text-left">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Check-In Day</label>
                   <p className="text-[11px] text-slate-400 font-medium">Auto-detect or lock to a specific event day</p>
                 </div>
                 <select
                   value={selectedScanDay}
                   onChange={(e) => {
                     const val = e.target.value;
                     setSelectedScanDay(val === "auto" ? "auto" : parseInt(val));
                   }}
                   className="w-full sm:w-auto px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-bold text-xs text-[#0f172a]"
                 >
                   <option value="auto">Auto-Detect Day</option>
                   {Array.from({ length: event.duration_days }, (_, i) => i + 1).map(d => (
                     <option key={d} value={d}>Day {d}</option>
                   ))}
                 </select>
               </div>
             )}
             
             <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
               <div className="space-y-8">
                 <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-1">QR Verification</h3>
                   <QRScanner 
                     onScan={async (regId) => {
                       const query = selectedScanDay === "auto" ? "mode=checkin" : `mode=checkin&day=${selectedScanDay}`;
                       const res = await fetch(`/api/py/registrations/${regId}/checkin?${query}`, { method: "PUT" });
                       if (!res.ok) {
                         const error = await res.json();
                         throw new Error(error.detail || "Authentication Failed");
                       }
                       const updated = await res.json();
                       setRegistrations(prev => prev.map(r => r.id === updated.id ? { ...r, checked_in: updated.checked_in, checked_in_days: updated.checked_in_days ?? [] } : r));
                       return updated;
                     }} 
                   />
                 </div>
               </div>

               <div className="space-y-8">
                 <div className="bg-slate-50 p-10 rounded-[2rem] border border-slate-100">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-1">Manual PIN Entry</h3>
                   {pinStatus === "idle" ? (
                     <div className="space-y-4">
                       <input 
                         type="text" 
                         maxLength={4}
                         placeholder="ENTER 4-DIGIT PIN"
                         value={pin}
                         onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                         className="w-full text-center text-2xl md:text-4xl font-black py-8 bg-white rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none text-[#0f172a] placeholder-slate-200 tracking-[0.2em] md:tracking-[0.5em]"
                       />
                       <button 
                         onClick={async () => {
                           if (pin.length !== 4) return;
                           setPinStatus("processing");
                           setPinMessage("Verifying PIN...");
                           try {
                             const payload: Record<string, any> = { pin };
                             if (selectedScanDay !== "auto") {
                               payload.day = selectedScanDay;
                             }
                             const res = await fetch(`/api/py/events/${id}/checkin-by-pin`, {
                               method: "POST",
                               headers: { "Content-Type": "application/json" },
                               body: JSON.stringify(payload)
                             });
                             if (res.ok) {
                               const updated = await res.json();
                               setRegistrations(prev => prev.map(r => r.id === updated.id ? { ...r, checked_in: updated.checked_in, checked_in_days: updated.checked_in_days ?? [] } : r));
                               setPinStatus("success");
                               setPinMessage(`Check-in Successful: ${updated.attendee?.first_name || 'Guest'}`);
                               setPin("");
                               setTimeout(() => setPinStatus("idle"), 3000);
                             } else {
                               const err = await res.json();
                               const errMsg = err.detail || "Invalid PIN";
                               if (errMsg.toLowerCase().includes("already checked in")) {
                                 setPinStatus("warning");
                                 setPinMessage(errMsg);
                               } else {
                                 setPinStatus("error");
                                 setPinMessage(errMsg);
                               }
                               setTimeout(() => setPinStatus("idle"), 4000);
                             }
                           } catch (err) {
                             setPinStatus("error");
                             setPinMessage("Verification error");
                             setTimeout(() => setPinStatus("idle"), 4000);
                           }
                         }}
                         disabled={pin.length !== 4}
                        className="w-full bg-[#0f172a] hover:bg-black disabled:bg-slate-200 text-white font-black py-6 rounded-2xl transition-all uppercase tracking-widest text-xs"
                       >
                         Verify & Check In
                       </button>
                     </div>
                   ) : (
                     <div className={`flex flex-col items-center gap-6 p-8 rounded-[1.5rem] shadow-lg w-full animate-in zoom-in-95 duration-300 ${
                       pinStatus === "success" ? "bg-green-500 text-white" : 
                       pinStatus === "error" ? "bg-red-500 text-white" : 
                       pinStatus === "warning" ? "bg-red-500 text-white" :
                       "bg-[#0f172a] text-white"
                     }`}>
                       {pinStatus === "processing" && <Loader2 className="animate-spin" size={48} />}
                       {pinStatus === "success" && <CheckCircle2 size={48} />}
                       {pinStatus === "error" && <XCircle size={48} />}
                       {pinStatus === "warning" && <AlertCircle size={48} />}
                       
                       <div className="text-center">
                          <p className="text-xl font-black italic uppercase tracking-tighter font-bricolage leading-tight">{pinMessage}</p>
                          {pinStatus !== "processing" && (
                            <button 
                              onClick={() => setPinStatus("idle")}
                              className={`mt-6 px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                                pinStatus === "warning" ? "bg-white/20 hover:bg-white/30 border-white/10" : "bg-white/20 hover:bg-white/30 border-white/10"
                              }`}
                            >
                              Dismiss
                            </button>
                          )}
                       </div>
                     </div>
                   )}
                 </div>

                 <div className="p-8 bg-yellow-400/5 rounded-[2rem] border border-yellow-400/10">
                   <p className="text-[10px] font-medium text-yellow-600/70 leading-relaxed uppercase tracking-wider">
                     Attendees can find their 4-digit Unique Clearance ID at the bottom of their confirmation email or below their QR code.
                   </p>
                 </div>
               </div>
             </div>
          </div>
        ) : activeTab === "staff" ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-14">
             <StaffAssignment 
               eventId={id as string} 
               clientId={event.client?.id}
             />
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-24">
             <div className="max-w-2xl mx-auto mb-16">
                <h2 className="text-5xl font-black text-[#0f172a] mb-6 tracking-tight font-bricolage italic uppercase text-center">BROADCAST <span className="text-slate-300">DISPATCH</span></h2>
                <p className="text-slate-500 font-medium text-center">Send updates or reminders to all {registrations.length} confirmed attendees.</p>
             </div>

             <div className="max-w-xl mx-auto space-y-12">
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const target = e.target as any;
                    const subject = target.subject.value;
                    const body = target.body.value;
                    const signature = target.signature.value;
                    
                    const fileInput = document.getElementById("attachments") as HTMLInputElement;
                    const files = fileInput?.files ? Array.from(fileInput.files) : [];
                    
                    const readAsBase64 = (file: File): Promise<string> => {
                      return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => {
                          const base64String = reader.result?.toString().split(",")[1] || "";
                          resolve(base64String);
                        };
                        reader.onerror = (error) => reject(error);
                      });
                    };
                    
                    if (!confirm(`Are you sure you want to send this broadcast to ${registrations.length} attendees?`)) return;
                    
                    try {
                      const attachments = await Promise.all(
                        files.map(async (file) => ({
                          filename: file.name,
                          content: await readAsBase64(file)
                        }))
                      );
                      
                      const res = await fetch(`/api/py/events/${id}/broadcast`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ subject, body, signature, attachments })
                      });
                      if (res.ok) {
                        alert("Broadcast successfully queued in the background!");
                        target.reset();
                        if (fileInput) fileInput.value = "";
                      } else {
                        alert("Failed to send broadcast. Ensure RESEND_API_KEY is configured.");
                      }
                    } catch (err) {
                      console.error(err);
                      alert("An error occurred during dispatch.");
                    }
                  }}
                  className="space-y-8"
                >
                   {/* Personalization Help card */}
                   <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 lg:p-8 space-y-4">
                      <h4 className="text-[10px] font-black text-[#0f172a] uppercase tracking-widest">Personalization Tags</h4>
                      <p className="text-slate-400 font-medium text-xs leading-relaxed">
                         Use these tags to dynamically customize the email for each guest:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                         <div className="text-slate-600"><code className="bg-white border border-slate-200/60 px-1.5 py-0.5 rounded text-yellow-600">{"{first_name}"}</code> - Guest's first name</div>
                         <div className="text-slate-600"><code className="bg-white border border-slate-200/60 px-1.5 py-0.5 rounded text-yellow-600">{"{last_name}"}</code> - Guest's last name</div>
                         <div className="text-slate-600"><code className="bg-white border border-slate-200/60 px-1.5 py-0.5 rounded text-yellow-600">{"{pin}"}</code> - Guest's unique 4-digit PIN</div>
                         <div className="text-slate-600"><code className="bg-white border border-slate-200/60 px-1.5 py-0.5 rounded text-yellow-600">{"{qr_code}"}</code> - Unique Check-in QR code</div>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Line</label>
                      <input required name="subject" placeholder={`Update for ${event.title}`} className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a]" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Body</label>
                      <textarea required name="body" rows={6} placeholder="Type your message here..." className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] resize-none" />
                   </div>
                   
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">File Attachments (Optional)</label>
                      <input 
                        type="file" 
                        id="attachments" 
                        multiple 
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-500 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-[#0f172a] file:text-white hover:file:bg-black cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-400 font-medium ml-1">Attach documents or media directly to the email body.</p>
                   </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Signature (Optional)</label>
                       <textarea name="signature" rows={2} placeholder="Kind regards, BMD Team" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] resize-none text-sm" />
                    </div>
                   <button type="submit" className="w-full bg-[#0f172a] hover:bg-black text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-slate-200 transition-all uppercase tracking-[0.3em] text-xs">
                      Dispatch Broadcast
                   </button>
                </form>

                <div className="pt-12 border-t border-slate-100 space-y-6">
                    <h3 className="text-xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">Bulk Credential Dispatch</h3>
                    <p className="text-slate-500 font-medium text-sm">
                       This will resend individual registration confirmation emails (including their unique PIN and QR code) to all confirmed attendees of this event. 
                       Recommended to do a few days before the event as a credentials reminder.
                    </p>
                    <button 
                       type="button"
                       onClick={handleBulkResend}
                       disabled={bulkResending}
                       className="w-full flex items-center justify-center gap-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-200 text-[#0f172a] font-black py-6 rounded-[2rem] transition-all uppercase tracking-widest text-xs"
                    >
                       {bulkResending ? <Loader2 size={18} className="animate-spin" /> : null}
                       Resend Tickets to All Confirmed Guests
                    </button>
                 </div>
             </div>
          </div>
        )}

        {/* Details Modal */}
        {selectedReg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedReg(null)}></div>
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#0f172a] text-white rounded-[1.2rem] flex items-center justify-center font-black text-lg">
                    {selectedReg.attendee.first_name[0]}{selectedReg.attendee.last_name[0]}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">Registration <span className="text-slate-300">Details</span></h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{selectedReg.attendee.first_name} {selectedReg.attendee.last_name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedReg(null)} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                   <ArrowLeft size={20} />
                </button>
              </div>
              <div className="p-10 max-h-[60vh] overflow-y-auto space-y-8">
                 <div className="grid grid-cols-2 gap-8">
                    <div>
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Status</p>
                       <p className="font-bold text-[#0f172a] capitalize">{selectedReg.status}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Company</p>
                       <p className="font-bold text-[#0f172a]">{selectedReg.attendee.company || "—"}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Email Address</p>
                       <p className="font-bold text-[#0f172a]">{selectedReg.attendee.email}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Registered On</p>
                       <p className="font-bold text-[#0f172a]">{new Date(selectedReg.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Clearance ID (PIN)</p>
                       <p className="font-mono font-bold text-[#0f172a] bg-slate-50 px-3 py-1 rounded border border-slate-100 inline-block text-lg tracking-wider">{selectedReg.pin || "—"}</p>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-slate-50">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6">Custom Field Responses</h4>
                    <div className="space-y-6">
                       {event.custom_fields_schema?.length === 0 ? (
                         <p className="text-slate-400 text-xs italic">No custom fields defined for this event.</p>
                       ) : (
                         event.custom_fields_schema.map(field => (
                           <div key={field.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                              <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2">{field.label}</p>
                              <p className="font-bold text-[#0f172a]">{selectedReg.custom_answers?.[field.id] || "—"}</p>
                           </div>
                         ))
                       )}
                    </div>
                 </div>
              </div>
              <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                 <button 
                   onClick={() => handleResendEmail(selectedReg.id)}
                   disabled={resendingRegId === selectedReg.id}
                   className="px-6 py-4 bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-200 text-[#0f172a] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2"
                 >
                    {resendingRegId === selectedReg.id ? <Loader2 size={14} className="animate-spin" /> : null}
                    Resend Ticket Email
                 </button>
                 <button 
                   onClick={() => setSelectedReg(null)}
                   className="px-8 py-4 bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200"
                 >
                    Close Review
                 </button>
              </div>
            </div>
          </div>
        )}
        {/* Bulk Import Modal */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
              <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <div>
                   <h3 className="text-xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">Bulk Import <span className="text-slate-300">Registrants</span></h3>
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1">Upload CSV or Excel file</p>
                 </div>
                 <button 
                   onClick={() => {
                     setIsImportModalOpen(false);
                     setParsedRegistrants([]);
                   }}
                   className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                 >
                   <X size={20} />
                 </button>
              </div>

              <div className="p-10 overflow-y-auto space-y-6 flex-1">
                <p className="text-slate-500 font-medium text-sm">
                  Import a bulk register of attendees. The system will automatically add them, generate a unique 4-digit PIN, create a QR code, and send the registration confirmation email.
                </p>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Supported Columns</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Must contain headers: <code className="bg-slate-200/60 px-1.5 py-0.5 rounded font-bold">first_name</code>, <code className="bg-slate-200/60 px-1.5 py-0.5 rounded font-bold">last_name</code>, <code className="bg-slate-200/60 px-1.5 py-0.5 rounded font-bold">email</code>, and <code className="bg-slate-200/60 px-1.5 py-0.5 rounded font-bold">company</code>. Additional columns are automatically parsed as custom responses.
                  </p>
                  <button
                    onClick={downloadRegistrantTemplate}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-[#0f172a] px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    <Download size={14} />
                    Download Excel Template
                  </button>
                </div>

                {!parsedRegistrants.length ? (
                  <div className="border-2 border-dashed border-slate-200 hover:border-yellow-400 rounded-3xl p-12 text-center transition-all cursor-pointer relative bg-slate-50/30 hover:bg-slate-50/50">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleImportFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-sm font-bold text-[#0f172a]">Choose a file or drag it here</p>
                    <p className="text-xs text-slate-400 mt-1">Supports CSV, XLSX, and XLS formats</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Parsed Attendees ({parsedRegistrants.length})</span>
                      <button 
                        onClick={() => setParsedRegistrants([])}
                        className="text-xs font-bold text-red-500 hover:underline uppercase"
                      >
                        Clear File
                      </button>
                    </div>
                    
                    <div className="max-h-[220px] overflow-y-auto pr-2 border border-slate-100 rounded-2xl divide-y divide-slate-100">
                      {parsedRegistrants.map((u, index) => (
                        <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                          <div>
                            <p className="font-bold text-sm text-[#0f172a]">{u.first_name} {u.last_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{u.email}</p>
                          </div>
                          {u.company && (
                            <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-100">
                              {u.company}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setParsedRegistrants([]);
                  }}
                  className="px-8 py-4 bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkRegistrantsImport}
                  disabled={!parsedRegistrants.length || importing}
                  className="px-8 py-4 bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all disabled:bg-slate-200 flex items-center gap-2 shadow-xl shadow-slate-200"
                >
                  {importing ? <Loader2 size={14} className="animate-spin" /> : null}
                  Confirm & Sync Attendees
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal for Logistics Stats */}
        {selectedMetric && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer" 
              onClick={() => setSelectedMetric(null)}
            />
            
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden relative z-10 transform scale-100 transition-all duration-300">
              <button 
                onClick={() => setSelectedMetric(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-[#0f172a] transition-all"
              >
                <X size={18} />
              </button>

              <div className="p-10 font-outfit">
                {selectedMetric === "date" && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-slate-50 text-[#0f172a] rounded-[1.5rem]">
                        <Calendar size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Details</span>
                        <h2 className="text-2xl font-black text-[#0f172a] tracking-tight italic font-bricolage leading-none">Event Schedule</h2>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Start Date & Time</span>
                        <p className="font-bold text-[#0f172a] text-sm">
                          {new Date(event.start_date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                      </div>
                      {event.duration_days && event.duration_days > 1 && (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">End Date & Time (Estimated)</span>
                          <p className="font-bold text-[#0f172a] text-sm">
                            {(() => {
                              const start = new Date(event.start_date);
                              const end = new Date(start);
                              end.setDate(start.getDate() + (event.duration_days - 1));
                              return end.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });
                            })()}
                          </p>
                        </div>
                      )}
                      {event.duration_days && (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase block">Duration</span>
                            <p className="font-bold text-[#0f172a] text-sm">{event.duration_days} Day(s)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedMetric === "venue" && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-slate-50 text-[#0f172a] rounded-[1.5rem]">
                        <MapPin size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Details</span>
                        <h2 className="text-2xl font-black text-[#0f172a] tracking-tight italic font-bricolage leading-none">Venue Information</h2>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Location Name</span>
                        <p className="font-bold text-[#0f172a] text-base leading-snug">{event.location}</p>
                      </div>
                      
                      {event.address && (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Street Address</span>
                          <p className="font-bold text-[#0f172a] text-sm leading-relaxed">{event.address}</p>
                        </div>
                      )}

                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${event.location} ${event.address || ''}`);
                            alert("Address copied to clipboard!");
                          }}
                          className="flex-1 py-3.5 bg-slate-50 border border-slate-100 text-slate-600 hover:text-[#0f172a] hover:bg-slate-100/50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Copy Address
                        </button>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location + ' ' + (event.address || ''))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3.5 bg-[#0f172a] hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all"
                        >
                          Open in Maps
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMetric === "enrollment" && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-slate-50 text-[#0f172a] rounded-[1.5rem]">
                        <Users size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Details</span>
                        <h2 className="text-2xl font-black text-[#0f172a] tracking-tight italic font-bricolage leading-none">Enrollment Status</h2>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Confirmed</span>
                          <p className="text-2xl font-black text-[#0f172a]">{confirmedCount}</p>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Capacity</span>
                          <p className="text-2xl font-black text-[#0f172a]">{event.capacity}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Fill Rate</span>
                          <span className="text-xs font-bold text-[#0f172a]">
                            {event.capacity > 0 ? Math.round((confirmedCount / event.capacity) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-yellow-400 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${event.capacity > 0 ? Math.min(100, Math.round((confirmedCount / event.capacity) * 100)) : 0}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold block mt-3">
                          {Math.max(0, event.capacity - confirmedCount)} spots remaining
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMetric === "declined" && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-red-50 text-red-500 rounded-[1.5rem]">
                        <UserX size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Details</span>
                        <h2 className="text-2xl font-black text-red-500 tracking-tight italic font-bricolage leading-none">Declined Invites</h2>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-red-50/20 p-5 rounded-2xl border border-red-100 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-black text-red-600/70 uppercase tracking-wider block mb-1">Declined Registrants</span>
                          <p className="text-3xl font-black text-red-600">{declinedCount}</p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Impact Summary</span>
                        <p className="text-xs font-bold text-[#0f172a] leading-relaxed mt-1">
                          {declinedCount > 0 
                            ? `${declinedCount} invitee(s) declined attendance. Their slots are released back to the general capacity pool.`
                            : "Excellent! Currently, no invitees have declined attendance."
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMetric === "checked_in" && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-green-50 text-green-600 rounded-[1.5rem]">
                        <CheckCircle2 size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Details</span>
                        <h2 className="text-2xl font-black text-green-600 tracking-tight italic font-bricolage leading-none">Check-in Status</h2>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Checked In</span>
                          <p className="text-2xl font-black text-green-600">{checkedInCount}</p>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Attendance Rate</span>
                          <p className="text-2xl font-black text-[#0f172a]">
                            {confirmedCount > 0 ? Math.round((checkedInCount / confirmedCount) * 100) : 0}%
                          </p>
                        </div>
                      </div>

                      {event.duration_days && event.duration_days > 1 && (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-3">Daily Attendance Breakdown</span>
                          <div className="space-y-2">
                            {Array.from({ length: event.duration_days }, (_, i) => i + 1).map(d => {
                              const dailyCount = registrations.filter(r => r.checked_in_days?.includes(d)).length;
                              const rate = confirmedCount > 0 ? Math.round((dailyCount / confirmedCount) * 100) : 0;
                              return (
                                <div key={d} className="flex justify-between items-center text-xs font-bold py-1 border-b border-slate-100 last:border-0">
                                  <span className="text-[#0f172a]">Day {d}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400">{rate}%</span>
                                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-md font-mono">{dailyCount} check-ins</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
