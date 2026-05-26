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
  ChevronRight,
  Building2
} from "lucide-react";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

interface ClientBranding {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color: string;
  accent_color: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [primaryClient, setPrimaryClient] = useState<ClientBranding | null>(null);

  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";
  const userEmail = session?.user?.email || "";

  // Derive a friendly first name from the email (part before @, capitalize first letter)
  const firstName = userEmail
    ? userEmail.split("@")[0].split(/[._-]/)[0]
        .replace(/^\w/, (c) => c.toUpperCase())
    : "User";

  // Initials for the avatar (up to 2 chars)
  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : "??";

  useEffect(() => {
    const savedTheme = localStorage.getItem("eel-theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }

    const savedLogo = localStorage.getItem("eel-logo");
    if (savedLogo) {
      setLogo(savedLogo);
    }
  }, []);

  // Fetch primary client for non-admin users to show their branding in the sidebar
  useEffect(() => {
    if (!session?.user?.email) return;
    if (userRole === "admin") {
      // Admins see the default BMD branding — no fetch needed
      setPrimaryClient(null);
      return;
    }
    const fetchMyClients = async () => {
      try {
        const res = await fetch("/api/py/clients", {
          headers: { "x-user-email": session.user?.email || "" }
        });
        if (res.ok) {
          const clients: ClientBranding[] = await res.json();
          if (clients && clients.length > 0) {
            // Show the first assigned client as the primary branding
            setPrimaryClient(clients[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch client branding", err);
      }
    };
    fetchMyClients();
  }, [session, userRole]);

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

  const allNavItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Clients", href: "/admin/clients", icon: Building2 },
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
      return item.name !== "Team" && item.name !== "Security" && item.name !== "Clients";
    }
    return true; // admin
  });

  // Determine sidebar branding: use assigned client branding for non-admins
  const sidebarClientName = primaryClient?.name ?? "BMD Computing";
  const sidebarClientLogo = primaryClient?.logo_url ?? logo;
  const sidebarInitial = primaryClient
    ? primaryClient.name.charAt(0).toUpperCase()
    : "B";

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-outfit transition-colors duration-500 dark:bg-[#090d16] bmd-admin-layout">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-500"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-[#0a0d14] text-white border-r border-white/5 transition-all duration-500 ease-in-out transform 
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
          {/* Logo / Client Branding Section */}
          <div className={`flex items-center gap-3 mb-12 group relative ${isSidebarCollapsed ? "justify-center" : ""}`}>
            {/* Logo — clickable to upload only for admins */}
            {userRole === "admin" ? (
              <label className={`cursor-pointer relative overflow-hidden w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-110 shrink-0 ${
                sidebarClientLogo 
                  ? "bg-transparent" 
                  : "bg-gradient-to-br from-yellow-400 to-amber-500 rotate-3 hover:rotate-6 shadow-lg shadow-yellow-500/20"
              }`}>
                {sidebarClientLogo ? (
                  <img src={sidebarClientLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-black font-black text-xl font-bricolage italic">{sidebarInitial}</span>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-[8px] font-black uppercase">Edit</span>
                </div>
              </label>
            ) : (
              <div className={`relative overflow-hidden w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                sidebarClientLogo 
                  ? "bg-transparent" 
                  : "bg-gradient-to-br from-yellow-400 to-amber-500 rotate-3 shadow-lg shadow-yellow-500/20"
              }`}>
                {sidebarClientLogo ? (
                  <img src={sidebarClientLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-black font-black text-xl font-bricolage italic">{sidebarInitial}</span>
                )}
              </div>
            )}

            {!isSidebarCollapsed && (
              <div className="transition-opacity duration-300 min-w-0">
                {primaryClient ? (
                  <>
                    <h1 className="text-base font-black font-bricolage italic tracking-tight leading-tight uppercase truncate text-white">
                      {primaryClient.name}
                    </h1>
                    <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">
                      BMD-EventHub
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-xl font-black font-bricolage italic tracking-tight leading-none uppercase">
                      BMD-<span className="text-yellow-400">EventHub</span>
                    </h1>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">BMD Computing</p>
                  </>
                )}
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
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                    isActive 
                      ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 shadow-lg shadow-yellow-500/10 font-black scale-[1.02]" 
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-white font-bold hover:translate-x-1"
                  } ${isSidebarCollapsed ? "justify-center px-0 w-12 h-12" : ""}`}
                  title={isSidebarCollapsed ? item.name : ""}
                >
                  <item.icon size={20} className={isActive ? "text-slate-950" : "text-slate-500 group-hover:text-white transition-colors duration-300"} />
                  {!isSidebarCollapsed && <span className="text-sm uppercase tracking-widest truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Footer: User info + Sign Out */}
          <div className="pt-6 border-t border-slate-800 space-y-3">
            {/* Logged-in user info */}
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-3 px-2 py-3">
                <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-yellow-400 uppercase">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">{firstName}</p>
                  <p className="text-[9px] text-slate-500 truncate uppercase tracking-wider font-bold">{userRole}</p>
                </div>
              </div>
            )}
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
        <header className="h-20 bg-white/40 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-40 transition-all duration-500 dark:bg-[#090d16]/40 dark:border-white/5">
           <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="lg:hidden p-2 text-slate-500"
             >
               {isSidebarOpen ? <X /> : <Menu />}
             </button>
             {/* Welcome message */}
             <div className="hidden sm:flex flex-col">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Welcome back</span>
               <span className="text-sm font-black text-[#0f172a] dark:text-white tracking-tight">{firstName} 👋</span>
             </div>
           </div>
           
           <div className="flex items-center gap-4">
               <button 
                 onClick={toggleTheme}
                 className="p-3 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:border dark:border-white/5"
               >
                 {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
               </button>

              {/* System status */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">System Status</span>
                <span className="text-[10px] text-green-500 font-bold flex items-center gap-1 justify-end">
                   <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                   Operational
                </span>
              </div>

               {/* User avatar with initials */}
               <div 
                 className="w-10 h-10 bg-gradient-to-br from-[#25678e] to-[#1e4e6d] rounded-2xl border border-white/10 flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                 title={userEmail}
               >
                 <span className="text-[11px] font-black text-white uppercase">{initials}</span>
               </div>
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
