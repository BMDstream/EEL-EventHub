"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  MoreVertical,
  Settings,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import FormBuilder from "@/components/FormBuilder";
import QRScanner from "@/components/QRScanner";

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
  attendee: Attendee;
}

interface Event {
  id: number;
  slug: string;
  title: string;
  description: string;
  start_date: string;
  location: string;
  capacity: number;
  custom_fields_schema: any[];
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
  const [activeTab, setActiveTab] = useState<"registrants" | "form" | "scanner" | "communications">(initialTab as any || "registrants");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventRes = await fetch(`/api/py/events/id/${id}`);
        if (!eventRes.ok) throw new Error("Event not found");
        const eventData = await eventRes.json();
        setEvent(eventData);

        const regRes = await fetch(`/api/py/events/${id}/registrations`);
        const regData = await regRes.json();
        setRegistrations(regData);
      } catch (err) {
        console.error("Failed to fetch event details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleDeleteRegistration = async (regId: string) => {
    if (!confirm("Are you sure you want to remove this registrant?")) return;
    setDeletingId(regId);
    try {
      const res = await fetch(`/api/py/registrations/${regId}`, { method: "DELETE" });
      if (res.ok) {
        setRegistrations(prev => prev.filter(r => r.id !== regId));
      }
    } catch (err) {
      console.error("Failed to delete registration", err);
    } finally {
      setDeletingId(null);
    }
  };

  const exportToCSV = () => {
    if (registrations.length === 0) return;
    const headers = [
      "First Name", "Last Name", "Email", "Company", "Status", "Checked In", "Registered At",
      ...(event?.custom_fields_schema || []).map(f => f.label)
    ];
    const rows = registrations.map(reg => [
      reg.attendee.first_name,
      reg.attendee.last_name,
      reg.attendee.email,
      reg.attendee.company || "",
      reg.status,
      reg.checked_in ? "Yes" : "No",
      new Date(reg.created_at).toLocaleString(),
      ...(event?.custom_fields_schema || []).map(f => reg.custom_answers?.[f.id] || "")
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${event?.title?.replace(/\s+/g, '_') || 'event'}_manifest.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const declinedCount = registrations.filter(r => r.status === "declined").length;
  const confirmedCount = registrations.filter(r => r.status === "confirmed").length;

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
            <div className="flex flex-col md:flex-row justify-between items-start gap-12">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                   <span className="px-3 py-1 bg-yellow-400/10 text-yellow-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-yellow-400/20">
                     Command Panel
                   </span>
                   <span className="text-[10px] font-mono text-slate-300">ID: {id}</span>
                </div>
                <h1 className="text-5xl font-black text-[#0f172a] mb-6 tracking-tighter italic font-bricolage leading-none">{event.title}</h1>
                <div className="flex items-center gap-2 mb-10 bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Public Link:</p>
                   <code className="text-xs font-bold text-[#0f172a] bg-white px-3 py-1 rounded-lg border border-slate-100 flex-1 truncate">
                     {typeof window !== 'undefined' ? `${window.location.origin}/${event.slug}` : `/${event.slug}`}
                   </code>
                   <button 
                     onClick={() => {
                       const url = `${window.location.origin}/${event.slug}`;
                       navigator.clipboard.writeText(url);
                       alert("Link copied!");
                     }}
                     className="px-4 py-2 bg-[#0f172a] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all"
                   >
                     Copy Link
                   </button>
                   <a 
                     href={`/${event.slug}`} 
                     target="_blank" 
                     className="p-2 text-slate-400 hover:text-[#0f172a] transition-all"
                   >
                     <ArrowUpRight size={16} />
                   </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 text-[#0f172a] rounded-2xl">
                      <Calendar size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Date</p>
                      <p className="font-bold text-[#0f172a]">{new Date(event.start_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 text-[#0f172a] rounded-2xl">
                      <MapPin size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Location</p>
                      <p className="font-bold text-[#0f172a] truncate max-w-[150px]">{event.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 text-[#0f172a] rounded-2xl">
                      <Users size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Enrollment</p>
                      <p className="font-bold text-[#0f172a]">{confirmedCount} / {event.capacity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                      <UserX size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Declined</p>
                      <p className="font-bold text-red-500">{declinedCount}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 w-full md:w-auto">
                <button
                  onClick={exportToCSV}
                  disabled={registrations.length === 0}
                  className="flex items-center justify-center gap-3 bg-[#0f172a] hover:bg-black disabled:bg-slate-200 text-white px-8 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs"
                >
                  <Download size={20} />
                  Export Manifest
                </button>
                <Link
                  href={`/admin/events/${id}/edit`}
                  className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-[#0f172a] px-8 py-5 rounded-2xl font-black transition-all border border-slate-200 uppercase tracking-widest text-xs"
                >
                  Edit Configuration
                </Link>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="px-10 flex border-t border-slate-50 bg-slate-50/20">
             <button 
               onClick={() => setActiveTab("registrants")}
               className={`px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === "registrants" ? "border-yellow-400 text-[#0f172a]" : "border-transparent text-slate-400"}`}
             >
                Registrants
             </button>
             <button 
               onClick={() => setActiveTab("form")}
               className={`px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === "form" ? "border-yellow-400 text-[#0f172a]" : "border-transparent text-slate-400"}`}
             >
                Form Studio
             </button>
             <button 
               onClick={() => setActiveTab("scanner")}
               className={`px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === "scanner" ? "border-yellow-400 text-[#0f172a]" : "border-transparent text-slate-400"}`}
             >
                Live Scanner
             </button>
             <button 
               onClick={() => setActiveTab("communications")}
               className={`px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === "communications" ? "border-yellow-400 text-[#0f172a]" : "border-transparent text-slate-400"}`}
             >
                Communications
             </button>
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
               <div className="flex items-center gap-4 px-6 py-4 bg-slate-50 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Showing:</span>
                  <span className="text-xs font-black text-[#0f172a]">{filteredRegistrations.length} Registrants</span>
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h2 className="text-xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">Active <span className="text-slate-300">Registrants</span></h2>
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
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/py/registrations/${reg.id}/checkin`, { method: "PUT" });
                                if (res.ok) {
                                  const updated = await res.json();
                                  setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, checked_in: updated.checked_in } : r));
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                              reg.checked_in 
                                ? "bg-green-500 text-white shadow-lg shadow-green-500/20" 
                                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                            }`}
                          >
                            {reg.checked_in ? "Checked In" : "Check In"}
                          </button>
                          <button
                            onClick={() => setSelectedReg(reg)}
                            className="p-2 text-slate-300 hover:text-[#0f172a] transition-all"
                          >
                            <MoreVertical size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteRegistration(reg.id)}
                            disabled={deletingId === reg.id}
                            className="text-slate-300 hover:text-red-500 p-2 transition-all"
                          >
                            {deletingId === reg.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          </button>
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
             <div className="max-w-2xl mx-auto text-center mb-16">
                <h2 className="text-5xl font-black text-[#0f172a] mb-6 tracking-tight font-bricolage italic uppercase">LIVE <span className="text-slate-300">SCANNER</span></h2>
                <p className="text-slate-500 font-medium">Scan attendee QR codes for instantaneous entry verification and check-in.</p>
             </div>
             <QRScanner 
               onScan={async (regId) => {
                 // Check if it's a valid ID and from this event
                 const res = await fetch(`/api/py/registrations/${regId}/checkin`, { method: "PUT" });
                 if (!res.ok) {
                   const error = await res.json();
                   throw new Error(error.detail || "Authentication Failed");
                 }
                 const updated = await res.json();
                 // Update the registrations list in the background
                 setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, checked_in: updated.checked_in } : r));
               }} 
             />
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-24">
             <div className="max-w-2xl mx-auto mb-16">
                <h2 className="text-5xl font-black text-[#0f172a] mb-6 tracking-tight font-bricolage italic uppercase text-center">BROADCAST <span className="text-slate-300">DISPATCH</span></h2>
                <p className="text-slate-500 font-medium text-center">Send updates or reminders to all {registrations.length} confirmed attendees.</p>
             </div>

             <div className="max-w-xl mx-auto">
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const target = e.target as any;
                    const subject = target.subject.value;
                    const body = target.body.value;
                    
                    if (!confirm(`Are you sure you want to send this broadcast to ${registrations.length} attendees?`)) return;
                    
                    try {
                      const res = await fetch(`/api/py/events/${id}/broadcast`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ subject, body })
                      });
                      if (res.ok) {
                        alert("Broadcast dispatched successfully!");
                        target.reset();
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
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Line</label>
                      <input required name="subject" placeholder={`Update for ${event.title}`} className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a]" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Body</label>
                      <textarea required name="body" rows={6} placeholder="Type your message here..." className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] resize-none" />
                   </div>
                   <button type="submit" className="w-full bg-[#0f172a] hover:bg-black text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-slate-200 transition-all uppercase tracking-[0.3em] text-xs">
                      Dispatch Broadcast
                   </button>
                </form>
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
              <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-end">
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
      </div>
    </AdminLayout>
  );
}
