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
  ShieldCheck,
  Building,
  X,
  Search,
  RefreshCw
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
  client?: any;
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshDatabase = async () => {
    if (!session?.user?.email) return;
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/py/settings/refresh-db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session.user.email
        }
      });
      if (res.ok) {
        alert("Database structure and seeds successfully reinitialized! Reloading page...");
        window.location.reload();
      } else {
        const data = await res.json();
        alert(`Failed to refresh database: ${data.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Network error: failed to trigger database refresh.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const openAuditLog = async () => {
    setIsAuditLogOpen(true);
    setAuditLoading(true);
    try {
      const res = await fetch("/api/py/activities?limit=50", {
        headers: { "x-user-email": session?.user?.email || "" }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch full audit log", err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.email) return;
    const fetchData = async () => {
      try {
        const [eventsRes, statsRes, activitiesRes] = await Promise.all([
          fetch("/api/py/events", {
            headers: { "x-user-email": session.user.email || "" }
          }),
          fetch("/api/py/stats", {
            headers: { "x-user-email": session.user.email || "" }
          }),
          fetch("/api/py/activities", {
            headers: { "x-user-email": session.user.email || "" }
          })
        ]);
        const eventsData = eventsRes.ok ? await eventsRes.json() : [];
        const sData = statsRes.ok ? await statsRes.json() : null;
        const aData = activitiesRes.ok ? await activitiesRes.json() : [];
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setStatsData(sData);
        setActivities(Array.isArray(aData) ? aData : []);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session]);

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "Recently";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return "Recently";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "registration":
        return Users;
      case "checkin":
        return Activity;
      case "security":
      case "system":
        return ShieldCheck;
      default:
        return Plus;
    }
  };

  const stats = [
    { name: "Total Events", value: statsData?.events || 0, icon: Calendar, change: "+0%", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { name: "Total Registrations", value: statsData?.registrations || 0, icon: Users, change: "+0%", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
    { name: "Check-in Rate", value: statsData?.check_in_rate || "0%", icon: CheckCircle2, change: "+0%", color: "text-yellow-600 dark:text-amber-400", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
    ...(userRole === "admin" ? [
      { name: "Total Clients", value: statsData?.clients || 0, icon: Building, change: "Active", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" }
    ] : [
      { name: "Digital Clearance", value: "Level 4", icon: ShieldCheck, change: "Active", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" }
    ])
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
            <h1 className="text-3xl md:text-5xl font-black text-[#0f172a] tracking-tighter font-bricolage italic mb-2 uppercase dark:text-white">COMMAND <span className="text-slate-300 dark:text-slate-500">CENTER</span></h1>
            <p className="text-slate-500 font-medium text-base md:text-lg dark:text-slate-400">Welcome back. Here is what's happening across your events today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {userRole === "admin" && (
              <button
                onClick={handleRefreshDatabase}
                disabled={isRefreshing}
                className="flex items-center gap-3 bg-slate-100 hover:bg-slate-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-slate-700 px-8 py-4 rounded-2xl font-black transition-all duration-300 uppercase tracking-widest text-xs dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "Refreshing..." : "Refresh DB"}
              </button>
            )}
            {(userRole === "admin" || userRole === "manager") && (
              <Link 
                href="/admin/create"
                className="flex items-center gap-3 bg-[#0f172a] hover:bg-black hover:scale-105 active:scale-95 text-white px-8 py-4 rounded-2xl font-black transition-all duration-300 shadow-2xl shadow-slate-200 hover:shadow-slate-300 uppercase tracking-widest text-xs group dark:bg-gradient-to-r dark:from-yellow-400 dark:to-amber-500 dark:text-slate-950 dark:shadow-yellow-400/10 dark:hover:shadow-yellow-400/20"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                Create New Event
              </Link>
            )}
          </div>
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
              className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-slate-100/80 hover:-translate-y-1 transition-all duration-300 group cursor-default dark:bg-[#0a0f1d]/40 dark:backdrop-blur-md dark:border-white/5 dark:hover:border-yellow-500/30 dark:hover:shadow-[0_0_25px_-5px_rgba(234,179,8,0.1)]"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl border border-slate-100/10 dark:border-white/5 group-hover:scale-110 group-hover:rotate-3 transition-all`}>
                  <stat.icon size={24} />
                </div>
                <span className={`text-[10px] font-black px-2 py-1 ${stat.bg} ${stat.color} rounded-lg uppercase tracking-widest dark:bg-opacity-20`}>
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
                <h2 className="text-2xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight dark:text-white">Active <span className="text-slate-300 dark:text-slate-500">Events</span></h2>
                <Link href="/admin/events" className="text-xs font-black text-[#0f172a] underline underline-offset-4 decoration-yellow-400 dark:text-yellow-400">View All</Link>
             </div>

             {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="animate-spin text-[#0f172a] dark:text-yellow-400" size={48} />
                </div>
              ) : events.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-20 text-center dark:bg-[#0a0f1d]/40 dark:backdrop-blur-md dark:border-white/5"
                >
                  <Calendar className="text-slate-200 mx-auto mb-6 dark:text-slate-800" size={64} />
                  <h3 className="text-2xl font-bold text-[#0f172a] mb-2 dark:text-white">No active events</h3>
                  <p className="text-slate-400 mb-8 max-w-sm mx-auto dark:text-slate-500">Start by creating your first event to see it here on the command center.</p>
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
                      className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-slate-100/80 hover:-translate-y-1 transition-all duration-300 dark:bg-[#0a0f1d]/40 dark:backdrop-blur-md dark:border-white/5 dark:hover:border-yellow-500/30 dark:hover:shadow-[0_0_25px_-5px_rgba(234,179,8,0.1)]"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg border border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-500/10">Live</span>
                          {event.client && (
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1 dark:text-slate-500">{event.client.name}</span>
                          )}
                        </div>
                        <div className="flex -space-x-1.5">
                           {[1,2,3].map(i => (
                             <div 
                               key={i} 
                               className="w-7 h-7 rounded-lg border-2 border-white dark:border-slate-900 bg-gradient-to-br from-yellow-400/20 to-amber-500/20 flex items-center justify-center text-[8px] text-slate-500 dark:text-slate-400 font-bold shrink-0"
                             >
                               {String.fromCharCode(64 + i)}
                             </div>
                           ))}
                           <div className="w-7 h-7 rounded-lg border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 text-[8px] flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">+12</div>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-[#0f172a] mb-4 group-hover:text-yellow-500 transition-colors dark:text-white">{(event.title || "").replace(/<[^>]*>/g, "")}</h3>
                      <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-slate-500 text-xs font-medium dark:text-slate-400">
                          <Calendar size={14} className="text-slate-400 dark:text-yellow-400/60" />
                          {new Date(event.start_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 text-slate-500 text-xs font-medium dark:text-slate-400">
                            <MapPin size={14} className="text-slate-400 dark:text-yellow-400/60 shrink-0" />
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
                        className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-2xl group-hover:bg-gradient-to-r group-hover:from-yellow-400 group-hover:to-amber-500 group-hover:text-slate-950 transition-all duration-300 text-xs font-black uppercase tracking-widest dark:bg-[#090d16] dark:text-slate-300 dark:border dark:border-white/5 dark:group-hover:border-transparent"
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
             <h2 className="text-2xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight dark:text-white">Recent <span className="text-slate-300 dark:text-slate-500">Activity</span></h2>
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-8 relative overflow-hidden dark:bg-[#0a0f1d]/40 dark:backdrop-blur-md dark:border-white/5 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-[0_0_25px_-5px_rgba(234,179,8,0.05)] transition-all duration-300"
             >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-yellow-400 to-amber-500"></div>
                <div className="max-h-[380px] overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {activities.map((activity, i) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + (i * 0.05) }}
                        key={i} 
                        className="flex gap-4 relative"
                      >
                        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0f172a] dark:bg-slate-900 dark:text-slate-300 dark:border dark:border-white/5 shrink-0">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-xs text-[#0f172a] font-bold dark:text-white">
                            <span className="text-slate-400 dark:text-slate-500">{activity.user}</span> {activity.action.replace(/<[^>]*>/g, "")}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1 dark:text-yellow-400/60">
                            {formatRelativeTime(activity.time)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {userRole === "admin" && (
                  <button 
                    onClick={openAuditLog}
                    className="w-full py-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-yellow-400 dark:border dark:border-white/5"
                  >
                    View Full Audit Log
                  </button>
                )}
             </motion.div>
          </div>
        </div>
      </div>

      {/* Sliding Audit Log Drawer */}
      <AnimatePresence>
        {isAuditLogOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuditLogOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-[#0a0d14] border-l border-slate-100 dark:border-white/5 shadow-2xl p-8 z-50 flex flex-col font-outfit overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-black font-bricolage italic text-[#0f172a] dark:text-white uppercase tracking-tight">System Audit Log</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live tracking database & network activities</p>
                </div>
                <button
                  onClick={() => setIsAuditLogOpen(false)}
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all dark:bg-slate-900/ text-slate-400 dark:hover:bg-slate-800 border dark:border-white/5"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search logs by guest or action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100/50 dark:border-white/5 text-sm font-medium text-[#0f172a] dark:text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500/50 transition-colors"
                />
              </div>

              {/* Log List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 scrollbar-none">
                {auditLoading ? (
                  <div className="flex flex-col justify-center items-center h-48">
                    <Loader2 className="animate-spin text-yellow-500 mb-3" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Syncing Log Archive...</p>
                  </div>
                ) : (() => {
                  const filteredLogs = auditLogs.filter(log => 
                    log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    log.action.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (filteredLogs.length === 0) {
                    return (
                      <div className="text-center py-12 border border-dashed border-slate-100 dark:border-white/5 rounded-2xl">
                        <ShieldCheck className="mx-auto mb-4 text-slate-300 dark:text-slate-700" size={32} />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No activities match search criteria</p>
                      </div>
                    );
                  }

                  return filteredLogs.map((activity, i) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        key={i}
                        className="flex gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100/30 dark:border-white/5 hover:border-yellow-500/20 transition-all duration-300"
                      >
                        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0f172a] dark:bg-slate-900 dark:text-slate-300 dark:border dark:border-white/5 shrink-0">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-xs text-[#0f172a] font-bold dark:text-white">
                            <span className="text-slate-400 dark:text-slate-500">{activity.user}</span> {activity.action.replace(/<[^>]*>/g, "")}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 dark:text-yellow-400/60">
                            {formatRelativeTime(activity.time)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-slate-100 dark:border-white/5 text-center">
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">Authorized Session Security Tier Level 4</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
