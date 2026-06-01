"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  Users, 
  UserMinus, 
  CheckCircle2, 
  BarChart3, 
  Loader2,
  Calendar,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PublicStats {
  title: string;
  rsvp: number;
  declined: number;
  checked_in: number;
  total: number;
  client?: {
    name: string;
    primary_color: string;
    accent_color: string;
    logo_url?: string;
  };
}

export default function ClientViewPage() {
  const { slug } = useParams();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (showGlobalLoading = false) => {
    if (showGlobalLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/py/events/${slug}/public-stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch public stats", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (slug) fetchStats(true);
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-500" size={48} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
        <h1 className="text-2xl font-black">Event Not Found</h1>
      </div>
    );
  }

  const cards = [
    { 
      name: "Confirmed RSVP", 
      value: stats.rsvp, 
      icon: Users, 
      color: "text-blue-400", 
      bg: "bg-blue-500/10",
      desc: "Attendees confirmed for entry"
    },
    { 
      name: "Declined", 
      value: stats.declined, 
      icon: UserMinus, 
      color: "text-red-400", 
      bg: "bg-red-500/10",
      desc: "Individuals who opted out"
    },
    { 
      name: "Total Checked In", 
      value: stats.checked_in, 
      icon: CheckCircle2, 
      color: "text-green-400", 
      bg: "bg-green-500/10",
      desc: "Successfully verified at terminal"
    }
  ];

  const getAccentWithOpacity = (hex: string | undefined, opacityHex: string = "4d") => {
    if (!hex) return "#eab308" + opacityHex;
    if (hex.startsWith("#") && hex.length === 7) {
      return hex + opacityHex;
    }
    return hex;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .client-bg-page {
          background-color: ${stats.client?.primary_color || '#020617'} !important;
        }
        .client-text-accent {
          color: ${stats.client?.accent_color || '#eab308'} !important;
        }
        .client-bg-accent {
          background-color: ${stats.client?.accent_color || '#eab308'} !important;
        }
        .client-border-accent {
          border-color: ${stats.client?.accent_color || '#eab308'} !important;
        }
        .client-hover-border-accent:hover {
          border-color: ${getAccentWithOpacity(stats.client?.accent_color, "4d")} !important;
        }
        .client-accent-glow {
          box-shadow: 0 25px 50px -12px ${getAccentWithOpacity(stats.client?.accent_color, "33")} !important;
        }
        .client-selection::selection {
          background-color: ${getAccentWithOpacity(stats.client?.accent_color, "4d")} !important;
        }
      `}} />
      <div className="min-h-screen bg-[#020617] client-bg-page text-white selection:bg-yellow-500/30 client-selection font-outfit p-6 md:p-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-4 mb-6">
                {stats.client?.logo_url && (
                  <img 
                    src={stats.client.logo_url} 
                    alt={stats.client.name} 
                    className="h-10 w-auto object-contain rounded-lg"
                  />
                )}
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-zinc-900 rounded-full border border-white/5">
                  <ShieldCheck className="client-text-accent" size={14} />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                    Authorized Client View
                  </span>
                </div>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter font-bricolage italic mb-4 leading-none">
                {stats.title} <br />
                <span className="client-text-accent">INSIGHTS.</span>
              </h1>
              <p className="text-zinc-500 font-medium max-w-xl text-lg">
                Real-time synchronization with the BMD registration engine. Providing transparency and operational data for your event.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900/50 border border-white/10 p-8 rounded-[2.5rem] flex items-center gap-8 backdrop-blur-xl"
            >
              <div className="w-16 h-16 client-bg-accent rounded-3xl flex items-center justify-center client-accent-glow">
                <BarChart3 className="text-black" size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Live Sync Status</p>
                <p className="text-xl font-black italic font-bricolage tracking-tight">CONNECTED</p>
              </div>
              <button 
                onClick={() => fetchStats(false)}
                disabled={refreshing}
                className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl transition-all disabled:opacity-50 text-white flex items-center justify-center"
                title="Refresh Stats"
              >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              </button>
            </motion.div>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {cards.map((card, i) => (
                <motion.div
                  key={card.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-zinc-900/30 border border-white/5 p-10 rounded-[3rem] hover:border-yellow-500/30 client-hover-border-accent transition-all group relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 ${card.bg} blur-[80px] opacity-0 group-hover:opacity-50 transition-opacity`}></div>
                  
                  <div className={`w-16 h-16 ${card.bg} rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform`}>
                    <card.icon className={card.color} size={32} />
                  </div>
                  
                  <h3 className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px] mb-2">{card.name}</h3>
                  <div className="flex items-baseline gap-4 mb-4">
                    <span className="text-6xl font-black font-bricolage italic tracking-tighter leading-none">
                      {card.value}
                    </span>
                  </div>
                  <p className="text-zinc-600 text-sm font-medium">{card.desc}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.8 }}
            className="mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6"
          >
            <div className="text-[10px] font-black uppercase tracking-widest">
              © 2026 {stats.client?.name || "Excellence Entertainment Logistics"}
            </div>
            <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest">
               <div className="flex items-center gap-2">
                  <Calendar size={12} className="client-text-accent" />
                  <span>Last Updated: Just Now</span>
               </div>
               <span>System: Level 4 Secure</span>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
