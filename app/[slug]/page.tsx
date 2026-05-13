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
}

interface Event {
  id: number;
  title: string;
  description: string;
  start_date: string;
  location: string;
  capacity: number;
  banner_url?: string;
  custom_fields_schema?: FormField[];
}

export default function PublicRegistrationPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registeredId, setRegisteredId] = useState<string | null>(null);
  const [registeredPin, setRegisteredPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    company: "",
  });

  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

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
          custom_answers: customAnswers
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRegisteredId(data.id);
        setRegisteredPin(data.pin);
      } else {
        alert("Failed to register. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-yellow-500" size={48} />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-6">
        <AlertCircle className="text-red-500 mb-6" size={64} />
        <h1 className="text-3xl font-black text-white mb-4 font-bricolage italic uppercase tracking-tight">Access Denied</h1>
        <p className="text-zinc-500 text-center max-w-md font-medium">{error}</p>
      </div>
    );
  }

  if (registeredId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="bg-zinc-900 rounded-[3rem] shadow-2xl p-16 max-w-xl w-full text-center border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
          <div className="bg-yellow-500 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-yellow-500/20">
            <CheckCircle2 className="text-black" size={56} />
          </div>
          <h1 className="text-4xl font-black text-white mb-6 font-bricolage italic uppercase tracking-tight">Access Granted.</h1>
          <p className="text-zinc-400 mb-12 font-medium leading-relaxed">
            Your orchestration for <span className="text-white font-bold">{event.title}</span> is confirmed. 
            Verification has been dispatched to <span className="text-yellow-500 font-bold">{formData.email}</span>.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-white p-2 rounded-xl">
                <QRCodeSVG 
                  value={registeredPin || registeredId || ""} 
                  size={160}
                  level="H"
                />
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">Unique Clearance ID</p>
            <p className="text-3xl font-black text-yellow-400 tracking-tighter italic font-bricolage">
              {registeredPin || (registeredId ? registeredId.substring(0, 8) : "")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-outfit">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Side: Info */}
        <div className="bg-black p-12 lg:p-24 flex flex-col justify-center text-white relative overflow-hidden">
          {event.banner_url ? (
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center" 
              style={{ backgroundImage: `url(${event.banner_url})` }}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            </div>
          ) : (
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.1),transparent_70%)]"></div>
          )}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-zinc-900 rounded-full mb-12 border border-white/5">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Excellence Entertainment Logistics</span>
            </div>
            <h1 className="text-6xl lg:text-8xl font-black mb-10 leading-[0.9] tracking-tighter font-bricolage italic">{event.title}</h1>
            <p className="text-xl text-zinc-500 mb-20 max-w-lg leading-relaxed font-medium">{event.description}</p>
            <div className="space-y-10">
              <div className="flex items-center gap-8 group">
                <div className="bg-zinc-900 p-5 rounded-2xl border border-white/5 group-hover:border-yellow-500/50 transition-all">
                  <Calendar size={32} className="text-yellow-500" />
                </div>
                <div>
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Schedule</p>
                  <p className="text-2xl font-black font-bricolage italic tracking-tight">{new Date(event.start_date).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-8 group">
                <div className="bg-zinc-900 p-5 rounded-2xl border border-white/5 group-hover:border-yellow-500/50 transition-all">
                  <MapPin size={32} className="text-yellow-500" />
                </div>
                <div>
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Venue</p>
                  <p className="text-2xl font-black font-bricolage italic tracking-tight">{event.location}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-12 lg:p-24 flex flex-col justify-center bg-zinc-900/30 border-l border-white/5 relative">
          <div className="max-w-md w-full mx-auto relative z-10 py-12">
            <div className="mb-16">
              <h2 className="text-5xl font-black text-white mb-6 tracking-tight font-bricolage italic">Register.</h2>
              <p className="text-zinc-500 text-lg font-medium leading-relaxed">Secure your credentials for this exclusive engagement.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Default Fields */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">First Name</label>
                  <input required type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full px-6 py-5 rounded-[1.5rem] bg-black border border-white/5 focus:border-yellow-500/50 focus:ring-4 focus:ring-yellow-500/5 outline-none transition-all font-bold text-white placeholder-zinc-700" placeholder="Jane" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Last Name</label>
                  <input required type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full px-6 py-5 rounded-[1.5rem] bg-black border border-white/5 focus:border-yellow-500/50 focus:ring-4 focus:ring-yellow-500/5 outline-none transition-all font-bold text-white placeholder-zinc-700" placeholder="Doe" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Intelligence / Email</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="jane.doe@company.com" className="w-full px-6 py-5 rounded-[1.5rem] bg-black border border-white/5 focus:border-yellow-500/50 focus:ring-4 focus:ring-yellow-500/5 outline-none transition-all font-bold text-white placeholder-zinc-700" />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Organization</label>
                <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="Global Enterprises Inc." className="w-full px-6 py-5 rounded-[1.5rem] bg-black border border-white/5 focus:border-yellow-500/50 focus:ring-4 focus:ring-yellow-500/5 outline-none transition-all font-bold text-white placeholder-zinc-700" />
              </div>

              {/* Dynamic Custom Fields */}
              {event.custom_fields_schema?.map((field) => (
                <div key={field.id} className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500/70 ml-1">
                    {field.label} {field.required && "*"}
                  </label>
                  
                  {field.type === "text" && (
                    <input
                      required={field.required}
                      type="text"
                      onChange={(e) => handleCustomChange(field.id, e.target.value)}
                      className="w-full px-6 py-5 rounded-[1.5rem] bg-black border border-white/5 focus:border-yellow-500/50 focus:ring-4 focus:ring-yellow-500/5 outline-none transition-all font-bold text-white placeholder-zinc-700"
                    />
                  )}

                  {field.type === "select" && (
                    <div className="relative">
                      <select
                        required={field.required}
                        onChange={(e) => handleCustomChange(field.id, e.target.value)}
                        className="w-full px-6 py-5 rounded-[1.5rem] bg-black border border-white/5 focus:border-yellow-500/50 focus:ring-4 focus:ring-yellow-500/5 outline-none transition-all font-bold text-white appearance-none cursor-pointer"
                      >
                        <option value="">Select Option</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={20} />
                    </div>
                  )}

                  {field.type === "checkbox" && (
                    <label className="flex items-center gap-4 cursor-pointer group p-5 bg-black rounded-[1.5rem] border border-white/5 hover:border-yellow-500/30 transition-all">
                       <input 
                         type="checkbox" 
                         onChange={(e) => handleCustomChange(field.id, e.target.checked)}
                         className="w-6 h-6 rounded-lg bg-zinc-900 border-white/10 checked:bg-yellow-500 transition-all" 
                       />
                       <span className="text-xs font-bold text-zinc-400 group-hover:text-white">Yes, I agree / confirm</span>
                    </label>
                  )}
                </div>
              ))}

              <div className="pt-8">
                <button type="submit" disabled={registering} className="w-full bg-yellow-500 hover:bg-white disabled:bg-zinc-800 text-black font-black py-6 rounded-[2rem] shadow-2xl shadow-yellow-500/10 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs">
                  {registering ? <Loader2 className="animate-spin" size={20} /> : null}
                  {registering ? "Dispatching..." : "Submit Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
