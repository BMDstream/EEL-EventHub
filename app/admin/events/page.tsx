"use client";

import { useState } from "react";
import { Calendar, MapPin, Users, Search, MoreHorizontal, ArrowUpRight, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";
import useSWR from "swr";
import { cleanHtmlText } from "@/lib/utils";

const fetcher = (url: string, email: string): Promise<Event[]> =>
  fetch(url, { headers: { "x-user-email": email } }).then((res) => res.json());

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

export default function EventsListPage() {
  const [search, setSearch] = useState("");
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";

  const { data: eventsData, error } = useSWR<Event[]>(
    session?.user?.email ? ["/api/py/events", session.user.email] : null,
    ([url, email]: [string, string]) => fetcher(url, email)
  );

  const events = eventsData || [];
  const loading = !eventsData && !error;

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || 
                          e.location.toLowerCase().includes(search.toLowerCase());
    
    if (userRole === "staff") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDate = new Date(e.start_date);
      return matchesSearch && eventDate >= today;
    }
    
    return matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-[#0f172a] tracking-tighter font-bricolage italic uppercase dark:text-white">EVENT <span className="text-slate-300 dark:text-slate-600">CATALOG</span></h1>
            <p className="text-slate-500 font-medium text-base md:text-lg dark:text-slate-400">Browse and manage your full portfolio of excellence.</p>
          </div>
          {userRole !== "staff" && (
            <Link 
              href="/admin/create"
              className="flex items-center gap-3 bg-[#0f172a] hover:bg-black text-white px-8 py-4 rounded-2xl font-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs dark:bg-yellow-400 dark:text-black dark:shadow-yellow-400/20"
            >
              <Plus size={20} />
              New Event
            </Link>
          )}
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-center dark:bg-[#0f172a] dark:border-slate-800">
           <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="text" 
                placeholder="Search events by title or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-16 pr-8 py-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:text-white"
              />
           </div>
           <div className="flex gap-2 w-full md:w-auto">
              <button className="px-6 py-4 bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all dark:bg-slate-800 dark:hover:bg-slate-700">Filter</button>
              <button className="px-6 py-4 bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all dark:bg-slate-800 dark:hover:bg-slate-700">Export CSV</button>
           </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden dark:bg-[#0f172a] dark:border-slate-800">
          {loading ? (
            <div className="p-24 flex justify-center"><Loader2 className="animate-spin text-slate-200" size={48} /></div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-24 text-center">
               <Calendar className="mx-auto mb-6 text-slate-100" size={80} />
               <h3 className="text-2xl font-bold text-[#0f172a]">No events found</h3>
               <p className="text-slate-400">Try adjusting your search or create a new event.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
               <thead>
                 <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Event Name</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date & Location</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Capacity</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                 {filteredEvents.map(event => (
                   <tr key={event.id} className="hover:bg-slate-50/50 transition-colors group dark:hover:bg-slate-800/50">
                      <td className="px-10 py-8">
                         <div>
                            <p className="text-lg font-black text-[#0f172a] dark:text-white group-hover:text-yellow-500 transition-colors">{cleanHtmlText(event.title || "")}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest dark:text-slate-500">Slug: {event.slug}</span>
                              {event.client && (
                                <>
                                  <span className="text-slate-200 dark:text-slate-700">•</span>
                                  <span className="text-[9px] bg-slate-50 border border-slate-100 text-slate-400 font-extrabold uppercase px-2 py-0.5 rounded dark:bg-slate-800 dark:border-slate-700">{event.client.name}</span>
                                </>
                              )}
                            </div>
                         </div>
                      </td>
                      <td className="px-10 py-8">
                         <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                               <Calendar size={14} className="text-slate-300" />
                               {new Date(event.start_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400" title={event.location}>
                               <MapPin size={14} className="text-slate-300 shrink-0" />
                               <span className="truncate max-w-[150px]">{event.location}</span>
                            </div>
                            {event.address && (
                              <div className="text-[10px] font-medium text-slate-300 pl-5 truncate max-w-[150px]" title={event.address}>
                                 {event.address}
                              </div>
                            )}
                         </div>
                      </td>
                      <td className="px-10 py-8">
                         <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[80px] dark:bg-slate-800">
                               <div className="h-full bg-yellow-400 w-2/3"></div>
                            </div>
                            <span className="text-xs font-black text-[#0f172a] dark:text-slate-300">{event.capacity}</span>
                         </div>
                      </td>
                      <td className="px-10 py-8">
                         <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-green-100">Confirmed</span>
                      </td>
                      <td className="px-10 py-8 text-right flex items-center justify-end gap-6">
                         <button 
                           onClick={() => {
                             const url = `${window.location.origin}/register/${event.slug}`;
                             navigator.clipboard.writeText(url);
                             alert("Registration link copied to clipboard!");
                           }}
                           className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-yellow-500 transition-all"
                         >
                           Copy Link
                         </button>
                         {userRole !== "staff" && (
                           <button 
                             onClick={async () => {
                               if (confirm(`Are you sure you want to duplicate the event "${cleanHtmlText(event.title || "")}"?`)) {
                                 try {
                                   const res = await fetch(`/api/py/events/${event.id}/duplicate`, {
                                     method: "POST",
                                     headers: { "x-user-email": session?.user?.email || "" }
                                   });
                                   if (res.ok) {
                                     alert("Event duplicated successfully!");
                                     window.location.reload();
                                   } else {
                                     const err = await res.json();
                                     alert(`Failed to duplicate: ${err.detail || "Unknown error"}`);
                                   }
                                 } catch (err) {
                                   alert("An error occurred while duplicating the event.");
                                 }
                               }
                             }}
                             className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-550 transition-all"
                           >
                             Duplicate
                           </button>
                         )}
                         <Link 
                           href={`/admin/events/${event.id}`}
                           className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#0f172a] hover:gap-3 transition-all dark:text-yellow-500 dark:hover:text-white"
                         >
                           Control Panel <ArrowUpRight size={14} />
                         </Link>
                      </td>
                   </tr>
                 ))}
                </tbody>
             </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
