"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Save, Loader2, Sparkles, Globe, Calendar, MapPin, Users, FileText, Lock } from "lucide-react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";

export default function CreateEventPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (userRole === "staff") {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
            <Lock className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-[#0f172a] mb-4 uppercase italic font-bricolage tracking-tight">Access <span className="text-red-500">Restricted</span></h1>
          <p className="text-slate-500 font-medium max-w-md">You do not have the clearance level required to initialize new events. Please contact a system administrator.</p>
        </div>
      </AdminLayout>
    );
  }
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    start_date: "",
    location: "",
    capacity: 100,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate date
      if (!formData.start_date) {
        alert("Please select a start date and time.");
        setLoading(false);
        return;
      }

      let formattedDate;
      try {
        formattedDate = new Date(formData.start_date).toISOString();
      } catch (dateErr) {
        alert("Invalid date format. Please re-select the date and time.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/py/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          start_date: formattedDate,
        }),
      });

      if (response.ok) {
        router.push("/admin/events");
      } else {
        let errorMessage = "Failed to create event";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonErr) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        alert(`Error: ${errorMessage}`);
      }
    } catch (err) {
      console.error("Failed to create event", err);
      alert(`An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "capacity" ? parseInt(value) : value,
    }));
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto font-outfit">
        <Link 
          href="/admin/events" 
          className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-[#0f172a] transition-colors mb-4 block"
        >
          ← Back to Catalog
        </Link>

        <div className="flex items-center gap-4 mb-12">
           <div className="w-16 h-16 bg-[#0f172a] text-white rounded-[2rem] flex items-center justify-center shadow-2xl">
              <Sparkles size={32} />
           </div>
           <div>
              <h1 className="text-4xl font-black text-[#0f172a] tracking-tighter font-bricolage italic uppercase">LAUNCH <span className="text-slate-300">NEW EVENT</span></h1>
              <p className="text-slate-500 font-medium">Define the parameters for your next logistics masterpiece.</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
           {/* Section 1: Core Details */}
           <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-14">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                 <FileText size={16} /> Core Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
                    <input
                      required
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g. Excellence Gala 2026"
                      className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all"
                    />
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Globe size={14} /> URL Slug
                    </label>
                    <input
                      required
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      placeholder="excellence-gala-2026"
                      className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all"
                    />
                 </div>
              </div>

              <div className="mt-10 space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manifesto (Description)</label>
                 <textarea
                    required
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe the vision and scope of this event..."
                    className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all resize-none"
                 />
              </div>
           </div>

           {/* Section 2: Logistics */}
           <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-14">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                 <MapPin size={16} /> Logistics & Scheduling
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Calendar size={14} /> Start Date
                    </label>
                    <input
                      required
                      type="datetime-local"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                      className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all"
                    />
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">Note: Please select both date and time</p>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <MapPin size={14} /> Venue
                    </label>
                    <input
                      required
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g. Metropolitan Hall"
                      className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all"
                    />
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Users size={14} /> Capacity
                    </label>
                    <input
                      required
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all"
                    />
                 </div>
              </div>
           </div>

           <div className="flex gap-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#0f172a] hover:bg-black disabled:bg-slate-200 text-white px-10 py-6 rounded-[2rem] font-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {loading ? "Initializing..." : "Launch Event"}
              </button>
           </div>
        </form>
      </div>
    </AdminLayout>
  );
}
