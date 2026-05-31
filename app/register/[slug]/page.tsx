"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, MapPin, CheckCircle2, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface FormField {
  id: string;
  label: string;
  type: "text" | "select" | "checkbox";
  required: boolean;
  options?: string[];
  dependsOn?: {
    fieldId: string;
    value: string;
  };
}

interface Client {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  sender_name?: string;
  reply_to?: string;
  primary_color: string;
  accent_color: string;
  heading_text: string;
  body_text: string;
  footer_text: string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  start_date: string;
  location: string;
  address?: string;
  capacity: number;
  banner_url?: string;
  custom_fields_schema?: FormField[];
  client?: Client;
  collect_company?: boolean;
  banner_settings?: {
    size?: string;
    position?: string;
    theme?: string;
  };
}

export default function PublicRegistrationPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registeredId, setRegisteredId] = useState<string | null>(null);
  const [registeredPin, setRegisteredPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    company: "",
  });

  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

  // Prune any custom answers for fields that are hidden because of conditional branching
  useEffect(() => {
    if (!event?.custom_fields_schema) return;
    
    let changed = false;
    const newAnswers = { ...customAnswers };
    
    for (const field of event.custom_fields_schema) {
      if (field.dependsOn) {
        const parentVal = newAnswers[field.dependsOn.fieldId];
        const parentValStr = typeof parentVal === "boolean" ? String(parentVal) : parentVal;
        
        if (parentValStr !== field.dependsOn.value) {
          if (newAnswers[field.id] !== undefined) {
            delete newAnswers[field.id];
            changed = true;
          }
        }
      }
    }
    
    if (changed) {
      setCustomAnswers(newAnswers);
    }
  }, [customAnswers, event?.custom_fields_schema]);
  const [isAttending, setIsAttending] = useState<boolean>(true);

  useEffect(() => {
    fetch(`/api/py/events/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then((data) => {
        setEvent(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Event not found or has expired.");
        setLoading(false);
      });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setRegistering(true);

    try {
      const response = await fetch(`/api/py/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          ...formData,
          custom_answers: customAnswers,
          is_attending: isAttending
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRegisteredId(data.id);
        setRegisteredPin(data.pin);
        setStatusMessage(data.message);
      } else {
        const errData = await response.json().catch(() => ({}));
        setSubmitError(errData.detail || "Registration failed. Please check your details and try again.");
      }
    } catch (err) {
      console.error(err);
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCustomChange = (id: string, value: any) => {
    setCustomAnswers(prev => ({ ...prev, [id]: value }));
  };

  const client = event?.client;
  const theme = event?.banner_settings?.theme || "cyber_dark";

  const bannerUrl = event?.banner_url;
  const bannerSize = event?.banner_settings?.size;
  const bannerPosition = event?.banner_settings?.position;

  const themeStyles = {
    cyber_dark: {
      wrapper: "min-h-screen bg-black text-white animate-in fade-in duration-500",
      leftPanel: "bg-black p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col justify-between text-white relative overflow-hidden min-h-[50vh] lg:min-screen",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.1),transparent_70%)]",
      leftBgImage: bannerUrl ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {bannerSize === "contain" && (
            <div 
              className="absolute inset-0 scale-110 blur-2xl opacity-60 bg-cover bg-center" 
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
          )}
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: bannerSize || "cover",
              backgroundPosition: bannerPosition || "center",
              backgroundRepeat: "no-repeat"
            }}
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-zinc-900/30 border-l border-white/5 relative",
      title: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-6 lg:mb-10 leading-[0.9] tracking-tighter font-bricolage italic break-words text-white relative z-10",
      heading: "text-5xl font-black text-white mb-6 tracking-tight font-bricolage italic",
      subHeading: "text-zinc-500 text-lg font-medium leading-relaxed",
      label: "text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-1",
      input: "w-full px-6 py-5 rounded-[1.5rem] bg-zinc-950 border border-white/20 client-input-focus outline-none transition-all font-bold text-white placeholder-zinc-600",
      select: "w-full px-6 py-5 rounded-[1.5rem] bg-zinc-950 border border-white/20 client-input-focus outline-none transition-all font-bold text-white appearance-none cursor-pointer",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-zinc-950 rounded-[1.5rem] border border-white/20 client-hover-border-accent transition-all",
      checkboxText: "text-xs font-bold text-zinc-400 group-hover:text-white",
      card: "bg-zinc-900 p-5 rounded-2xl border border-white/5 client-hover-border-accent transition-all",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-zinc-900 rounded-full border border-white/5",
      badgeText: "text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400",
      rsvpBorder: "py-6 border-y border-white/5 space-y-4",
      divider: "border-t border-white/5",
      btnSubmit: "w-full client-bg-accent hover:bg-white disabled:bg-zinc-800 text-black font-black py-6 rounded-[2rem] shadow-2xl client-shadow-accent transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 ${active ? 'client-border-accent client-bg-accent text-black' : 'border-white/5 bg-transparent text-zinc-500 hover:border-white/10'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 ${active ? 'border-red-500 bg-red-500 text-white' : 'border-white/5 bg-transparent text-zinc-500 hover:border-white/10'}`,
      loader: "animate-spin client-text-accent",
      loadingBg: "min-h-screen flex items-center justify-center bg-black",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-black p-6",
      successBg: "min-h-screen flex items-center justify-center bg-black p-6",
      successCard: "bg-zinc-900 rounded-[3rem] shadow-2xl p-16 max-w-xl w-full text-center border border-white/5 relative overflow-hidden text-white",
      successQR: "bg-white/5 border border-white/10 rounded-2xl p-6 mb-8",
      textMain: "text-white",
      textMuted: "text-zinc-400",
    },
    minimal_light: {
      wrapper: "min-h-screen bg-slate-50 text-slate-800 animate-in fade-in duration-500",
      leftPanel: "p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col justify-between text-slate-900 relative overflow-hidden min-h-[50vh] lg:min-screen border-r border-slate-200/60 bg-white",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0.03),transparent_70%)]",
      leftBgImage: bannerUrl ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {bannerSize === "contain" && (
            <div 
              className="absolute inset-0 scale-110 blur-2xl opacity-60 bg-cover bg-center" 
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
          )}
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: bannerSize || "cover",
              backgroundPosition: bannerPosition || "center",
              backgroundRepeat: "no-repeat"
            }}
          />
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px]"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-slate-50 relative",
      title: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-6 lg:mb-10 leading-[0.9] tracking-tighter font-bricolage italic break-words text-slate-900 relative z-10",
      heading: "text-5xl font-black text-slate-900 mb-6 tracking-tight font-bricolage italic",
      subHeading: "text-slate-500 text-lg font-medium leading-relaxed",
      label: "text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1",
      input: "w-full px-6 py-5 rounded-[1.5rem] bg-white border border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all font-bold text-slate-900 placeholder-slate-300 shadow-sm",
      select: "w-full px-6 py-5 rounded-[1.5rem] bg-white border border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all font-bold text-slate-900 appearance-none cursor-pointer shadow-sm",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-white rounded-[1.5rem] border border-slate-200 hover:border-slate-400 transition-all shadow-sm",
      checkboxText: "text-xs font-bold text-slate-500 group-hover:text-slate-900",
      card: "bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-white rounded-full border border-slate-100 shadow-sm",
      badgeText: "text-[10px] font-black uppercase tracking-[0.3em] text-slate-500",
      rsvpBorder: "py-6 border-y border-slate-200/60 space-y-4",
      divider: "border-t border-slate-200/60",
      btnSubmit: "w-full client-bg-primary hover:opacity-90 disabled:bg-slate-200 text-white font-black py-6 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 ${active ? 'client-border-accent client-bg-accent text-black' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 ${active ? 'border-red-500 bg-red-500 text-white' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`,
      loader: "animate-spin text-slate-800",
      loadingBg: "min-h-screen flex items-center justify-center bg-slate-50",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6",
      successBg: "min-h-screen flex items-center justify-center bg-slate-50 p-6",
      successCard: "bg-white rounded-[3rem] shadow-2xl p-16 max-w-xl w-full text-center border border-slate-100 relative overflow-hidden text-slate-900",
      successQR: "bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8",
      textMain: "text-slate-900",
      textMuted: "text-slate-500",
    },
    glassmorphism: {
      wrapper: "min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-slate-950 text-white animate-in fade-in duration-500",
      leftPanel: "p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col justify-between text-white relative overflow-hidden min-h-[50vh] lg:min-screen",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_70%)]",
      leftBgImage: bannerUrl ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {bannerSize === "contain" && (
            <div 
              className="absolute inset-0 scale-110 blur-2xl opacity-60 bg-cover bg-center" 
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
          )}
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: bannerSize || "cover",
              backgroundPosition: bannerPosition || "center",
              backgroundRepeat: "no-repeat"
            }}
          />
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-white/5 backdrop-blur-md border-l border-white/10 relative",
      title: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-6 lg:mb-10 leading-[0.9] tracking-tighter font-bricolage italic break-words text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 relative z-10",
      heading: "text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 mb-6 tracking-tight font-bricolage italic",
      subHeading: "text-indigo-200/50 text-lg font-medium leading-relaxed",
      label: "text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200/70 ml-1",
      input: "w-full px-6 py-5 rounded-[1.5rem] bg-white/5 backdrop-blur-sm border border-white/10 focus:border-indigo-400 focus:bg-white/10 outline-none transition-all font-bold text-white placeholder-slate-400",
      select: "w-full px-6 py-5 rounded-[1.5rem] bg-white/5 backdrop-blur-sm border border-white/10 focus:border-indigo-400 focus:bg-white/10 outline-none transition-all font-bold text-white appearance-none cursor-pointer",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-indigo-500/50 transition-all",
      checkboxText: "text-xs font-bold text-indigo-200/50 group-hover:text-white",
      card: "bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10",
      badgeText: "text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200/70",
      rsvpBorder: "py-6 border-y border-white/10 space-y-4",
      divider: "border-t border-white/10",
      btnSubmit: "w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:brightness-110 disabled:bg-zinc-800 text-black font-black py-6 rounded-[2rem] shadow-lg shadow-yellow-500/10 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 ${active ? 'border-indigo-400 bg-indigo-500/30 text-white shadow-inner' : 'border-white/10 bg-transparent text-indigo-200/50 hover:border-white/20'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 ${active ? 'border-red-500/80 bg-red-500/30 text-white' : 'border-white/10 bg-transparent text-indigo-200/50 hover:border-white/20'}`,
      loader: "animate-spin text-indigo-400",
      loadingBg: "min-h-screen flex items-center justify-center bg-slate-950",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6",
      successBg: "min-h-screen flex items-center justify-center bg-slate-950 p-6",
      successCard: "bg-white/5 backdrop-blur-md rounded-[3rem] shadow-2xl p-16 max-w-xl w-full text-center border border-white/10 relative overflow-hidden text-white",
      successQR: "bg-white/5 border border-white/10 rounded-2xl p-6 mb-8",
      textMain: "text-white",
      textMuted: "text-indigo-200/50",
    },
    brutalist_retro: {
      wrapper: "min-h-screen bg-[#f8f4eb] text-black font-mono animate-in fade-in duration-500",
      leftPanel: "p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col justify-between text-white relative overflow-hidden min-h-[50vh] lg:min-screen border-r-[8px] border-black bg-[#1e1e1e]",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.1),transparent_70%)]",
      leftBgImage: bannerUrl ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {bannerSize === "contain" && (
            <div 
              className="absolute inset-0 scale-110 blur-2xl opacity-60 bg-cover bg-center" 
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
          )}
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: bannerSize || "cover",
              backgroundPosition: bannerPosition || "center",
              backgroundRepeat: "no-repeat"
            }}
          />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-[#fffbf0] relative border-l-[4px] border-black",
      title: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-6 lg:mb-10 leading-[0.9] tracking-tighter font-bricolage italic break-words text-[#facc15] uppercase relative z-10",
      heading: "text-5xl font-black text-black mb-6 tracking-tight font-bricolage italic uppercase border-b-4 border-black pb-4",
      subHeading: "text-black font-mono text-base font-bold",
      label: "text-xs font-black uppercase tracking-widest text-black ml-1 block",
      input: "w-full px-6 py-5 rounded-none bg-white border-[3px] border-black outline-none transition-all font-bold text-black placeholder-zinc-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
      select: "w-full px-6 py-5 rounded-none bg-white border-[3px] border-black outline-none transition-all font-bold text-black appearance-none cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-white rounded-none border-[3px] border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
      checkboxText: "text-xs font-black text-black uppercase",
      card: "bg-[#facc15] p-5 rounded-none border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-white rounded-none border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      badgeText: "text-[10px] font-black uppercase tracking-widest text-black",
      rsvpBorder: "py-6 border-y-[3px] border-black space-y-4",
      divider: "border-t-[3px] border-black",
      btnSubmit: "w-full bg-[#facc15] hover:bg-[#eab308] disabled:bg-zinc-300 text-black font-black py-6 border-[3px] border-black rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-none font-black border-[3px] border-black transition-all ${active ? 'bg-[#facc15] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-0.5 translate-y-0.5' : 'bg-white text-zinc-500 hover:bg-slate-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-none font-black border-[3px] border-black transition-all ${active ? 'bg-red-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-0.5 translate-y-0.5' : 'bg-white text-zinc-500 hover:bg-slate-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`,
      loader: "animate-spin text-black",
      loadingBg: "min-h-screen flex items-center justify-center bg-[#f8f4eb]",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-[#f8f4eb] p-6 border-[8px] border-black",
      successBg: "min-h-screen flex items-center justify-center bg-[#f8f4eb] p-6",
      successCard: "bg-[#fffbf0] rounded-none border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-16 max-w-xl w-full text-center relative overflow-hidden text-black",
      successQR: "bg-white border-[3px] border-black rounded-none p-6 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      textMain: "text-black",
      textMuted: "text-black font-mono",
    }
  };

  const style = themeStyles[theme as keyof typeof themeStyles] || themeStyles.cyber_dark;

  return (
    <>
      {client && (
        <style dangerouslySetInnerHTML={{ __html: `
          .client-text-accent { color: ${client.accent_color || '#eab308'} !important; }
          .client-bg-accent { background-color: ${client.accent_color || '#eab308'} !important; }
          .client-border-accent { border-color: ${client.accent_color || '#eab308'} !important; }
          .client-hover-border-accent:hover { border-color: ${client.accent_color || '#eab308'} !important; }
          .client-hover-bg-accent:hover { background-color: ${client.accent_color || '#eab308'} !important; }
          .client-shadow-accent { box-shadow: 0 25px 50px -12px ${(client.accent_color || '#eab308')}30 !important; }
          .client-text-primary { color: ${client.primary_color || '#0f172a'} !important; }
          .client-bg-primary { background-color: ${client.primary_color || '#0f172a'} !important; }
          .client-border-primary { border-color: ${client.primary_color || '#0f172a'} !important; }
          .client-input-focus:focus {
            border-color: ${client.accent_color || '#eab308'} !important;
            box-shadow: 0 0 0 4px ${client.accent_color}1a !important;
          }
          .client-checkbox:checked {
            background-color: ${client.accent_color || '#eab308'} !important;
            border-color: ${client.accent_color || '#eab308'} !important;
          }
        `}} />
      )}
      {loading ? (
        <div className={style.loadingBg}>
          <Loader2 className={style.loader} size={48} />
        </div>
      ) : error || !event ? (
        <div className={style.errorBg}>
          <AlertCircle className="text-red-500 mb-6" size={64} />
          <h1 className={`text-3xl font-black mb-4 font-bricolage italic uppercase tracking-tight ${style.textMain}`}>Access Denied</h1>
          <p className={`${style.textMuted} text-center max-w-md font-medium`}>{error}</p>
        </div>
      ) : registeredId ? (
        <div className={style.successBg}>
          <div className={style.successCard}>
            {theme === "cyber_dark" && <div className="absolute top-0 left-0 w-full h-1 client-bg-accent"></div>}
            <div className={`${theme === "cyber_dark" ? "client-bg-accent animate-bounce" : theme === "minimal_light" ? "client-bg-primary animate-pulse" : theme === "brutalist_retro" ? "bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : "bg-gradient-to-r from-yellow-500 to-indigo-500"} w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl`}>
              <CheckCircle2 className={theme === "minimal_light" ? "text-white" : "text-black"} size={56} />
            </div>
            <h1 className={`text-4xl font-black mb-6 font-bricolage italic uppercase tracking-tight ${style.textMain}`}>
              {statusMessage || (isAttending ? "Access Granted." : "Response Recorded.")}
            </h1>
            <p className={`${style.textMuted} mb-12 font-medium leading-relaxed`}>
              Your orchestration for <span className={`${style.textMain} font-bold`}>{event.title}</span> is confirmed. 
              {isAttending 
                ? ` Verification has been dispatched to `
                : ` We've noted that you cannot attend. Thank you for letting us know. `}
              {isAttending && <span className={`${theme === "minimal_light" ? "client-text-primary" : "client-text-accent"} font-bold`}>{formData.email}</span>}
            </p>
            {isAttending && (
              <div className={style.successQR}>
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-2 rounded-xl">
                    <QRCodeSVG 
                      value={registeredPin || registeredId || ""} 
                      size={160}
                      level="M"
                    />
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">Unique Clearance ID</p>
                <p className={`text-3xl font-black ${theme === "minimal_light" ? "client-text-primary" : "client-text-accent"} tracking-tighter italic font-bricolage`}>
                  {registeredPin || (registeredId ? registeredId.substring(0, 8) : "")}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={style.wrapper}>
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
            {/* Left Side: Info */}
            <div className={style.leftPanel}>
              {style.leftBgImage}
              {!event.banner_url && theme === "cyber_dark" && <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.1),transparent_70%)]"></div>}
              {!event.banner_url && theme === "minimal_light" && <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0.03),transparent_70%)]"></div>}
              {!event.banner_url && theme === "glassmorphism" && <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_70%)]"></div>}
              {!event.banner_url && theme === "brutalist_retro" && <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.1),transparent_70%)]"></div>}
              
              <div className="relative z-10 my-auto py-12 lg:py-24">
                <h1 className={style.title}>{event.title}</h1>
                <p className={`text-xl mb-10 lg:mb-20 max-w-lg leading-relaxed font-medium ${style.textMuted}`}>{event.description}</p>
                <div className="space-y-6 lg:space-y-10">
                  <div className="flex items-center gap-8 group">
                    <div className={style.card}>
                      <Calendar size={32} className={theme === "minimal_light" ? "client-text-primary" : "client-text-accent"} />
                    </div>
                    <div>
                      <p className={`${style.textMuted} text-[10px] font-black uppercase tracking-[0.3em] mb-2`}>Schedule</p>
                      <p className={`text-2xl font-black font-bricolage italic tracking-tight ${style.textMain}`}>{new Date(event.start_date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-8 group">
                    <div className={style.card}>
                      <MapPin size={32} className={theme === "minimal_light" ? "client-text-primary" : "client-text-accent"} />
                    </div>
                    <div>
                      <p className={`${style.textMuted} text-[10px] font-black uppercase tracking-[0.3em] mb-2`}>Venue</p>
                      <p className={`text-2xl font-black font-bricolage italic tracking-tight ${style.textMain}`}>{event.location}</p>
                      {event.address && (
                        <p className={`${style.textMuted} text-sm font-medium leading-relaxed max-w-sm mt-1`}>{event.address}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-12 lg:mt-0">
                <div className={style.badge}>
                  {client?.logo_url ? (
                    <img src={client.logo_url} alt={client.name} className="h-6 object-contain animate-in zoom-in duration-300" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full animate-pulse ${theme === "minimal_light" ? "client-bg-primary" : "client-bg-accent"}`}></span>
                  )}
                  <span className={style.badgeText}>
                    {client?.name || "Excellence Entertainment Logistics"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side: Form */}
            <div className={style.rightPanel}>
              <div className="max-w-md w-full mx-auto relative z-10 py-12">
                <div className="mb-16">
                  <h2 className={style.heading}>Register.</h2>
                  <p className={style.subHeading}>Secure your credentials for this exclusive engagement.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Default Fields */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className={style.label}>First Name</label>
                      <input required type="text" name="first_name" value={formData.first_name} onChange={handleChange} className={style.input} placeholder="Jane" />
                    </div>
                    <div className="space-y-3">
                      <label className={style.label}>Last Name</label>
                      <input required type="text" name="last_name" value={formData.last_name} onChange={handleChange} className={style.input} placeholder="Doe" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className={style.label}>Intelligence / Email</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="jane.doe@company.com" className={style.input} />
                  </div>

                  {event.collect_company !== false && (
                    <div className="space-y-3">
                      <label className={style.label}>Organization</label>
                      <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="Global Enterprises Inc." className={style.input} />
                    </div>
                  )}

                  {/* RSVP Question */}
                  <div className={style.rsvpBorder}>
                    <label className={style.label}>Attendance Status</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setIsAttending(true)}
                        className={style.btnAttending(isAttending)}
                      >
                        I am attending
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAttending(false)}
                        className={style.btnNotAttending(!isAttending)}
                      >
                        Cannot attend
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Custom Fields */}
                  {isAttending && event.custom_fields_schema && event.custom_fields_schema.length > 0 && (
                    <div className={`pt-4 pb-2 ${style.divider}`}>
                      <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme === "minimal_light" ? "client-text-primary" : "client-text-accent"}`}>Additional Details</p>
                    </div>
                  )}
                  {isAttending && event.custom_fields_schema?.map((field) => {
                    if (field.dependsOn) {
                      const parentVal = customAnswers[field.dependsOn.fieldId];
                      const parentValStr = typeof parentVal === "boolean" ? String(parentVal) : parentVal;
                      if (parentValStr !== field.dependsOn.value) {
                        return null;
                      }
                    }

                    return (
                      <div key={field.id} className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <label className={`${style.label} ${theme === "brutalist_retro" ? "" : "text-zinc-200"}`}>
                          {field.label} {field.required && <span className={`${theme === "minimal_light" ? "client-text-primary" : "client-text-accent"} ml-0.5 font-bold`}>*</span>}
                        </label>
                        
                        {field.type === "text" && (
                          <input
                            required={field.required}
                            type="text"
                            onChange={(e) => handleCustomChange(field.id, e.target.value)}
                            className={style.input}
                          />
                        )}

                        {field.type === "select" && (
                          <div className="relative">
                            <select
                              required={field.required}
                              onChange={(e) => handleCustomChange(field.id, e.target.value)}
                              className={style.select}
                            >
                              <option value="" className={theme === "minimal_light" || theme === "brutalist_retro" ? "text-black" : "text-white"}>Select Option</option>
                              {field.options?.map(opt => <option key={opt} value={opt} className={theme === "minimal_light" || theme === "brutalist_retro" ? "text-black" : "text-white"}>{opt}</option>)}
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={20} />
                          </div>
                        )}

                        {field.type === "checkbox" && (
                          <label className={style.checkbox}>
                             <input 
                               type="checkbox" 
                               onChange={(e) => handleCustomChange(field.id, e.target.checked)}
                               className="w-6 h-6 rounded-lg bg-zinc-900 border-white/10 client-checkbox transition-all" 
                             />
                             <span className={style.checkboxText}>Yes, I agree / confirm</span>
                          </label>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-8">
                    {submitError && (
                      <div className="mb-4 px-5 py-4 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-start gap-3">
                        <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                        <p className="text-red-300 text-sm font-medium leading-snug">{submitError}</p>
                      </div>
                    )}
                    <button type="submit" disabled={registering} className={style.btnSubmit}>
                      {registering ? <Loader2 className="animate-spin" size={20} /> : null}
                      {registering ? "Dispatching..." : "Submit Registration"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
