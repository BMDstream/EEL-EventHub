"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { 
  Save, 
  Mail, 
  Type, 
  Palette, 
  Layout, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Lock,
  Upload
} from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";

  const [config, setConfig] = useState({
    primary_color: "#0f172a",
    accent_color: "#94a3b8",
    heading_text: "Access Granted.",
    body_text: "Your registration for **{event_title}** has been confirmed. Below are your secure credentials for terminal verification.",
    footer_text: "Automated Event Management System\nSecurity Tier: Level 4 Authorized",
    logo_url: "",
    sender_name: "BMD-EventHub",
    sender_email: "",
    font_family: "Calibri, sans-serif",
    font_size: "16px"
  });
  const [senderEmails, setSenderEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (userRole === "staff") {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
            <Lock className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-[#0f172a] mb-4 uppercase italic font-bricolage tracking-tight dark:text-white">Access <span className="text-red-500">Restricted</span></h1>
          <p className="text-slate-500 font-medium max-w-md">You do not have the clearance level required to view settings.</p>
        </div>
      </AdminLayout>
    );
  }

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/py/settings/email_config", {
          headers: {
            "x-user-email": session?.user?.email || ""
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.value && Object.keys(data.value).length > 0) {
            setConfig(prev => ({
              ...prev,
              ...data.value
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchSenderDomains() {
      try {
        const res = await fetch("/api/py/settings/sender-domains", {
          headers: { "x-user-email": session?.user?.email || "" }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setSenderEmails(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch sender domains", err);
      }
    }

    if (session?.user?.email) {
      fetchSettings();
      if (userRole === "admin" || userRole === "manager") {
        fetchSenderDomains();
      }
    } else if (session === null) {
      setLoading(false);
    }
  }, [session, userRole]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, logo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/py/settings/email_config", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved successfully! New emails will use this template." });
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save settings. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-[#0f172a]" size={48} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-[#0f172a] tracking-tighter font-bricolage italic mb-2 uppercase dark:text-white">SYSTEM <span className="text-slate-300 dark:text-slate-600">SETTINGS</span></h1>
          <p className="text-slate-500 font-medium text-lg dark:text-slate-400">Customize the global communication experience and platform aesthetics.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Email Template Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl dark:bg-blue-900/20">
                <Mail size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight dark:text-white">Confirmation Email Template</h2>
                <p className="text-sm text-slate-400 font-medium">Customize the automated registration confirmation dispatch.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Colors */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                    <Palette size={12} /> Primary Color
                  </label>
                  <div className="flex gap-4">
                    <input 
                      type="color" 
                      value={config.primary_color}
                      onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                      className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={config.primary_color}
                      onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                      className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                    <Palette size={12} /> Accent Color
                  </label>
                  <div className="flex gap-4">
                    <input 
                      type="color" 
                      value={config.accent_color}
                      onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
                      className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={config.accent_color}
                      onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
                      className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                    <Type size={12} /> Email Font Family
                  </label>
                  <select
                    value={config.font_family || "Calibri, sans-serif"}
                    onChange={(e) => setConfig({ ...config, font_family: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
                  >
                    <option value="Calibri, sans-serif">Calibri (Recommended)</option>
                    <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'Outfit', sans-serif">Outfit</option>
                    <option value="'Bricolage Grotesque', sans-serif">Bricolage</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="sans-serif">System Sans-Serif</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                    <Type size={12} /> Email Font Size
                  </label>
                  <select
                    value={config.font_size || "16px"}
                    onChange={(e) => setConfig({ ...config, font_size: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
                  >
                    <option value="12px">12px</option>
                    <option value="14px">14px</option>
                    <option value="15px">15px</option>
                    <option value="16px">16px (Default)</option>
                    <option value="17px">17px</option>
                    <option value="18px">18px</option>
                    <option value="20px">20px</option>
                  </select>
                </div>
              </div>

              {/* Text Fields & Logo */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                    <Type size={12} /> Heading Text
                  </label>
                  <input 
                    type="text" 
                    value={config.heading_text}
                    onChange={(e) => setConfig({ ...config, heading_text: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 italic">Use a period (.) to separate the two colors (e.g. Access.Granted)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                      <Type size={12} /> Email Sender Name
                    </label>
                    <input 
                      type="text" 
                      value={config.sender_name || ""}
                      onChange={(e) => setConfig({ ...config, sender_name: e.target.value })}
                      placeholder="e.g. BMD-EventHub"
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-400 italic">This name will appear as the sender in the recipient's inbox (e.g. "EEL-Events").</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                      <Mail size={12} /> Email Sender Email
                    </label>
                    <select
                      value={config.sender_email || ""}
                      onChange={(e) => setConfig({ ...config, sender_email: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="">Default (events@eelogistics.co.za)</option>
                      {(senderEmails.length > 0 ? senderEmails : ["events@eelogistics.co.za", "events@bmdcomputing.com"]).map((email) => (
                        <option key={email} value={email}>{email}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 italic">The email address used to send emails (must be a verified Resend domain).</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                  <Layout size={12} /> Body Message Template
                </label>
                <textarea 
                  rows={4}
                  value={config.body_text}
                  onChange={(e) => setConfig({ ...config, body_text: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
                />
                <p className="text-[10px] text-slate-400 italic">Use {"{event_title}"} or **{"{event_title}"}** to dynamically insert the event name.</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                  <Layout size={12} /> Footer Text
                </label>
                <textarea 
                  rows={2}
                  value={config.footer_text}
                  onChange={(e) => setConfig({ ...config, footer_text: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
                />
              </div>
            </div>
          </motion.div>

          {/* Action Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
            {message && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold ${
                  message.type === "success" ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                }`}
              >
                {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {message.text}
              </motion.div>
            )}
            <div className="flex-1" />
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center gap-3 bg-[#0f172a] hover:bg-black text-white px-10 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs disabled:opacity-50 dark:bg-yellow-400 dark:text-black"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? "Deploying Changes..." : "Save System Config"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
