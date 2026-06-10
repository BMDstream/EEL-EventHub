"use client";

import React, { useState } from "react";
import { 
  Trophy, 
  User, 
  Mail, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  QrCode, 
  Key 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface PlayerInfo {
  id: number;
  name: string;
  email: string;
  pin: string;
  qr_hash: string;
  email_dispatched: boolean;
}

interface RegistrationSuccessData {
  match_id: number;
  challenger: PlayerInfo;
  partner: PlayerInfo;
}

export default function TournamentRegisterPage() {
  // Form State
  const [challengerName, setChallengerName] = useState("");
  const [challengerEmail, setChallengerEmail] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");

  // UI Flow State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<RegistrationSuccessData | null>(null);

  // Simple Email validation regex
  const validateEmailFormat = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Frontend Validations
    if (!challengerName.trim() || !challengerEmail.trim() || !partnerName.trim() || !partnerEmail.trim()) {
      setErrorMsg("Please fill in all player details.");
      return;
    }

    if (!validateEmailFormat(challengerEmail)) {
      setErrorMsg("Invalid email format for Challenger.");
      return;
    }

    if (!validateEmailFormat(partnerEmail)) {
      setErrorMsg("Invalid email format for Challenged Partner.");
      return;
    }

    if (challengerEmail.trim().toLowerCase() === partnerEmail.trim().toLowerCase()) {
      setErrorMsg("Challenger and Partner emails cannot be the same.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/py/tournament/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challenger_name: challengerName.trim(),
          challenger_email: challengerEmail.trim(),
          partner_name: partnerName.trim(),
          partner_email: partnerEmail.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process dual-registration.");
      }

      setSuccessData(data);
      // Reset form
      setChallengerName("");
      setChallengerEmail("");
      setPartnerName("");
      setPartnerEmail("");
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setErrorMsg(null);
  };

  // Background particle blobs
  const backgroundBlobs = (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full filter blur-[100px] opacity-20 bg-gradient-to-br from-yellow-500 to-amber-500 animate-pulse"></div>
      <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-10 bg-gradient-to-br from-blue-500 to-purple-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030712] text-white font-outfit relative overflow-hidden flex flex-col items-center justify-center px-6 py-12">
      {backgroundBlobs}

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-sm font-black tracking-widest text-zinc-500 hover:text-white uppercase transition-colors mb-3">
            ← Back to Command Center
          </Link>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Trophy size={24} className="text-slate-950" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black font-bricolage italic uppercase tracking-tight">
              TOURNAMENT <span className="text-yellow-400">HUB</span>
            </h1>
          </div>
          <p className="text-zinc-400 text-sm font-medium">Create a competitive matchup. Register yourself and a partner to trigger dual event clearance.</p>
        </div>

        <AnimatePresence mode="wait">
          {!successData ? (
            <motion.div
              key="register-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-black/50"
            >
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1: Challenger */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                    Challenger (You)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Challenger Full Name"
                        value={challengerName}
                        onChange={(e) => setChallengerName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-900/60 border border-white/5 text-sm font-medium text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="email"
                        placeholder="Challenger Email"
                        value={challengerEmail}
                        onChange={(e) => setChallengerEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-900/60 border border-white/5 text-sm font-medium text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Challenged Partner */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                    Challenged Partner
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Partner Full Name"
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-900/60 border border-white/5 text-sm font-medium text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="email"
                        placeholder="Partner Email"
                        value={partnerEmail}
                        onChange={(e) => setPartnerEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-900/60 border border-white/5 text-sm font-medium text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 p-4 rounded-xl text-red-200 text-xs font-bold"
                  >
                    <AlertTriangle size={16} className="text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-slate-950 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl hover:shadow-yellow-400/10 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Registering Matchup...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Issue Clearance Passes
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="register-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-black/50 space-y-8"
            >
              {/* Top Banner */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4 border border-green-500/30">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="text-2xl font-black font-bricolage italic uppercase text-green-400 tracking-tight">Clearance Issued</h2>
                <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest font-black">Match ID #{successData.match_id}</p>
                <p className="text-zinc-500 text-xs font-semibold mt-2">Passes have been securely created and dynamic invitations dispatched via Resend.</p>
              </div>

              {/* Passes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Challenger Pass */}
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center">
                  <div className="absolute top-4 left-4">
                    <span className="px-2.5 py-1 bg-yellow-400/10 text-yellow-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-yellow-400/20">Challenger</span>
                  </div>
                  <div className="w-32 h-32 bg-white rounded-xl p-2.5 my-6 flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${successData.challenger.qr_hash}`} 
                      alt="Challenger QR Pass"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h4 className="text-sm font-black truncate max-w-full">{successData.challenger.name}</h4>
                  <p className="text-[10px] text-zinc-500 font-semibold truncate max-w-full mb-4">{successData.challenger.email}</p>
                  <div className="w-full bg-[#030712] border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-500 flex items-center gap-1.5"><Key size={12} /> PIN</span>
                    <span className="text-yellow-400 tracking-widest font-black uppercase">{successData.challenger.pin}</span>
                  </div>
                </div>

                {/* Partner Pass */}
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center">
                  <div className="absolute top-4 left-4">
                    <span className="px-2.5 py-1 bg-blue-400/10 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-blue-400/20">Partner</span>
                  </div>
                  <div className="w-32 h-32 bg-white rounded-xl p-2.5 my-6 flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${successData.partner.qr_hash}`} 
                      alt="Partner QR Pass"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h4 className="text-sm font-black truncate max-w-full">{successData.partner.name}</h4>
                  <p className="text-[10px] text-zinc-500 font-semibold truncate max-w-full mb-4">{successData.partner.email}</p>
                  <div className="w-full bg-[#030712] border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-500 flex items-center gap-1.5"><Key size={12} /> PIN</span>
                    <span className="text-yellow-400 tracking-widest font-black uppercase">{successData.partner.pin}</span>
                  </div>
                </div>
              </div>

              {/* Next Actions */}
              <div className="pt-2">
                <button
                  onClick={handleReset}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs border border-white/10 transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  Register Another Matchup
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
