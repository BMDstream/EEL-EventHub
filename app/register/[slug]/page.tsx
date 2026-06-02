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
  description?: string;
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
  registration_active?: boolean;
  registration_start?: string;
  registration_end?: string;
  disclaimer_enabled?: boolean;
  disclaimer_text?: string;
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
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

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
  const [isAttending, setIsAttending] = useState<boolean | null>(null);

  // Check if registration is active or scheduled
  let registrationClosed = false;
  let closureReason = "";
  
  if (event) {
    const now = new Date();
    if (event.registration_active === false) {
      registrationClosed = true;
      closureReason = "Registration is currently closed for this event.";
    } else {
      if (event.registration_start) {
        const startDate = new Date(event.registration_start);
        if (now < startDate) {
          registrationClosed = true;
          closureReason = `Registration has not opened yet. It is scheduled to open on ${startDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.`;
        }
      }
      if (event.registration_end) {
        const endDate = new Date(event.registration_end);
        if (now > endDate) {
          registrationClosed = true;
          closureReason = "Registration for this event has closed.";
        }
      }
    }
  }

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
    
    if (isAttending === null) {
      setSubmitError("Please select your attendance status.");
      return;
    }
    
    // Enforce disclaimer acceptance
    if (isAttending && event.disclaimer_enabled && event.disclaimer_text && !disclaimerAccepted) {
      setSubmitError("You must read and accept the Disclaimer and Indemnity to register.");
      return;
    }
    
    setRegistering(true);
    setSubmitError(null);

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
      wrapper: "min-h-screen bg-black text-white animate-in fade-in duration-500 relative",
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
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-zinc-900/40 backdrop-blur-md border-l border-white/5 relative",
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
      centeredCard: "",
      headerBlock: "",
      bodyBlock: "",
    },
    minimal_light: {
      wrapper: "min-h-screen bg-slate-50 text-slate-800 animate-in fade-in duration-500 relative",
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
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-white/70 backdrop-blur-md border-l border-slate-200/40 relative",
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
      centeredCard: "",
      headerBlock: "",
      bodyBlock: "",
    },
    glassmorphism: {
      wrapper: "min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-slate-950 text-white animate-in fade-in duration-500 relative",
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
      centeredCard: "",
      headerBlock: "",
      bodyBlock: "",
    },
    brutalist_retro: {
      wrapper: "min-h-screen bg-[#f8f4eb] text-black font-mono animate-in fade-in duration-500 relative",
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
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-[#fffbf0]/80 backdrop-blur-md relative border-l-[4px] border-black",
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
      centeredCard: "",
      headerBlock: "",
      bodyBlock: "",
    },
    midnight_luxury: {
      wrapper: "min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a1128] to-black text-white font-sans animate-in fade-in duration-500 relative overflow-hidden",
      leftPanel: "",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(212,175,55,0.08),transparent_50%)] pointer-events-none z-0",
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
          <div className="absolute inset-0 bg-[#0a1128]/70 backdrop-blur-[2px]"></div>
        </div>
      ) : null,
      rightPanel: "",
      title: "text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 leading-tight",
      heading: "text-4xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-100 mb-4 tracking-tight uppercase",
      subHeading: "text-slate-400 text-sm font-medium leading-relaxed font-serif italic",
      label: "text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]/80 ml-1 block",
      input: "w-full px-6 py-4 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/10 outline-none transition-all font-medium text-white placeholder-slate-700 shadow-inner",
      select: "w-full px-6 py-4 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/10 outline-none transition-all font-medium text-white appearance-none cursor-pointer shadow-inner",
      checkbox: "flex items-center gap-4 cursor-pointer group p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-[#d4af37]/50 transition-all shadow-inner",
      checkboxText: "text-xs font-medium text-slate-400 group-hover:text-white",
      card: "bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-[#d4af37]/10 rounded-full border border-[#d4af37]/20 backdrop-blur-md",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.15em] text-[#d4af37]",
      rsvpBorder: "py-5 border-y border-slate-800 space-y-4",
      divider: "border-t border-slate-800",
      btnSubmit: "w-full bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#d4af37] hover:brightness-110 disabled:bg-zinc-800 text-black font-bold py-5 rounded-full shadow-lg shadow-[#d4af37]/10 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.25em] text-xs font-black",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-full font-bold transition-all border-2 ${active ? 'border-[#d4af37] bg-[#d4af37]/10 text-white shadow-inner' : 'border-slate-800 bg-transparent text-slate-500 hover:border-slate-700'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-full font-bold transition-all border-2 ${active ? 'border-red-500/80 bg-red-500/10 text-white' : 'border-slate-800 bg-transparent text-slate-500 hover:border-slate-700'}`,
      loader: "animate-spin text-[#d4af37]",
      loadingBg: "min-h-screen flex items-center justify-center bg-slate-950",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6",
      successBg: "min-h-screen flex items-center justify-center bg-slate-950 p-6",
      successCard: "bg-[#030712]/80 border border-[#d4af37]/20 rounded-[2.5rem] p-12 max-w-xl w-full text-center relative overflow-hidden text-white backdrop-blur-md",
      successQR: "bg-slate-950 border border-slate-800 rounded-xl p-5 mb-6",
      textMain: "text-white",
      textMuted: "text-slate-400",
      centeredCard: "bg-[#030712]/80 border border-[#d4af37]/20 rounded-[2.5rem] p-8 sm:p-12 md:p-16 max-w-2xl w-full backdrop-blur-md shadow-[0_0_50px_rgba(212,175,55,0.05)] text-white relative z-10 my-12",
      headerBlock: "",
      bodyBlock: "",
    },
    neon_horizon: {
      wrapper: "min-h-screen bg-black text-[#00ffff] font-sans animate-in fade-in duration-500 overflow-hidden relative",
      leftPanel: "bg-[#0a0518] p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col justify-between text-white relative overflow-hidden min-h-[50vh] lg:min-screen border-l-4 border-[#ff007f] shadow-[inset_10px_0_30px_rgba(255,0,127,0.1)]",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,0,127,0.05)_1px,transparent_1px),linear-gradient(to_right,rgba(255,0,127,0.05)_1px,transparent_1px)] bg-[size:30px_30px] z-0",
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
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-[#070114]/70 backdrop-blur-md border-r border-[#00ffff]/10 relative",
      title: "text-4xl sm:text-5xl md:text-6xl font-black mb-6 leading-[0.9] tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-[#ff007f] via-[#b900ff] to-[#00ffff] drop-shadow-[0_2px_10px_rgba(255,0,127,0.4)] relative z-10",
      heading: "text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff007f] to-[#00ffff] mb-6 tracking-tight uppercase italic",
      subHeading: "text-[#b900ff] text-base font-semibold tracking-wide uppercase",
      label: "text-[10px] font-black uppercase tracking-[0.25em] text-[#00ffff] ml-1 block",
      input: "w-full px-6 py-5 rounded-[1.5rem] bg-[#0c0320] border-2 border-[#ff007f]/30 focus:border-[#ff007f] focus:shadow-[0_0_15px_rgba(255,0,127,0.3)] outline-none transition-all font-bold text-white placeholder-slate-700",
      select: "w-full px-6 py-5 rounded-[1.5rem] bg-[#0c0320] border-2 border-[#ff007f]/30 focus:border-[#ff007f] focus:shadow-[0_0_15px_rgba(255,0,127,0.3)] outline-none transition-all font-bold text-white appearance-none cursor-pointer",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-[#0c0320] rounded-[1.5rem] border-2 border-[#ff007f]/30 hover:border-[#ff007f] hover:shadow-[0_0_10px_rgba(255,0,127,0.2)] transition-all",
      checkboxText: "text-xs font-bold text-[#ff007f]/80 group-hover:text-white",
      card: "bg-[#0c0320] p-5 rounded-2xl border border-[#00ffff]/20 shadow-[0_0_15px_rgba(0,255,255,0.05)]",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-[#0c0320] rounded-full border border-[#ff007f]/20",
      badgeText: "text-[10px] font-black uppercase tracking-[0.3em] text-[#ff007f]",
      rsvpBorder: "py-6 border-y border-[#00ffff]/10 space-y-4",
      divider: "border-t border-[#00ffff]/10",
      btnSubmit: "w-full bg-gradient-to-r from-[#ff007f] to-[#b900ff] hover:brightness-110 disabled:bg-zinc-800 text-white font-black py-6 rounded-[2rem] shadow-lg shadow-[#ff007f]/20 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 ${active ? 'border-[#00ffff] bg-[#00ffff]/10 text-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,0.2)]' : 'border-white/5 bg-transparent text-[#00ffff]/40 hover:border-[#00ffff]/20'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 ${active ? 'border-red-500 bg-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-white/5 bg-transparent text-[#00ffff]/40 hover:border-[#00ffff]/20'}`,
      loader: "animate-spin text-[#ff007f]",
      loadingBg: "min-h-screen flex items-center justify-center bg-black",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-black p-6",
      successBg: "min-h-screen flex items-center justify-center bg-black p-6",
      successCard: "bg-[#0a0518] rounded-[3rem] border border-[#ff007f]/30 shadow-[0_0_30px_rgba(255,0,127,0.15)] p-16 max-w-xl w-full text-center relative overflow-hidden text-white",
      successQR: "bg-black border border-[#00ffff]/20 rounded-2xl p-6 mb-8",
      textMain: "text-white",
      textMuted: "text-[#00ffff]/60",
      centeredCard: "",
      headerBlock: "",
      bodyBlock: "",
    },
    forest_zen: {
      wrapper: "min-h-screen bg-[#fcfbf9] text-[#1c2e24] font-sans animate-in fade-in duration-500 relative",
      leftPanel: "",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(45,74,57,0.25),transparent_70%)] pointer-events-none z-0",
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
          <div className="absolute inset-0 bg-[#1c2e24]/60"></div>
        </div>
      ) : null,
      rightPanel: "",
      title: "text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-2 leading-tight",
      heading: "text-3xl sm:text-4xl font-bold text-[#1c2e24] mb-4 tracking-tight",
      subHeading: "text-[#5c7a67] text-sm font-medium leading-relaxed font-sans",
      label: "text-[10px] font-black uppercase tracking-[0.25em] text-[#2d4a39] ml-1 block",
      input: "w-full px-6 py-4 rounded-xl bg-white border border-[#2d4a39]/20 focus:border-[#1c2e24] focus:ring-4 focus:ring-[#1c2e24]/5 outline-none transition-all font-bold text-[#1c2e24] placeholder-[#2d4a39]/30 shadow-sm",
      select: "w-full px-6 py-4 rounded-xl bg-white border border-[#2d4a39]/20 focus:border-[#1c2e24] focus:ring-4 focus:ring-[#1c2e24]/5 outline-none transition-all font-bold text-[#1c2e24] appearance-none cursor-pointer shadow-sm",
      checkbox: "flex items-center gap-4 cursor-pointer group p-4 bg-white rounded-xl border border-[#2d4a39]/20 hover:border-[#1c2e24] transition-all shadow-sm",
      checkboxText: "text-xs font-bold text-[#5c7a67] group-hover:text-[#1c2e24]",
      card: "bg-[#1c2e24]/10 p-4 rounded-xl border border-[#1c2e24]/10 shadow-sm text-[#1c2e24]",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-[#2d4a39]/20 rounded-full border border-white/10",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.2em] text-[#fcfbf9]",
      rsvpBorder: "py-5 border-y border-[#2d4a39]/10 space-y-4",
      divider: "border-t border-[#2d4a39]/10",
      btnSubmit: "w-full bg-[#1c2e24] hover:bg-[#2d4a39] disabled:bg-[#f2efe9] text-white font-bold py-5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-4 uppercase tracking-[0.25em] text-xs",
      btnAttending: (active: boolean) => `px-6 py-3 rounded-lg font-bold transition-all border-2 ${active ? 'border-[#1c2e24] bg-[#1c2e24] text-white' : 'border-[#2d4a39]/20 bg-white text-[#5c7a67] hover:border-[#2d4a39]/40'}`,
      btnNotAttending: (active: boolean) => `px-6 py-3 rounded-lg font-bold transition-all border-2 ${active ? 'border-red-600 bg-red-600 text-white' : 'border-[#2d4a39]/20 bg-white text-[#5c7a67] hover:border-[#2d4a39]/40'}`,
      loader: "animate-spin text-[#1c2e24]",
      loadingBg: "min-h-screen flex items-center justify-center bg-[#fcfbf9]",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-[#fcfbf9] p-6",
      successBg: "min-h-screen flex items-center justify-center bg-[#fcfbf9] p-6",
      successCard: "bg-white rounded-[2rem] shadow-2xl p-12 max-w-xl w-full text-center border border-[#2d4a39]/10 relative overflow-hidden text-[#1c2e24]",
      successQR: "bg-[#fcfbf9] border border-[#2d4a39]/10 rounded-xl p-5 mb-6 shadow-sm",
      textMain: "text-[#1c2e24]",
      textMuted: "text-[#5c7a67]",
      centeredCard: "",
      headerBlock: "bg-[#1c2e24]/85 backdrop-blur-md text-[#fcfbf9] p-8 sm:p-12 md:p-16 border-b-4 border-[#2d4a39] relative overflow-hidden",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
    },
    aurora_glow: {
      wrapper: "min-h-screen bg-[#070b19] text-white font-sans animate-in fade-in duration-500 relative overflow-hidden",
      leftPanel: "",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(20,184,166,0.15),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(99,102,241,0.15),transparent_50%),radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_60%)] pointer-events-none z-0 animate-aurora",
      leftBgImage: bannerUrl ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {bannerSize === "contain" && (
            <div 
              className="absolute inset-0 scale-110 blur-2xl opacity-60 bg-cover bg-center animate-aurora" 
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
          <div className="absolute inset-0 bg-[#070b19]/60 backdrop-blur-[2px]"></div>
        </div>
      ) : null,
      rightPanel: "",
      title: "text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-emerald-100 to-indigo-200 leading-tight",
      heading: "text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-indigo-200 mb-4 tracking-tight uppercase",
      subHeading: "text-teal-200/50 text-sm font-medium leading-relaxed font-sans",
      label: "text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200/70 ml-1 block",
      input: "w-full px-6 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-teal-400 focus:bg-white/10 outline-none transition-all font-medium text-white placeholder-slate-500",
      select: "w-full px-6 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-teal-400 focus:bg-white/10 outline-none transition-all font-medium text-white appearance-none cursor-pointer",
      checkbox: "flex items-center gap-4 cursor-pointer group p-4 bg-white/5 rounded-xl border border-white/10 hover:border-teal-500/50 transition-all",
      checkboxText: "text-xs font-medium text-teal-200/50 group-hover:text-white",
      card: "bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.2em] text-teal-200/70",
      rsvpBorder: "py-5 border-y border-white/10 space-y-4",
      divider: "border-t border-white/10",
      btnSubmit: "w-full bg-gradient-to-r from-teal-400 to-emerald-500 hover:brightness-110 disabled:bg-zinc-800 text-slate-900 font-bold py-5 rounded-xl shadow-lg shadow-teal-500/10 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.25em] text-xs font-black",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-xl font-bold transition-all border-2 ${active ? 'border-teal-400 bg-teal-500/20 text-white shadow-inner' : 'border-white/10 bg-transparent text-teal-200/50 hover:border-white/20'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-xl font-bold transition-all border-2 ${active ? 'border-red-500/80 bg-red-500/20 text-white' : 'border-white/10 bg-transparent text-teal-200/50 hover:border-white/20'}`,
      loader: "animate-spin text-teal-400",
      loadingBg: "min-h-screen flex items-center justify-center bg-[#070b19]",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-[#070b19] p-6",
      successBg: "min-h-screen flex items-center justify-center bg-[#070b19] p-6",
      successCard: "bg-white/5 border border-white/10 rounded-[2rem] p-12 max-w-xl w-full text-center relative overflow-hidden text-white backdrop-blur-xl",
      successQR: "bg-white/5 border border-white/10 rounded-xl p-5 mb-6 shadow-sm",
      textMain: "text-white",
      textMuted: "text-teal-200/50",
      centeredCard: "bg-white/5 border border-white/10 rounded-[2rem] p-8 sm:p-12 md:p-16 max-w-2xl w-full backdrop-blur-xl shadow-2xl shadow-emerald-500/5 text-white relative z-10 my-12",
      headerBlock: "",
      bodyBlock: "",
    },
    crimson_sunset: {
      wrapper: "min-h-screen bg-[linear-gradient(to_bottom_right,_var(--tw-gradient-stops))] from-[#3a0d1e] via-[#6d1a36] to-[#b83b5e] text-white font-sans animate-in fade-in duration-500 relative",
      leftPanel: "",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(240,138,93,0.15),transparent_60%)] pointer-events-none z-0",
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
          <div className="absolute inset-0 bg-[#3a0d1e]/60"></div>
        </div>
      ) : null,
      rightPanel: "",
      title: "text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-100 to-amber-300 leading-tight",
      heading: "text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-rose-200 mb-4 tracking-tight uppercase",
      subHeading: "text-rose-200/50 text-sm font-medium leading-relaxed font-sans",
      label: "text-[10px] font-bold uppercase tracking-[0.2em] text-rose-200/70 ml-1 block",
      input: "w-full px-6 py-4 rounded-xl bg-black/25 border border-white/10 focus:border-[#f08a5d] focus:bg-black/35 outline-none transition-all font-medium text-white placeholder-slate-500 shadow-inner",
      select: "w-full px-6 py-4 rounded-xl bg-black/25 border border-white/10 focus:border-[#f08a5d] focus:bg-black/35 outline-none transition-all font-medium text-white appearance-none cursor-pointer shadow-inner",
      checkbox: "flex items-center gap-4 cursor-pointer group p-4 bg-black/25 rounded-xl border border-white/10 hover:border-[#f08a5d]/50 transition-all shadow-inner",
      checkboxText: "text-xs font-medium text-rose-200/50 group-hover:text-white",
      card: "bg-black/25 p-4 rounded-xl border border-white/10 backdrop-blur-sm",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-[#f08a5d]/10 rounded-full border border-[#f08a5d]/20 backdrop-blur-md",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.2em] text-[#f08a5d]",
      rsvpBorder: "py-5 border-y border-white/10 space-y-4",
      divider: "border-t border-white/10",
      btnSubmit: "w-full bg-[#f08a5d] hover:bg-[#f08a5d]/90 disabled:bg-zinc-800 text-black font-bold py-5 rounded-xl shadow-lg shadow-[#f08a5d]/10 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.25em] text-xs font-black",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-xl font-bold transition-all border-2 ${active ? 'border-[#f08a5d] bg-[#f08a5d]/20 text-white shadow-inner' : 'border-white/10 bg-transparent text-rose-200/50 hover:border-white/20'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-xl font-bold transition-all border-2 ${active ? 'border-red-500/80 bg-red-500/20 text-white' : 'border-white/10 bg-transparent text-rose-200/50 hover:border-white/20'}`,
      loader: "animate-spin text-[#f08a5d]",
      loadingBg: "min-h-screen flex items-center justify-center bg-[#3a0d1e]",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-[#3a0d1e] p-6",
      successBg: "min-h-screen flex items-center justify-center bg-[#3a0d1e] p-6",
      successCard: "bg-black/35 border border-white/10 rounded-[2rem] p-12 max-w-xl w-full text-center relative overflow-hidden text-white backdrop-blur-xl",
      successQR: "bg-black/25 border border-white/10 rounded-xl p-5 mb-6 shadow-sm",
      textMain: "text-white",
      textMuted: "text-rose-200/50",
      centeredCard: "",
      headerBlock: "bg-[#3a0d1e]/85 backdrop-blur-md text-white p-8 sm:p-12 md:p-16 border-b-4 border-[#6d1a36] relative overflow-hidden",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
    },
    cyberpunk_terminal: {
      wrapper: "min-h-screen bg-black text-[#39ff14] font-mono animate-in fade-in duration-500 relative",
      leftPanel: "bg-black p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col justify-between text-[#39ff14] relative overflow-hidden min-h-[50vh] lg:min-screen border-r-2 border-[#39ff14]/30",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] pointer-events-none z-0",
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
          <div className="absolute inset-0 bg-black/80"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-black/70 backdrop-blur-md relative border-l-2 border-[#39ff14]/20",
      title: "text-3xl sm:text-4xl md:text-5xl font-black mb-6 leading-tight tracking-widest uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-[#39ff14] via-[#20c20e] to-[#128a07] drop-shadow-[0_2px_10px_rgba(57,255,20,0.3)] relative z-10",
      heading: "text-4xl font-black text-[#39ff14] mb-6 tracking-widest uppercase border-b-2 border-[#39ff14] pb-4",
      subHeading: "text-[#39ff14]/60 text-xs font-medium leading-relaxed tracking-wider uppercase",
      label: "text-[10px] font-black uppercase tracking-[0.25em] text-[#39ff14] ml-1 block",
      input: "w-full px-6 py-5 rounded-none bg-black border-2 border-[#39ff14]/30 focus:border-[#39ff14] focus:shadow-[0_0_15px_rgba(57,255,20,0.25)] outline-none transition-all font-bold text-[#39ff14] placeholder-[#39ff14]/30",
      select: "w-full px-6 py-5 rounded-none bg-black border-2 border-[#39ff14]/30 focus:border-[#39ff14] focus:shadow-[0_0_15px_rgba(57,255,20,0.25)] outline-none transition-all font-bold text-[#39ff14] appearance-none cursor-pointer",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-black rounded-none border-2 border-[#39ff14]/30 hover:border-[#39ff14] hover:shadow-[0_0_10px_rgba(57,255,20,0.15)] transition-all",
      checkboxText: "text-xs font-bold text-[#39ff14]/80 group-hover:text-white",
      card: "bg-black p-5 rounded-none border border-[#39ff14]/30 shadow-[0_0_15px_rgba(57,255,20,0.05)]",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-black rounded-none border border-[#39ff14]/30",
      badgeText: "text-[10px] font-black uppercase tracking-[0.3em] text-[#39ff14]",
      rsvpBorder: "py-6 border-y border-[#39ff14]/20 space-y-4",
      divider: "border-t border-[#39ff14]/20",
      btnSubmit: "w-full bg-[#39ff14] hover:bg-black hover:text-[#39ff14] border-2 border-[#39ff14] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-6 rounded-none shadow-[0_0_15px_rgba(57,255,20,0.2)] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-none font-bold transition-all border-2 ${active ? 'border-[#39ff14] bg-[#39ff14]/10 text-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,0.15)]' : 'border-[#39ff14]/20 bg-transparent text-[#39ff14]/40 hover:border-[#39ff14]/40'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-none font-bold transition-all border-2 ${active ? 'border-red-500 bg-red-500/10 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.15)]' : 'border-[#39ff14]/20 bg-transparent text-[#39ff14]/40 hover:border-[#39ff14]/40'}`,
      loader: "animate-spin text-[#39ff14]",
      loadingBg: "min-h-screen flex items-center justify-center bg-black",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-black p-6 border-2 border-[#39ff14]",
      successBg: "min-h-screen flex items-center justify-center bg-black p-6",
      successCard: "bg-black rounded-none border-2 border-[#39ff14] shadow-[0_0_30px_rgba(57,255,20,0.2)] p-16 max-w-xl w-full text-center relative overflow-hidden text-[#39ff14]",
      successQR: "bg-black border border-[#39ff14]/30 rounded-none p-6 mb-8",
      textMain: "text-[#39ff14]",
      textMuted: "text-[#39ff14]/60",
      centeredCard: "",
      headerBlock: "",
      bodyBlock: "",
    }
  };

  const style = themeStyles[theme as keyof typeof themeStyles] || themeStyles.cyber_dark;

  const themeLayouts = {
    cyber_dark: "split",
    minimal_light: "split",
    glassmorphism: "split",
    brutalist_retro: "reversed",
    midnight_luxury: "centered",
    neon_horizon: "reversed",
    forest_zen: "stacked",
    aurora_glow: "centered",
    crimson_sunset: "stacked",
    cyberpunk_terminal: "split"
  } as const;

  const layout = themeLayouts[theme as keyof typeof themeLayouts] || "split";

  // Sub-render blocks for dynamic layouts
  const eventInfo = event ? (
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
  ) : null;

  const clientBadge = (
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
  );

  const registrationForm = event ? (
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
          <label className={style.label}>Email</label>
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
          <label className={style.label}>
            Attendance Status <span className={`${theme === "minimal_light" ? "client-text-primary" : "client-text-accent"} ml-0.5 font-bold`}>*</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setIsAttending(true)}
              className={style.btnAttending(isAttending === true)}
            >
              I am attending
            </button>
            <button
              type="button"
              onClick={() => setIsAttending(false)}
              className={style.btnNotAttending(isAttending === false)}
            >
              Unable to attend
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
              <label className={style.label}>
                {field.label} {field.required && <span className={`${theme === "minimal_light" ? "client-text-primary" : "client-text-accent"} ml-0.5 font-bold`}>*</span>}
              </label>
              
              {field.description && (
                <div className={`p-4 rounded-[1.2rem] flex items-start gap-3 text-xs leading-normal border ${
                  theme === "minimal_light" || theme === "brutalist_retro"
                    ? "bg-slate-100/80 border-slate-200 text-slate-600" 
                    : "bg-black/30 border-white/5 text-zinc-400"
                }`}>
                  <span className="shrink-0 text-emerald-500">✅</span>
                  <span className="italic font-medium">{field.description}</span>
                </div>
              )}
              
              {field.type === "text" && (
                <input
                  required={field.required}
                  type="text"
                  placeholder="Enter your answer"
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

        {/* Disclaimer & Indemnity */}
        {isAttending && event.disclaimer_enabled && event.disclaimer_text && (
          <div className={`space-y-4 p-6 rounded-[1.5rem] border ${theme === 'minimal_light' || theme === 'brutalist_retro' ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-black/30 border-white/10 text-white'} mt-6`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme === "minimal_light" ? "client-text-primary" : "client-text-accent"}`}>Disclaimer & Indemnity</p>
            <div className="text-xs leading-relaxed opacity-85 whitespace-pre-wrap max-h-40 overflow-y-auto pr-2 border-b border-white/5 pb-4">
              {event.disclaimer_text}
            </div>
            <label className={`flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all ${theme === 'minimal_light' || theme === 'brutalist_retro' ? 'bg-white border-slate-200 text-slate-800' : 'bg-black/20 text-white'}`}>
              <input
                required
                type="checkbox"
                checked={disclaimerAccepted}
                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                className="w-6 h-6 rounded-lg bg-zinc-900 border-white/10 client-checkbox transition-all"
              />
              <span className="text-xs font-bold opacity-80 group-hover:opacity-100 transition-opacity">
                I read and accept the Disclaimer and Indemnity <span className="text-red-500 font-bold">*</span>
              </span>
            </label>
          </div>
        )}

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
  ) : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-aurora {
          background-size: 200% 200%;
          animation: aurora 15s ease infinite;
        }
        ${client ? `
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
        ` : ''}
      `}} />
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
      ) : registrationClosed ? (
        <div className={style.errorBg}>
          <AlertCircle className="text-yellow-500 mb-6 animate-pulse" size={64} />
          <h1 className={`text-3xl font-black mb-4 font-bricolage italic uppercase tracking-tight ${style.textMain}`}>Registration Closed</h1>
          <p className={`${style.textMuted} text-center max-w-md font-medium`}>{closureReason}</p>
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
              Your registration for <span className={`${style.textMain} font-bold`}>{event.title}</span> is {isAttending ? 'confirmed' : 'submitted'}. 
              {isAttending 
                ? ` Verification has been dispatched to `
                : ` We've noted that you are unable to attend. Thank you for letting us know. `}
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
          {/* Background Images / Overlay rendering */}
          {style.leftBgImage}
          <div className={style.leftOverlay}></div>

          {layout === "split" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen relative z-10">
              <div className="p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col justify-between text-white relative min-h-[50vh] lg:min-screen">
                {eventInfo}
                {clientBadge}
              </div>
              <div className={style.rightPanel}>
                {registrationForm}
              </div>
            </div>
          )}

          {layout === "reversed" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen relative z-10">
              <div className="p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col justify-between text-white relative min-h-[50vh] lg:min-screen lg:order-last">
                {eventInfo}
                {clientBadge}
              </div>
              <div className={style.rightPanel}>
                {registrationForm}
              </div>
            </div>
          )}

          {layout === "centered" && (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 relative z-10">
              <div className={style.centeredCard}>
                <div className="mb-8 border-b border-white/10 pb-8">
                  <h1 className={style.title}>{event.title}</h1>
                  <p className={`text-base mb-8 max-w-xl leading-relaxed mt-4 ${style.textMuted}`}>{event.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                      <Calendar size={24} className={theme === "minimal_light" ? "client-text-primary" : "client-text-accent"} />
                      <div>
                        <p className={`${style.textMuted} text-[8px] font-black uppercase tracking-[0.3em]`}>Schedule</p>
                        <p className={`text-sm font-bold ${style.textMain}`}>{new Date(event.start_date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <MapPin size={24} className={theme === "minimal_light" ? "client-text-primary" : "client-text-accent"} />
                      <div>
                        <p className={`${style.textMuted} text-[8px] font-black uppercase tracking-[0.3em]`}>Venue</p>
                        <p className={`text-sm font-bold ${style.textMain}`}>{event.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {registrationForm}
              </div>
              <div className="mt-8 mb-12 flex justify-center w-full">
                {clientBadge}
              </div>
            </div>
          )}

          {layout === "stacked" && (
            <div className="min-h-screen flex flex-col relative z-10">
              <div className={style.headerBlock}>
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div>
                    <h1 className={style.title}>{event.title}</h1>
                    <p className={`text-base max-w-xl leading-relaxed mt-4 ${style.textMuted}`}>{event.description}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-8 shrink-0">
                    <div className="flex items-center gap-4">
                      <Calendar size={24} className="client-text-accent" />
                      <div>
                        <p className={`${style.textMuted} text-[9px] font-black uppercase tracking-[0.3em]`}>Schedule</p>
                        <p className={`text-lg font-bold ${style.textMain}`}>{new Date(event.start_date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <MapPin size={24} className="client-text-accent" />
                      <div>
                        <p className={`${style.textMuted} text-[9px] font-black uppercase tracking-[0.3em]`}>Venue</p>
                        <p className={`text-lg font-bold ${style.textMain}`}>{event.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={style.bodyBlock}>
                {registrationForm}
                <div className="mt-12 mb-16 flex justify-center">
                  {clientBadge}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
