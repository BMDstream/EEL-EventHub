"use client";

import { ShieldCheck, ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { MSLoginHandler } from "@/components/MSLoginHandler";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/admin",
    });

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-yellow-500/30 font-outfit flex flex-col items-center justify-center p-6 bmd-login-layout">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] opacity-50 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-[120px] opacity-50"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center mb-12 group">
          <div className="text-4xl font-black tracking-tighter font-bricolage mb-2">
            BMD<span className="text-yellow-500">-</span>EVENT<span className="text-yellow-500">HUB</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 group-hover:text-yellow-500 transition-colors">
            Security Gateway
          </div>
        </Link>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
          <h1 className="text-3xl font-black tracking-tight mb-8 font-bricolage italic uppercase">Authorized Access</h1>
          
          {/* Microsoft Login Button */}
          <Link 
            href="/api/py/auth/azure/login" 
            className="w-full bg-[#25678e] text-white py-5 rounded-2xl font-black flex items-center justify-center gap-4 hover:bg-[#1d5373] transition-all uppercase tracking-widest text-xs mb-8 group shadow-lg shadow-[#25678e]/30"
          >
            <ShieldCheck size={20} className="text-white/80 group-hover:text-white transition-colors" />
            Login with Microsoft
          </Link>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-black">
              <span className="bg-zinc-900/50 px-4 text-zinc-600">OR</span>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Terminal ID (Email)</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-800 border-2 border-zinc-600 rounded-xl px-5 py-4 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-[#25678e] focus:shadow-[0_0_0_3px_rgba(37,103,142,0.4)] transition-all font-medium"
                placeholder="Enter email..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Access Key (Password)</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-800 border-2 border-zinc-600 rounded-xl px-5 py-4 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-[#25678e] focus:shadow-[0_0_0_3px_rgba(37,103,142,0.4)] transition-all font-medium"
                placeholder="Enter password..."
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold flex items-center gap-3">
                <Lock size={16} />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#25678e] text-white py-5 rounded-2xl font-black flex items-center justify-center gap-4 hover:bg-[#1d5373] transition-all uppercase tracking-widest text-xs disabled:opacity-50 shadow-lg shadow-[#25678e]/30"
            >
              {loading ? "Authenticating..." : "Sign In"} <ArrowRight size={18} />
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
          Security Level 4 • Restricted Access
        </p>
      </div>

      <Suspense fallback={null}>
        <MSLoginHandler />
      </Suspense>
    </div>
  );
}
