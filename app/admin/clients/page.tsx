"use client";

import { useEffect, useState } from "react";
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Mail, 
  Palette, 
  Type, 
  Upload, 
  X,
  Sparkles,
  Link2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/AdminLayout";
import { useSession } from "next-auth/react";

interface Client {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  sender_name?: string;
  reply_to?: string;
  primary_color: string;
  accent_color: string;
  heading_text: string;
  body_text: string;
  footer_text: string;
  created_at: string;
}

export default function ClientsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logo_url: "",
    sender_name: "",
    reply_to: "",
    primary_color: "#0f172a",
    accent_color: "#94a3b8",
    heading_text: "Access Granted.",
    body_text: "Your orchestration for **{event_title}** has been authorized. Below are your secure credentials for terminal verification.",
    footer_text: "Automated Event Management System\nSecurity Tier: Level 4 Authorized"
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/py/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      slug: "",
      logo_url: "",
      sender_name: "",
      reply_to: "",
      primary_color: "#0f172a",
      accent_color: "#94a3b8",
      heading_text: "Access Granted.",
      body_text: "Your orchestration for **{event_title}** has been authorized. Below are your secure credentials for terminal verification.",
      footer_text: "Automated Event Management System\nSecurity Tier: Level 4 Authorized"
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      slug: client.slug,
      logo_url: client.logo_url || "",
      sender_name: client.sender_name || "",
      reply_to: client.reply_to || "",
      primary_color: client.primary_color,
      accent_color: client.accent_color,
      heading_text: client.heading_text,
      body_text: client.body_text,
      footer_text: client.footer_text
    });
    setModalOpen(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingClient 
        ? `/api/py/clients/${editingClient.id}` 
        : "/api/py/clients";
      const method = editingClient ? "PUT" : "POST";

      // Formulate slug from name if empty
      const finalSlug = formData.slug.trim() 
        ? formData.slug.toLowerCase().replace(/[^a-z0-9-_]/g, "")
        : formData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");

      const payload = {
        ...formData,
        slug: finalSlug
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalOpen(false);
        fetchClients();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail || "Failed to save client"}`);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will fail if they have active events.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/py/clients/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchClients();
      } else {
        const err = await res.json();
        alert(`Failed to delete: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting client");
    }
  };

  if (userRole === "staff") {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
            <Building2 className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-[#0f172a] mb-4 uppercase italic font-bricolage tracking-tight dark:text-white">Access <span className="text-red-500">Restricted</span></h1>
          <p className="text-slate-500 font-medium max-w-md">You do not have the clearance level required to manage system clients.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black text-[#0f172a] tracking-tighter font-bricolage italic mb-2 uppercase dark:text-white">CLIENT <span className="text-slate-300 dark:text-slate-600">STUDIO</span></h1>
            <p className="text-slate-500 font-medium text-lg dark:text-slate-400">Manage multiple client brand spaces, custom colors, logos, and custom email credentials.</p>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-3 bg-[#0f172a] hover:bg-black text-white px-8 py-5 rounded-2xl font-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs dark:bg-yellow-400 dark:text-black dark:shadow-none"
          >
            <Plus size={16} /> Add Client
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-[#0f172a]" size={48} />
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-20 text-center dark:bg-[#0f172a] dark:border-slate-800">
            <Building2 className="text-slate-200 mx-auto mb-6 dark:text-slate-700" size={64} />
            <h3 className="text-2xl font-bold text-[#0f172a] mb-2 dark:text-white">No clients defined</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">Create client profiles to begin grouping events and styling public registration pages.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <motion.div 
                key={client.id}
                layoutId={`client-card-${client.id}`}
                className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-2xl transition-all flex flex-col justify-between dark:bg-[#0f172a] dark:border-slate-800"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0f172a] border border-slate-100 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                      {client.logo_url ? (
                        <img src={client.logo_url} alt={client.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 size={24} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEdit(client)}
                        className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-yellow-400 hover:text-black transition-all dark:bg-slate-800 dark:hover:bg-yellow-400"
                        title="Edit Client"
                      >
                        <Edit size={14} />
                      </button>
                      {client.slug !== "eel" && (
                        <button 
                          onClick={() => handleDelete(client.id, client.name)}
                          className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all dark:bg-slate-800 dark:hover:bg-red-500"
                          title="Delete Client"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-[#0f172a] mb-2 leading-tight dark:text-white">{client.name}</h3>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-wider dark:bg-slate-800">
                    <Link2 size={10} /> slug: {client.slug}
                  </div>

                  <div className="mt-8 space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: client.primary_color }} />
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Primary: {client.primary_color}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: client.accent_color }} />
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Accent: {client.accent_color}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between dark:border-slate-800">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    Created: {new Date(client.created_at).toLocaleDateString()}
                  </div>
                  {client.reply_to && (
                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]" title={client.reply_to}>
                      ✉ {client.reply_to}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {modalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 lg:p-14 shadow-2xl relative dark:bg-[#0f172a] dark:border dark:border-slate-800"
              >
                <button 
                  onClick={() => setModalOpen(false)}
                  className="absolute right-8 top-8 p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-yellow-400 text-black rounded-2xl flex items-center justify-center rotate-3">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#0f172a] font-bricolage italic uppercase dark:text-white">
                      {editingClient ? "Configure Client" : "Add Client Space"}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Specify name, logo, custom color branding, and mail dispatches.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                  {/* Basic Client Configuration */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em] border-b border-slate-100 pb-3 dark:border-slate-800">1. Basic Info & Branding</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Name</label>
                        <input 
                          required
                          type="text" 
                          placeholder="e.g. Gold Medal Padel"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                          Client URL Slug <span className="text-[9px] text-slate-300 italic font-medium">(lowercase, no spaces)</span>
                        </label>
                        <input 
                          required
                          disabled={!!editingClient && editingClient.slug === "eel"}
                          type="text" 
                          placeholder="e.g. gold-medal-padel"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "") })}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400 disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Upload size={12} /> Client Logo
                        </label>
                        <div className="flex items-center gap-6">
                          <label className="cursor-pointer bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-6 hover:border-yellow-400 transition-all flex flex-col items-center justify-center w-24 h-24 shrink-0 dark:bg-slate-800 dark:border-slate-700">
                            {formData.logo_url ? (
                              <img src={formData.logo_url} alt="Logo preview" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <Upload size={20} className="text-slate-300" />
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                          </label>
                          <div>
                            <p className="text-xs text-[#0f172a] font-bold dark:text-white">Upload Client Logo</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1 leading-normal">
                              Supports PNG, JPG, or SVG. The logo will be rendered on public registration forms and emails.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Palette size={12} /> Primary Color
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={formData.primary_color}
                              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                              className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent shrink-0"
                            />
                            <input 
                              type="text" 
                              value={formData.primary_color}
                              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-xs text-[#0f172a] focus:ring-1 focus:ring-yellow-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Palette size={12} /> Accent Color
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={formData.accent_color}
                              onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                              className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent shrink-0"
                            />
                            <input 
                              type="text" 
                              value={formData.accent_color}
                              onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-xs text-[#0f172a] focus:ring-1 focus:ring-yellow-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mail & Custom Template Credentials */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em] border-b border-slate-100 pb-3 dark:border-slate-800">2. Mail Dispatch & Email Branding</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Mail size={12} /> Sender Display Name
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. Gold Medal Padel"
                          value={formData.sender_name}
                          onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                        <p className="text-[9px] text-slate-400 italic">Displayed as the name in the inbox (via your verified platform domain).</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Mail size={12} /> Reply-To Email Address
                        </label>
                        <input 
                          type="email" 
                          placeholder="e.g. info@goldmedalpadel.com"
                          value={formData.reply_to}
                          onChange={(e) => setFormData({ ...formData, reply_to: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                        <p className="text-[9px] text-slate-400 italic">Attendee replies to ticket emails will automatically go here.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Type size={12} /> Email Heading Text
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. Access Granted."
                          value={formData.heading_text}
                          onChange={(e) => setFormData({ ...formData, heading_text: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                        <p className="text-[9px] text-slate-400 italic">Use a period (.) to separate the two colors (e.g. Access.Granted).</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Body Message Template</label>
                      <textarea 
                        rows={3}
                        value={formData.body_text}
                        onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400 resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                      <p className="text-[9px] text-slate-400 italic">Use {"{event_title}"} or **{"{event_title}"}** to dynamically insert the event name.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Footer Text</label>
                      <textarea 
                        rows={2}
                        value={formData.footer_text}
                        onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400 resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-6 justify-end pt-4">
                    <button 
                      type="button" 
                      onClick={() => setModalOpen(false)}
                      className="px-8 py-5 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all dark:border-slate-800 dark:text-white dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={saving}
                      className="flex items-center gap-3 bg-[#0f172a] hover:bg-black text-white px-10 py-5 rounded-2xl font-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs dark:bg-yellow-400 dark:text-black dark:shadow-none"
                    >
                      {saving ? <Loader2 className="animate-spin" size={18} /> : null}
                      {saving ? "Deploying space..." : (editingClient ? "Save branding" : "Initialize space")}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
