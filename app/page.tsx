"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, ShieldCheck, Zap } from "lucide-react";
import { MSLoginHandler } from "@/components/MSLoginHandler";
import { Suspense } from "react";

// Particle class definition
class Particle {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  radius: number = 0;
  baseRadius: number = 0;
  originalX: number = 0;
  originalY: number = 0;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.radius = Math.random() * 2 + 1;
    this.baseRadius = this.radius;
    this.originalX = this.x;
    this.originalY = this.y;
  }

  update(width: number, height: number, mouseX: number, mouseY: number) {
    // Move particle
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off walls
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;

    // Cursor attraction/displacement for parallax depth
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 250;

    if (dist < maxDist) {
      const force = (maxDist - dist) / maxDist;
      // Gently pull/shift particles toward/away to simulate a 3D field
      this.x -= (dx / dist) * force * 10;
      this.y -= (dy / dist) * force * 10;
      this.radius = this.baseRadius + force * 1.5;
    } else {
      if (this.radius > this.baseRadius) {
        this.radius -= 0.05;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(250, 204, 21, 0.35)"; // subtle yellow glow
    ctx.fill();
  }
}

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Calculate particle density dynamically
      particles = [];
      const density = Math.floor((canvas.width * canvas.height) / 12000);
      const maxParticles = Math.min(density, 100);
      for (let i = 0; i < maxParticles; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = {
        x: -1000,
        y: -1000
      };
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    
    handleResize();

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw dynamic lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(canvas.width, canvas.height, mouseRef.current.x, mouseRef.current.y);
        particles[i].draw(ctx);

        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-yellow-500/30 font-outfit relative overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(80px, -80px) scale(1.15); }
          66% { transform: translate(-40px, 40px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-2 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-80px, 80px) scale(1.2); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-3 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-50px, -60px) scale(0.95); }
          66% { transform: translate(60px, 50px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob-1 {
          animation: float-1 25s infinite alternate ease-in-out;
          background: radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, transparent 70%);
          filter: blur(80px);
        }
        .animate-blob-2 {
          animation: float-2 30s infinite alternate ease-in-out;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 70%);
          filter: blur(90px);
        }
        .animate-blob-3 {
          animation: float-3 28s infinite alternate ease-in-out;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%);
          filter: blur(85px);
        }
      `}} />

      {/* Parallax blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[10%] w-[600px] h-[600px] rounded-full animate-blob-1"></div>
        <div className="absolute top-[35%] right-[10%] w-[700px] h-[700px] rounded-full animate-blob-2"></div>
        <div className="absolute bottom-[5%] left-[25%] w-[650px] h-[650px] rounded-full animate-blob-3"></div>
      </div>

      {/* Particle Canvas */}
      <ParticleBackground />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-10 py-8 max-w-7xl mx-auto relative z-20">
        <div className="text-2xl font-black tracking-tighter font-bricolage italic uppercase">
          BMD<span className="text-yellow-400">-</span>EVENT<span className="text-yellow-400">HUB</span>
        </div>
        <div className="flex items-center gap-8">
          <Link href="/admin" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white transition-colors">
            Portal Access
          </Link>
          <Link 
            href="/admin" 
            className="bg-white hover:bg-yellow-400 text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-xl shadow-white/5 hover:shadow-yellow-400/20 hover:scale-105"
          >
            Launch System
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-10 pt-20 pb-36 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-950/60 backdrop-blur-md rounded-full mb-8 border border-white/5">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                BMD Computing • Enterprise Tier
              </span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 font-bricolage italic uppercase bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
              Event <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-500">Intelligence.</span>
            </h1>
            
            <p className="text-base text-zinc-400 max-w-md mb-12 font-medium leading-relaxed">
              The next-generation logistics center for professional event registration. Precision manifest tracking, custom questionnaires, and seamless scanning operations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/admin" 
                className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 px-10 py-5 rounded-2xl text-xs font-black transition-all hover:scale-[1.03] flex items-center justify-center gap-3 shadow-xl shadow-yellow-400/10 uppercase tracking-[0.2em]"
              >
                Go to Dashboard <ArrowRight size={18} />
              </Link>
              <Link 
                href="/api/py/auth/azure/login" 
                className="bg-slate-950/60 backdrop-blur-md text-white hover:bg-white hover:text-black px-10 py-5 rounded-2xl text-xs font-black transition-all hover:scale-[1.03] flex items-center justify-center gap-3 border border-white/10 uppercase tracking-[0.2em]"
              >
                <ShieldCheck size={18} className="text-yellow-400" />
                Login with Microsoft
              </Link>
            </div>
            
            <Suspense fallback={null}>
              <MSLoginHandler />
            </Suspense>
          </div>

          {/* Interactive Feature Showcase Card */}
          <div className="relative group">
            <div className="absolute -inset-10 bg-yellow-500/5 rounded-full blur-[100px] opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative aspect-[4/5] bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-12 flex flex-col justify-end overflow-hidden shadow-2xl group-hover:border-yellow-400/30 transition-all duration-500">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black via-black/10 to-transparent opacity-80 pointer-events-none"></div>
               <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl mb-6 flex items-center justify-center shadow-xl shadow-yellow-400/20">
                     <Calendar size={32} className="text-slate-950" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tight mb-3 font-bricolage italic uppercase">Seamless Flow.</h3>
                  <p className="text-zinc-400 text-sm font-medium max-w-xs leading-relaxed">
                    Automated manifest synchronization and secure credential issuance scaled for VIP events.
                  </p>
               </div>
               
               <div className="absolute top-10 right-10 text-[90px] font-black text-white/5 font-bricolage leading-none pointer-events-none select-none">
                 HUB
               </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-36">
          {[
            { icon: <Zap size={22} />, title: "Real-time Edge", desc: "Instantaneous check-ins and manifest synchronization." },
            { icon: <ShieldCheck size={22} />, title: "Secure Access", desc: "Microsoft Entra ID integration for secure staff clearance." },
            { icon: <Calendar size={22} />, title: "Smart Logic", desc: "Dynamic custom questionnaires built per client event." }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-[2.5rem] bg-slate-950/30 backdrop-blur-md border border-white/5 hover:border-yellow-400/20 hover:bg-slate-950/50 transition-all duration-500 group shadow-lg">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-6 border border-white/10 group-hover:bg-yellow-400 group-hover:text-slate-950 transition-colors duration-300">
                {feature.icon}
              </div>
              <h4 className="text-xl font-black mb-2.5 font-bricolage italic uppercase tracking-tight">{feature.title}</h4>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
      
      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-10 py-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30 relative z-20">
        <div className="text-xs font-black tracking-widest uppercase">
          © 2026 BMD Computing
        </div>
        <div className="flex gap-8 text-[9px] font-black uppercase tracking-[0.4em]">
          <span>Security</span>
          <span>Terms</span>
          <span>Privacy</span>
        </div>
      </footer>
    </div>
  );
}
