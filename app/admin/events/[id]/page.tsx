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
  MoreVertical
} from "lucide-react";

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
}

export default function EventDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch event details
        const eventRes = await fetch(`/api/py/events/id/${id}`);
        if (!eventRes.ok) throw new Error("Event not found");
        const eventData = await eventRes.json();
        setEvent(eventData);

        // Fetch registrations
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

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${event?.title.replace(/\s+/g, "_")}_registrations.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Event not found</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <div className="max-w-6xl mx-auto">
        <Link 
          href="/admin" 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-colors text-sm font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        {/* Event Header Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-8">
          <div className="p-8 lg:p-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                   <span className="px-3 py-1 bg-[#1e293b]/5 text-[#1e293b] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#1e293b]/10">
                     Active Event
                   </span>
                   <span className="text-[10px] font-mono text-slate-400">UUID: {id}</span>
                </div>
                <h1 className="text-4xl font-black text-[#0f172a] mb-6 tracking-tight italic">{event.title}</h1>
                <div className="flex flex-wrap gap-8 text-slate-500">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <Calendar size={20} className="text-[#1e293b]" />
                    </div>
                    <span className="font-bold text-slate-700">{new Date(event.start_date).toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <MapPin size={20} className="text-[#1e293b]" />
                    </div>
                    <span className="font-bold text-slate-700">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <Users size={20} className="text-[#1e293b]" />
                    </div>
                    <span className="font-bold text-slate-700">{registrations.length} / {event.capacity} Enrolled</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <Link
                  href={`/admin/events/${id}/edit`}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all border border-slate-200"
                >
                  Edit Settings
                </Link>
                <button
                  onClick={exportToCSV}
                  disabled={registrations.length === 0}
                  className="flex items-center gap-3 bg-[#1e293b] hover:bg-[#0f172a] disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-xl shadow-slate-200"
                >
                  <Download size={20} />
                  Export Manifest
                </button>
              </div>
            </div>
            <div className="mt-12 pt-12 border-t border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Event Intelligence</h3>
              <p className="text-slate-600 leading-relaxed font-medium max-w-3xl">{event.description}</p>
            </div>
          </div>
        </div>

        {/* Registrants Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Registrants</h2>
            <div className="text-sm text-slate-500">
              {registrations.length} total
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-8 py-4 font-bold">Attendee</th>
                  <th className="px-8 py-4 font-bold">Company</th>
                  <th className="px-8 py-4 font-bold">Status</th>
                  <th className="px-8 py-4 font-bold">Date Joined</th>
                  <th className="px-8 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400">
                      No one has registered for this event yet.
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="font-semibold text-slate-900">{reg.attendee.first_name} {reg.attendee.last_name}</div>
                        <div className="text-sm text-slate-500">{reg.attendee.email}</div>
                      </td>
                      <td className="px-8 py-4 text-slate-600">
                        {reg.attendee.company || "—"}
                      </td>
                      <td className="px-8 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          reg.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {reg.status === "confirmed" ? <CheckCircle2 size={12} /> : null}
                          {reg.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500">
                        {new Date(reg.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button
                          onClick={() => handleDeleteRegistration(reg.id)}
                          disabled={deletingId === reg.id}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove registrant"
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
    </div>
  );
}
