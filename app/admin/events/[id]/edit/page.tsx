"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Trash2, Building2, Lock } from "lucide-react";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";

const THEME_DEFAULTS = {
  cyber_dark: { primary: "#000000", accent: "#eab308" },
  minimal_light: { primary: "#0f172a", accent: "#0284c7" },
  glassmorphism: { primary: "#1e1b4b", accent: "#6366f1" },
  brutalist_retro: { primary: "#000000", accent: "#facc15" },
  midnight_luxury: { primary: "#0a1128", accent: "#d4af37" },
  neon_horizon: { primary: "#000000", accent: "#ff007f" },
  forest_zen: { primary: "#1c2e24", accent: "#2d4a39" },
  aurora_glow: { primary: "#070b19", accent: "#14b8a6" },
  crimson_sunset: { primary: "#3a0d1e", accent: "#f08a5d" },
  cyberpunk_terminal: { primary: "#000000", accent: "#39ff14" },
  corporate_mono: { primary: "#334155", accent: "#0f172a" },
  nordic_alabaster: { primary: "#1c1917", accent: "#78716c" },
  midnight_executive: { primary: "#0d0e12", accent: "#2563eb" },
  champagne_lounge: { primary: "#4a3f35", accent: "#c5a059" },
  logistics_glass: { primary: "#1e293b", accent: "#94a3b8" }
};

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
  const [originalLogo, setOriginalLogo] = useState("");
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
    logo_url: "",
    client_id: "",
    collect_company: true,
    allowed_domains: "",
    banner_size: "cover",
    banner_position: "center",
    banner_theme: "cyber_dark",
    banner_primary_color: "",
    banner_accent_color: "",
    banner_layout: "",
    registration_active: true,
    registration_start: "",
    registration_end: "",
    disclaimer_enabled: false,
    disclaimer_text: "",
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
          logo_url: data.logo_url || "",
          client_id: data.client_id ? data.client_id.toString() : "",
          collect_company: data.collect_company !== false,
          allowed_domains: data.allowed_domains ? data.allowed_domains.join(", ") : "",
          banner_size: data.banner_settings?.size || "cover",
          banner_position: data.banner_settings?.position || "center",
          banner_theme: data.banner_settings?.theme || "cyber_dark",
          banner_primary_color: data.banner_settings?.primary_color || "",
          banner_accent_color: data.banner_settings?.accent_color || "",
          banner_layout: data.banner_settings?.layout || "",
          registration_active: data.registration_active !== false,
          registration_start: data.registration_start ? data.registration_start.slice(0, 16) : "",
          registration_end: data.registration_end ? data.registration_end.slice(0, 16) : "",
          disclaimer_enabled: !!data.disclaimer_enabled,
          disclaimer_text: data.disclaimer_text || "",
        });
        setOriginalBanner(data.banner_url || "");
        setOriginalLogo(data.logo_url || "");
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
      const { banner_size, banner_position, banner_theme, banner_primary_color, banner_accent_color, banner_layout, banner_url, logo_url, ...submitData } = formData;
      
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
          theme: formData.banner_theme,
          primary_color: formData.banner_primary_color || "",
          accent_color: formData.banner_accent_color || "",
          layout: formData.banner_layout || "",
        },
        registration_start: formData.registration_start || null,
        registration_end: formData.registration_end || null,
      };

      // Only send banner_url if it has changed to avoid payload limit issues (413)
      if (formData.banner_url !== originalBanner) {
        payload.banner_url = formData.banner_url;
      }

      // Only send logo_url if it has changed to avoid payload limit issues (413)
      if (formData.logo_url !== originalLogo) {
        payload.logo_url = formData.logo_url;
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
    
    if (name === "banner_theme") {
      const defaults = THEME_DEFAULTS[value as keyof typeof THEME_DEFAULTS];
      setFormData((prev) => ({
        ...prev,
        banner_theme: value,
        banner_primary_color: defaults?.primary || "",
        banner_accent_color: defaults?.accent || "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : (name === "capacity" || name === "duration_days" ? parseInt(value) : value),
      }));
    }
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

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                  Event Email Logo Override
                  {formData.logo_url && <button type="button" onClick={() => setFormData({...formData, logo_url: ""})} className="text-red-500 hover:underline">Remove</button>}
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file, 800, 800, 0.85);
                          setFormData(prev => ({ ...prev, logo_url: compressed }));
                        } catch (err) {
                          console.error("Compression failed, using original", err);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className={`w-full h-24 rounded-2xl border-2 border-dashed ${formData.logo_url ? 'border-green-500/30 bg-green-50/50' : 'border-slate-200 bg-slate-50/50'} relative transition-all overflow-hidden`}>
                    {formData.logo_url ? (
                      <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-900/5">
                        <img 
                          src={formData.logo_url} 
                          alt="Logo Preview" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Upload Custom Email Logo</p>
                        <p className="text-[8px] text-slate-300 uppercase mt-1">Overrides client/default logo for this event</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registration Form Design Style</label>
                <select
                  name="banner_theme"
                  value={formData.banner_theme}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-xs text-slate-700 bg-slate-50/50 cursor-pointer"
                >
                  <option value="cyber_dark">Cyber Dark (Premium Black & Gold)</option>
                  <option value="minimal_light">Minimal Light (Clean White & Slate)</option>
                  <option value="glassmorphism">Glassmorphism (Frosted Glass Overlay)</option>
                  <option value="brutalist_retro">Brutalist Retro (Bold Typography & Retro Tech)</option>
                  <option value="midnight_luxury">Midnight Luxury (Deep Royal Blue & Gold)</option>
                  <option value="neon_horizon">Neon Horizon (Synthwave & Neon Glow)</option>
                  <option value="forest_zen">Forest Zen (Deep Emerald & Sage Stacked)</option>
                  <option value="aurora_glow">Aurora Glow (Dynamic Gradient & Glassmorphism)</option>
                  <option value="crimson_sunset">Crimson Sunset (Burgundy & Warm Coral)</option>
                  <option value="cyberpunk_terminal">Cyberpunk Terminal (Matrix Green & Scanlines)</option>
                  <option value="corporate_mono">Corporate Mono (Slate Grey & Pure Minimalist)</option>
                  <option value="nordic_alabaster">Nordic Alabaster (Off-White & Editorial Serif)</option>
                  <option value="midnight_executive">Midnight Executive (Deep Charcoal & Electric Blue)</option>
                  <option value="champagne_lounge">Champagne Lounge (Warm Alabaster & Brushed Gold)</option>
                  <option value="logistics_glass">Logistics Glass (Translucent Slate & Steel Borders)</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registration Form Layout</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { id: "", label: "Default", desc: "Theme default" },
                    { id: "stacked", label: "Stacked", desc: "Top Banner" },
                    { id: "split", label: "Split Right", desc: "Form on Right" },
                    { id: "reversed", label: "Split Left", desc: "Form on Left" },
                    { id: "centered", label: "Centered", desc: "Centered Card" }
                  ].map((lay) => {
                    const active = formData.banner_layout === lay.id;
                    return (
                      <button
                        key={lay.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, banner_layout: lay.id }))}
                        className={`flex flex-col items-center justify-between p-2.5 rounded-xl border text-center transition-all bg-white hover:border-slate-350 ${
                          active 
                            ? "border-slate-800 ring-2 ring-slate-800/10 shadow-sm" 
                            : "border-slate-100 shadow-sm opacity-80 hover:opacity-100"
                        }`}
                      >
                        {lay.id === "" && (
                          <div className="relative w-full h-10 bg-slate-100 rounded flex items-center justify-center border border-slate-200/60 mb-2 overflow-hidden">
                            <div className="text-[9px] font-black tracking-tighter text-slate-400 uppercase">Default</div>
                          </div>
                        )}
                        {lay.id === "stacked" && (
                          <div className="flex flex-col gap-0.5 w-full h-10 bg-slate-150 rounded p-1 border border-slate-200/60 mb-2">
                            <div className="bg-slate-350 h-2 w-full rounded-sm"></div>
                            <div className="bg-white h-5 w-4/5 mx-auto rounded-sm border border-slate-200 flex items-center justify-center">
                              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                            </div>
                          </div>
                        )}
                        {lay.id === "split" && (
                          <div className="flex gap-0.5 w-full h-10 bg-slate-150 rounded p-1 border border-slate-200/60 mb-2">
                            <div className="bg-slate-350 w-2/5 h-full rounded-sm"></div>
                            <div className="bg-white w-3/5 h-full rounded-sm border border-slate-200 flex items-center justify-center">
                              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                            </div>
                          </div>
                        )}
                        {lay.id === "reversed" && (
                          <div className="flex gap-0.5 w-full h-10 bg-slate-150 rounded p-1 border border-slate-200/60 mb-2">
                            <div className="bg-white w-3/5 h-full rounded-sm border border-slate-200 flex items-center justify-center">
                              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                            </div>
                            <div className="bg-slate-350 w-2/5 h-full rounded-sm"></div>
                          </div>
                        )}
                        {lay.id === "centered" && (
                          <div className="relative w-full h-10 bg-slate-200 rounded p-1 border border-slate-250 mb-2 flex items-center justify-center">
                            <div className="bg-white w-3/4 h-6 rounded-sm border border-slate-300 shadow-sm flex items-center justify-center">
                              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                            </div>
                          </div>
                        )}
                        <span className="text-[10px] font-black tracking-tight text-slate-800 block leading-tight">{lay.label}</span>
                        <span className="text-[8px] text-slate-400 font-bold block">{lay.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Custom Primary Color Override</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="banner_primary_color"
                      value={formData.banner_primary_color || "#000000"}
                      onChange={handleChange}
                      className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      name="banner_primary_color"
                      value={formData.banner_primary_color}
                      onChange={handleChange}
                      placeholder="e.g. #0f172a"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-slate-700 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Custom Accent Color Override</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="banner_accent_color"
                      value={formData.banner_accent_color || "#000000"}
                      onChange={handleChange}
                      className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      name="banner_accent_color"
                      value={formData.banner_accent_color}
                      onChange={handleChange}
                      placeholder="e.g. #eab308"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-slate-700 bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>
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

            {/* Registration Active & Disclaimer Section */}
            <div className="border-t border-slate-100 pt-8 mt-6 space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                 <Lock size={16} /> Registration Access & Disclaimer
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Registration Active Toggle */}
                 <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registration Availability</label>
                    <label className="flex items-center gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                       <input 
                         type="checkbox" 
                         name="registration_active" 
                         checked={formData.registration_active} 
                         onChange={handleChange}
                         className="w-5 h-5 rounded border-slate-300 text-[#1e293b] focus:ring-[#1e293b]/5" 
                       />
                       <div>
                          <p className="text-xs font-bold text-[#1e293b]">Registration Form Active</p>
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
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
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
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
                    />
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">Leave empty to keep open indefinitely</p>
                 </div>

                 {/* Disclaimer Toggle */}
                 <div className="space-y-3 md:col-span-2 border-t border-slate-100 pt-6 mt-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Disclaimer & Indemnity</label>
                    <label className="flex items-center gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                       <input 
                         type="checkbox" 
                         name="disclaimer_enabled" 
                         checked={formData.disclaimer_enabled} 
                         onChange={handleChange}
                         className="w-5 h-5 rounded border-slate-300 text-[#1e293b] focus:ring-[#1e293b]/5" 
                       />
                       <div>
                          <p className="text-xs font-bold text-[#1e293b]">Enable Disclaimer & Indemnity</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Show a custom terms/indemnity agreement that guests must accept to register.</p>
                       </div>
                    </label>
                 </div>

                 {/* Disclaimer Text Area (Conditional) */}
                 {formData.disclaimer_enabled && (
                    <div className="space-y-3 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Disclaimer Content</label>
                       <textarea
                         required={formData.disclaimer_enabled}
                         name="disclaimer_text"
                         value={formData.disclaimer_text}
                         onChange={handleChange}
                         rows={4}
                         placeholder="Enter the disclaimer and indemnity statement that guests must read and accept..."
                         className="w-full px-5 py-4 rounded-2xl border border-slate-100 focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 outline-none transition-all font-bold text-slate-700 bg-slate-50/50 resize-none"
                       />
                    </div>
                 )}
              </div>
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
