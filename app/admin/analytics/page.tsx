"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { cleanHtmlText } from "@/lib/utils";
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Activity, 
  Building, 
  Loader2, 
  Lock, 
  RefreshCw, 
  ArrowUpRight 
} from "lucide-react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

interface DailyRegistration {
  date: string;
  count: number;
}

interface EventBreakdown {
  id: number;
  title: string;
  capacity: number;
  registrations: number;
  checked_in: number;
  check_in_rate: string;
}

interface ClientBreakdown {
  id: number;
  name: string;
  events_count: number;
  registrations_count: number;
}

interface AnalyticsData {
  registrations_by_day: DailyRegistration[];
  event_breakdown: EventBreakdown[];
  client_breakdown: ClientBreakdown[];
  summary: {
    total_events: number;
    total_registrations: number;
    checked_in: number;
    check_in_rate: string;
    clients: number;
  };
}

export default function AnalyticsDashboard() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<{ x: number; y: number; date: string; count: number } | null>(null);

  const fetchAnalytics = async () => {
    if (!session?.user?.email) return;
    try {
      const res = await fetch("/api/py/analytics", {
        headers: { "x-user-email": session.user.email || "" }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [session]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (userRole === "staff") {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mb-8 border border-red-500/20">
            <Lock className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-[#0f172a] mb-4 uppercase italic font-bricolage tracking-tight dark:text-white">
            Access <span className="text-red-500">Restricted</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-md dark:text-slate-400">
            You do not have the clearance level required to view system analytics.
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col justify-center items-center h-[70vh]">
          <Loader2 className="animate-spin text-yellow-500 mb-4" size={48} />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Retrieving Core Metrics...</p>
        </div>
      </AdminLayout>
    );
  }

  // Velocity Area & Line Chart Calculations
  const regData = analyticsData?.registrations_by_day || [];
  const chartWidth = 600;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const maxCount = Math.max(...regData.map(d => d.count), 5);
  const chartPoints = regData.map((d, index) => {
    const x = paddingX + (index / (regData.length - 1 || 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (d.count / maxCount) * (chartHeight - paddingY * 2);
    return { x, y, date: d.date, count: d.count };
  });

  const linePath = chartPoints.length > 0 
    ? `M ${chartPoints.map(p => `${p.x} ${p.y}`).join(" L ")}`
    : "";

  const areaPath = chartPoints.length > 0
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${chartHeight - paddingY} L ${chartPoints[0].x} ${chartHeight - paddingY} Z`
    : "";

  // Radial Chart Calculations
  const checkInRateStr = analyticsData?.summary?.check_in_rate || "0%";
  const checkInRatePercent = parseFloat(checkInRateStr) || 0;
  const radialRadius = 55;
  const circumference = 2 * Math.PI * radialRadius;
  const strokeDashoffset = circumference - (checkInRatePercent / 100) * circumference;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-[#0f172a] tracking-tighter font-bricolage italic mb-2 uppercase dark:text-white">
              Intel <span className="text-slate-300 dark:text-slate-500">& Insights</span>
            </h1>
            <p className="text-slate-500 font-medium text-base md:text-lg dark:text-slate-400">
              Live registration velocity, crowd capacities, and client distribution summaries.
            </p>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-3 bg-white hover:bg-slate-50 text-[#0f172a] px-6 py-4 rounded-2xl font-black transition-all border border-slate-100 dark:bg-slate-900/40 dark:border-white/5 dark:text-white dark:hover:bg-slate-900 shadow-sm"
          >
            <RefreshCw size={16} className={`${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Sync Analytics"}
          </button>
        </div>

        {/* Summary Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Tracked Events", value: analyticsData?.summary?.total_events || 0, icon: Calendar, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
            { label: "Total Registrations", value: analyticsData?.summary?.total_registrations || 0, icon: Users, color: "text-green-500 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
            { label: "Attended Guests", value: analyticsData?.summary?.checked_in || 0, icon: Activity, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
            { label: "Overall Attendance", value: checkInRateStr, icon: TrendingUp, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" }
          ].map((stat, idx) => (
            <div 
              key={idx}
              className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:bg-[#0a0f1d]/40 dark:backdrop-blur-md dark:border-white/5 cursor-default hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-100/50 dark:hover:shadow-[0_0_25px_-5px_rgba(234,179,8,0.05)] transition-all duration-300"
            >
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{stat.label}</span>
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} border border-slate-100/10 dark:border-white/5`}>
                  <stat.icon size={18} />
                </div>
              </div>
              <h3 className="text-4xl font-black font-bricolage italic tracking-tight text-[#0f172a] dark:text-white">
                {stat.value}
              </h3>
            </div>
          ))}
        </div>

        {/* Primary Data Visuals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Velocity Line Area Chart Card */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-8 dark:bg-[#0a0f1d]/40 dark:backdrop-blur-md dark:border-white/5 hover:shadow-xl dark:hover:shadow-[0_0_25px_-5px_rgba(234,179,8,0.05)] transition-all duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black font-bricolage italic text-[#0f172a] dark:text-white uppercase tracking-tight">Registration Velocity</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Confirmed guest sign-ups over the past 7 days</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-500 bg-amber-500/10 px-3.5 py-1.5 rounded-xl uppercase tracking-wider">
                <TrendingUp size={14} />
                Velocity
              </div>
            </div>

            {/* SVG Line / Area Graph */}
            {regData.length === 0 ? (
              <div className="h-56 flex items-center justify-center border border-dashed border-slate-100 dark:border-white/5 rounded-2xl">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">No timeline activities available</p>
              </div>
            ) : (
              <div className="relative">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto select-none overflow-visible">
                  <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#eab308" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#eab308" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guideline Grids */}
                  {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                    const y = paddingY + r * (chartHeight - paddingY * 2);
                    return (
                      <line 
                        key={i} 
                        x1={paddingX} 
                        y1={y} 
                        x2={chartWidth - paddingX} 
                        y2={y} 
                        stroke="rgba(148, 163, 184, 0.05)" 
                        strokeWidth="1" 
                        strokeDasharray="4 4" 
                      />
                    );
                  })}

                  {/* Area Wave */}
                  <motion.path
                    d={areaPath}
                    fill="url(#chart-gradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                  />

                  {/* Line Wave */}
                  <motion.path
                    d={linePath}
                    fill="none"
                    stroke="url(#line-gradient)"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#eab308" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>

                  {/* Data Points */}
                  {chartPoints.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="6"
                        className="fill-white stroke-amber-500 stroke-[3px] dark:fill-[#0a0f1d] cursor-pointer"
                        onMouseEnter={(e) => setActiveTooltip(p)}
                        onMouseLeave={() => setActiveTooltip(null)}
                      />
                      {/* Text Label on X Axis */}
                      <text
                        x={p.x}
                        y={chartHeight - 8}
                        className="text-[9px] font-black fill-slate-400 dark:fill-slate-500 uppercase tracking-widest text-center"
                        textAnchor="middle"
                      >
                        {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Interactive Tooltip Popover */}
                {activeTooltip && (
                  <div 
                    className="absolute bg-slate-950 text-white text-xs px-3.5 py-2 rounded-xl shadow-2xl pointer-events-none border border-white/10 flex flex-col font-outfit"
                    style={{ 
                      left: `${(activeTooltip.x / chartWidth) * 100}%`, 
                      top: `${(activeTooltip.y / chartHeight) * 100 - 20}%`,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                      {new Date(activeTooltip.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                    <span className="font-black text-sm mt-0.5 text-yellow-400">{activeTooltip.count} Guests</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Radial Progress Attendance Chart Card */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 dark:bg-[#0a0f1d]/40 dark:backdrop-blur-md dark:border-white/5 hover:shadow-xl dark:hover:shadow-[0_0_25px_-5px_rgba(234,179,8,0.05)] transition-all duration-300 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black font-bricolage italic text-[#0f172a] dark:text-white uppercase tracking-tight">Check-In Velocity</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time attendance conversion</p>
            </div>

            <div className="relative my-8">
              <svg width="150" height="150" className="mx-auto select-none overflow-visible">
                <circle
                  cx="75"
                  cy="75"
                  r={radialRadius}
                  fill="transparent"
                  className="stroke-slate-100 dark:stroke-white/5"
                  strokeWidth="12"
                />
                <motion.circle
                  cx="75"
                  cy="75"
                  r={radialRadius}
                  fill="transparent"
                  stroke="url(#radial-grad)"
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="radial-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-[#0f172a] dark:text-white font-bricolage italic tracking-tight">
                  {checkInRatePercent}%
                </span>
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Attended</span>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100/50 dark:bg-slate-900/30 dark:border-white/5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>Confirmed Registrations</span>
                <span className="text-[#0f172a] dark:text-white font-black">{analyticsData?.summary?.total_registrations || 0}</span>
              </div>
              <div className="h-px bg-slate-200 dark:bg-white/5"></div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>Checked In</span>
                <span className="text-yellow-500 font-black">{analyticsData?.summary?.checked_in || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Visual Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Crowd Capacities Card */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-8 dark:bg-[#0a0f1d]/40 dark:backdrop-blur-md dark:border-white/5 hover:shadow-xl dark:hover:shadow-[0_0_25px_-5px_rgba(234,179,8,0.05)] transition-all duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black font-bricolage italic text-[#0f172a] dark:text-white uppercase tracking-tight">Event Utilization</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Confirmed guest RSVPs against max event capacity</p>
              </div>
            </div>

            {analyticsData?.event_breakdown?.length === 0 ? (
              <div className="h-48 flex items-center justify-center border border-dashed border-slate-100 dark:border-white/5 rounded-2xl">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">No active events registered</p>
              </div>
            ) : (
              <div className="space-y-6">
                {analyticsData?.event_breakdown?.slice(0, 5).map((e) => {
                  const percent = Math.min(Math.round((e.registrations / (e.capacity || 1)) * 100), 100);
                  return (
                    <div key={e.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-[#0f172a] dark:text-white truncate max-w-[240px] md:max-w-md">{cleanHtmlText(e.title || "")}</span>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                          <span>{e.registrations} / {e.capacity} RSVPs</span>
                          <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-wider ${
                            percent >= 90 
                              ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-500/10"
                              : "bg-green-50 text-green-600 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-500/10"
                          }`}>{percent}% Full</span>
                        </div>
                      </div>
                      
                      {/* Custom rounded progress bar */}
                      <div className="w-full h-3 bg-slate-50 dark:bg-slate-900 border border-slate-100/50 dark:border-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Client Distribution Card */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 dark:bg-[#0a0f1d]/40 dark:backdrop-blur-md dark:border-white/5 hover:shadow-xl dark:hover:shadow-[0_0_25px_-5px_rgba(234,179,8,0.05)] transition-all duration-300">
            <div className="mb-8">
              <h3 className="text-xl font-black font-bricolage italic text-[#0f172a] dark:text-white uppercase tracking-tight">Client Shares</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Branded client spaces and guest weights</p>
            </div>

            {analyticsData?.client_breakdown?.length === 0 ? (
              <div className="h-48 flex items-center justify-center border border-dashed border-slate-100 dark:border-white/5 rounded-2xl">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">No clients configured</p>
              </div>
            ) : (
              <div className="space-y-6">
                {analyticsData?.client_breakdown?.slice(0, 4).map((c) => (
                  <div 
                    key={c.id}
                    className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50 dark:bg-slate-900/30 dark:border-white/5 hover:-translate-y-0.5 hover:border-yellow-500/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-yellow-400/10 text-yellow-500 rounded-xl border border-yellow-400/10">
                        <Building size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#0f172a] dark:text-white">{c.name}</h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">{c.events_count} Active Events</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-[#0f172a] dark:text-white">{c.registrations_count}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Guests</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
