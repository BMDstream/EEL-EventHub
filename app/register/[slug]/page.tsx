"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Calendar, MapPin, CheckCircle2, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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

interface FormField {
  id: string;
  label: string;
  type: "text" | "select" | "checkbox" | "partner_card";
  required: boolean;
  options?: string[];
  dependsOn?: {
    fieldId: string;
    value: string;
  };
  description?: string;
  inactive?: boolean;
}

function parseMarkdown(text: string, theme: string = "cyber_dark") {
  if (!text) return "";
  
  // Escape HTML to prevent XSS
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Italic (*text* or _text_)
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  const isDark = theme !== "minimal_light" && 
                 theme !== "brutalist_retro" && 
                 theme !== "corporate_mono" && 
                 theme !== "nordic_alabaster" && 
                 theme !== "champagne_lounge";

  let numStyleClass = "font-black";
  switch(theme) {
    case "cyber_dark":
      numStyleClass = "client-text-accent text-yellow-400 font-black font-bricolage italic text-sm";
      break;
    case "minimal_light":
      numStyleClass = "client-text-primary text-slate-900 font-bold font-sans text-xs bg-slate-100 px-1.5 py-0.5 rounded";
      break;
    case "glassmorphism":
      numStyleClass = "text-indigo-300 font-black font-sans border-b border-indigo-500/30 pb-0.5";
      break;
    case "brutalist_retro":
      numStyleClass = "text-black font-black font-mono text-sm underline decoration-[3px] decoration-[#facc15] bg-[#facc15] px-1 border border-black";
      break;
    case "midnight_luxury":
      numStyleClass = "text-[#d4af37] font-serif font-black italic text-sm border-r border-[#d4af37]/30 pr-2 mr-1";
      break;
    case "neon_horizon":
      numStyleClass = "text-[#00ffff] font-black font-sans drop-shadow-[0_0_5px_rgba(0,255,255,0.6)]";
      break;
    case "forest_zen":
      numStyleClass = "text-[#1c2e24] font-bold font-sans bg-[#2d4a39]/10 px-2 py-0.5 rounded-full";
      break;
    case "aurora_glow":
      numStyleClass = "text-teal-400 font-black font-sans border-l-2 border-teal-400 pl-1.5";
      break;
    case "crimson_sunset":
      numStyleClass = "text-[#f08a5d] font-black font-serif italic text-sm";
      break;
    case "cyberpunk_terminal":
      numStyleClass = "text-[#39ff14] font-bold font-mono border border-[#39ff14] px-1 bg-black";
      break;
    case "corporate_mono":
      numStyleClass = "text-slate-900 font-black font-mono border-b border-slate-900 pb-0.5";
      break;
    case "nordic_alabaster":
      numStyleClass = "text-stone-900 font-serif italic border-r border-stone-300 pr-2 mr-1";
      break;
    case "midnight_executive":
      numStyleClass = "text-blue-500 font-extrabold font-sans text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded";
      break;
    case "champagne_lounge":
      numStyleClass = "text-[#c5a059] font-serif font-bold text-sm underline decoration-stone-300";
      break;
    case "logistics_glass":
      numStyleClass = "text-slate-300 font-bold font-mono border-l-2 border-slate-600 pl-1.5";
      break;
    default:
      numStyleClass = isDark ? "client-text-accent text-amber-400 font-extrabold" : "client-text-primary text-slate-900 font-bold";
  }

  // Split by line breaks to handle paragraphs/lists
  const lines = html.split("\n");
  const processedLines = lines.map((line) => {
    // Check if it's a numbered list item (e.g. "1. Item")
    const numListMatch = line.match(/^(\s*\d+\.\s+)(.*)/);
    if (numListMatch) {
      return `<div class="pl-4 py-1 flex items-start gap-1"><span class="${numStyleClass} shrink-0">${numListMatch[1]}</span><span>${numListMatch[2]}</span></div>`;
    }
    
    // Check if it's a bullet list item (e.g. "- Item" or "* Item")
    const bulletListMatch = line.match(/^(\s*[-*]\s+)(.*)/);
    if (bulletListMatch) {
      return `<div class="pl-6 py-1 flex items-start gap-1 list-disc list-inside"><span>•</span><span>${bulletListMatch[2]}</span></div>`;
    }

    // Check if the line starts with spaces (indentation)
    if (line.startsWith("   ") || line.startsWith("  ") || line.startsWith("\t")) {
      return `<p class="pl-8 min-h-[1em]">${line.trim()}</p>`;
    }

    return `<p class="min-h-[1em]">${line}</p>`;
  });

  return processedLines.join("");
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
  background_url?: string;
  collect_company?: boolean;
  company_required?: boolean;
  custom_fields_schema?: FormField[];
  client?: Client;
  banner_settings?: {
    size?: string;
    position?: string;
    theme?: string;
    primary_color?: string;
    accent_color?: string;
    layout?: string;
  };
  registration_active?: boolean;
  registration_start?: string;
  registration_end?: string;
  disclaimer_enabled?: boolean;
  disclaimer_text?: string;
}

export default function PublicRegistrationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black text-white font-sans"><Loader2 className="animate-spin text-yellow-400" size={32} /></div>}>
      <PublicRegistrationPageContent />
    </Suspense>
  );
}

