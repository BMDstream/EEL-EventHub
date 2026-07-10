"use client";

import AdminLayout from "@/components/AdminLayout";
import { ShieldCheck, Lock, Activity, Users, Monitor, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

interface UserSession {
  id: number;
  user_email: string;
  ip_address: string;
  user_agent: string;
  last_active: string;
}

interface AuditLog {
  id: number;
  user_email: string;
  action: string;
  description: string;
  event_id?: number;
  timestamp: string;
}

export default function SecurityPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";
  const userEmail = session?.user?.email || "";

  // Sessions and Audit Logs state
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  
  // Loading states
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  
  // Filtering & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/py/security/sessions", {
        headers: { "x-user-email": userEmail }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSessions(data);
      }
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const offset = (page - 1) * limit;
      let url = `/api/py/security/logs?limit=${limit}&offset=${offset}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      const res = await fetch(url, {
        headers: { "x-user-email": userEmail }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setTotalLogs(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "admin" && userEmail) {
      fetchSessions();
    }
  }, [userRole, userEmail]);

  useEffect(() => {
    if (userRole === "admin" && userEmail) {
      fetchAuditLogs();
    }
  }, [userRole, userEmail, page, searchTerm]);

  if (userRole !== "admin") {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 font-outfit">
          <div className="w-24 h-24 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mb-8">
            <Lock className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-[#0f172a] dark:text-white mb-4 uppercase italic tracking-tight">Access <span className="text-red-500">Restricted</span></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md">You do not have the clearance level required to access security settings. Please contact a system administrator.</p>
        </div>
      </AdminLayout>
    );
  }

  // Parse User Agent to get friendly OS/Browser display
  const getDeviceFriendlyName = (ua: string) => {
    if (!ua) return "Unknown Browser";
    if (ua.includes("Windows")) return "Windows PC";
    if (ua.includes("Macintosh")) return "MacBook / iMac";
    if (ua.includes("iPhone")) return "iPhone";
    if (ua.includes("Android")) return "Android Device";
    if (ua.includes("Linux")) return "Linux Workstation";
    return "Web Client";
  };

  // Label tags for actions
  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case "checkin":
      case "checkin_toggle":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";
      case "walkin_registration":
        return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
      case "create_event":
      case "update_event":
      case "update_schema":
        return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50";
      case "delete_event":
      case "delete_registration":
      case "bulk_delete":
        return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
    }
  };

  const getFriendlyActionName = (action: string) => {
    return action.toUpperCase().replace(/_/g, " ");
  };

  const totalPages = Math.ceil(totalLogs / limit);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 font-outfit space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#0f172a] dark:bg-yellow-400 text-white dark:text-slate-900 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#0f172a] dark:text-white uppercase tracking-tight italic">Fortress <span className="text-slate-400 dark:text-yellow-400">Security</span></h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Real-time session audit logs and admin control center.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { fetchSessions(); fetchAuditLogs(); }} 
              className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 outline-none transition-all font-bold text-xs"
            >
              <RefreshCw size={14} className={(sessionsLoading || logsLoading) ? "animate-spin" : ""} /> Refresh Security Data
            </button>
          </div>
        </div>

        {/* Sessions Section */}
        <div className="bg-white dark:bg-[#0d1527] rounded-[2rem] border border-slate-100 dark:border-slate-800/80 p-8 shadow-sm space-y-6 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0f172a] dark:text-white uppercase tracking-wider">Active Admin & Staff Sessions</h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Currently authenticated operators with database read/write access</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-50 dark:border-slate-800/80">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Active User</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">IP Address</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">OS / Device</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Active Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {sessionsLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 font-semibold text-xs">
                      Loading active sessions...
                    </td>
                  </tr>
                ) : activeSessions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 font-semibold text-xs">
                      No active sessions found.
                    </td>
                  </tr>
                ) : (
                  activeSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-all">
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                        {session.user_email}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 text-sm font-mono">{session.ip_address || "127.0.0.1"}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm font-semibold flex items-center gap-1.5">
                        <Monitor size={14} className="text-slate-400" />
                        {getDeviceFriendlyName(session.user_agent)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        {new Date(session.last_active).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Section */}
        <div className="bg-white dark:bg-[#0d1527] rounded-[2rem] border border-slate-100 dark:border-slate-800/80 p-8 shadow-sm space-y-6 transition-all duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-xl flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#0f172a] dark:text-white uppercase tracking-wider">Comprehensive Audit Trail</h2>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Historical ledger of sensitive admin actions</p>
              </div>
            </div>

            {/* Audit Search bar */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search audit trail..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full pl-11 pr-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 dark:text-white focus:border-[#1e293b] dark:focus:border-yellow-400 bg-slate-50/50 dark:bg-slate-900 outline-none transition-all font-bold text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-50 dark:border-slate-800/80">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Email</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action Trigger</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {logsLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 font-semibold text-xs">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 font-semibold text-xs">
                      No logs matches the search query.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-all text-sm font-semibold">
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-bold">{log.user_email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getActionBadgeClass(log.action)}`}>
                          {getFriendlyActionName(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-sm truncate">{log.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
              <span className="text-xs font-bold text-slate-400">
                Showing Page {page} of {totalPages} ({totalLogs} Total Logs)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1 || logsLoading}
                  onClick={() => setPage(page - 1)}
                  className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page === totalPages || logsLoading}
                  onClick={() => setPage(page + 1)}
                  className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-40 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
