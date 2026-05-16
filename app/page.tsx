import Link from "next/link";
import { ArrowRight, Calendar, ShieldCheck, Zap } from "lucide-react";
import { MSLoginHandler } from "@/components/MSLoginHandler";
import { Suspense } from "react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-yellow-500/30 font-outfit">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-12 py-8 max-w-7xl mx-auto">
        <div className="text-3xl font-black tracking-tighter font-bricolage">
          EEL<span className="text-yellow-500">-</span>EVENT<span className="text-yellow-500">HUB</span>
        </div>
        <div className="flex items-center gap-10">
          <Link href="/admin" className="text-xs font-black uppercase tracking-[0.3em] hover:text-yellow-500 transition-colors">
            Portal Access
          </Link>
          <Link 
            href="/admin" 
            className="bg-white text-black px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-yellow-500 transition-all shadow-2xl shadow-white/5"
          >
            Launch System
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-12 pt-24 pb-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-zinc-900 rounded-full mb-10 border border-white/5">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                Excellence Entertainment Logistics
              </span>
            </div>
            <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-[0.85] mb-10 font-bricolage italic">
              EVENT <br /> 
              <span className="text-yellow-500">INTELLIGENCE.</span>
            </h1>
            <p className="text-lg text-zinc-500 max-w-md mb-12 font-medium leading-relaxed">
              The next-generation hub for professional event orchestration. Precision logistics meet world-class entertainment management.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <Link 
                href="/admin" 
                className="bg-yellow-500 text-black px-12 py-6 rounded-2xl text-sm font-black hover:bg-white transition-all flex items-center justify-center gap-4 shadow-2xl shadow-yellow-500/20 uppercase tracking-[0.2em]"
              >
                Go to Dashboard <ArrowRight size={24} />
              </Link>
              <Link 
                href="/api/py/auth/azure/login" 
                className="bg-zinc-900 text-white px-12 py-6 rounded-2xl text-sm font-black hover:bg-white hover:text-black transition-all flex items-center justify-center gap-4 border border-white/5 uppercase tracking-[0.2em]"
              >
                <ShieldCheck size={24} className="text-yellow-500" />
                Login with Microsoft
              </Link>
            </div>
            
            <Suspense fallback={null}>
              <MSLoginHandler />
            </Suspense>
          </div>

          <div className="relative group">
            <div className="absolute -inset-20 bg-yellow-500/10 rounded-full blur-[120px] opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative aspect-[4/5] bg-zinc-900 border border-white/10 rounded-[4rem] p-16 flex flex-col justify-end overflow-hidden shadow-2xl">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
               <div className="relative z-10">
                  <div className="w-20 h-20 bg-yellow-500 rounded-3xl mb-8 flex items-center justify-center shadow-2xl shadow-yellow-500/40">
                     <Calendar size={40} className="text-black" />
                  </div>
                  <h3 className="text-4xl font-black tracking-tight mb-4 font-bricolage italic">Seamless Flow.</h3>
                  <p className="text-zinc-400 font-medium max-w-xs leading-relaxed">
                    Automated registration and attendee analytics scaled for enterprise entertainment.
                  </p>
               </div>
               
               {/* Decorative elements */}
               <div className="absolute top-12 right-12 text-[100px] font-black text-white/5 font-bricolage leading-none pointer-events-none">
                 HUB
               </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-40">
          {[
            { icon: <Zap />, title: "Real-time Edge", desc: "Sub-millisecond processing for global attendee data." },
            { icon: <ShieldCheck />, title: "Secure Access", desc: "Microsoft Entra ID integration for zero-trust security." },
            { icon: <Calendar />, title: "Smart Logic", desc: "Intelligent manifest exports and registration tracking." }
          ].map((feature, i) => (
            <div key={i} className="p-10 rounded-[3rem] bg-zinc-900/50 border border-white/5 hover:border-yellow-500/50 transition-all duration-500 group">
              <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                {feature.icon}
              </div>
              <h4 className="text-2xl font-black mb-3 font-bricolage italic uppercase tracking-tight">{feature.title}</h4>
              <p className="text-zinc-500 font-medium leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
      
      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-12 py-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 opacity-40">
        <div className="text-sm font-black tracking-widest uppercase">
          © 2026 Excellence Entertainment Logistics
        </div>
        <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.4em]">
          <span>Security</span>
          <span>Terms</span>
          <span>Privacy</span>
        </div>
      </footer>
    </div>
  );
}
