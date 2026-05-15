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
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const [config, setConfig] = useState({
    primary_color: "#0f172a",
    accent_color: "#94a3b8",
    heading_text: "Access Granted.",
    body_text: "Your orchestration for **{event_title}** has been authorized. Below are your secure credentials for terminal verification.",
    footer_text: "Automated Event Management System\nSecurity Tier: Level 4 Authorized"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/py/settings/email_config");
        if (res.ok) {
          const data = await res.json();
          if (data.value && Object.keys(data.value).length > 0) {
            setConfig(data.value);
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/py/settings/email_config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
              </div>

              {/* Text Fields */}
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
