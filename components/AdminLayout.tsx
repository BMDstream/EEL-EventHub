"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  TrendingUp,
  ShieldCheck,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem("eel-logo");
    if (savedLogo) setLogo(savedLogo);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogo(base64String);
        localStorage.setItem("eel-logo", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Events", href: "/admin/events", icon: Calendar },
    { name: "Forms", href: "/admin/forms", icon: Settings },
    { name: "Team", href: "/admin/users", icon: Users },
    { name: "Analytics", href: "/admin/analytics", icon: TrendingUp },
    { name: "Security", href: "/admin/security", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex font-outfit">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] text-white transition-all duration-500 ease-in-out transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0`}>
        <div className="h-full flex flex-col p-8">
          {/* Logo Section */}
          <div className="flex items-center gap-3 mb-12 group relative">
            <label className="cursor-pointer relative overflow-hidden w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center rotate-3 transition-transform hover:scale-110">
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-cover -rotate-3" />
              ) : (
                <span className="text-black font-black text-xl font-bricolage italic">E</span>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[8px] font-black uppercase">Edit</span>
              </div>
            </label>
            <div>
              <h1 className="text-xl font-black font-bricolage italic tracking-tight leading-none uppercase">EEL-<span className="text-yellow-400">EventHub</span></h1>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Excellence Logistics</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
                    isActive 
                      ? "bg-yellow-400 text-black shadow-xl shadow-yellow-400/20 font-black" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white font-bold"
                  }`}
                >
                  <item.icon size={20} className={isActive ? "text-black" : "text-slate-500 group-hover:text-white"} />
                  <span className="text-sm uppercase tracking-widest">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer / Profile */}
          <div className="pt-8 border-t border-slate-800">
            <button 
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-4 px-5 py-4 w-full rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold group"
            >
              <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
              <span className="text-sm uppercase tracking-widest">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
           <button 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
             className="lg:hidden p-2 text-slate-500"
           >
             {isSidebarOpen ? <X /> : <Menu />}
           </button>
           
           <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">System Status</span>
                <span className="text-[10px] text-green-500 font-bold flex items-center gap-1 justify-end">
                   <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                   Operational
                </span>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full border border-slate-200"></div>
           </div>
        </header>

        {/* Page Content */}
        <div className="p-8 lg:p-12 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
