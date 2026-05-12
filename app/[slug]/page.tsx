"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, MapPin, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface Event {
  id: number;
  title: string;
  description: string;
  start_date: string;
  location: string;
  capacity: number;
}

export default function PublicRegistrationPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registeredId, setRegisteredId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    company: "",
  });

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
      const response = await fetch(`/api/py/register?event_id=${event.id}&email=${formData.email}&first_name=${formData.first_name}&last_name=${formData.last_name}&company=${formData.company}`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setRegisteredId(data.id);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <AlertCircle className="text-red-500 mb-4" size={64} />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (registeredId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-3xl shadow-xl p-12 max-w-xl w-full text-center border border-gray-100">
          <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-500" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Registration Confirmed!</h1>
          <p className="text-slate-600 mb-8">
            Thank you for registering for <span className="font-bold text-slate-900">{event.title}</span>. 
            We've sent a confirmation email to <span className="font-semibold">{formData.email}</span>.
          </p>
          <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">Registration ID</p>
            <code className="text-lg font-mono text-blue-600 font-bold">{registeredId}</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Side: Info */}
        <div className="bg-slate-900 p-12 lg:p-24 flex flex-col justify-center text-white relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full -mr-48 -mt-48 opacity-20 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600 rounded-full -ml-48 -mb-48 opacity-20 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="inline-block px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-8">
              Exclusive Event
            </div>
            <h1 className="text-5xl lg:text-7xl font-black mb-8 leading-[1.1] tracking-tighter italic">
              {event.title}
            </h1>
            <p className="text-xl text-slate-400 mb-16 max-w-lg leading-relaxed font-medium">
              {event.description}
            </p>
            
            <div className="space-y-8">
              <div className="flex items-center gap-6 group">
                <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-md border border-white/10 group-hover:bg-blue-600 transition-colors">
                  <Calendar size={28} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Schedule</p>
                  <p className="text-xl font-bold italic">{new Date(event.start_date).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                  <p className="text-slate-400 font-medium">{new Date(event.start_date).toLocaleTimeString(undefined, { timeStyle: 'short' })}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 group">
                <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-md border border-white/10 group-hover:bg-blue-600 transition-colors">
                  <MapPin size={28} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Venue</p>
                  <p className="text-xl font-bold italic">{event.location}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-12 left-12 lg:left-24 text-[10px] font-bold text-slate-700 tracking-[0.3em] uppercase">
            © 2024 Enterprise Event Logistics
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-12 lg:p-24 flex flex-col justify-center bg-gray-50/50">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-12">
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Join the Summit.</h2>
              <p className="text-slate-500 text-lg font-medium">Secure your invitation by completing the registration below.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                  <input
                    required
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-900"
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
                  <input
                    required
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-900"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Work Email</label>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="jane.doe@company.com"
                  className="w-full px-5 py-4 rounded-2xl bg-white border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Organization</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Global Enterprises Inc."
                  className="w-full px-5 py-4 rounded-2xl bg-white border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-900"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={registering}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black py-5 rounded-2xl shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                >
                  {registering ? <Loader2 className="animate-spin" size={20} /> : null}
                  {registering ? "Processing..." : "Complete Registration"}
                </button>
              </div>
              
              <p className="text-[10px] text-center text-slate-400 font-bold leading-relaxed px-8">
                By completing this registration, you acknowledge our data processing terms for professional event management.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
