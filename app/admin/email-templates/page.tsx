"use client";

import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { 
  Save, 
  Mail, 
  RefreshCw, 
  Send, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Lock,
  Code,
  Eye,
  Copy,
  Info,
  Check,
  ChevronRight,
  Sparkles,
  Layers,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

interface EmailTemplate {
  id?: number;
  key: string;
  name: string;
  subject: string;
  body_html: string;
  created_at?: string;
  updated_at?: string;
}

const TEMPLATE_ICONS: Record<string, any> = {
  registration_confirmed: Sparkles,
  registration_declined: AlertCircle,
  partner_pending: Layers,
  broadcast: Mail,
  tournament_matchup: Award,
};

const MOCK_PREVIEW_DATA: Record<string, Record<string, string>> = {
  registration_confirmed: {
    first_name: "John",
    event_title: "Padels Tournament 2026",
    to_email: "john.doe@example.com",
    pin: "ABCDEF",
    primary_color: "#0f172a",
    accent_color: "#eab308",
    heading_title: "Registration",
    heading_subtitle: "Confirmed",
    logo_html: '<td align="right" valign="middle"><div style="background-color:#0f172a;padding:8px 16px;border-radius:8px;color:#fff;font-weight:bold;font-size:14px;display:inline-block;">BMD</div></td>',
    body_html: "Your registration has been confirmed. Below are your secure credentials for terminal verification.",
    details_html: `<div style="background: #ffffff; padding: 24px; border: 1px solid #f1f5f9; border-radius: 20px; margin-bottom: 20px;">
      <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #94a3b8; margin: 0 0 4px 0; font-family: sans-serif;">Event</p>
      <p style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; font-family: sans-serif;">Padels Tournament 2026</p>
      <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #94a3b8; margin: 0 0 4px 0; font-family: sans-serif;">Date & Time</p>
      <p style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; font-family: sans-serif;">Thursday, June 25, 2026 @ 10:00 AM</p>
      <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #94a3b8; margin: 0 0 4px 0; font-family: sans-serif;">Venue</p>
      <p style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0; font-family: sans-serif;">Arena Center</p>
    </div>`,
    qr_block_html: `<div style="background: #f8fafc; padding: 32px; border-radius: 20px; text-align: center; border: 1px solid #f1f5f9; margin-bottom: 20px;">
      <div style="width: 140px; height: 140px; background-color: #0f172a; margin: 0 auto 16px auto; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: bold; font-family: sans-serif;">[QR CODE PREVIEW]</div>
      <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 8px; font-family: sans-serif;">Ticket Reference ID</p>
      <div style="display: inline-block; background: #ffffff; padding: 8px 16px; border-radius: 12px; border: 2px solid #0f172a;">
        <code style="font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: 0.15em; font-family: monospace;">ABCDEF</code>
      </div>
    </div>`,
    warning_block_html: `<div style="background: #fffbeb; padding: 16px; border-radius: 12px; border: 1px solid #fef3c7; margin-bottom: 20px; text-align: center;">
      <p style="color: #b45309; font-size: 12px; font-weight: 700; margin: 0; text-transform: uppercase; font-family: sans-serif;">Please present this QR code at the check-in desk.</p>
    </div>`,
    button_block_html: "",
    footer_text: "Automated Event Management System • Security Tier 4",
    profile_update_link: ""
  },
  registration_declined: {
    first_name: "John",
    event_title: "Padels Tournament 2026",
    to_email: "john.doe@example.com",
    primary_color: "#0f172a",
    accent_color: "#94a3b8",
    heading_title: "Response",
    heading_subtitle: "Recorded",
    logo_html: '<td align="right" valign="middle"><div style="background-color:#0f172a;padding:8px 16px;border-radius:8px;color:#fff;font-weight:bold;font-size:14px;display:inline-block;">BMD</div></td>',
    body_html: "We have recorded your response that you are unable to attend the Padels Tournament. Thank you for letting us know, and we hope to connect with you at future events.",
    footer_text: "Automated Event Management System • Security Tier 4"
  },
  partner_pending: {
    first_name: "John",
    event_title: "Padels Tournament 2026",
    to_email: "john.doe@example.com",
    primary_color: "#0f172a",
    accent_color: "#eab308",
    logo_html: '<td align="right" valign="middle"><div style="background-color:#0f172a;padding:8px 16px;border-radius:8px;color:#fff;font-weight:bold;font-size:14px;display:inline-block;">BMD</div></td>',
    footer_text: "Automated Event Management System • Security Tier 4",
    profile_update_link: "https://events.eelogistics.co.za/update/ABCDEF"
  },
  broadcast: {
    first_name: "John",
    last_name: "Doe",
    to_email: "john.doe@example.com",
    pin: "ABCDEF",
    event_title: "Padels Tournament 2026",
    location: "Arena Center",
    start_date: "Thursday, June 25, 2026 @ 10:00 AM",
    primary_color: "#0f172a",
    accent_color: "#eab308",
    logo_html: '<td align="right" valign="middle"><div style="background-color:#0f172a;padding:8px 16px;border-radius:8px;color:#fff;font-weight:bold;font-size:14px;display:inline-block;">BMD</div></td>',
    broadcast_body: "This is a customized broadcast update message for you, John Doe. Please make sure to arrive 30 minutes before the start time.",
    broadcast_signature: "The Championship Tournament Team",
    qr_code: `<div style="background: #f8fafc; padding: 24px; border-radius: 16px; text-align: center; border: 1px solid #e2e8f0; margin: 16px auto; max-width: 180px;">
      <div style="width: 100px; height: 100px; background-color: #0f172a; margin: 0 auto 12px auto; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 8px; font-weight: bold; font-family: sans-serif;">[QR CODE PREVIEW]</div>
      <p style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #64748b; margin: 0 0 4px 0; font-family: sans-serif;">Clearance ID</p>
      <div style="display: inline-block; background: #ffffff; padding: 4px 8px; border-radius: 8px; border: 1.5px solid #0f172a;">
        <code style="font-size: 14px; font-weight: 900; color: #0f172a; letter-spacing: 0.1em; font-family: monospace;">ABCDEF</code>
      </div>
    </div>`,
    details_html: `<div style="background: #ffffff; padding: 16px; border: 1px solid #f1f5f9; border-radius: 16px; margin-bottom: 16px; margin-top: 16px;">
      <p style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; margin: 0 0 2px 0; font-family: sans-serif;">Event</p>
      <p style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; font-family: sans-serif;">Padels Tournament 2026</p>
      <p style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; margin: 0 0 2px 0; font-family: sans-serif;">Date & Time</p>
      <p style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; font-family: sans-serif;">Thursday, June 25, 2026 @ 10:00 AM</p>
      <p style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; margin: 0 0 2px 0; font-family: sans-serif;">Venue</p>
      <p style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0; font-family: sans-serif;">Arena Center</p>
    </div>`,
    footer_text: "Automated Event Management System • Security Tier 4"
  },
  tournament_matchup: {
    name: "John Doe",
    role: "Challenger",
    opponent_name: "Jane Smith",
    pin: "123456",
    qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=test-qr-hash",
    button_html: `<div style="text-align: center; margin-top: 10px; margin-bottom: 20px;">
      <a href="#" style="background-color: #eab308; color: #000000; padding: 12px 24px; border-radius: 8px; font-size: 12px; font-weight: 900; text-decoration: none; text-transform: uppercase; display: inline-block; font-family: sans-serif;">
        Update Your Ticket Details
      </a>
    </div>`,
    event_title: "Sports Tournament Series",
    to_email: "john.doe@example.com"
  }
};

const CHEATSHEET_VARIABLES: Record<string, Array<{ name: string; description: string }>> = {
  registration_confirmed: [
    { name: "first_name", description: "First name of the attendee" },
    { name: "event_title", description: "Title of the registered event" },
    { name: "to_email", description: "Recipient's email address" },
    { name: "pin", description: "Clearance code/PIN" },
    { name: "primary_color", description: "Primary branding color hex" },
    { name: "accent_color", description: "Accent branding color hex" },
    { name: "heading_title", description: "Badge main text heading" },
    { name: "heading_subtitle", description: "Badge colored text heading" },
    { name: "logo_html", description: "Custom branding logo header cell" },
    { name: "body_html", description: "Automated client text block" },
    { name: "details_html", description: "Branded event details info block" },
    { name: "qr_block_html", description: "Ticket QR code and Reference ID block" },
    { name: "warning_block_html", description: "Verification desk alert block" },
    { name: "button_block_html", description: "Co-registrant details updating button" },
    { name: "footer_text", description: "Client customized footer copyright note" },
    { name: "profile_update_link", description: "Link url to complete co-registrant form" }
  ],
  registration_declined: [
    { name: "first_name", description: "First name of the attendee" },
    { name: "event_title", description: "Title of the declined event" },
    { name: "to_email", description: "Recipient's email address" },
    { name: "primary_color", description: "Primary branding color hex" },
    { name: "accent_color", description: "Accent branding color hex" },
    { name: "heading_title", description: "Badge main text heading" },
    { name: "heading_subtitle", description: "Badge colored text heading" },
    { name: "logo_html", description: "Custom branding logo header cell" },
    { name: "body_html", description: "Custom decline text block" },
    { name: "footer_text", description: "Customized footer copyright note" }
  ],
  partner_pending: [
    { name: "first_name", description: "First name of the co-registrant" },
    { name: "event_title", description: "Title of the registered event" },
    { name: "to_email", description: "Recipient's email address" },
    { name: "primary_color", description: "Primary branding color hex" },
    { name: "accent_color", description: "Accent branding color hex" },
    { name: "logo_html", description: "Custom branding logo header cell" },
    { name: "footer_text", description: "Customized footer copyright note" },
    { name: "profile_update_link", description: "Secure link url to update co-registrant details" }
  ],
  broadcast: [
    { name: "first_name", description: "First name of the attendee" },
    { name: "last_name", description: "Last name of the attendee" },
    { name: "to_email", description: "Attendee's email address" },
    { name: "pin", description: "Clearance code/PIN" },
    { name: "event_title", description: "Title of the event" },
    { name: "location", description: "Event venue location name" },
    { name: "start_date", description: "Event start date and time formatted" },
    { name: "primary_color", description: "Primary branding color hex" },
    { name: "accent_color", description: "Accent branding color hex" },
    { name: "logo_html", description: "Custom branding logo header cell" },
    { name: "broadcast_body", description: "Broadcast dynamic content body text" },
    { name: "broadcast_signature", description: "Broadcast custom sender signature" },
    { name: "qr_code", description: "Embedded QR Code block image card" },
    { name: "details_html", description: "Branded event details info block" },
    { name: "footer_text", description: "Customized footer description text" }
  ],
  tournament_matchup: [
    { name: "name", description: "Player first and last name" },
    { name: "role", description: "Player tournament registration role" },
    { name: "opponent_name", description: "Name of the player's tournament opponent" },
    { name: "pin", description: "Clearance passcode/PIN" },
    { name: "qr_code_url", description: "Pass check-in QR code image API link" },
    { name: "button_html", description: "Button link updating details" },
    { name: "event_title", description: "Tournament championship game series title" },
    { name: "to_email", description: "Player's email address" }
  ]
};

export default function EmailTemplatesPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("registration_confirmed");
  const [subject, setSubject] = useState<string>("");
  const [bodyHtml, setBodyHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testEmail, setTestEmail] = useState<string>("");
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  // Guard access to admins only
  if (userRole === "staff") {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
            <Lock className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-[#0f172a] mb-4 uppercase italic font-bricolage tracking-tight dark:text-white">
            Access <span className="text-red-500">Restricted</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-md">
            You do not have the admin clearance level required to customize email templates.
          </p>
        </div>
      </AdminLayout>
    );
  }

  // Load all templates from API
  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch("/api/py/settings/templates", {
          headers: {
            "x-user-email": session?.user?.email || ""
          }
        });
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
          // Initialize form with default selected template
          const current = data.find((t: EmailTemplate) => t.key === selectedKey);
          if (current) {
            setSubject(current.subject);
            setBodyHtml(current.body_html);
          }
        }
      } catch (err) {
        console.error("Failed to load templates", err);
      } finally {
        setLoading(false);
      }
    }
    if (session?.user?.email) {
      loadTemplates();
    }
  }, [session, selectedKey]);

  // Track template selection change
  const handleSelectTemplate = (key: string) => {
    if (hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Are you sure you want to switch templates?")) {
        return;
      }
    }
    setSelectedKey(key);
    const target = templates.find(t => t.key === key);
    if (target) {
      setSubject(target.subject);
      setBodyHtml(target.body_html);
      setHasUnsavedChanges(false);
    }
  };

  // Compile preview HTML locally
  const getPreviewHtml = () => {
    let html = bodyHtml;
    const mockVars = MOCK_PREVIEW_DATA[selectedKey] || {};
    
    // Perform simple string replacements
    Object.entries(mockVars).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      html = html.replaceAll(placeholder, value);
    });
    
    return html;
  };

  // Write compiled content directly into iframe
  useEffect(() => {
    if (previewFrameRef.current) {
      const iframe = previewFrameRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(getPreviewHtml());
        doc.close();
      }
    }
  }, [bodyHtml, selectedKey]);

  // Handle Save
  const handleSave = async () => {
    setSaving(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/py/settings/templates/${selectedKey}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({
          subject: subject,
          body_html: bodyHtml
        })
      });
      if (res.ok) {
        const updated = await res.json();
        // Update template list state
        setTemplates(prev => prev.map(t => t.key === selectedKey ? updated : t));
        setHasUnsavedChanges(false);
        setNotification({ type: "success", text: "Template changes deployed successfully!" });
      } else {
        throw new Error("Failed to save changes");
      }
    } catch (err) {
      setNotification({ type: "error", text: "Failed to save template. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // Handle Reset to Default
  const handleReset = async () => {
    if (!confirm("Are you sure you want to restore this template to the system default? All customizations will be lost.")) {
      return;
    }
    setResetting(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/py/settings/templates/${selectedKey}/reset`, {
        method: "POST",
        headers: {
          "x-user-email": session?.user?.email || ""
        }
      });
      if (res.ok) {
        const resetTemplate = await res.json();
        setSubject(resetTemplate.subject);
        setBodyHtml(resetTemplate.body_html);
        setTemplates(prev => prev.map(t => t.key === selectedKey ? resetTemplate : t));
        setHasUnsavedChanges(false);
        setNotification({ type: "success", text: "Template restored to default layout successfully!" });
      } else {
        throw new Error("Failed to reset template");
      }
    } catch (err) {
      setNotification({ type: "error", text: "Failed to restore template defaults." });
    } finally {
      setResetting(false);
    }
  };

  // Handle Send Test Email
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    setSendingTest(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/py/settings/templates/${selectedKey}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({ email: testEmail })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: "success", text: `Test email dispatched to ${testEmail}!` });
        setIsTestModalOpen(false);
      } else {
        throw new Error(data.details || "SMTP transfer failed");
      }
    } catch (err: any) {
      setNotification({ type: "error", text: `Test delivery failed: ${err.message || err}` });
    } finally {
      setSendingTest(false);
    }
  };

  // Copy helper
  const handleCopyVariable = (name: string) => {
    const format = `{${name}}`;
    navigator.clipboard.writeText(format);
    setCopiedVar(name);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const selectedTemplate = templates.find(t => t.key === selectedKey);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="animate-spin text-[#0f172a]" size={48} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto px-4">
        {/* Header Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-[#0f172a] tracking-tighter font-bricolage italic mb-2 uppercase dark:text-white">
              EMAIL <span className="text-slate-300 dark:text-slate-600">TEMPLATES</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg dark:text-slate-400">
              Customize automated notification text, colors, and layout structures.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleReset}
              disabled={resetting || saving}
              className="flex items-center gap-2 px-6 py-4 rounded-xl border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-100 hover:bg-red-50/30 transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-red-950/20"
            >
              {resetting ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
              Restore Default
            </button>

            <button
              onClick={() => {
                setTestEmail(session?.user?.email || "");
                setIsTestModalOpen(true);
              }}
              disabled={saving || resetting}
              className="flex items-center gap-2 px-6 py-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-black transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Send size={14} />
              Send Test
            </button>

            <button
              onClick={handleSave}
              disabled={saving || resetting || !hasUnsavedChanges}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${
                hasUnsavedChanges 
                  ? "bg-[#0f172a] text-white hover:bg-black shadow-slate-200 dark:bg-yellow-400 dark:text-black dark:shadow-yellow-500/10"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600"
              }`}
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Deploy Changes
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold mb-8 ${
                notification.type === "success" 
                  ? "bg-green-50 text-green-600 border border-green-100 dark:bg-green-950/20 dark:border-green-900/30" 
                  : "bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30"
              }`}
            >
              {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {notification.text}
              <button 
                onClick={() => setNotification(null)}
                className="ml-auto hover:opacity-75 text-xs underline font-medium"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 1. Left Sidebar: Template Selection */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
              Select Template
            </h3>
            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 space-y-2">
              {templates.map((t) => {
                const Icon = TEMPLATE_ICONS[t.key] || Mail;
                const isSelected = t.key === selectedKey;
                return (
                  <button
                    key={t.key}
                    onClick={() => handleSelectTemplate(t.key)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                      isSelected 
                        ? "bg-[#0f172a]/5 text-[#0f172a] font-black dark:bg-yellow-400/10 dark:text-yellow-400"
                        : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className={`p-3 rounded-xl ${
                      isSelected 
                        ? "bg-[#0f172a] text-white dark:bg-yellow-400 dark:text-black"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{t.key}</p>
                    </div>
                    <ChevronRight size={14} className={`opacity-40 transition-transform ${isSelected ? "translate-x-1" : ""}`} />
                  </button>
                );
              })}
            </div>

            {/* Template Variables Cheat Sheet */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-[0.1em] text-[#0f172a] mb-4 flex items-center gap-2 dark:text-white">
                <Info size={14} className="text-blue-500" />
                Placeholders
              </h3>
              <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed">
                Click any variable key to copy it into your clipboard, then paste it in the subject or body editor.
              </p>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {CHEATSHEET_VARIABLES[selectedKey]?.map((variable) => {
                  const isCopied = copiedVar === variable.name;
                  return (
                    <button
                      key={variable.name}
                      onClick={() => handleCopyVariable(variable.name)}
                      className="w-full flex items-start justify-between p-2.5 rounded-xl border border-dashed border-slate-100 hover:border-slate-200 text-left hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30 transition-all group"
                    >
                      <div className="pr-2 min-w-0">
                        <code className="text-[11px] font-black text-blue-600 dark:text-blue-400 block truncate font-mono">
                          {`{${variable.name}}`}
                        </code>
                        <span className="text-[10px] text-slate-400 font-medium block leading-normal mt-0.5">
                          {variable.description}
                        </span>
                      </div>
                      <div className="p-1 rounded bg-slate-50 group-hover:bg-slate-100 text-slate-400 group-hover:text-[#0f172a] transition-all flex-shrink-0 dark:bg-slate-800 dark:group-hover:bg-slate-700 dark:text-slate-500">
                        {isCopied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Middle Workspace: Monospaced Text Editor */}
          <div className="lg:col-span-5 space-y-6">
            {/* Subject Line Card */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Enter email subject line..."
                className="w-full px-6 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            {/* HTML Editor Body Card */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 flex flex-col min-h-[600px]">
              <div className="flex items-center justify-between mb-4 ml-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                  <Code size={12} /> HTML Body Code
                </span>
                {hasUnsavedChanges && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded-full dark:bg-yellow-950/40 dark:text-yellow-400">
                    Unsaved
                  </span>
                )}
              </div>
              <textarea
                value={bodyHtml}
                onChange={(e) => {
                  setBodyHtml(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full flex-1 p-6 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none font-mono text-xs leading-relaxed resize-none overflow-y-auto"
                style={{ tabSize: 2 }}
                spellCheck={false}
              />
            </div>
          </div>

          {/* 3. Right Sidebar: Live Preview Iframe */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
              <Eye size={12} /> Real-time Preview
            </h3>
            
            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 flex flex-col h-[750px]">
              {/* Preview Subject Header */}
              <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700 mb-4 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <div className="flex-1 min-w-0 text-xs font-bold text-slate-500 dark:text-slate-400 truncate pl-2">
                  Subject: {subject || <span className="italic opacity-55">(No Subject)</span>}
                </div>
              </div>

              {/* Sandboxed iframe container */}
              <div className="flex-1 rounded-2xl overflow-hidden border border-slate-150 dark:border-slate-750 bg-white relative">
                <iframe
                  ref={previewFrameRef}
                  sandbox="allow-same-origin"
                  title="Email Template Preview"
                  className="w-full h-full border-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Test Email Sending Modal */}
        <AnimatePresence>
          {isTestModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsTestModalOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative z-10"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-900/20">
                    <Send size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#0f172a] dark:text-white font-bricolage italic uppercase">
                      Send Test Email
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Send a mock preview delivery to verify inbox styling.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSendTest} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                      Recipient Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="e.g. admin@example.com"
                      className="w-full px-6 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsTestModalOpen(false)}
                      className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase tracking-widest transition-all dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendingTest || !testEmail}
                      className="flex items-center gap-2 bg-[#0f172a] hover:bg-black text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-100 disabled:opacity-50 dark:bg-yellow-400 dark:text-black dark:shadow-yellow-500/10"
                    >
                      {sendingTest ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                      {sendingTest ? "Sending..." : "Send Test"}
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
