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
  X,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const savedLogo = localStorage.getItem("eel-logo");
    if (savedLogo) setLogo(savedLogo);

    const savedTheme = localStorage.getItem("eel-theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      // Default to dark for premium feel if not set
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("eel-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

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

  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";

  const allNavItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Events", href: "/admin/events", icon: Calendar },
    { name: "Team", href: "/admin/users", icon: Users },
    { name: "Analytics", href: "/admin/analytics", icon: TrendingUp },
    { name: "Security", href: "/admin/security", icon: ShieldCheck },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const navItems = allNavItems.filter(item => {
    if (userRole === "staff") {
      return item.name === "Dashboard" || item.name === "Events";
    }
    if (userRole === "manager") {
      return item.name !== "Team" && item.name !== "Security";
    }
    return true; // admin
  });

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex font-outfit transition-colors duration-500 dark:bg-[#020617]">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-500"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-[#0f172a] text-white transition-all duration-500 ease-in-out transform 
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:relative lg:translate-x-0
        ${isSidebarCollapsed ? "lg:w-24" : "lg:w-80"}
      `}>
        {/* Collapse Toggle (Desktop) */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-10 w-6 h-6 bg-yellow-400 text-black rounded-full items-center justify-center shadow-lg z-50 hover:scale-110 transition-transform"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`h-full flex flex-col p-8 transition-all ${isSidebarCollapsed ? "items-center px-4" : ""}`}>
          {/* Logo Section */}
          <div className={`flex items-center gap-3 mb-12 group relative ${isSidebarCollapsed ? "justify-center" : ""}`}>
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
            {!isSidebarCollapsed && (
              <div className="transition-opacity duration-300">
                <h1 className="text-xl font-black font-bricolage italic tracking-tight leading-none uppercase">EEL-<span className="text-yellow-400">EventHub</span></h1>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Excellence Logistics</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
                    isActive 
                      ? "bg-yellow-400 text-black shadow-xl shadow-yellow-400/20 font-black" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white font-bold"
                  } ${isSidebarCollapsed ? "justify-center px-0 w-12 h-12" : ""}`}
                  title={isSidebarCollapsed ? item.name : ""}
                >
                  <item.icon size={20} className={isActive ? "text-black" : "text-slate-500 group-hover:text-white"} />
                  {!isSidebarCollapsed && <span className="text-sm uppercase tracking-widest truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Footer / Profile */}
          <div className="pt-8 border-t border-slate-800">
            <button 
              onClick={() => signOut({ callbackUrl: "/" })}
              className={`flex items-center gap-4 px-5 py-4 w-full rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold group ${isSidebarCollapsed ? "justify-center px-0 w-12 h-12" : ""}`}
              title={isSidebarCollapsed ? "Sign Out" : ""}
            >
              <LogOut size={20} className="group-hover:translate-x-1 transition-transform shrink-0" />
              {!isSidebarCollapsed && <span className="text-sm uppercase tracking-widest truncate">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40 transition-colors dark:bg-[#0f172a]/80 dark:border-slate-800">
           <button 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
             className="lg:hidden p-2 text-slate-500"
           >
             {isSidebarOpen ? <X /> : <Menu />}
           </button>
           
           <div className="flex items-center gap-6">
              <button 
                onClick={toggleTheme}
                className="p-3 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">System Status</span>
                <span className="text-[10px] text-green-500 font-bold flex items-center gap-1 justify-end">
                   <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                   Operational
                </span>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full border border-slate-200 dark:bg-slate-800 dark:border-slate-700"></div>
           </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-8 lg:p-12 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
