"use client";

import AdminLayout from "@/components/AdminLayout";
import { ShieldCheck, Lock } from "lucide-react";

export default function SecurityPlaceholder() {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto py-20 text-center">
        <div className="w-24 h-24 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <ShieldCheck size={48} />
        </div>
        <h1 className="text-5xl font-black text-[#0f172a] tracking-tighter font-bricolage italic mb-4 uppercase">FORTRSS <span className="text-slate-300">SECURITY</span></h1>
        <p className="text-xl text-slate-500 font-medium mb-12">Your data integrity is protected. Advanced security controls are being finalized.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-4">
              <Lock size={20} className="text-slate-300" />
              <div className="text-left">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audit Logs</p>
                 <p className="font-bold text-[#0f172a]">Active (Encrypted)</p>
              </div>
           </div>
           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-4">
              <ShieldCheck size={20} className="text-slate-300" />
              <div className="text-left">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">API Gateway</p>
                 <p className="font-bold text-[#0f172a]">Operational</p>
              </div>
           </div>
        </div>
      </div>
    </AdminLayout>
  );
}
