"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Trash2, Building2, Lock } from "lucide-react";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";

const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function EditEventPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [originalBanner, setOriginalBanner] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    start_date: "",
    location: "",
    address: "",
    capacity: 100,
    duration_days: 1,
    banner_url: "",
    client_id: "",
    collect_company: true,
    allowed_domains: "",
    banner_size: "cover",
    banner_position: "center",
  });

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/py/clients", {
      headers: { "x-user-email": session.user.email }
    })
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch((err) => console.error("Failed to fetch clients", err));
  }, [session]);

  if (userRole === "staff") {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
            <Lock className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-[#0f172a] mb-4 uppercase italic font-bricolage tracking-tight dark:text-white">Access <span className="text-red-500">Restricted</span></h1>
          <p className="text-slate-500 font-medium max-w-md dark:text-slate-400">You do not have the clearance level required to edit events. Please contact a system administrator.</p>
        </div>
      </AdminLayout>
    );
  }

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch(`/api/py/events/id/${id}`, {
      headers: { "x-user-email": session.user.email }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then((data) => {
        // Format date for datetime-local input
        const formattedDate = data.start_date ? data.start_date.slice(0, 16) : "";
        
        setFormData({
          title: data.title,
          slug: data.slug,
          description: data.description,
          start_date: formattedDate,
          location: data.location,
          address: data.address || "",
          capacity: data.capacity,
          duration_days: data.duration_days || 1,
          banner_url: data.banner_url || "",
          client_id: data.client_id ? data.client_id.toString() : "",
          collect_company: data.collect_company !== false,
          allowed_domains: data.allowed_domains ? data.allowed_domains.join(", ") : "",
          banner_size: data.banner_settings?.size || "cover",
          banner_position: data.banner_settings?.position || "center",
        });
        setOriginalBanner(data.banner_url || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch event", err);
        setLoading(false);
      });
  }, [id, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { banner_size, banner_position, banner_url, ...submitData } = formData;
      
      const payload: any = {
        ...submitData,
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        start_date: formData.start_date,
        allowed_domains: formData.allowed_domains
          ? formData.allowed_domains.split(",").map(d => d.trim().toLowerCase()).filter(d => d)
          : [],
        banner_settings: {
          size: formData.banner_size,
          position: formData.banner_position,
        }
      };

      // Only send banner_url if it has changed to avoid payload limit issues (413)
      if (formData.banner_url !== originalBanner) {
        payload.banner_url = formData.banner_url;
      }

      const response = await fetch(`/api/py/events/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || "",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push(`/admin/events/${id}`);
      } else {
        let errorMessage = "Failed to update event";
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch (jsonErr) {
          try {
            errorMessage = await response.text();
          } catch (textErr) {}
        }
        alert(`Error: ${errorMessage}`);
      }
    } catch (err) {
      console.error("Failed to update event", err);
      alert("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone and will delete all registrations.")) return;
    
    try {
      const response = await fetch(`/api/py/events/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-email": session?.user?.email || "",
        }
      });

      if (response.ok) {
        router.push("/admin");
      } else {
        alert("Failed to delete event.");
      }
    } catch (err) {
      console.error("Failed to delete event", err);
      alert("An error occurred.");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="animate-spin text-[#1e293b]" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <Link 
            href={`/admin/events/${id}`} 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={18} />
            Back to Event
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold px-4 py-2 rounded-xl hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
          >
            <Trash2 size={20} />
            Delete Event
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
          <div className="bg-[#1e293b] px-10 py-10">
            <h1 className="text-3xl font-black text-white italic tracking-tight">Edit Event Settings</h1>
            <p className="text-slate-400 font-medium mt-2">Updating the parameters for "{formData.title}"</p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
                <input
                  required
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL Slug</label>
                <input
                  required
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
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
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50 appearance-none cursor-pointer"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id.toString()}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date & Time</label>
                <input
                  required
                  type="datetime-local"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Venue</label>
                <input
                  required
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                <input
                  required
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacity</label>
                <input
                  required
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration (Days)</label>
                <input
                  required
                  type="number"
                  min={1}
                  name="duration_days"
                  value={formData.duration_days}
                  onChange={handleChange}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-between justify-between">
                  Background Banner
                  {formData.banner_url && <button onClick={() => setFormData({...formData, banner_url: ""})} className="text-red-500 hover:underline">Remove</button>}
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file, 1600, 1600, 0.85);
                          setFormData(prev => ({ ...prev, banner_url: compressed }));
                        } catch (err) {
                          console.error("Compression failed, using original", err);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData(prev => ({ ...prev, banner_url: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className={`w-full h-24 rounded-2xl border-2 border-dashed ${formData.banner_url ? 'border-green-500/30 bg-green-50/50' : 'border-slate-200 bg-slate-50/50'} relative transition-all overflow-hidden`}>
                    {formData.banner_url ? (
                      <div className="absolute inset-0">
                        {formData.banner_size === "contain" && (
                          <div 
                            className="absolute inset-0 scale-110 blur-md opacity-60 bg-cover bg-center"
                            style={{ backgroundImage: `url(${formData.banner_url})` }}
                          />
                        )}
                        <div 
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `url(${formData.banner_url})`,
                            backgroundSize: formData.banner_size,
                            backgroundPosition: formData.banner_position,
                            backgroundRepeat: "no-repeat"
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Upload Banner Image</p>
                        <p className="text-[8px] text-slate-300 uppercase mt-1">Recommended: 1920x1080</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {formData.banner_url && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banner Display Settings</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Fit / Scale</label>
                      <select
                        name="banner_size"
                        value={formData.banner_size}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-xs text-slate-700 bg-slate-50/50 cursor-pointer"
                      >
                        <option value="cover">Cover (Fill Screen)</option>
                        <option value="contain">Contain (Show Full Image)</option>
                        <option value="100% 100%">Stretch to Fit</option>
                        <option value="auto 100%">Fit Height (Top to Bottom)</option>
                        <option value="100% auto">Fit Width</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Focus / Position</label>
                      <select
                        name="banner_position"
                        value={formData.banner_position}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-xs text-slate-700 bg-slate-50/50 cursor-pointer"
                      >
                        <option value="center">Center</option>
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Approved Email Domains (Optional - comma separated)</label>
              <input
                type="text"
                name="allowed_domains"
                value={formData.allowed_domains}
                onChange={handleChange}
                placeholder="e.g. bmdcomputing.com, companyname.co.za"
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
              />
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">Guests will only be permitted to register if their email ends in one of these domains.</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intelligence / Description</label>
              <textarea
                required
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50 resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registration Options</label>
              <label className="flex items-center gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="collect_company" 
                  checked={formData.collect_company} 
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-300 text-[#1e293b] focus:ring-[#1e293b]/5" 
                />
                <span className="text-xs font-bold text-slate-600">Collect Organization / Company name from guests</span>
              </label>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#1e293b] hover:bg-[#0f172a] disabled:bg-slate-300 text-white font-black py-5 rounded-2xl shadow-2xl shadow-slate-200 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {saving ? "Deploying Changes..." : "Commit Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
