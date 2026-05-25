"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Loader2, 
  TrendingUp, 
  Ticket, 
  ArrowUpRight,
  Activity,
  CheckCircle2,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";

interface Event {
  id: number;
  slug: string;
  title: string;
  description: string;
  start_date: string;
  location: string;
  address?: string;
  capacity: number;
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, statsRes] = await Promise.all([
          fetch("/api/py/events"),
          fetch("/api/py/stats")
        ]);
        const eventsData = await eventsRes.json();
        const sData = await statsRes.json();
        setEvents(eventsData);
        setStatsData(sData);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { name: "Total Events", value: statsData?.events || 0, icon: Calendar, change: "+0%", color: "text-blue-600", bg: "bg-blue-50" },
    { name: "Total Registrations", value: statsData?.registrations || 0, icon: Users, change: "+0%", color: "text-green-600", bg: "bg-green-50" },
    { name: "Check-in Rate", value: statsData?.check_in_rate || "0%", icon: CheckCircle2, change: "+0%", color: "text-yellow-600", bg: "bg-yellow-50" },
    { name: "Digital Clearance", value: "Level 4", icon: ShieldCheck, change: "Active", color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12"
        >
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-[#0f172a] tracking-tighter font-bricolage italic mb-2 uppercase dark:text-white">COMMAND <span className="text-slate-300 dark:text-slate-600">CENTER</span></h1>
            <p className="text-slate-500 font-medium text-base md:text-lg dark:text-slate-400">Welcome back. Here is what's happening across your EEL events today.</p>
          </div>
          {(userRole === "admin" || userRole === "manager") && (
            <Link 
              href="/admin/create"
              className="flex items-center gap-3 bg-[#0f172a] hover:bg-black text-white px-8 py-4 rounded-2xl font-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs group dark:bg-yellow-400 dark:text-black dark:shadow-yellow-400/20"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              Create New Event
            </Link>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {stats.map((stat) => (
            <motion.div 
              variants={itemVariants}
              key={stat.name} 
              className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group cursor-default dark:bg-[#0f172a] dark:border-slate-800"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all`}>
                  <stat.icon size={24} />
                </div>
                <span className={`text-[10px] font-black px-2 py-1 ${stat.bg} ${stat.color} rounded-lg uppercase tracking-widest`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">{stat.name}</p>
              <h3 className="text-3xl font-black text-[#0f172a] font-bricolage italic tracking-tight dark:text-white">{stat.value}</h3>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content: Events */}
          <div className="lg:col-span-2 space-y-8">
             <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight dark:text-white">Active <span className="text-slate-300 dark:text-slate-600">Events</span></h2>
                <Link href="/admin/events" className="text-xs font-black text-[#0f172a] underline underline-offset-4 decoration-yellow-400 dark:text-yellow-400">View All</Link>
             </div>

             {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="animate-spin text-[#0f172a]" size={48} />
                </div>
              ) : events.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-20 text-center"
                >
                  <Calendar className="text-slate-200 mx-auto mb-6" size={64} />
                  <h3 className="text-2xl font-bold text-[#0f172a] mb-2">No active events</h3>
                  <p className="text-slate-400 mb-8 max-w-sm mx-auto">Start by creating your first event to see it here on the command center.</p>
                </motion.div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {events.slice(0, 4).map((event) => (
                    <motion.div 
                      variants={itemVariants}
                      key={event.id} 
                      className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-2xl transition-all dark:bg-[#0f172a] dark:border-slate-800"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg border border-green-100">Live</span>
                        <div className="flex -space-x-2">
                           {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200"></div>)}
                           <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 text-[8px] flex items-center justify-center font-bold">+12</div>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-[#0f172a] mb-4 group-hover:text-yellow-500 transition-colors dark:text-white">{event.title}</h3>
                      <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                          <Calendar size={14} className="text-slate-400" />
                          {new Date(event.start_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                            <MapPin size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[220px]">{event.location}</span>
                          </div>
                          {event.address && (
                            <div className="text-[10px] font-medium text-slate-400 pl-[26px] truncate max-w-[220px] dark:text-slate-500">
                              {event.address}
                            </div>
                          )}
                        </div>
                      </div>
                      <Link 
                        href={`/admin/events/${event.id}`}
                        className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-2xl group-hover:bg-[#0f172a] group-hover:text-white transition-all text-xs font-black uppercase tracking-widest dark:bg-slate-800 dark:group-hover:bg-yellow-400 dark:group-hover:text-black"
                      >
                        Manage
                        <ArrowUpRight size={16} />
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
          </div>

          {/* Sidebar: Activity */}
          <div className="space-y-8">
             <h2 className="text-2xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight dark:text-white">Recent <span className="text-slate-300 dark:text-slate-600">Activity</span></h2>
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-8 relative overflow-hidden dark:bg-[#0f172a] dark:border-slate-800"
             >
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400/20"></div>
                {[
                  { user: "Barton D.", action: "created new event", time: "2m ago", icon: Plus },
                  { user: "Sarah L.", action: "registered for Gala", time: "15m ago", icon: Activity },
                  { user: "System", action: "database backup complete", time: "1h ago", icon: TrendingUp },
                ].map((activity, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + (i * 0.1) }}
                    key={i} 
                    className="flex gap-4 relative"
                  >
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#0f172a] dark:bg-slate-800 dark:text-white">
                      <activity.icon size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-[#0f172a] font-bold"><span className="text-slate-400">{activity.user}</span> {activity.action}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">{activity.time}</p>
                    </div>
                  </motion.div>
                ))}
                {userRole === "admin" && (
                  <button className="w-full py-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all dark:bg-slate-800 dark:hover:bg-slate-700">
                    View Full Audit Log
                  </button>
                )}
             </motion.div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
