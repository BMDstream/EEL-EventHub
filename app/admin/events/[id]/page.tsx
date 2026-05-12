"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Users, 
  Download, 
  Trash2, 
  Calendar, 
  MapPin, 
  Loader2,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Settings,
  Sparkles
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import FormBuilder from "@/components/FormBuilder";

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
  attendee: Attendee;
}

interface Event {
  id: number;
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
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"registrants" | "form">("registrants");

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
    const headers = ["First Name", "Last Name", "Email", "Company", "Status", "Checked In", "Registered At"];
    const rows = registrations.map(r => [
      r.attendee.first_name,
      r.attendee.last_name,
      r.attendee.email,
      r.attendee.company || "",
      r.status,
      r.checked_in ? "Yes" : "No",
      new Date(r.created_at).toLocaleString()
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${event?.title.replace(/\s+/g, "_")}_registrations.csv`);
    link.click();
  };

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
                <h1 className="text-5xl font-black text-[#0f172a] mb-10 tracking-tighter italic font-bricolage leading-none">{event.title}</h1>
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
                      <p className="font-bold text-[#0f172a]">{registrations.length} / {event.capacity}</p>
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
          </div>
        </div>

        {activeTab === "registrants" ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <h2 className="text-xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">Active <span className="text-slate-300">Registrants</span></h2>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100">
                {registrations.length} Verified
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
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
                  {registrations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-10 py-24 text-center">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Users className="text-slate-200" size={32} />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No active registrations yet.</p>
                      </td>
                    </tr>
                  ) : (
                    registrations.map((reg) => (
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
                            reg.status === "confirmed" ? "bg-green-50 text-green-600 border-green-100" : "bg-yellow-50 text-yellow-600 border-yellow-100"
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${reg.status === "confirmed" ? "bg-green-500" : "bg-yellow-500"}`}></div>
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(reg.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-10 py-8 text-right">
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
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-14">
             <FormBuilder 
               eventId={id as string} 
               initialSchema={event.custom_fields_schema} 
               onSave={(newSchema) => setEvent({ ...event, custom_fields_schema: newSchema })} 
             />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
