"use client";

import AdminLayout from "@/components/AdminLayout";
import { TrendingUp, Lock, Rocket } from "lucide-react";

export default function AnalyticsPlaceholder() {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto py-20 text-center">
        <div className="w-24 h-24 bg-yellow-400/10 text-yellow-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-yellow-400/20">
          <TrendingUp size={48} />
        </div>
        <h1 className="text-5xl font-black text-[#0f172a] tracking-tighter font-bricolage italic mb-4 uppercase">INTEL <span className="text-slate-300">& INSIGHTS</span></h1>
        <p className="text-xl text-slate-500 font-medium mb-12">We are currently integrating advanced data visualization for your events.</p>
        
        <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 inline-flex items-center gap-6">
           <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0f172a]">
              <Rocket size={24} className="animate-bounce" />
           </div>
           <p className="text-left font-bold text-[#0f172a]">
              Coming in Phase 2: <br />
              <span className="text-xs text-slate-400 uppercase tracking-widest font-black">Registration Velocity & ROI Tracking</span>
           </p>
        </div>
      </div>
    </AdminLayout>
  );
}
