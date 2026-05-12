import Link from "next/link";
import { ArrowRight, Calendar, ShieldCheck, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-yellow-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-white/5">
        <div className="text-2xl font-black tracking-tighter italic">
          EEL <span className="text-yellow-500">CVENT</span>
        </div>
        <div className="flex items-center gap-8">
          <Link href="/admin" className="text-sm font-bold hover:text-yellow-500 transition-colors">
            Admin Portal
          </Link>
          <Link 
            href="/admin" 
            className="bg-yellow-500 text-black px-6 py-2.5 rounded-full text-sm font-bold hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-500/10"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-block px-4 py-1.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-8 border border-yellow-500/20">
              Enterprise Event Logistics
            </div>
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-8 italic">
              Events <br /> 
              <span className="text-yellow-500 underline decoration-white/10 underline-offset-8">Redefined.</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-lg mb-12 font-medium leading-relaxed">
              The all-in-one platform for professional event management. From registration workflows to real-time attendee tracking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/admin" 
                className="bg-yellow-500 text-black px-10 py-5 rounded-2xl text-lg font-black hover:bg-yellow-400 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-yellow-500/20 uppercase tracking-widest"
              >
                Go to Dashboard <ArrowRight size={24} />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-yellow-500/5 rounded-[3rem] blur-3xl"></div>
            <div className="relative bg-zinc-900 border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden aspect-square flex flex-col items-center justify-center p-12 text-center">
               <div className="w-32 h-32 bg-yellow-500 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl mb-8">
                  <Calendar size={64} className="text-black -rotate-12" />
               </div>
               <h3 className="text-3xl font-black tracking-tight mb-4 italic text-white">Seamless Integration.</h3>
               <p className="text-slate-400 font-medium max-w-xs">
                 Powered by Next.js and FastAPI for high-performance enterprise event scaling.
               </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
          <div className="p-8 rounded-3xl bg-zinc-900 border border-white/5 hover:border-yellow-500/30 transition-colors">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-sm mb-6 border border-white/5">
              <Zap size={24} className="text-yellow-500" />
            </div>
            <h4 className="text-xl font-black mb-2 italic">Lightning Fast</h4>
            <p className="text-slate-500 font-medium">Built with the latest technologies for sub-second response times.</p>
          </div>
          <div className="p-8 rounded-3xl bg-zinc-900 border border-white/5 hover:border-yellow-500/30 transition-colors">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-sm mb-6 border border-white/5">
              <ShieldCheck size={24} className="text-yellow-500" />
            </div>
            <h4 className="text-xl font-black mb-2 italic">Enterprise Security</h4>
            <p className="text-slate-500 font-medium">Fully integrated with Microsoft Entra ID for secure corporate access.</p>
          </div>
          <div className="p-8 rounded-3xl bg-zinc-900 border border-white/5 hover:border-yellow-500/30 transition-colors">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-sm mb-6 border border-white/5">
              <Calendar size={24} className="text-yellow-500" />
            </div>
            <h4 className="text-xl font-black mb-2 italic">Easy Management</h4>
            <p className="text-slate-500 font-medium">Comprehensive tools to manage registrations, edits, and exports.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
