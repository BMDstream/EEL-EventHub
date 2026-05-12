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
  CheckCircle2
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface Event {
  id: number;
  slug: string;
  title: string;
  description: string;
  start_date: string;
  location: string;
  capacity: number;
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/py/events")
      .then((res) => res.json())
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch events", err);
        setLoading(false);
      });
  }, []);

  const stats = [
    { name: "Total Events", value: events.length, icon: Calendar, change: "+12%", color: "text-blue-600", bg: "bg-blue-50" },
    { name: "Total Registrations", value: "1,284", icon: Users, change: "+18%", color: "text-green-600", bg: "bg-green-50" },
    { name: "Check-in Rate", value: "94.2%", icon: CheckCircle2, change: "+2.4%", color: "text-yellow-600", bg: "bg-yellow-50" },
    { name: "Projected Revenue", value: "$42.5k", icon: Ticket, change: "+5%", color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black text-[#0f172a] tracking-tighter font-bricolage italic mb-2">COMMAND <span className="text-slate-300">CENTER</span></h1>
            <p className="text-slate-500 font-medium text-lg">Welcome back. Here is what's happening across your EEL events today.</p>
          </div>
          <Link 
            href="/admin/create"
            className="flex items-center gap-3 bg-[#0f172a] hover:bg-black text-white px-8 py-4 rounded-2xl font-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs"
          >
            <Plus size={20} />
            Create New Event
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                  <stat.icon size={24} />
                </div>
                <span className={`text-[10px] font-black px-2 py-1 ${stat.bg} ${stat.color} rounded-lg uppercase tracking-widest`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">{stat.name}</p>
              <h3 className="text-3xl font-black text-[#0f172a] font-bricolage italic tracking-tight">{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content: Events */}
          <div className="lg:col-span-2 space-y-8">
             <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">Active <span className="text-slate-300">Events</span></h2>
                <Link href="/admin/events" className="text-xs font-black text-[#0f172a] underline underline-offset-4 decoration-yellow-400">View All</Link>
             </div>

             {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="animate-spin text-[#0f172a]" size={48} />
                </div>
              ) : events.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-20 text-center">
                  <Calendar className="text-slate-200 mx-auto mb-6" size={64} />
                  <h3 className="text-2xl font-bold text-[#0f172a] mb-2">No active events</h3>
                  <p className="text-slate-400 mb-8 max-w-sm mx-auto">Start by creating your first event to see it here on the command center.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {events.slice(0, 4).map((event) => (
                    <div key={event.id} className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-2xl transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg border border-green-100">Live</span>
                        <div className="flex -space-x-2">
                           {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200"></div>)}
                           <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 text-[8px] flex items-center justify-center font-bold">+12</div>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-[#0f172a] mb-4 group-hover:text-yellow-500 transition-colors">{event.title}</h3>
                      <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                          <Calendar size={14} className="text-slate-400" />
                          {new Date(event.start_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                          <MapPin size={14} className="text-slate-400" />
                          {event.location}
                        </div>
                      </div>
                      <Link 
                        href={`/admin/events/${event.id}`}
                        className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-2xl group-hover:bg-[#0f172a] group-hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                      >
                        Manage
                        <ArrowUpRight size={16} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Sidebar: Activity */}
          <div className="space-y-8">
             <h2 className="text-2xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">Recent <span className="text-slate-300">Activity</span></h2>
             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400/20"></div>
                {[
                  { user: "Barton D.", action: "created new event", time: "2m ago", icon: Plus },
                  { user: "Sarah L.", action: "registered for Gala", time: "15m ago", icon: Activity },
                  { user: "System", action: "database backup complete", time: "1h ago", icon: TrendingUp },
                ].map((activity, i) => (
                  <div key={i} className="flex gap-4 relative">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#0f172a]">
                      <activity.icon size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-[#0f172a] font-bold"><span className="text-slate-400">{activity.user}</span> {activity.action}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
                <button className="w-full py-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all">
                  View Full Audit Log
                </button>
             </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
