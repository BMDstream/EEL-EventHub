"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Calendar, MapPin, Users, Loader2 } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black text-[#0f172a] tracking-tight font-bricolage italic">EEL-EVENT<span className="text-slate-400">HUB</span></h1>
            <p className="text-[#64748b] font-medium uppercase tracking-widest text-[10px]">Excellence Entertainment Logistics Management</p>
          </div>
          <Link 
            href="/admin/create"
            className="flex items-center gap-2 bg-[#1e293b] hover:bg-[#0f172a] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
          >
            <Plus size={20} />
            Create New Event
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-[#1e293b]" size={48} />
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-16 text-center">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
              <Calendar className="text-[#1e293b]" size={40} />
            </div>
            <h3 className="text-2xl font-bold text-[#0f172a] mb-2">No events found</h3>
            <p className="text-[#64748b] mb-8 max-w-md mx-auto font-medium">Launch your first event to start accepting registrations and managing attendees.</p>
            <Link 
              href="/admin/create"
              className="inline-flex items-center gap-2 text-[#1e293b] font-bold hover:gap-3 transition-all underline decoration-slate-200 underline-offset-8"
            >
              Create your first event <Plus size={20} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <div key={event.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl hover:border-slate-200 transition-all duration-300">
                <div className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-[#1e293b]/5 text-[#1e293b] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#1e293b]/10">
                      Active
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">UUID: {event.id}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#0f172a] mb-4 line-clamp-1 group-hover:text-[#1e293b] transition-colors">{event.title}</h3>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                      <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-[#1e293b]/5 transition-colors">
                        <Calendar size={16} className="text-[#1e293b]" />
                      </div>
                      <span className="font-medium">{new Date(event.start_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                      <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-[#1e293b]/5 transition-colors">
                        <MapPin size={16} className="text-[#1e293b]" />
                      </div>
                      <span className="font-medium truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                      <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-[#1e293b]/5 transition-colors">
                        <Users size={16} className="text-[#1e293b]" />
                      </div>
                      <span className="font-medium">Capacity: {event.capacity}</span>
                    </div>
                  </div>

                  <Link 
                    href={`/admin/events/${event.id}`}
                    className="block w-full text-center bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-slate-100"
                  >
                    Manage Event
                  </Link>
                </div>
                <div className="bg-slate-50 px-8 py-3 border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Slug: {event.slug}</span>
                  <Link href={`/${event.slug}`} target="_blank" className="hover:text-[#1e293b]">
                    Live Page ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
