"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Save, Loader2, Sparkles, Globe, Calendar, MapPin, Users, FileText, Lock, Building2, Mail, Type } from "lucide-react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import RichTextEditor from "@/components/RichTextEditor";

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
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    start_date: "",
    location: "",
    address: "",
    capacity: 100,
    duration_days: 1,
    client_id: "",
    collect_company: true,
    company_required: false,
    allowed_domains: "",
    registration_active: true,
    registration_start: "",
    registration_end: "",
    disclaimer_enabled: false,
    disclaimer_text: "",
    sender_email: "",
    sender_name: "",
  });
  const [senderEmails, setSenderEmails] = useState<string[]>([]);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/py/clients", {
      headers: {
        "x-user-email": session.user.email
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setClients(data);
        if (data.length > 0) {
          setFormData((prev) => ({
            ...prev,
            client_id: data[0].id.toString(),
          }));
        }
      })
      .catch((err) => console.error("Failed to fetch clients", err));
  }, [session]);

  useEffect(() => {
    if ((userRole !== "admin" && userRole !== "manager") || !session?.user?.email) return;
    fetch("/api/py/settings/sender-domains", {
      headers: { "x-user-email": session.user.email }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSenderEmails(data);
        }
      })
      .catch((err) => console.error("Failed to fetch sender domains", err));
  }, [userRole, session]);

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

      const response = await fetch("/api/py/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "",
        },
        body: JSON.stringify({
          ...formData,
          client_id: formData.client_id ? parseInt(formData.client_id) : null,
          sender_email: formData.sender_email || null,
          sender_name: formData.sender_name || null,
          start_date: formData.start_date,
          allowed_domains: formData.allowed_domains
            ? formData.allowed_domains.split(",").map(d => d.trim().toLowerCase()).filter(d => d)
            : [],
          registration_start: formData.registration_start || null,
          registration_end: formData.registration_end || null,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (name === "capacity" || name === "duration_days" ? parseInt(value) : value),
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
                     <RichTextEditor 
                        value={formData.title || ""} 
                        onChange={(val) => setFormData(prev => ({ ...prev, title: val }))} 
                        placeholder="e.g. Excellence Gala 2026"
                        minHeight="80px"
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

                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Building2 size={14} /> Brand Client
                     </label>
                     <select
                       name="client_id"
                       value={formData.client_id}
                       onChange={handleChange}
                       className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all appearance-none cursor-pointer"
                     >
                       {clients.map((c) => (
                         <option key={c.id} value={c.id.toString()}>{c.name}</option>
                       ))}
                     </select>
                  </div>
               </div>

                {(userRole === "admin" || userRole === "manager") && (
                  <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Mail size={14} /> Email Sender Domain
                       </label>
                       <select
                         name="sender_email"
                         value={formData.sender_email}
                         onChange={handleChange}
                         className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all appearance-none cursor-pointer"
                       >
                         <option value="">Default (events@eelogistics.co.za)</option>
                         {(senderEmails.length > 0 ? senderEmails : ["events@eelogistics.co.za", "events@bmdcomputing.com"]).map((email) => (
                           <option key={email} value={email}>{email}</option>
                         ))}
                       </select>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Type size={14} /> Email Sender Name
                       </label>
                       <input
                         type="text"
                         name="sender_name"
                         value={formData.sender_name}
                         onChange={handleChange}
                         placeholder="e.g. EEL-Events"
                         className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all"
                       />
                    </div>
                  </div>
                )}

              <div className="mt-10 space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Approved Email Domains (Optional - comma separated)</label>
                 <input
                   type="text"
                   name="allowed_domains"
                   value={formData.allowed_domains}
                   onChange={handleChange}
                   placeholder="e.g. bmdcomputing.com, companyname.co.za"
                   className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all"
                 />
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">Guests will only be permitted to register if their email ends in one of these domains.</p>
              </div>

              <div className="mt-10 space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manifesto (Description)</label>
                  <RichTextEditor 
                     value={formData.description || ""} 
                     onChange={(val) => setFormData(prev => ({ ...prev, description: val }))} 
                     placeholder="Describe the vision and scope of this event..."
                     minHeight="120px"
                  />
              </div>

              <div className="mt-8 space-y-3 bg-slate-50 rounded-2xl p-5">
                 <label className="flex items-center gap-4 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="collect_company" 
                      checked={formData.collect_company} 
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-slate-300 text-[#0f172a] focus:ring-yellow-400/20" 
                    />
                    <span className="text-xs font-bold text-[#0f172a]">Collect Organization / Company name from guests</span>
                 </label>
                 {formData.collect_company && (
                   <label className="flex items-center gap-4 pl-9 mt-2 cursor-pointer border-t border-slate-200/50 pt-2">
                      <input 
                        type="checkbox" 
                        name="company_required" 
                        checked={formData.company_required} 
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-slate-300 text-[#0f172a] focus:ring-yellow-400/20" 
                      />
                      <span className="text-xs font-bold text-[#0f172a]">Organization / Company is required</span>
                   </label>
                 )}
              </div>
           </div>

           {/* Section 2: Logistics */}
           <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-14">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                 <MapPin size={16} /> Logistics & Scheduling
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                        <MapPin size={14} /> Address
                     </label>
                     <input
                       required
                       type="text"
                       name="address"
                       value={formData.address}
                       onChange={handleChange}
                       placeholder="e.g. 12 Main Street, Washington"
                       className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all"
                     />
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Calendar size={14} /> Duration (Days)
                     </label>
                     <input
                       required
                       type="number"
                       min={1}
                       name="duration_days"
                       value={formData.duration_days}
                       onChange={handleChange}
                       className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all"
                     />
                  </div>
                </div>
            </div>

            {/* Section 3: Registration Status & Disclaimer */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-14">
               <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                  <Lock size={16} /> Registration Access & Disclaimer
               </h3>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Registration Active Toggle */}
                  <div className="space-y-3 md:col-span-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registration Availability</label>
                     <label className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-colors">
                        <input 
                          type="checkbox" 
                          name="registration_active" 
                          checked={formData.registration_active} 
                          onChange={handleChange}
                          className="w-5 h-5 rounded border-slate-300 text-[#0f172a] focus:ring-yellow-400/20" 
                        />
                        <div>
                           <p className="text-xs font-bold text-[#0f172a]">Registration Form Active</p>
                           <p className="text-[10px] text-slate-400 mt-0.5">Toggle this off to immediately suspend all public registrations.</p>
                        </div>
                     </label>
                  </div>

                  {/* Scheduling Dates */}
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Schedule Open Date & Time (Optional)</label>
                     <input
                       type="datetime-local"
                       name="registration_start"
                       value={formData.registration_start}
                       onChange={handleChange}
                       className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all"
                     />
                     <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">Leave empty to open immediately</p>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Schedule Close Date & Time (Optional)</label>
                     <input
                       type="datetime-local"
                       name="registration_end"
                       value={formData.registration_end}
                       onChange={handleChange}
                       className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all"
                     />
                     <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">Leave empty to keep open indefinitely</p>
                  </div>

                  {/* Disclaimer Toggle */}
                  <div className="space-y-3 md:col-span-2 border-t border-slate-100 pt-8 mt-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Disclaimer & Indemnity</label>
                     <label className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-colors">
                        <input 
                          type="checkbox" 
                          name="disclaimer_enabled" 
                          checked={formData.disclaimer_enabled} 
                          onChange={handleChange}
                          className="w-5 h-5 rounded border-slate-300 text-[#0f172a] focus:ring-yellow-400/20" 
                        />
                        <div>
                           <p className="text-xs font-bold text-[#0f172a]">Enable Disclaimer & Indemnity</p>
                           <p className="text-[10px] text-slate-400 mt-0.5">Show a custom terms/indemnity agreement that guests must accept to register.</p>
                        </div>
                     </label>
                  </div>

                  {/* Disclaimer Text Area (Conditional) */}
                  {formData.disclaimer_enabled && (
                     <div className="space-y-3 md:col-span-2 animate-in fade-in slide-in-from-bottom-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Disclaimer Content</label>
                        <textarea
                          required={formData.disclaimer_enabled}
                          name="disclaimer_text"
                          value={formData.disclaimer_text}
                          onChange={handleChange}
                          rows={4}
                          placeholder="Enter the disclaimer and indemnity statement that guests must read and accept..."
                          className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] transition-all resize-none"
                        />
                     </div>
                  )}
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