function PublicRegistrationPageContent() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const isUpdateFlow = !!searchParams.get("email");
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

  // Pre-fill fields from search params (staged partner completion)
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const firstParam = searchParams.get("first_name");
    const lastParam = searchParams.get("last_name");
    
    if (emailParam || firstParam || lastParam) {
      setFormData((prev) => ({
        ...prev,
        email: emailParam ? decodeURIComponent(emailParam) : prev.email,
        first_name: firstParam ? decodeURIComponent(firstParam) : prev.first_name,
        last_name: lastParam ? decodeURIComponent(lastParam) : prev.last_name,
      }));
    }
  }, [searchParams]);

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
    
    // Validate partner card fields (identical check and corporate domain validation)
    if (isAttending && event.custom_fields_schema) {
      for (const field of event.custom_fields_schema) {
        if (field.inactive) continue;
        if (field.type === "partner_card") {
          if (isUpdateFlow) continue;
          const partnerData = customAnswers[field.id];
          if (field.required && (!partnerData?.first_name?.trim() || !partnerData?.last_name?.trim() || !partnerData?.email?.trim())) {
            setSubmitError("Please fill out all partner details.");
            return;
          }
          if (partnerData?.email?.trim()) {
            const registrantEmail = formData.email.trim().toLowerCase();
            const partnerEmail = partnerData.email.trim().toLowerCase();
            
            if (registrantEmail === partnerEmail) {
              setSubmitError("Your email and your partner's email cannot be the same.");
              return;
            }
            
            const registrantParts = registrantEmail.split("@");
            const partnerParts = partnerEmail.split("@");
            if (registrantParts.length > 1 && partnerParts.length > 1) {
              const registrantDomain = registrantParts[1];
              const partnerDomain = partnerParts[1];
              if (registrantDomain !== partnerDomain) {
                setSubmitError(`Partner's email must be from the same company (ending in @${registrantDomain}).`);
                return;
              }
            }
          }
        }
      }
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
          is_attending: isAttending,
          is_partner_update: isUpdateFlow
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
  const defaults = THEME_DEFAULTS[theme as keyof typeof THEME_DEFAULTS] || THEME_DEFAULTS.cyber_dark;

  const eventPrimaryColor = event?.banner_settings?.primary_color || client?.primary_color || defaults.primary;
  const eventAccentColor = event?.banner_settings?.accent_color || client?.accent_color || defaults.accent;

  const isLightTheme = theme === "minimal_light" || 
                       theme === "brutalist_retro" || 
                       theme === "corporate_mono" || 
                       theme === "nordic_alabaster" || 
                       theme === "champagne_lounge";

  const bannerUrl = event?.background_url || event?.banner_url;
  const formBannerUrl = event?.background_url ? event?.banner_url : undefined;
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
      title: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 lg:mb-10 leading-[0.9] tracking-tighter font-bricolage italic break-normal text-white relative z-10",
      heading: "text-5xl font-black text-white mb-6 tracking-tight font-bricolage italic",
      subHeading: "text-zinc-500 text-lg font-medium leading-relaxed",
      label: "text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-1",
      input: "w-full px-6 py-5 rounded-[1.5rem] bg-zinc-950 border border-white/20 client-input-focus outline-none transition-all font-bold text-white placeholder-zinc-600",
      select: "w-full px-6 py-5 rounded-[1.5rem] bg-zinc-950 border border-white/20 client-input-focus outline-none transition-all font-bold text-white appearance-none cursor-pointer",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-zinc-950 rounded-[1.5rem] border border-white/20 client-hover-border-accent transition-all",
      checkboxText: "text-xs font-bold text-zinc-400 group-hover:text-white",
      checkboxInput: "w-6 h-6 rounded-lg bg-zinc-950 border-white/10 client-checkbox transition-all shrink-0",
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
      centeredCard: "bg-zinc-900/60 border border-white/5 rounded-[3rem] p-8 sm:p-12 md:p-16 max-w-2xl w-full backdrop-blur-md shadow-2xl text-white relative z-10 my-12",
      headerBlock: "bg-zinc-950 text-white p-8 sm:p-12 md:p-16 border-b border-white/10 relative overflow-hidden",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-[1.5rem] border bg-black/30 border-white/10 text-white mt-6",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all bg-black/20 text-white"
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
      title: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 lg:mb-10 leading-[0.9] tracking-tighter font-outfit break-normal text-slate-900 relative z-10",
      heading: "text-5xl font-black text-slate-900 mb-6 tracking-tight font-outfit",
      subHeading: "text-slate-500 text-lg font-medium leading-relaxed",
      label: "text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1",
      input: "w-full px-6 py-5 rounded-[1.5rem] bg-white border border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all font-bold text-slate-900 placeholder-slate-300 shadow-sm",
      select: "w-full px-6 py-5 rounded-[1.5rem] bg-white border border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all font-bold text-slate-900 appearance-none cursor-pointer shadow-sm",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-white rounded-[1.5rem] border border-slate-200 hover:border-slate-400 transition-all shadow-sm",
      checkboxText: "text-xs font-bold text-slate-500 group-hover:text-slate-900",
      checkboxInput: "w-5 h-5 rounded bg-slate-100 border-slate-300 text-slate-800 focus:ring-slate-800 shrink-0",
      card: "bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-white rounded-full border border-slate-100 shadow-sm",
      badgeText: "text-[10px] font-black uppercase tracking-[0.3em] text-slate-500",
      rsvpBorder: "py-6 border-y border-slate-200/60 space-y-4",
      divider: "border-t border-slate-200/60",
      btnSubmit: "w-full client-bg-primary hover:opacity-90 disabled:bg-slate-200 text-white font-black py-6 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 \${active ? 'client-border-accent client-bg-accent text-black' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 \${active ? 'border-red-500 bg-red-500 text-white' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`,
      loader: "animate-spin text-slate-800",
      loadingBg: "min-h-screen flex items-center justify-center bg-slate-50",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6",
      successBg: "min-h-screen flex items-center justify-center bg-slate-50 p-6",
      successCard: "bg-white rounded-[3rem] shadow-2xl p-16 max-w-xl w-full text-center border border-slate-100 relative overflow-hidden text-slate-900",
      successQR: "bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8",
      textMain: "text-slate-900",
      textMuted: "text-slate-500",
      centeredCard: "bg-white border border-slate-200/80 rounded-[3rem] p-8 sm:p-12 md:p-16 max-w-2xl w-full shadow-2xl text-slate-900 relative z-10 my-12",
      headerBlock: "bg-white border-b border-slate-200 p-8 sm:p-12 md:p-16 relative overflow-hidden",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-[1.5rem] border bg-slate-100 border-slate-200 text-slate-900 mt-6",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-slate-200 hover:border-slate-400 bg-white text-slate-800"
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
      title: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 lg:mb-10 leading-[0.9] tracking-tighter font-outfit text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 relative z-10 break-normal",
      heading: "text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 mb-6 tracking-tight font-outfit",
      subHeading: "text-indigo-200/50 text-lg font-medium leading-relaxed",
      label: "text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200/70 ml-1",
      input: "w-full px-6 py-5 rounded-[1.5rem] bg-white/5 backdrop-blur-sm border border-white/10 focus:border-indigo-400 focus:bg-white/10 outline-none transition-all font-bold text-white placeholder-slate-400",
      select: "w-full px-6 py-5 rounded-[1.5rem] bg-white/5 backdrop-blur-sm border border-white/10 focus:border-indigo-400 focus:bg-white/10 outline-none transition-all font-bold text-white appearance-none cursor-pointer",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-indigo-500/50 transition-all",
      checkboxText: "text-xs font-bold text-indigo-200/50 group-hover:text-white",
      checkboxInput: "w-6 h-6 rounded-md bg-white/5 border border-white/20 text-indigo-500 focus:ring-0 shrink-0",
      card: "bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10",
      badgeText: "text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200/70",
      rsvpBorder: "py-6 border-y border-white/10 space-y-4",
      divider: "border-t border-white/10",
      btnSubmit: "w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:brightness-110 disabled:bg-zinc-800 text-white font-black py-6 rounded-[2rem] shadow-lg shadow-indigo-500/10 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 \${active ? 'border-indigo-400 bg-indigo-500/30 text-white shadow-inner' : 'border-white/10 bg-transparent text-indigo-200/50 hover:border-white/20'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 \${active ? 'border-red-500/80 bg-red-500/30 text-white' : 'border-white/10 bg-transparent text-indigo-200/50 hover:border-white/20'}`,
      loader: "animate-spin text-indigo-400",
      loadingBg: "min-h-screen flex items-center justify-center bg-slate-950",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6",
      successBg: "min-h-screen flex items-center justify-center bg-slate-950 p-6",
      successCard: "bg-white/5 backdrop-blur-md rounded-[3rem] shadow-2xl p-16 max-w-xl w-full text-center border border-white/10 relative overflow-hidden text-white",
      successQR: "bg-white/5 border border-white/10 rounded-2xl p-6 mb-8",
      textMain: "text-white",
      textMuted: "text-indigo-200/50",
      centeredCard: "bg-white/5 border border-white/10 rounded-[3rem] p-8 sm:p-12 md:p-16 max-w-2xl w-full backdrop-blur-md shadow-2xl text-white relative z-10 my-12",
      headerBlock: "bg-indigo-950 p-8 sm:p-12 md:p-16 border-b border-white/10 relative overflow-hidden",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-[1.5rem] border bg-white/5 backdrop-blur-sm border-white/10 text-white mt-6",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-white/10 hover:border-white/25 bg-white/5 backdrop-blur-sm text-white"
    },
    brutalist_retro: {
      wrapper: "min-h-screen bg-[#f8f4eb] text-black font-mono animate-in fade-in duration-500 relative",
      leftPanel: "p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col justify-between text-black relative overflow-hidden min-h-[50vh] lg:min-screen border-r-[3px] border-black bg-[#fffbf0]",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.06),transparent_70%)]",
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
          <div className="absolute inset-0 bg-white/80"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-[#fffbf0]/80 backdrop-blur-md relative border-l-[3px] border-black",
      title: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 lg:mb-10 leading-[0.9] tracking-tighter uppercase relative z-10 font-mono text-black break-normal",
      heading: "text-4xl font-black text-black mb-6 tracking-tight uppercase border-b-4 border-black pb-4 font-mono",
      subHeading: "text-black/80 font-mono text-base font-bold",
      label: "text-xs font-black uppercase tracking-widest text-black ml-1 block font-mono",
      input: "w-full px-6 py-5 rounded-none bg-white border-[3px] border-black outline-none transition-all font-black text-black placeholder-zinc-500 shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-mono",
      select: "w-full px-6 py-5 rounded-none bg-white border-[3px] border-black outline-none transition-all font-black text-black appearance-none cursor-pointer shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] font-mono",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-white rounded-none border-[3px] border-black transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]",
      checkboxText: "text-xs font-black text-black uppercase font-mono",
      checkboxInput: "w-6 h-6 rounded-none bg-white border-[3px] border-black text-black accent-black cursor-pointer shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)]",
      card: "bg-[#facc15] p-5 rounded-none border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] text-black",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-white rounded-none border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]",
      badgeText: "text-[10px] font-black uppercase tracking-widest text-black font-mono",
      rsvpBorder: "py-6 border-y-[3px] border-black space-y-4 font-mono",
      divider: "border-t-[3px] border-black",
      btnSubmit: "w-full bg-[#facc15] hover:bg-[#eab308] disabled:bg-zinc-300 text-black font-black py-6 border-[3px] border-black rounded-none shadow-[5px_5px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs font-mono",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-none font-black border-[3px] border-black transition-all font-mono \${active ? 'bg-[#facc15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] translate-x-0.5 translate-y-0.5' : 'bg-white text-zinc-500 hover:bg-slate-50 shadow-[4px_4px_0px_rgba(0,0,0,1)]'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-none font-black border-[3px] border-black transition-all font-mono \${active ? 'bg-red-500 text-white shadow-[2px_2px_0px_rgba(0,0,0,1)] translate-x-0.5 translate-y-0.5' : 'bg-white text-zinc-500 hover:bg-slate-50 shadow-[4px_4px_0px_rgba(0,0,0,1)]'}`,
      loader: "animate-spin text-black",
      loadingBg: "min-h-screen flex items-center justify-center bg-[#f8f4eb]",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-[#f8f4eb] p-6 border-[6px] border-black",
      successBg: "min-h-screen flex items-center justify-center bg-[#f8f4eb] p-6",
      successCard: "bg-[#fffbf0] rounded-none border-[3px] border-black shadow-[10px_10px_0px_rgba(0,0,0,1)] p-16 max-w-xl w-full text-center relative overflow-hidden text-black font-mono",
      successQR: "bg-white border-[3px] border-black rounded-none p-6 mb-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]",
      textMain: "text-black",
      textMuted: "text-black/70 font-mono",
      centeredCard: "bg-[#fffbf0]/95 border-[3px] border-black rounded-none p-8 sm:p-12 md:p-16 max-w-2xl w-full shadow-[8px_8px_0px_rgba(0,0,0,1)] text-black relative z-10 my-12 font-mono",
      headerBlock: "bg-[#fffbf0] border-b-[3px] border-black p-8 sm:p-12 md:p-16 relative overflow-hidden font-mono",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-none border-[3px] border-black bg-[#fffbf0] text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] mt-6 font-mono",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-none border-[3px] border-black hover:bg-[#facc15] bg-white text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] font-mono"
    },
    midnight_luxury: {
      wrapper: "min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a1128] to-black text-white font-sans animate-in fade-in duration-500 relative overflow-hidden",
      leftPanel: "bg-slate-950/40 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-r border-[#d4af37]/20 relative min-h-[50vh] lg:min-screen",
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
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-slate-950/20 backdrop-blur-sm border-l border-[#d4af37]/15 relative",
      title: "text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 leading-tight font-serif break-normal",
      heading: "text-4xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-100 mb-4 tracking-tight uppercase font-serif",
      subHeading: "text-slate-400 text-sm font-medium leading-relaxed font-serif italic",
      label: "text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]/80 ml-1 block font-serif",
      input: "w-full px-5 py-4 bg-transparent border-b-2 border-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium text-white placeholder-slate-700 rounded-none font-serif",
      select: "w-full px-5 py-4 bg-transparent border-b-2 border-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium text-white appearance-none cursor-pointer rounded-none font-serif",
      checkbox: "flex items-center gap-4 cursor-pointer group p-4 bg-slate-950/60 rounded-xl border border-slate-900 hover:border-[#d4af37]/30 transition-all font-serif",
      checkboxText: "text-xs font-medium text-slate-400 group-hover:text-white font-serif",
      checkboxInput: "w-5 h-5 rounded-full bg-slate-950 border border-amber-500/30 text-amber-500 accent-amber-500 shrink-0",
      card: "bg-slate-950/80 p-4 rounded-xl border border-slate-900 text-slate-300",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-[#d4af37]/10 rounded-full border border-[#d4af37]/20 backdrop-blur-md",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.15em] text-[#d4af37] font-serif",
      rsvpBorder: "py-5 border-y border-slate-900 space-y-4 font-serif",
      divider: "border-t border-slate-900",
      btnSubmit: "w-full bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#d4af37] hover:brightness-110 disabled:bg-zinc-800 text-black font-serif italic py-5 rounded-lg shadow-lg shadow-[#d4af37]/10 transition-all flex items-center justify-center gap-4 text-xs font-black",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-lg font-bold font-serif transition-all border-2 \${active ? 'border-[#d4af37] bg-[#d4af37]/10 text-white shadow-inner' : 'border-slate-900 bg-transparent text-slate-500 hover:border-slate-800'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-lg font-bold font-serif transition-all border-2 \${active ? 'border-red-500/80 bg-red-500/10 text-white' : 'border-slate-900 bg-transparent text-slate-500 hover:border-slate-800'}`,
      loader: "animate-spin text-[#d4af37]",
      loadingBg: "min-h-screen flex items-center justify-center bg-slate-950",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6",
      successBg: "min-h-screen flex items-center justify-center bg-slate-950 p-6",
      successCard: "bg-[#030712]/80 border border-[#d4af37]/20 rounded-[2.5rem] p-12 max-w-xl w-full text-center relative overflow-hidden text-white backdrop-blur-md font-serif",
      successQR: "bg-slate-950 border border-slate-900 rounded-xl p-5 mb-6",
      textMain: "text-white",
      textMuted: "text-slate-400 font-serif",
      centeredCard: "bg-[#030712]/80 border border-[#d4af37]/20 rounded-[2.5rem] p-8 sm:p-12 md:p-16 max-w-2xl w-full backdrop-blur-md shadow-[0_0_50px_rgba(212,175,55,0.05)] text-white relative z-10 my-12 font-serif",
      headerBlock: "bg-[#030712]/90 border-b border-[#d4af37]/20 p-8 sm:p-12 md:p-16 relative overflow-hidden font-serif",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-2xl border border-amber-500/20 bg-slate-950/80 text-slate-200 mt-6 font-serif",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-slate-900 bg-slate-950/60 text-white hover:border-amber-500/20 font-serif"
    },
    neon_horizon: {
      wrapper: "min-h-screen bg-black text-[#00ffff] font-sans animate-in fade-in duration-500 overflow-hidden relative",
      leftPanel: "bg-[#0a0518] p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col justify-between text-white relative overflow-hidden min-h-[50vh] lg:min-screen border-r border-[#ff007f]/20 shadow-[inset_10px_0_30px_rgba(255,0,127,0.1)]",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,0,127,0.05)_1px,transparent_1px),linear-gradient(to_right,rgba(255,0,127,0.05)_1px,transparent_1px)] bg-[size:30px_30px] z-0",
      leftBgImage: bannerUrl ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {bannerSize === "contain" && (
            <div 
              className="absolute inset-0 scale-110 blur-2xl opacity-65 bg-cover bg-center" 
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
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-[#070114]/70 backdrop-blur-md border-l border-[#00ffff]/10 relative",
      title: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-[0.9] tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-[#ff007f] via-[#b900ff] to-[#00ffff] drop-shadow-[0_2px_10px_rgba(255,0,127,0.4)] relative z-10 font-outfit break-normal",
      heading: "text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff007f] to-[#00ffff] mb-6 tracking-tight uppercase italic font-outfit",
      subHeading: "text-[#b900ff] text-base font-semibold tracking-wide uppercase",
      label: "text-[10px] font-black uppercase tracking-[0.25em] text-[#00ffff] ml-1 block font-outfit",
      input: "w-full px-6 py-5 rounded-[1.5rem] bg-[#0c0320] border-2 border-[#ff007f]/30 focus:border-[#00ffff] focus:shadow-[0_0_15px_rgba(0,255,255,0.4)] outline-none transition-all font-bold text-white placeholder-slate-700",
      select: "w-full px-6 py-5 rounded-[1.5rem] bg-[#0c0320] border-2 border-[#ff007f]/30 focus:border-[#00ffff] focus:shadow-[0_0_15px_rgba(0,255,255,0.4)] outline-none transition-all font-bold text-white appearance-none cursor-pointer",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-[#0c0320] rounded-[1.5rem] border-2 border-[#ff007f]/30 hover:border-[#00ffff] hover:shadow-[0_0_10px_rgba(0,255,255,0.15)] transition-all",
      checkboxText: "text-xs font-bold text-[#ff007f]/80 group-hover:text-white",
      checkboxInput: "w-6 h-6 rounded-md bg-[#0c0320] border-2 border-[#ff007f]/30 text-pink-500 focus:border-[#00ffff] shadow-[0_0_8px_rgba(255,0,127,0.2)] shrink-0",
      card: "bg-[#0c0320] p-5 rounded-2xl border border-[#00ffff]/20 shadow-[0_0_15px_rgba(0,255,255,0.05)]",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-[#0c0320] rounded-full border border-[#ff007f]/20",
      badgeText: "text-[10px] font-black uppercase tracking-[0.3em] text-[#ff007f]",
      rsvpBorder: "py-6 border-y border-[#00ffff]/10 space-y-4",
      divider: "border-t border-[#00ffff]/10",
      btnSubmit: "w-full bg-gradient-to-r from-[#ff007f] to-[#b900ff] hover:brightness-110 disabled:bg-zinc-800 text-white font-black py-6 rounded-[2rem] shadow-lg shadow-[#ff007f]/20 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 \${active ? 'border-[#00ffff] bg-[#00ffff]/10 text-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,0.2)]' : 'border-white/5 bg-transparent text-[#00ffff]/40 hover:border-[#00ffff]/20'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-[1.2rem] font-bold transition-all border-2 \${active ? 'border-red-500 bg-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-white/5 bg-transparent text-[#00ffff]/40 hover:border-[#00ffff]/20'}`,
      loader: "animate-spin text-[#ff007f]",
      loadingBg: "min-h-screen flex items-center justify-center bg-black",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-black p-6",
      successBg: "min-h-screen flex items-center justify-center bg-black p-6",
      successCard: "bg-[#0a0518] rounded-[3rem] border border-[#ff007f]/30 shadow-[0_0_30px_rgba(255,0,127,0.15)] p-16 max-w-xl w-full text-center relative overflow-hidden text-white font-outfit",
      successQR: "bg-black border border-[#00ffff]/20 rounded-2xl p-6 mb-8",
      textMain: "text-white",
      textMuted: "text-[#00ffff]/60",
      centeredCard: "bg-[#0a0518]/90 border border-[#ff007f]/30 rounded-[3rem] p-8 sm:p-12 md:p-16 max-w-2xl w-full backdrop-blur-md shadow-[0_0_30px_rgba(255,0,127,0.15)] text-white relative z-10 my-12 font-outfit",
      headerBlock: "bg-[#0a0518] border-b border-[#ff007f]/30 p-8 sm:p-12 md:p-16 relative overflow-hidden font-outfit",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-[1.5rem] border border-[#ff007f]/20 bg-[#070114]/60 text-white mt-6",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-[#00ffff]/20 bg-[#0c0320]/40 text-[#00ffff] hover:border-[#ff007f]/30"
    },
    forest_zen: {
      wrapper: "min-h-screen bg-[#fcfbf9] text-[#1c2e24] font-sans animate-in fade-in duration-500 relative",
      leftPanel: "bg-[#1c2e24]/10 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-r border-[#2d4a39]/20 relative min-h-[50vh] lg:min-screen",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(45,74,57,0.15),transparent_70%)] pointer-events-none z-0",
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
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-white/40 backdrop-blur-sm relative border-l border-[#2d4a39]/15",
      title: "text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1c2e24] mb-2 leading-tight font-outfit break-normal",
      heading: "text-3xl sm:text-4xl font-bold text-[#1c2e24] mb-4 tracking-tight font-outfit",
      subHeading: "text-[#5c7a67] text-sm font-medium leading-relaxed font-sans",
      label: "text-[10px] font-black uppercase tracking-[0.25em] text-[#2d4a39] ml-1 block font-outfit",
      input: "w-full px-6 py-4 rounded-[1.5rem_0.25rem_1.5rem_0.25rem] bg-white border border-[#2d4a39]/30 focus:border-[#1c2e24] focus:ring-4 focus:ring-[#1c2e24]/5 outline-none transition-all font-bold text-[#1c2e24] placeholder-slate-300 shadow-sm",
      select: "w-full px-6 py-4 rounded-[1.5rem_0.25rem_1.5rem_0.25rem] bg-white border border-[#2d4a39]/30 focus:border-[#1c2e24] focus:ring-4 focus:ring-[#1c2e24]/5 outline-none transition-all font-bold text-[#1c2e24] appearance-none cursor-pointer shadow-sm",
      checkbox: "flex items-center gap-4 cursor-pointer group p-4 bg-white rounded-[1.5rem_0.25rem_1.5rem_0.25rem] border border-[#2d4a39]/30 hover:border-[#1c2e24] transition-all shadow-sm",
      checkboxText: "text-xs font-bold text-[#5c7a67] group-hover:text-[#1c2e24]",
      checkboxInput: "w-5 h-5 rounded-full bg-white border-[#2d4a39]/40 text-[#1c2e24] accent-[#1c2e24] shrink-0",
      card: "bg-[#1c2e24]/10 p-4 rounded-xl border border-[#1c2e24]/10 shadow-sm text-[#1c2e24]",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-[#2d4a39]/20 rounded-full border border-white/10",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.2em] text-[#2d4a39] font-outfit",
      rsvpBorder: "py-5 border-y border-[#2d4a39]/10 space-y-4",
      divider: "border-t border-[#2d4a39]/10",
      btnSubmit: "w-full bg-[#1c2e24] hover:bg-[#2d4a39] disabled:bg-[#f2efe9] text-white font-bold py-5 rounded-[1.5rem_0.25rem_1.5rem_0.25rem] shadow-lg transition-all flex items-center justify-center gap-4 uppercase tracking-[0.25em] text-xs",
      btnAttending: (active: boolean) => `px-6 py-3 rounded-[0.8rem_0.2rem_0.8rem_0.2rem] font-bold transition-all border-2 \${active ? 'border-[#1c2e24] bg-[#1c2e24] text-white' : 'border-[#2d4a39]/20 bg-white text-[#5c7a67] hover:border-[#2d4a39]/45'}`,
      btnNotAttending: (active: boolean) => `px-6 py-3 rounded-[0.8rem_0.2rem_0.8rem_0.2rem] font-bold transition-all border-2 \${active ? 'border-red-600 bg-red-600 text-white' : 'border-[#2d4a39]/20 bg-white text-[#5c7a67] hover:border-[#2d4a39]/45'}`,
      loader: "animate-spin text-[#1c2e24]",
      loadingBg: "min-h-screen flex items-center justify-center bg-[#fcfbf9]",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-[#fcfbf9] p-6",
      successBg: "min-h-screen flex items-center justify-center bg-[#fcfbf9] p-6",
      successCard: "bg-white rounded-[2rem] shadow-2xl p-12 max-w-xl w-full text-center border border-[#2d4a39]/10 relative overflow-hidden text-[#1c2e24] font-outfit",
      successQR: "bg-[#fcfbf9] border border-[#2d4a39]/10 rounded-xl p-5 mb-6 shadow-sm",
      textMain: "text-[#1c2e24]",
      textMuted: "text-[#5c7a67]",
      centeredCard: "bg-white/80 border border-[#2d4a39]/10 rounded-[2rem] p-8 sm:p-12 md:p-16 max-w-2xl w-full backdrop-blur-md shadow-2xl text-[#1c2e24] relative z-10 my-12 font-outfit",
      headerBlock: "bg-[#1c2e24] text-[#fcfbf9] p-8 sm:p-12 md:p-16 border-b-4 border-[#2d4a39] relative overflow-hidden font-outfit",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-[1.5rem_0.25rem_1.5rem_0.25rem] border border-[#2d4a39]/25 bg-[#1c2e24]/5 text-[#1c2e24] mt-6",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-[1.5rem_0.25rem_1.5rem_0.25rem] border border-[#2d4a39]/25 bg-white text-[#1c2e24] hover:border-[#1c2e24]"
    },
    aurora_glow: {
      wrapper: "min-h-screen bg-[#070b19] text-white font-sans animate-in fade-in duration-500 relative overflow-hidden",
      leftPanel: "bg-slate-950/30 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-r border-white/5 relative min-h-[50vh] lg:min-screen",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(20,184,166,0.12),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(99,102,241,0.12),transparent_50%)] pointer-events-none z-0 animate-aurora",
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
          <div className="absolute inset-0 bg-[#070b19]/60 backdrop-blur-[2px]"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-slate-950/20 backdrop-blur-md relative border-l border-white/5",
      title: "text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-emerald-100 to-indigo-200 leading-tight font-outfit break-normal",
      heading: "text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-indigo-200 mb-4 tracking-tight uppercase font-outfit",
      subHeading: "text-teal-200/50 text-sm font-medium leading-relaxed font-sans",
      label: "text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200/70 ml-1 block font-outfit",
      input: "w-full px-6 py-4 rounded-xl bg-[#070b19]/60 border border-white/10 focus:border-teal-400 focus:bg-[#070b19]/90 outline-none transition-all font-medium text-white placeholder-slate-500",
      select: "w-full px-6 py-4 rounded-xl bg-[#070b19]/60 border border-white/10 focus:border-teal-400 focus:bg-[#070b19]/90 outline-none transition-all font-medium text-white appearance-none cursor-pointer",
      checkbox: "flex items-center gap-4 cursor-pointer group p-4 bg-white/5 rounded-xl border border-white/10 hover:border-teal-500/50 transition-all",
      checkboxText: "text-xs font-medium text-teal-200/50 group-hover:text-white",
      checkboxInput: "w-5 h-5 rounded bg-[#070b19] border-teal-500/30 text-teal-400 accent-teal-400 shrink-0",
      card: "bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.2em] text-teal-200/70 font-outfit",
      rsvpBorder: "py-5 border-y border-white/10 space-y-4",
      divider: "border-t border-white/10",
      btnSubmit: "w-full bg-gradient-to-r from-teal-400 to-emerald-500 hover:brightness-110 disabled:bg-zinc-800 text-slate-900 font-bold py-5 rounded-xl shadow-lg shadow-teal-500/10 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.25em] text-xs font-black font-outfit",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-xl font-bold transition-all border-2 \${active ? 'border-teal-400 bg-teal-500/20 text-white shadow-inner' : 'border-white/10 bg-transparent text-teal-200/50 hover:border-white/20'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-xl font-bold transition-all border-2 \${active ? 'border-red-500/80 bg-red-500/20 text-white' : 'border-white/10 bg-transparent text-teal-200/50 hover:border-white/20'}`,
      loader: "animate-spin text-teal-400",
      loadingBg: "min-h-screen flex items-center justify-center bg-[#070b19]",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-[#070b19] p-6",
      successBg: "min-h-screen flex items-center justify-center bg-[#070b19] p-6",
      successCard: "bg-white/5 border border-white/10 rounded-[2rem] p-12 max-w-xl w-full text-center relative overflow-hidden text-white backdrop-blur-xl font-outfit",
      successQR: "bg-white/5 border border-white/10 rounded-xl p-5 mb-6 shadow-sm",
      textMain: "text-white",
      textMuted: "text-teal-200/50",
      centeredCard: "bg-white/5 border border-white/10 rounded-[2rem] p-8 sm:p-12 md:p-16 max-w-2xl w-full backdrop-blur-md shadow-2xl shadow-emerald-500/5 text-white relative z-10 my-12 font-outfit",
      headerBlock: "bg-[#070b19]/90 p-8 sm:p-12 md:p-16 border-b border-white/10 relative overflow-hidden font-outfit",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-white mt-6",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-white/5 bg-white/5 hover:border-teal-400/30 text-teal-200"
    },
    crimson_sunset: {
      wrapper: "min-h-screen bg-[linear-gradient(to_bottom_right,_var(--tw-gradient-stops))] from-[#3a0d1e] via-[#6d1a36] to-[#b83b5e] text-white font-sans animate-in fade-in duration-500 relative",
      leftPanel: "bg-black/25 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-r border-white/10 relative min-h-[50vh] lg:min-screen",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(240,138,93,0.12),transparent_60%)] pointer-events-none z-0",
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
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-black/10 backdrop-blur-sm relative border-l border-white/5",
      title: "text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-100 to-amber-300 leading-tight font-outfit break-normal",
      heading: "text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-rose-200 mb-4 tracking-tight uppercase font-outfit",
      subHeading: "text-rose-200/50 text-sm font-medium leading-relaxed font-sans",
      label: "text-[10px] font-bold uppercase tracking-[0.2em] text-rose-200/70 ml-1 block font-outfit",
      input: "w-full px-6 py-4 rounded-xl bg-black/25 border border-white/10 focus:border-[#f08a5d] focus:bg-black/35 outline-none transition-all font-medium text-white placeholder-slate-500 shadow-inner",
      select: "w-full px-6 py-4 rounded-xl bg-black/25 border border-white/10 focus:border-[#f08a5d] focus:bg-black/35 outline-none transition-all font-medium text-white appearance-none cursor-pointer shadow-inner",
      checkbox: "flex items-center gap-4 cursor-pointer group p-4 bg-black/25 rounded-xl border border-white/10 hover:border-[#f08a5d]/50 transition-all shadow-inner",
      checkboxText: "text-xs font-medium text-rose-200/50 group-hover:text-white",
      checkboxInput: "w-5 h-5 rounded-lg bg-black/30 border border-rose-500/30 text-[#f08a5d] accent-[#f08a5d] shrink-0",
      card: "bg-black/25 p-4 rounded-xl border border-white/10 backdrop-blur-sm",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-[#f08a5d]/10 rounded-full border border-[#f08a5d]/20 backdrop-blur-md",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.2em] text-[#f08a5d] font-outfit",
      rsvpBorder: "py-5 border-y border-white/10 space-y-4",
      divider: "border-t border-white/10",
      btnSubmit: "w-full bg-[#f08a5d] hover:bg-[#f08a5d]/90 disabled:bg-zinc-800 text-black font-bold py-5 rounded-xl shadow-lg shadow-[#f08a5d]/10 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.25em] text-xs font-black font-outfit",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-xl font-bold transition-all border-2 \${active ? 'border-[#f08a5d] bg-[#f08a5d]/20 text-white shadow-inner' : 'border-white/10 bg-transparent text-rose-200/50 hover:border-white/20'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-xl font-bold transition-all border-2 \${active ? 'border-red-500/80 bg-red-500/20 text-white' : 'border-white/10 bg-transparent text-rose-200/50 hover:border-white/20'}`,
      loader: "animate-spin text-[#f08a5d]",
      loadingBg: "min-h-screen flex items-center justify-center bg-[#3a0d1e]",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-[#3a0d1e] p-6",
      successBg: "min-h-screen flex items-center justify-center bg-[#3a0d1e] p-6",
      successCard: "bg-black/35 border border-white/10 rounded-[2rem] p-12 max-w-xl w-full text-center relative overflow-hidden text-white backdrop-blur-xl font-outfit",
      successQR: "bg-black/25 border border-white/10 rounded-xl p-5 mb-6 shadow-sm",
      textMain: "text-white",
      textMuted: "text-rose-200/50",
      centeredCard: "bg-black/35 border border-white/10 rounded-[2rem] p-8 sm:p-12 md:p-16 max-w-2xl w-full backdrop-blur-md shadow-2xl text-white relative z-10 my-12 font-outfit",
      headerBlock: "bg-[#3a0d1e]/85 backdrop-blur-md text-white p-8 sm:p-12 md:p-16 border-b-4 border-[#6d1a36] relative overflow-hidden font-outfit",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-xl border border-white/10 bg-black/30 text-white mt-6",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-white/5 bg-black/20 text-[#rose-200] hover:border-[#f08a5d]/30"
    },
    cyberpunk_terminal: {
      wrapper: "min-h-screen bg-black text-[#39ff14] font-mono animate-in fade-in duration-500 relative",
      leftPanel: "bg-black p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col justify-between text-[#39ff14] relative overflow-hidden min-h-[50vh] lg:min-screen border-r border-[#39ff14]/30",
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
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-black/70 backdrop-blur-md relative border-l border-[#39ff14]/25",
      title: "text-3xl sm:text-4xl md:text-5xl font-black mb-6 leading-tight tracking-widest uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-[#39ff14] via-[#20c20e] to-[#128a07] drop-shadow-[0_2px_10px_rgba(57,255,20,0.3)] relative z-10 font-mono break-normal",
      heading: "text-4xl font-black text-[#39ff14] mb-6 tracking-widest uppercase border-b-2 border-[#39ff14] pb-4 font-mono",
      subHeading: "text-[#39ff14]/60 text-xs font-medium leading-relaxed tracking-wider uppercase font-mono",
      label: "text-[10px] font-black uppercase tracking-[0.25em] text-[#39ff14] ml-1 block font-mono",
      input: "w-full px-6 py-5 rounded-none bg-black border border-[#39ff14]/40 focus:border-[#39ff14] focus:shadow-[0_0_12px_rgba(57,255,20,0.2)] outline-none transition-all font-bold text-[#39ff14] placeholder-[#39ff14]/30 font-mono",
      select: "w-full px-6 py-5 rounded-none bg-black border border-[#39ff14]/40 focus:border-[#39ff14] focus:shadow-[0_0_12px_rgba(57,255,20,0.2)] outline-none transition-all font-bold text-[#39ff14] appearance-none cursor-pointer font-mono",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-black rounded-none border border-[#39ff14]/30 hover:border-[#39ff14] transition-all",
      checkboxText: "text-xs font-bold text-[#39ff14]/80 group-hover:text-white font-mono",
      checkboxInput: "w-6 h-6 rounded-none bg-black border border-[#39ff14] text-[#39ff14] accent-[#39ff14] cursor-pointer shrink-0 font-mono",
      card: "bg-black p-5 rounded-none border border-[#39ff14]/30 shadow-[0_0_15px_rgba(57,255,20,0.05)]",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-black rounded-none border border-[#39ff14]/30",
      badgeText: "text-[10px] font-black uppercase tracking-[0.3em] text-[#39ff14] font-mono",
      rsvpBorder: "py-6 border-y border-[#39ff14]/20 space-y-4 font-mono",
      divider: "border-t border-[#39ff14]/20",
      btnSubmit: "w-full bg-[#39ff14] hover:bg-black hover:text-[#39ff14] border-2 border-[#39ff14] disabled:bg-zinc-800 disabled:text-[#128a07] text-black font-black py-6 rounded-none shadow-[0_0_15px_rgba(57,255,20,0.2)] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs font-mono",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-none font-bold transition-all border-2 font-mono \${active ? 'border-[#39ff14] bg-[#39ff14]/20 text-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,0.3)]' : 'border-[#39ff14]/20 bg-transparent text-[#39ff14]/40 hover:border-[#39ff14]/40'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-none font-bold transition-all border-2 font-mono \${active ? 'border-red-500 bg-red-550/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-[#39ff14]/20 bg-transparent text-[#39ff14]/40 hover:border-[#39ff14]/40'}`,
      loader: "animate-spin text-[#39ff14]",
      loadingBg: "min-h-screen flex items-center justify-center bg-black",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-black p-6 border-2 border-[#39ff14]",
      successBg: "min-h-screen flex items-center justify-center bg-black p-6",
      successCard: "bg-black rounded-none border-2 border-[#39ff14] shadow-[0_0_30px_rgba(57,255,20,0.2)] p-16 max-w-xl w-full text-center relative overflow-hidden text-[#39ff14] font-mono",
      successQR: "bg-black border border-[#39ff14]/30 rounded-none p-6 mb-8",
      textMain: "text-[#39ff14]",
      textMuted: "text-[#39ff14]/60 font-mono",
      centeredCard: "bg-black/90 border border-[#39ff14]/30 rounded-none p-8 sm:p-12 md:p-16 max-w-2xl w-full shadow-[0_0_20px_rgba(57,255,20,0.15)] text-[#39ff14] relative z-10 my-12 font-mono",
      headerBlock: "bg-black border-b border-[#39ff14]/30 p-8 sm:p-12 md:p-16 relative overflow-hidden font-mono",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-none border border-[#39ff14]/20 bg-[#070114]/60 text-[#39ff14] mt-6 font-mono",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-none border border-[#39ff14]/20 bg-black text-[#39ff14] hover:border-[#39ff14] font-mono"
    },
    corporate_mono: {
      wrapper: "min-h-screen bg-slate-100 text-slate-900 font-sans relative",
      leftPanel: "bg-slate-900 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-r-[2px] border-slate-800 relative min-h-[50vh] lg:min-screen overflow-hidden",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(71,85,105,0.08),transparent_70%)]",
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
          <div className="absolute inset-0 bg-slate-900/60"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-white relative",
      title: "text-3xl sm:text-4xl lg:text-5xl font-outfit font-extrabold tracking-tighter text-white mb-6 uppercase italic break-normal",
      heading: "text-4xl font-extrabold text-slate-900 mb-6 tracking-tight italic font-outfit",
      subHeading: "text-slate-400 text-sm font-medium leading-relaxed uppercase tracking-wider",
      label: "text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 ml-1 block font-outfit",
      input: "w-full px-6 py-4 rounded-none bg-slate-50 border border-slate-350 focus:border-slate-850 focus:bg-white outline-none transition-all text-slate-900 font-bold placeholder-slate-300 shadow-sm",
      select: "w-full px-6 py-4 rounded-none bg-slate-50 border border-slate-350 focus:border-slate-850 focus:bg-white outline-none transition-all font-bold text-slate-900 appearance-none cursor-pointer shadow-sm",
      checkbox: "flex items-center gap-4 cursor-pointer group p-4 bg-slate-50 rounded-none border border-slate-200 hover:border-slate-400 transition-all shadow-sm",
      checkboxText: "text-xs font-bold text-slate-500 group-hover:text-slate-900",
      checkboxInput: "w-5 h-5 rounded-none bg-white border border-slate-300 text-slate-900 accent-slate-900 shrink-0",
      card: "bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm text-slate-800",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-full border border-slate-200 shadow-sm",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 font-outfit",
      rsvpBorder: "py-5 border-y border-slate-200 space-y-4",
      divider: "border-t border-slate-200",
      btnSubmit: "w-full bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white font-bold py-5 rounded-none transition-all uppercase tracking-widest text-xs font-outfit",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-none font-bold border transition-all \${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-55'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-none font-bold border transition-all \${active ? 'border-red-500 bg-red-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-55'}`,
      loader: "animate-spin text-slate-900",
      loadingBg: "min-h-screen flex items-center justify-center bg-slate-100",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6",
      successBg: "min-h-screen flex items-center justify-center bg-slate-100 p-6",
      successCard: "bg-white rounded-none shadow-2xl p-12 max-w-xl w-full text-center border border-slate-200 relative overflow-hidden text-slate-900 font-outfit",
      successQR: "bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 shadow-sm",
      textMain: "text-slate-900",
      textMuted: "text-slate-500",
      centeredCard: "bg-white border border-slate-200 rounded-none p-8 sm:p-12 md:p-16 max-w-2xl w-full shadow-2xl text-slate-900 relative z-10 my-12 font-outfit",
      headerBlock: "bg-slate-900 text-white p-8 sm:p-12 md:p-16 border-b border-slate-200 relative overflow-hidden font-outfit",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-none border border-slate-200 bg-slate-50 text-slate-900 mt-6",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-none border border-slate-200 bg-white text-slate-800 hover:border-slate-400"
    },
    nordic_alabaster: {
      wrapper: "min-h-screen bg-[#faf9f6] text-[#4a3f35] font-serif animate-in fade-in duration-500 relative",
      leftPanel: "bg-[#f4f1ea] text-slate-900 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-r border-slate-200 relative min-h-[50vh] lg:min-screen",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(140,130,115,0.05),transparent_70%)]",
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
          <div className="absolute inset-0 bg-[#f4f1ea]/65 backdrop-blur-[1px]"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-[#faf9f6] relative",
      title: "text-3xl sm:text-4xl lg:text-5xl font-light font-serif tracking-tight text-slate-900 mb-6 italic break-normal",
      heading: "text-4xl font-light font-serif text-slate-900 mb-6 italic border-b border-slate-200 pb-4",
      subHeading: "text-slate-500 text-sm font-medium leading-relaxed font-sans uppercase tracking-wider",
      label: "text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1 block font-sans",
      input: "w-full px-5 py-4 bg-transparent border-b border-stone-300 focus:border-stone-900 outline-none transition-all text-stone-900 font-serif placeholder-stone-400 rounded-none",
      select: "w-full px-5 py-4 bg-transparent border-b border-stone-300 focus:border-stone-900 outline-none transition-all font-serif text-stone-900 appearance-none cursor-pointer rounded-none",
      checkbox: "flex items-center gap-4 cursor-pointer group p-4 bg-[#f4f1ea] rounded-none border border-slate-200 hover:border-slate-400 transition-all",
      checkboxText: "text-xs font-medium text-slate-500 group-hover:text-slate-900 font-sans",
      checkboxInput: "w-4 h-4 rounded-none bg-transparent border border-stone-400 text-stone-850 accent-stone-850 shrink-0",
      card: "bg-[#f4f1ea] p-4 rounded-none border border-slate-200 text-slate-800 font-sans",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-[#f4f1ea] rounded-none border border-slate-200",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 font-sans",
      rsvpBorder: "py-5 border-y border-slate-200 space-y-4 font-sans",
      divider: "border-t border-slate-200",
      btnSubmit: "w-full bg-[#1c1917] hover:bg-black disabled:bg-slate-200 text-white font-serif italic py-5 rounded-none transition-all tracking-wide text-sm",
      btnAttending: (active: boolean) => `px-6 py-3 border-b-2 transition-all font-serif \${active ? 'border-[#1c1917] text-slate-900 font-bold bg-[#f4f1ea]' : 'border-transparent text-slate-400 hover:text-slate-950'}`,
      btnNotAttending: (active: boolean) => `px-6 py-3 border-b-2 transition-all font-serif \${active ? 'border-red-500 text-red-500 font-bold bg-[#f4f1ea]' : 'border-transparent text-slate-400 hover:text-slate-955'}`,
      loader: "animate-spin text-slate-800",
      loadingBg: "min-h-screen flex items-center justify-center bg-[#faf9f6]",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-[#faf9f6] p-6",
      successBg: "min-h-screen flex items-center justify-center bg-[#faf9f6] p-6",
      successCard: "bg-[#faf9f6] border border-slate-200 rounded-none p-12 max-w-xl w-full text-center relative overflow-hidden text-slate-900 font-serif",
      successQR: "bg-[#f4f1ea] border border-slate-200 rounded-none p-5 mb-6",
      textMain: "text-slate-900",
      textMuted: "text-slate-500 font-sans",
      centeredCard: "bg-[#faf9f6] border border-stone-250 rounded-none p-8 sm:p-12 md:p-16 max-w-2xl w-full shadow-sm text-stone-900 relative z-10 my-12 font-serif",
      headerBlock: "bg-[#f4f1ea] text-[#4a3f35] p-8 sm:p-12 md:p-16 border-b border-stone-200 relative overflow-hidden font-serif",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-none border border-stone-250 bg-[#f4f1ea] text-[#4a3f35] mt-6 font-serif",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-none border border-stone-200 bg-transparent text-stone-900 hover:border-stone-400 font-serif"
    },
    midnight_executive: {
      wrapper: "min-h-screen bg-[#0d0e12] text-zinc-100 font-sans animate-in fade-in duration-500 relative",
      leftPanel: "bg-[#13151a] p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-r border-zinc-800/50 relative min-h-[50vh] lg:min-screen",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,0.06),transparent_50%)] pointer-events-none z-0",
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
          <div className="absolute inset-0 bg-[#13151a]/75 backdrop-blur-[1px]"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-[#0d0e12]/80 backdrop-blur-md relative",
      title: "text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-6 uppercase font-outfit italic break-normal",
      heading: "text-4xl font-black text-white mb-6 tracking-tight font-outfit italic uppercase",
      subHeading: "text-zinc-500 text-sm font-medium leading-relaxed uppercase tracking-wider",
      label: "text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 ml-1 block font-outfit",
      input: "w-full px-6 py-5 rounded-lg bg-[#16181f] border border-zinc-800 client-input-focus outline-none transition-all font-bold text-white placeholder-zinc-700",
      select: "w-full px-6 py-5 rounded-lg bg-[#16181f] border border-zinc-800 client-input-focus outline-none transition-all font-bold text-white appearance-none cursor-pointer",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-[#16181f] rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all",
      checkboxText: "text-xs font-bold text-zinc-400 group-hover:text-white",
      checkboxInput: "w-5 h-5 rounded bg-[#16181f] border-zinc-800 text-blue-600 accent-blue-600 shrink-0",
      card: "bg-[#16181f] p-5 rounded-xl border border-zinc-800/80 text-zinc-300",
      badge: "inline-flex items-center gap-4 px-5 py-3 bg-[#16181f] rounded-full border border-zinc-850",
      badgeText: "text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 font-outfit",
      rsvpBorder: "py-6 border-y border-zinc-850 space-y-4",
      divider: "border-t border-zinc-850",
      btnSubmit: "w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white font-bold py-5 rounded-lg transition-all shadow-lg uppercase tracking-widest text-xs font-outfit",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-lg font-bold border-2 transition-all \${active ? 'border-blue-500 bg-blue-500/20 text-white shadow-inner' : 'border-zinc-800 bg-transparent text-zinc-500 hover:border-zinc-700'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-lg font-bold border-2 transition-all \${active ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-zinc-800 bg-transparent text-zinc-500 hover:border-zinc-700'}`,
      loader: "animate-spin text-[#2563eb]",
      loadingBg: "min-h-screen flex items-center justify-center bg-[#0d0e12]",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-[#0d0e12] p-6",
      successBg: "min-h-screen flex items-center justify-center bg-[#0d0e12] p-6",
      successCard: "bg-[#13151a] border border-zinc-800/80 rounded-3xl p-12 max-w-xl w-full text-center relative overflow-hidden text-white backdrop-blur-md font-outfit",
      successQR: "bg-slate-950 border border-zinc-800 rounded-xl p-5 mb-6",
      textMain: "text-white",
      textMuted: "text-zinc-400",
      centeredCard: "bg-[#13151a] border border-zinc-800/80 rounded-3xl p-8 sm:p-12 md:p-16 max-w-2xl w-full shadow-2xl text-white relative z-10 my-12 font-outfit",
      headerBlock: "bg-[#13151a] border-b border-zinc-800/50 p-8 sm:p-12 md:p-16 relative overflow-hidden font-outfit",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-xl border border-zinc-850 bg-[#13151a] text-zinc-300 mt-6",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-zinc-800 bg-[#16181f]/40 text-white hover:border-blue-500/30"
    },
    champagne_lounge: {
      wrapper: "min-h-screen bg-[#faf6f0] text-[#4a3f35] font-sans animate-in fade-in duration-500 relative flex items-center justify-center p-6",
      leftPanel: "bg-white/60 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-r border-[#e3dac9] relative min-h-[50vh] lg:min-screen",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(197,160,89,0.08),transparent_60%)] pointer-events-none z-0",
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
          <div className="absolute inset-0 bg-[#faf6f0]/75"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-white/40 backdrop-blur-sm border-l border-[#e3dac9] relative",
      title: "text-3xl sm:text-4xl font-light font-serif tracking-tight text-[#4a3f35] mb-6 break-normal",
      heading: "text-3xl font-light font-serif text-[#4a3f35] mb-4 tracking-tight border-b border-[#e3dac9] pb-4",
      subHeading: "text-stone-400 text-xs font-semibold tracking-wide uppercase font-sans",
      label: "text-[10px] font-bold uppercase tracking-[0.2em] text-[#4a3f35]/70 ml-1 block font-sans",
      input: "w-full px-6 py-4 rounded-full bg-white border border-[#e3dac9] client-input-focus outline-none transition-all font-medium text-[#4a3f35] placeholder-stone-300 shadow-inner px-8",
      select: "w-full px-6 py-4 rounded-full bg-white border border-[#e3dac9] client-input-focus outline-none transition-all font-medium text-[#4a3f35] appearance-none cursor-pointer shadow-inner px-8",
      checkbox: "flex items-center gap-4 cursor-pointer group p-4 bg-white rounded-full border border-[#e3dac9] hover:border-[#c5a059]/40 transition-all shadow-inner px-8",
      checkboxText: "text-xs font-bold text-stone-400 group-hover:text-[#4a3f35] font-sans",
      checkboxInput: "w-5 h-5 rounded-full bg-white border border-[#e3dac9] text-[#c5a059] accent-[#c5a059] shrink-0",
      card: "bg-white p-4 rounded-xl border border-[#e3dac9] shadow-sm text-[#4a3f35] font-sans",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-[#c5a059]/10 rounded-full border border-[#c5a059]/20 backdrop-blur-md",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.25em] text-[#c5a059] font-sans",
      rsvpBorder: "py-5 border-y border-[#e3dac9] space-y-4 font-sans",
      divider: "border-t border-[#e3dac9]",
      btnSubmit: "w-full bg-[#c5a059] hover:bg-[#b08b45] disabled:bg-[#f2efe9] text-white font-bold py-5 rounded-full shadow-lg transition-all uppercase tracking-widest text-xs font-sans",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-full font-bold font-sans transition-all border-2 \${active ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' : 'border-[#e3dac9] bg-transparent text-stone-400 hover:border-[#c5a059]'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-full font-bold font-sans transition-all border-2 \${active ? 'border-red-500 bg-red-500/10 text-red-550' : 'border-[#e3dac9] bg-transparent text-stone-400 hover:border-red-500'}`,
      loader: "animate-spin text-[#c5a059]",
      loadingBg: "min-h-screen flex items-center justify-center bg-[#faf6f0]",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-[#faf6f0] p-6",
      successBg: "min-h-screen flex items-center justify-center bg-[#faf6f0] p-6",
      successCard: "bg-[#fdfbf7] border border-[#e3dac9] rounded-[2.5rem] p-12 max-w-xl w-full text-center relative overflow-hidden text-[#4a3f35] shadow-2xl font-serif",
      successQR: "bg-white border border-[#e3dac9] rounded-xl p-5 mb-6 shadow-inner",
      textMain: "text-[#4a3f35]",
      textMuted: "text-stone-400 font-sans",
      centeredCard: "bg-[#fdfbf7] border border-[#e3dac9] rounded-[2.5rem] p-8 sm:p-12 md:p-16 max-w-2xl w-full backdrop-blur-md shadow-2xl text-[#4a3f35] relative z-10 my-12 font-serif",
      headerBlock: "bg-[#faf6f0] border-b border-[#e3dac9] p-8 sm:p-12 md:p-16 relative overflow-hidden font-serif",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-[2rem] border border-[#e3dac9] bg-white text-[#4a3f35] mt-6 font-serif",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-full border border-[#e3dac9] bg-white text-[#4a3f35] hover:border-[#c5a059]/40 font-serif"
    },
    logistics_glass: {
      wrapper: "min-h-screen bg-slate-950 text-slate-100 font-sans animate-in fade-in duration-500 relative",
      leftPanel: "bg-slate-900/50 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-r border-slate-800/80 relative min-h-[50vh] lg:min-screen",
      leftOverlay: bannerUrl 
        ? "absolute inset-0 z-0 overflow-hidden"
        : "absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(148,163,184,0.05),transparent_60%)] pointer-events-none z-0",
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
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"></div>
        </div>
      ) : null,
      rightPanel: "p-12 lg:p-24 flex flex-col justify-center bg-slate-900/30 backdrop-blur-md relative border-l border-slate-800/50",
      title: "text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-300 to-slate-500 mb-6 uppercase italic font-outfit break-normal",
      heading: "text-4xl font-black text-white mb-6 tracking-tight font-outfit italic uppercase border-b-2 border-slate-800 pb-4",
      subHeading: "text-slate-400 text-xs font-semibold tracking-wider uppercase",
      label: "text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1 block font-outfit",
      input: "w-full px-6 py-5 rounded-none bg-slate-950/40 border border-slate-800 client-input-focus outline-none transition-all font-bold text-white placeholder-slate-700 font-mono",
      select: "w-full px-6 py-5 rounded-none bg-slate-950/40 border border-slate-800 client-input-focus outline-none transition-all font-bold text-white appearance-none cursor-pointer font-mono",
      checkbox: "flex items-center gap-4 cursor-pointer group p-5 bg-slate-950/40 rounded-none border border-slate-800 hover:border-slate-600 transition-all",
      checkboxText: "text-xs font-bold text-slate-400 group-hover:text-white font-mono",
      checkboxInput: "w-5 h-5 rounded-none bg-slate-950/40 border border-slate-700 text-slate-300 accent-slate-650 shrink-0",
      card: "bg-slate-900/40 backdrop-blur-sm p-4 rounded-xl border border-slate-800 text-slate-300",
      badge: "inline-flex items-center gap-3 px-4 py-2 bg-slate-900/60 rounded-full border border-slate-800 backdrop-blur-md",
      badgeText: "text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 font-outfit",
      rsvpBorder: "py-5 border-y border-slate-800 space-y-4 font-mono",
      divider: "border-t border-slate-800",
      btnSubmit: "w-full bg-slate-850 hover:bg-slate-700 disabled:bg-zinc-800 text-slate-100 font-bold py-6 rounded-none transition-all shadow-xl uppercase tracking-widest text-xs font-mono",
      btnAttending: (active: boolean) => `px-6 py-4 rounded-none font-bold transition-all border-2 font-mono \${active ? 'border-slate-500 bg-slate-500/20 text-white' : 'border-slate-800 bg-transparent text-slate-500 hover:border-slate-700'}`,
      btnNotAttending: (active: boolean) => `px-6 py-4 rounded-none font-bold transition-all border-2 font-mono \${active ? 'border-red-500 bg-red-500/20 text-red-500' : 'border-slate-800 bg-transparent text-slate-500 hover:border-slate-700'}`,
      loader: "animate-spin text-slate-450",
      loadingBg: "min-h-screen flex items-center justify-center bg-slate-950",
      errorBg: "min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6",
      successBg: "min-h-screen flex items-center justify-center bg-slate-950 p-6",
      successCard: "bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 max-w-xl w-full text-center relative overflow-hidden text-white backdrop-blur-md font-mono",
      successQR: "bg-slate-950 border border-slate-800 rounded-xl p-5 mb-6",
      textMain: "text-white",
      textMuted: "text-slate-400 font-mono",
      centeredCard: "bg-slate-900/30 border border-slate-800/55 rounded-none p-8 sm:p-12 md:p-16 max-w-2xl w-full backdrop-blur-md shadow-2xl text-slate-100 relative z-10 my-12 font-mono",
      headerBlock: "bg-slate-900/60 p-8 sm:p-12 md:p-16 border-b border-slate-800 relative overflow-hidden font-mono",
      bodyBlock: "flex-1 py-16 px-6 max-w-xl mx-auto w-full",
      disclaimerContainer: "space-y-4 p-6 rounded-none border border-slate-800 bg-slate-950/40 text-slate-350 mt-6 font-mono",
      disclaimerAcceptLabel: "flex items-center gap-4 cursor-pointer group p-4 rounded-none border border-slate-800 bg-slate-950/20 text-slate-300 hover:border-slate-600 font-mono"
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
    cyberpunk_terminal: "split",
    corporate_mono: "split",
    nordic_alabaster: "split",
    midnight_executive: "split",
    champagne_lounge: "centered",
    logistics_glass: "split"
  } as const;

  const layout = event?.banner_settings?.layout || themeLayouts[theme as keyof typeof themeLayouts] || "split";

  // Sub-render blocks for dynamic layouts
  const eventInfo = event ? (
    <div className="relative z-10 my-auto py-12 lg:py-24">
      <h1 className={style.title}>{event.title}</h1>
      <p className={`text-xl mb-10 lg:mb-20 max-w-lg leading-relaxed font-medium ${style.textMuted}`}>{event.description}</p>
      <div className="space-y-6 lg:space-y-10">
        <div className="flex items-center gap-8 group">
          <div className={style.card}>
            <Calendar size={32} className={isLightTheme ? "client-text-primary" : "client-text-accent"} />
          </div>
          <div>
            <p className={`${style.textMuted} text-[10px] font-black uppercase tracking-[0.3em] mb-2`}>Schedule</p>
            <p className={`text-2xl font-black font-bricolage italic tracking-tight ${style.textMain}`}>{new Date(event.start_date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</p>
          </div>
        </div>
        <div className="flex items-start gap-8 group">
          <div className={style.card}>
            <MapPin size={32} className={isLightTheme ? "client-text-primary" : "client-text-accent"} />
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
    <div className={style.bodyBlock || "max-w-md w-full mx-auto relative z-10 py-12"}>
      {formBannerUrl && (
        <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200/10 dark:border-white/5 shadow-lg">
          <img src={formBannerUrl} alt="Event Banner" className="w-full h-auto object-cover max-h-48" />
        </div>
      )}
      <div className="mb-12">
        <h2 className={style.heading}>Register.</h2>
        <p className={style.subHeading}>Secure your credentials for this exclusive engagement.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className={style.label}>
              First Name <span className={`${isLightTheme ? "client-text-primary" : "client-text-accent"} ml-0.5 font-bold`}>*</span>
            </label>
            <input
              required
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="e.g. Alan"
              className={style.input}
            />
          </div>

          <div className="space-y-2">
            <label className={style.label}>
              Last Name <span className={`${isLightTheme ? "client-text-primary" : "client-text-accent"} ml-0.5 font-bold`}>*</span>
            </label>
            <input
              required
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="e.g. Turing"
              className={style.input}
            />
          </div>

          <div className="space-y-2">
            <label className={style.label}>
              Secure Email Address <span className={`${isLightTheme ? "client-text-primary" : "client-text-accent"} ml-0.5 font-bold`}>*</span>
            </label>
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. turing@bletchleypark.org.uk"
              className={style.input}
            />
          </div>

          {event.collect_company !== false && (
            <div className="space-y-2">
              <label className={style.label}>
                Organization / Company {event.company_required && <span className={`${isLightTheme ? "client-text-primary" : "client-text-accent"} ml-0.5 font-bold`}>*</span>}
              </label>
              <input
                required={event.company_required}
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="e.g. Government Code & Cypher School"
                className={style.input}
              />
            </div>
          )}

          <div className={style.rsvpBorder}>
            <label className={style.label}>
              Attendance Status <span className={`${isLightTheme ? "client-text-primary" : "client-text-accent"} ml-0.5 font-bold`}>*</span>
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
        </div>

        {isAttending && event.custom_fields_schema && event.custom_fields_schema.length > 0 && (
          <div className="space-y-8">
            <div className="pt-6">
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLightTheme ? "client-text-primary" : "client-text-accent"}`}>Additional Details</p>
            </div>
            {event.custom_fields_schema.map((field) => {
              if (field.inactive) {
                return null;
              }

              // Hide partner card field & partner-related details if in update flow
              const isPartnerRelated = field.type === "partner_card" || 
                                       field.label?.toLowerCase().includes("partner") || 
                                       field.description?.toLowerCase().includes("partner");
              if (isUpdateFlow && isPartnerRelated) {
                return null;
              }

              // Evaluation of conditional rendering
              if (field.dependsOn) {
                const parentVal = customAnswers[field.dependsOn.fieldId];
                const parentValStr = typeof parentVal === "boolean" ? String(parentVal) : parentVal;
                if (parentValStr !== field.dependsOn.value) {
                  return null;
                }
              }

              return (
                <div key={field.id} className="space-y-3">
                  <label className={style.label}>
                    {field.label} {field.required && <span className={`${isLightTheme ? "client-text-primary" : "client-text-accent"} ml-0.5 font-bold`}>*</span>}
                  </label>
                  
                  {field.description && (
                    <div className={`p-4 rounded-[1.2rem] flex items-start gap-3 text-xs leading-normal border ${
                      isLightTheme
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
                        <option value="" className={isLightTheme ? "text-black" : "text-white"}>Select Option</option>
                        {field.options?.map(opt => <option key={opt} value={opt} className={isLightTheme ? "text-black" : "text-white"}>{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={20} />
                    </div>
                  )}

                  {field.type === "checkbox" && (
                    <label className={style.checkbox}>
                       <input 
                         type="checkbox" 
                         onChange={(e) => handleCustomChange(field.id, e.target.checked)}
                         className={style.checkboxInput || "w-6 h-6 rounded-lg bg-zinc-900 border-white/10 client-checkbox transition-all"} 
                       />
                       <span className={style.checkboxText}>Yes, I agree / confirm</span>
                    </label>
                  )}

                  {field.type === "partner_card" && (
                    <div className={`space-y-6 p-6 rounded-2xl border ${
                      isLightTheme 
                        ? "bg-slate-50 border-slate-200 text-slate-850" 
                        : "bg-zinc-900/30 border-white/5 text-zinc-100"
                    }`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Partner First Name *</label>
                          <input
                            required={field.required}
                            type="text"
                            placeholder="e.g. Alan"
                            value={customAnswers[field.id]?.first_name || ""}
                            onChange={(e) => handleCustomChange(field.id, {
                              ...customAnswers[field.id],
                              first_name: e.target.value
                            })}
                            className={style.input}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Partner Last Name *</label>
                          <input
                            required={field.required}
                            type="text"
                            placeholder="e.g. Turing"
                            value={customAnswers[field.id]?.last_name || ""}
                            onChange={(e) => handleCustomChange(field.id, {
                              ...customAnswers[field.id],
                              last_name: e.target.value
                            })}
                            className={style.input}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Partner Email *</label>
                        <input
                          required={field.required}
                          type="email"
                          placeholder="partner@company.com"
                          value={customAnswers[field.id]?.email || ""}
                          onChange={(e) => handleCustomChange(field.id, {
                            ...customAnswers[field.id],
                            email: e.target.value
                          })}
                          className={style.input}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Disclaimer & Indemnity */}
        {isAttending && event.disclaimer_enabled && event.disclaimer_text && (
          <div className={style.disclaimerContainer || `space-y-4 p-6 rounded-[1.5rem] border ${isLightTheme ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-black/30 border-white/10 text-white'} mt-6`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLightTheme ? "client-text-primary" : "client-text-accent"}`}>Disclaimer & Indemnity</p>
            <div 
              className="text-xs leading-relaxed opacity-85 max-h-40 overflow-y-auto pr-2 border-b border-white/5 pb-4 space-y-1.5"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(event.disclaimer_text || "", theme) }}
            />
            <label className={style.disclaimerAcceptLabel || `flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all ${isLightTheme ? 'bg-white border-slate-200 text-slate-800' : 'bg-black/20 text-white'}`}>
              <input
                required
                type="checkbox"
                checked={disclaimerAccepted}
                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                className={style.checkboxInput || "w-6 h-6 rounded-lg bg-zinc-900 border-white/10 client-checkbox transition-all"}
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
        .client-text-accent { color: ${eventAccentColor} !important; }
        .client-bg-accent { background-color: ${eventAccentColor} !important; }
        .client-border-accent { border-color: ${eventAccentColor} !important; }
        .client-hover-border-accent:hover { border-color: ${eventAccentColor} !important; }
        .client-hover-bg-accent:hover { background-color: ${eventAccentColor} !important; }
        .client-shadow-accent { box-shadow: 0 25px 50px -12px ${eventAccentColor}30 !important; }
        .client-text-primary { color: ${eventPrimaryColor} !important; }
        .client-bg-primary { background-color: ${eventPrimaryColor} !important; }
        .client-border-primary { border-color: ${eventPrimaryColor} !important; }
        .client-input-focus:focus {
          border-color: ${eventAccentColor} !important;
          box-shadow: 0 0 0 4px ${eventAccentColor}1a !important;
        }
        .client-checkbox:checked {
          background-color: ${eventAccentColor} !important;
          border-color: ${eventAccentColor} !important;
        }
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
            {(theme === "cyber_dark" || theme === "midnight_executive" || theme === "logistics_glass") && <div className="absolute top-0 left-0 w-full h-1 client-bg-accent"></div>}
            <div className={`${
              theme === "cyber_dark" || theme === "midnight_executive" || theme === "logistics_glass"
                ? "client-bg-accent animate-bounce" 
                : theme === "minimal_light" || theme === "corporate_mono" || theme === "nordic_alabaster" || theme === "champagne_lounge"
                  ? "client-bg-primary animate-pulse" 
                  : theme === "brutalist_retro" 
                    ? "bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                    : "bg-gradient-to-r from-yellow-500 to-indigo-500"
            } w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl`}>
              <CheckCircle2 className={isLightTheme && theme !== "brutalist_retro" ? "text-white" : "text-black"} size={56} />
            </div>
            <h1 className={`text-4xl font-black mb-6 font-bricolage italic uppercase tracking-tight ${style.textMain}`}>
              {statusMessage || (isAttending ? "Access Granted." : "Response Recorded.")}
            </h1>
            <p className={`${style.textMuted} mb-12 font-medium leading-relaxed`}>
              Your registration for <span className={`${style.textMain} font-bold`}>{event.title}</span> is {isAttending ? 'confirmed' : 'submitted'}. 
              {isAttending 
                ? ` Verification has been dispatched to `
                : ` We've noted that you are unable to attend. Thank you for letting us know. `}
              {isAttending && <span className={`${isLightTheme ? "client-text-primary" : "client-text-accent"} font-bold`}>{formData.email}</span>}
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
                <p className={`text-3xl font-black ${isLightTheme ? "client-text-primary" : "client-text-accent"} tracking-tighter italic font-bricolage`}>
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
              <div className={style.leftPanel}>
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
              <div className={`${style.leftPanel} lg:order-last`}>
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
                      <Calendar size={24} className={isLightTheme ? "client-text-primary" : "client-text-accent"} />
                      <div>
                        <p className={`${style.textMuted} text-[9px] font-black uppercase tracking-[0.25em] mb-1`}>Time Frame</p>
                        <p className={`text-sm font-bold tracking-tight ${style.textMain}`}>{new Date(event.start_date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className={style.card}>
                        <MapPin size={24} className={isLightTheme ? "client-text-primary" : "client-text-accent"} />
                      </div>
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
