"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Settings, 
  Loader2, 
  ArrowRight,
  Sparkles,
  Search,
  Layout
} from "lucide-react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/AdminLayout";

interface Event {
  id: number;
  title: string;
  start_date: string;
  location: string;
}

export default function FormsHubPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black text-[#0f172a] tracking-tighter font-bricolage italic mb-2 uppercase">FORM <span className="text-slate-300">STUDIO</span></h1>
            <p className="text-slate-500 font-medium text-lg">Design and manage custom registration forms for your events.</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-12 max-w-2xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search events by title..."
            className="w-full pl-16 pr-8 py-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm focus:shadow-xl transition-all outline-none font-bold text-[#0f172a]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-[#0f172a]" size={48} />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-20 text-center">
            <Layout className="text-slate-200 mx-auto mb-6" size={64} />
            <h3 className="text-2xl font-bold text-[#0f172a] mb-2">No events found</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">We couldn't find any events matching your search criteria.</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredEvents.map((event) => (
              <motion.div 
                variants={itemVariants}
                key={event.id}
                className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-2xl transition-all"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0f172a] group-hover:bg-yellow-400 transition-colors">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#0f172a] leading-tight">{event.title}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      {new Date(event.start_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl mb-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <p className="font-bold text-[#0f172a] text-xs">Form Active & Accepting Registrations</p>
                </div>

                <Link 
                  href={`/admin/events/${event.id}?tab=form`}
                  className="flex items-center justify-between w-full p-5 bg-[#0f172a] text-white rounded-2xl hover:bg-black transition-all text-xs font-black uppercase tracking-widest"
                >
                  Enter Form Studio
                  <ArrowRight size={18} />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}
