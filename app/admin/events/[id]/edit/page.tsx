"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Trash2, Building2, Lock, Mail,
  Type, Eye, ExternalLink, CheckCircle2, AlertCircle, Sparkles,
  Calendar, Award, Layers, ChevronDown
} from "lucide-react";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";
import RichTextEditor from "@/components/RichTextEditor";
import { unescapeHtmlLinks } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers shared with settings page
// ---------------------------------------------------------------------------
const THEME_DEFAULTS = {
  cyber_dark: { primary: "#000000", accent: "#eab308" },
  minimal_light: { primary: "#0f172a", accent: "#0284c7" },
  glassmorphism: { primary: "#1e1b4b", accent: "#6366f1" },
  brutalist_retro: { primary: "#000000", accent: "#facc15" },
  midnight_luxury: { primary: "#0a1128", accent: "#d4af37" },
  neon_horizon: { primary: "#000000", accent: "#ff007f" },
  forest_zen: { primary: "#1c2e24", accent: "#2d4a39" },
  aurora_glow: { primary: "#070b19", accent: "#14b8a6" },
  crimson_sunset: { primary: "#3a0d1e", accent: "#f08a5d" },
  cyberpunk_terminal: { primary: "#000000", accent: "#39ff14" },
  corporate_mono: { primary: "#334155", accent: "#0f172a" },
  nordic_alabaster: { primary: "#1c1917", accent: "#78716c" },
  midnight_executive: { primary: "#0d0e12", accent: "#2563eb" },
  champagne_lounge: { primary: "#4a3f35", accent: "#c5a059" },
  logistics_glass: { primary: "#1e293b", accent: "#94a3b8" },
};

const TEMPLATE_ICONS: Record<string, any> = {
  registration_confirmed: Sparkles,
  registration_declined: AlertCircle,
  partner_pending: Layers,
  broadcast: Mail,
  tournament_matchup: Award,
  banner_email: Calendar,
};

const TEMPLATE_LABELS: Record<string, string> = {
  registration_confirmed: "Attendee Confirmation",
  registration_declined: "Decline Recorded",
  partner_pending: "Partner Pending",
  broadcast: "Broadcast",
  tournament_matchup: "Tournament Matchup",
  banner_email: "Banner Email (Premium)",
};

interface EmailTemplate {
  id?: number;
  key: string;
  name: string;
  subject: string;
  body_html: string;
}

const parseTemplateMeta = (html: string): Record<string, string> | null => {
  if (!html || typeof html !== "string") return null;
  const match = html.match(/<!-- TEMPLATE_META: ({.*?}) -->/);
  if (match) {
    try { return JSON.parse(match[1]); } catch { /* no meta */ }
  }
  return null;
};

const resolveBaseTemplateKey = (key: string, bodyHtml = ""): string => {
  const SYSTEM_KEYS = ["registration_confirmed", "registration_declined", "partner_pending", "broadcast", "tournament_matchup", "banner_email"];
  if (SYSTEM_KEYS.includes(key)) {
    return key;
  }
  const lowerStr = (key + " " + bodyHtml).toLowerCase();
  if (lowerStr.includes("confirmed") || lowerStr.includes("confirm") || lowerStr.includes("attendee") || lowerStr.includes("pass")) {
    return "registration_confirmed";
  }
  if (lowerStr.includes("declined") || lowerStr.includes("decline")) {
    return "registration_declined";
  }
  if (lowerStr.includes("partner") || lowerStr.includes("pending") || lowerStr.includes("urgent")) {
    return "partner_pending";
  }
  if (lowerStr.includes("broadcast")) {
    return "broadcast";
  }
  if (lowerStr.includes("matchup") || lowerStr.includes("tournament") || lowerStr.includes("match")) {
    return "tournament_matchup";
  }
  if (lowerStr.includes("banner") || lowerStr.includes("invite") || lowerStr.includes("golf") || lowerStr.includes("sports")) {
    return "banner_email";
  }
  return "registration_confirmed";
};

const compileTemplatePreview = (
  key: string,
  bodyHtml: string,
  eventBannerUrl: string,
  eventLogoUrl: string,
  primaryColor: string,
  accentColor: string,
  eventData?: any,
  fontFamily = "Calibri, sans-serif",
  fontSize = "16px"
): string => {
  const baseKey = resolveBaseTemplateKey(key, bodyHtml);
  const meta = parseTemplateMeta(bodyHtml) || {};
  const primary = primaryColor || meta.primary_color || "#0f172a";
  const accent = accentColor || meta.accent_color || "#94a3b8";
  const attendeePassBgColor = eventData?.registration_form_template?.theme_config?.attendeePassBgColor || "#000000";
  const engagementDetailsColor = eventData?.registration_form_template?.theme_config?.engagementDetailsColor || primary;
  const usesCustomTemplate = !!(eventData?.confirmation_template_id);
  const showBanner = !!(usesCustomTemplate && meta.banner_image_url && meta.show_banner === "true");
  const bannerUrl = showBanner ? meta.banner_image_url : "";

  const bannerHtml = showBanner
    ? `<tr><td align="center" style="padding:0;margin:0;line-height:0;"><img src="${bannerUrl}" width="600" style="width:100%;max-width:600px;height:auto;display:block;border-top-left-radius:38px;border-top-right-radius:38px;" alt="Event Banner"/></td></tr>`
    : "";

  const showLogo = meta.show_logo !== "false";
  const logoUrl = eventLogoUrl || meta.logo_image_url || "";
  const logoText = meta.logo_text || "BMD";

  const logoHtml = showLogo
    ? (logoUrl
      ? `<td align="right" valign="middle"><img src="${logoUrl}" style="max-height:48px;max-width:120px;object-fit:contain;" alt="Logo"/></td>`
      : `<td align="right" valign="middle"><div style="background:${primary};padding:8px 16px;border-radius:8px;color:#fff;font-weight:bold;font-size:14px;display:inline-block;font-family:${fontFamily};">${logoText}</div></td>`)
    : "";

  // Formatting date/time from eventData
  let dateStr = "Thursday, June 25, 2026";
  let timeStr = "10:00 AM";
  if (eventData?.start_date) {
    try {
      const dt = new Date(eventData.start_date);
      if (!isNaN(dt.getTime())) {
        dateStr = dt.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        timeStr = dt.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit' });
      }
    } catch (e) {
      console.error("Failed to parse start_date", e);
    }
  }

  const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
  };
  const title = toTitleCase((eventData?.title || "Padels Tournament 2026").replace(/<[^>]*>/g, ""));
  const venue = eventData?.location || "Arena Center";
  const address = eventData?.address || "123 Main St";

  // Construct blocks
  const addressHtml = address ? `
  <div style="margin-top: 20px; font-family: ${fontFamily};">
      <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: ${engagementDetailsColor}; opacity: 0.8; margin: 0 0 4px 0; font-family: ${fontFamily};">Address</p>
      <p style="font-size: 16px; font-weight: 700; color: ${engagementDetailsColor}; margin: 0 0 10px 0; font-family: ${fontFamily};">${address}</p>
      <a href="#" style="display: inline-block; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; background-color: ${engagementDetailsColor}; text-decoration: none; padding: 10px 20px; border-radius: 12px; margin-top: 4px; font-family: ${fontFamily};">
          🗺️ Open in Google Maps
      </a>
  </div>
  ` : "";

  const detailsHtml = `
  <div style="background: #ffffff; padding: 32px; border: 1px solid #f1f5f9; border-radius: 32px; margin-bottom: 40px; font-family: ${fontFamily};">
      <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: ${engagementDetailsColor}; margin-bottom: 24px; font-family: ${fontFamily};">${meta.engagement_title || "Engagement Details"}</p>
      
      <div style="margin-bottom: 20px; font-family: ${fontFamily};">
          <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: ${engagementDetailsColor}; opacity: 0.8; margin: 0 0 4px 0; font-family: ${fontFamily};">Event</p>
          <p style="font-size: 18px; font-weight: 800; color: ${engagementDetailsColor}; margin: 0; font-family: ${fontFamily};">${title}</p>
      </div>

      <div style="margin-bottom: 20px; font-family: ${fontFamily};">
          <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: ${engagementDetailsColor}; opacity: 0.8; margin: 0 0 4px 0; font-family: ${fontFamily};">Date & Time</p>
          <p style="font-size: 16px; font-weight: 700; color: ${engagementDetailsColor}; margin: 0; font-family: ${fontFamily};">${dateStr} @ ${timeStr}</p>
      </div>

      <div style="margin-bottom: 20px; font-family: ${fontFamily};">
          <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: ${engagementDetailsColor}; opacity: 0.8; margin: 0 0 4px 0; font-family: ${fontFamily};">Venue</p>
          <p style="font-size: 16px; font-weight: 700; color: ${engagementDetailsColor}; margin: 0; font-family: ${fontFamily};">${venue}</p>
      </div>
      ${addressHtml}
  </div>
  `;

  const showQrCode = meta.show_qr_code !== "false";
  const showPin = meta.show_pin !== "false";

  const qrImgSnippet = showQrCode
    ? `<div style="width:140px;height:140px;background:${primary};margin:0 auto 24px auto;border-radius:16px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:bold;box-shadow:0 25px 50px -12px rgba(0,0,0,0.15);">QR CODE</div>`
    : "";

  const pinSnippet = showPin
    ? `<p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: #64748b; margin-bottom: 16px; font-family: ${fontFamily};">unique access pass number</p>
      <div style="display: inline-block; background: #ffffff; padding: 16px 32px; border-radius: 20px; border: 2px solid ${primary}; font-family: ${fontFamily};">
          <code style="font-size: 32px; font-weight: 900; color: ${primary}; letter-spacing: 0.25em; font-family: monospace;">1234</code>
      </div>`
    : "";

  const qrBlockHtml = (showQrCode || showPin)
    ? `<div style="background: #f8fafc; padding: 48px; border-radius: 32px; text-align: center; border: 1px solid #f1f5f9; margin-bottom: 40px; position: relative; overflow: hidden; font-family: ${fontFamily};">
          ${qrImgSnippet}
          ${pinSnippet}
       </div>`
    : "";

  const warningText = meta.warning_text || "Please present this QR code OR number at the registration desk.";
  const warningBlockHtml = `
  <div style="background: #fffbeb; padding: 28px; border-radius: 24px; border: 1px solid #fef3c7; margin-bottom: 40px; text-align: center; font-family: ${fontFamily};">
      <p style="color: #b45309; font-size: 14px; font-weight: 700; margin: 0; line-height: 1.5; text-transform: uppercase; letter-spacing: 0.05em; font-family: ${fontFamily};">
          ${warningText}
      </p>
  </div>
  `;

  const buttonText = meta.button_text || "Update Details";
  const buttonBlockHtml = `
  <div style="text-align: center; margin-top: 10px; margin-bottom: 40px;">
      <a href="#" style="background-color: ${accent}; color: #000000; padding: 16px 32px; border-radius: 16px; font-size: 13px; font-weight: 950; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 4px 12px rgba(234,179,8,0.2); font-family: ${fontFamily};">
          ${buttonText}
      </a>
  </div>
  `;

  let html = bodyHtml;

  // Use baseKey layouts if bodyHtml is empty or missing typical structure
  if (!html || !html.includes("<table")) {
    if (baseKey === "registration_confirmed") {
      const bodyText = meta.body_text || "Your registration has been confirmed. Below are your secure credentials for terminal verification.";
      const headingTitle = meta.heading_title || "Registration";
      const headingSubtitle = meta.heading_subtitle || "Confirmed";
      const footerText = meta.footer_text || "Automated Event Management System";

      html = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%;table-layout:fixed;margin:0;padding:0;background:#f8fafc;">
    <tr><td align="center" style="padding:40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border:1px solid #f1f5f9;border-radius:40px;background-color:#ffffff;box-shadow:0 20px 50px rgba(0,0,0,0.05);overflow:hidden;border-collapse:separate;">
        ${bannerHtml}
        <tr><td style="padding:40px;font-family:${fontFamily};font-size:${fontSize};">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:48px;">
            <tr>
              <td align="left" valign="middle">
                <div style="background:${attendeePassBgColor};padding:12px 28px;border-radius:16px;display:inline-block;">
                  <span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.4em;color:#fff;">Attendee Pass</span>
                </div>
              </td>
              {logo_html}
            </tr>
          </table>
          <h2 style="font-size:38px;font-weight:900;color:${primary};margin-bottom:28px;text-transform:uppercase;font-style:italic;letter-spacing:-0.04em;line-height:1;margin-top:0;">
            ${headingTitle} <span style="color:${accent};">${headingSubtitle}</span>
          </h2>
          <p style="font-size:${fontSize};line-height:1.7;margin-bottom:40px;color:#475569;">
            Hello <strong>John</strong>,<br/><br/>
            ${bodyText}
          </p>
          {details_html}
          {qr_block_html}
          {warning_block_html}
          {button_block_html}
          <hr style="border:0;border-top:1px solid #f1f5f9;margin:40px 0;"/>
          <p style="font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;margin:0;">${footerText}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>`;
    } else if (baseKey === "banner_email") {
      const headingTitle = meta.heading_title || "MAZIV";
      const headingSubtitle = meta.heading_subtitle || "GROUP";
      const bodyText = meta.body_text || "Thank you for confirming your attendance. Below are more details for the day.";
      const footerText = meta.footer_text || "events@company.com";
      const itineraryTitle = meta.itinerary_title || "Programme";
      const itineraryBody = meta.itinerary_body || "Registration: 08:30\nOpening: 09:00\nClose: 17:00";
      const bannerDisplayUrl = bannerUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800";

      html = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%;table-layout:fixed;margin:0;padding:0;background:#f8fafc;">
    <tr><td align="center" style="padding:40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border-radius:40px;overflow:hidden;border-collapse:separate;background:#ffffff;box-shadow:0 20px 50px rgba(0,0,0,0.05);">
        <tr><td align="center" style="padding:0;line-height:0;">
          <img src="${bannerDisplayUrl}" width="600" style="width:100%;max-width:600px;height:auto;display:block;" alt="Event Banner"/>
        </td></tr>
        <tr><td style="background:${primary};padding:32px 40px;">
          <h1 style="font-size:36px;font-weight:900;color:#ffffff;margin:0;text-transform:uppercase;letter-spacing:-0.02em;font-style:italic;">
            ${headingTitle} <span style="color:${accent};">${headingSubtitle}</span>
          </h1>
        </td></tr>
        <tr><td style="padding:40px;font-family:${fontFamily};font-size:${fontSize};">
          <p style="color:#475569;line-height:1.7;margin-bottom:32px;">Dear <strong>John</strong>,<br/><br/>${bodyText}</p>
          <div style="background:#f8fafc;border-radius:24px;padding:28px;border:1px solid #f1f5f9;margin-bottom:24px;">
            <p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;color:${accent};margin:0 0 12px 0;">${itineraryTitle}</p>
            <p style="color:#334155;line-height:1.8;margin:0;">{itinerary_html}</p>
          </div>
          <hr style="border:0;border-top:1px solid #f1f5f9;margin:32px 0;"/>
          <p style="font-size:11px;color:#94a3b8;text-align:center;">${footerText}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>`;
    } else {
      const footerText = meta.footer_text || "Automated Event Management System";
      const headingTitle = meta.heading_title || "Notification";
      const headingSubtitle = meta.heading_subtitle || "Sent";
      const bodyText = meta.body_text || "This is a preview of your email template.";

      html = `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%;table-layout:fixed;margin:0;padding:0;background:#f8fafc;">
    <tr><td align="center" style="padding:40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border:1px solid #f1f5f9;border-radius:40px;background:#fff;overflow:hidden;border-collapse:separate;">
        ${bannerHtml}
        <tr><td style="padding:40px;font-family:${fontFamily};font-size:${fontSize};">
          <table width="100%" border="0" style="margin-bottom:40px;"><tr>
            <td><div style="background:${primary};padding:12px 24px;border-radius:14px;display:inline-block;"><span style="color:#fff;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;">EventHub</span></div></td>
            {logo_html}
          </tr></table>
          <h2 style="font-size:34px;font-weight:900;color:${primary};margin:0 0 24px 0;text-transform:uppercase;font-style:italic;letter-spacing:-0.03em;">
            ${headingTitle} <span style="color:${accent};">${headingSubtitle}</span>
          </h2>
          <p style="color:#475569;line-height:1.7;margin-bottom:40px;">Hello <strong>John</strong>,<br/><br/>${bodyText}</p>
          <hr style="border:0;border-top:1px solid #f1f5f9;margin:40px 0;"/>
          <p style="font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">${footerText}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>`;
    }
  }

  // Generate itinerary html for Banner Email from formValues or meta
  const itineraryBody = meta.itinerary_body || "Registration: 08:30\nOpening: 09:00\nClose: 17:00";
  const itineraryHtml = itineraryBody
    .split("\n")
    .map((line: string) => {
      const parts = line.split(":");
      if (parts.length > 1) {
        return `<div style="margin-bottom: 6px; font-family: ${fontFamily};"><strong>${parts[0].trim()}:</strong> ${parts.slice(1).join(":").trim()}</div>`;
      }
      return `<div style="margin-bottom: 6px; font-family: ${fontFamily};">${line.trim()}</div>`;
    })
    .join("");

  // Global placeholder replacements inside the template HTML
  const finalHtml = html
    .replaceAll("{banner_html}", bannerHtml)
    .replaceAll("{logo_html}", logoHtml)
    .replaceAll("{details_html}", detailsHtml)
    .replaceAll("{qr_block_html}", qrBlockHtml)
    .replaceAll("{warning_block_html}", warningBlockHtml)
    .replaceAll("{button_block_html}", buttonBlockHtml)
    .replaceAll("{itinerary_html}", itineraryHtml)
    .replaceAll("{event_title}", title)
    .replaceAll("{title}", title)
    .replaceAll("{event_location}", venue)
    .replaceAll("{location}", venue)
    .replaceAll("{venue}", venue)
    .replaceAll("{event_address}", address)
    .replaceAll("{address}", address)
    .replaceAll("{event_date}", `${dateStr} @ ${timeStr}`)
    .replaceAll("{date}", `${dateStr} @ ${timeStr}`)
    .replaceAll("{start_date}", eventData?.start_date || "2026-06-25")
    .replaceAll("{start_time}", timeStr)
    .replaceAll("{first_name}", "John")
    .replaceAll("{last_name}", "Doe")
    .replaceAll("{to_email}", "john@example.com")
    .replaceAll("{pin}", "1234")
    .replaceAll("{clearance_id}", "1234");

  return unescapeHtmlLinks(finalHtml);
};

const uploadImageFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/py/media/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`);
  }
  const data = await res.json();
  return data.url;
};

const compressImage = (file: File, maxWidth = 1200, maxHeight = 630, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        } else {
          if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(event.target?.result as string); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function EditEventPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [senderEmails, setSenderEmails] = useState<string[]>([]);
  const [originalBanner, setOriginalBanner] = useState("");
  const [originalLogo, setOriginalLogo] = useState("");
  const [originalBg, setOriginalBg] = useState("");
  const [eventUserRole, setEventUserRole] = useState<string>("staff");
  const effectiveRole = userRole === "admin" ? "admin" : eventUserRole;
  const [activeTab, setActiveTab] = useState<"details" | "email">("details");

  // Email tab states
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [declinePreviewHtml, setDeclinePreviewHtml] = useState("");
  const [saveEmailNotification, setSaveEmailNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const declinePreviewFrameRef = useRef<HTMLIFrameElement>(null);
  const [regTemplates, setRegTemplates] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    start_date: "",
    location: "",
    address: "",
    capacity: 100,
    duration_days: 1,
    banner_url: "",
    logo_url: "",
    sender_email: "",
    sender_name: "",
    reply_to: "",
    client_id: "",
    collect_company: true,
    company_required: false,
    background_url: "",
    allowed_domains: "",
    banner_size: "cover",
    banner_position: "center",
    banner_theme: "cyber_dark",
    banner_primary_color: "",
    banner_accent_color: "",
    banner_text_color: "",
    banner_layout: "",
    registration_active: true,
    registration_start: "",
    registration_end: "",
    disclaimer_enabled: false,
    disclaimer_text: "",
    disclaimer_checkbox_label: "",
    confirmation_template_key: "global",
    confirmation_template_id: null as number | null,
    decline_template_key: "global",
    decline_template_id: null as number | null,
    registration_form_template_id: null as number | null,
    send_emails: true,
  });

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/py/clients", { headers: { "x-user-email": session.user.email } })
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch((err) => console.error("Failed to fetch clients", err));

    fetch("/api/py/settings/registration-templates", { headers: { "x-user-email": session.user.email } })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setRegTemplates(data); })
      .catch((err) => console.error("Failed to load registration templates", err));
  }, [session]);

  useEffect(() => {
    if ((effectiveRole !== "admin" && effectiveRole !== "manager") || !session?.user?.email) return;
    fetch("/api/py/settings/sender-domains", { headers: { "x-user-email": session.user.email } })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setSenderEmails(data); })
      .catch((err) => console.error("Failed to fetch sender domains", err));
  }, [effectiveRole, session]);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch(`/api/py/events/id/${id}`, { headers: { "x-user-email": session.user.email } })
      .then((res) => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then((data) => {
        const formattedDate = data.start_date ? data.start_date.slice(0, 16) : "";
        setFormData({
          title: data.title,
          slug: data.slug,
          description: data.description,
          start_date: formattedDate,
          location: data.location,
          address: data.address || "",
          capacity: data.capacity,
          duration_days: data.duration_days || 1,
          banner_url: data.banner_url || "",
          logo_url: data.logo_url || "",
          sender_email: data.sender_email || "",
          sender_name: data.sender_name || "",
          reply_to: data.reply_to || "",
          client_id: data.client_id ? data.client_id.toString() : "",
          collect_company: data.collect_company !== false,
          company_required: !!data.company_required,
          background_url: data.background_url || "",
          allowed_domains: data.allowed_domains ? data.allowed_domains.join(", ") : "",
          banner_size: data.banner_settings?.size || "cover",
          banner_position: data.banner_settings?.position || "center",
          banner_theme: data.banner_settings?.theme || "cyber_dark",
          banner_primary_color: data.banner_settings?.primary_color || "",
          banner_accent_color: data.banner_settings?.accent_color || "",
          banner_text_color: data.banner_settings?.text_color || "",
          banner_layout: data.banner_settings?.layout || "",
          registration_active: data.registration_active !== false,
          registration_start: data.registration_start ? data.registration_start.slice(0, 16) : "",
          registration_end: data.registration_end ? data.registration_end.slice(0, 16) : "",
          disclaimer_enabled: !!data.disclaimer_enabled,
          disclaimer_text: data.disclaimer_text || "",
          disclaimer_checkbox_label: data.banner_settings?.disclaimer_checkbox_label || "",
          confirmation_template_key: data.confirmation_template_key || "global",
          confirmation_template_id: data.confirmation_template_id || null,
          decline_template_key: data.decline_template_key || "global",
          decline_template_id: data.decline_template_id || null,
          registration_form_template_id: data.registration_form_template_id || null,
          send_emails: data.send_emails !== false,
        });
        setOriginalBanner(data.banner_url || "");
        setOriginalLogo(data.logo_url || "");
        setOriginalBg(data.background_url || "");
        setEventUserRole(data.user_role_for_client || "staff");
        setLoading(false);
      })
      .catch((err) => { console.error("Failed to fetch event", err); setLoading(false); });
  }, [id, session]);

  // Load templates when Email tab is opened
  useEffect(() => {
    if (activeTab !== "email" || templates.length > 0 || !session?.user?.email) return;
    setLoadingTemplates(true);
    fetch("/api/py/settings/templates", { headers: { "x-user-email": session.user.email } })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setTemplates(data); })
      .catch((err) => console.error("Failed to load templates", err))
      .finally(() => setLoadingTemplates(false));
  }, [activeTab, session, templates.length]);

  // Rebuild preview whenever the selected template ID/key or event branding changes
  useEffect(() => {
    if (activeTab !== "email") return;
    // If a template is selected by ID, use it; otherwise fall back to the key-based lookup
    let tpl: EmailTemplate | undefined;
    if (formData.confirmation_template_id) {
      tpl = templates.find((t) => t.id === formData.confirmation_template_id);
    }
    if (!tpl) {
      const activeKey = formData.confirmation_template_key === "global"
        ? "registration_confirmed"
        : formData.confirmation_template_key;
      tpl = templates.find((t) => t.key === activeKey);
    }
    const html = compileTemplatePreview(
      tpl?.key || "registration_confirmed",
      tpl?.body_html || "",
      formData.banner_url,
      formData.logo_url,
      formData.banner_primary_color,
      formData.banner_accent_color,
      formData,
    );
    setPreviewHtml(html);
  }, [activeTab, formData.confirmation_template_id, formData.confirmation_template_key, formData.banner_url, formData.logo_url, formData.banner_primary_color, formData.banner_accent_color, formData.title, formData.start_date, formData.location, formData.address, templates]);

  // Rebuild decline preview whenever the selected decline template ID/key or event branding changes
  useEffect(() => {
    if (activeTab !== "email") return;
    let tpl: EmailTemplate | undefined;
    if (formData.decline_template_id) {
      tpl = templates.find((t) => t.id === formData.decline_template_id);
    }
    if (!tpl) {
      const activeKey = formData.decline_template_key === "global"
        ? "registration_declined"
        : formData.decline_template_key;
      tpl = templates.find((t) => t.key === activeKey);
    }
    const html = compileTemplatePreview(
      tpl?.key || "registration_declined",
      tpl?.body_html || "",
      formData.banner_url,
      formData.logo_url,
      formData.banner_primary_color,
      formData.banner_accent_color,
      formData,
    );
    setDeclinePreviewHtml(html);
  }, [activeTab, formData.decline_template_id, formData.decline_template_key, formData.banner_url, formData.logo_url, formData.banner_primary_color, formData.banner_accent_color, formData.title, formData.start_date, formData.location, formData.address, templates]);

  // Write preview into iframe
  useEffect(() => {
    if (!previewFrameRef.current || !previewHtml) return;
    const doc = previewFrameRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box;}body{margin:0;padding:0;background:#f8fafc;}</style></head><body>${previewHtml}</body></html>`);
      doc.close();
    }
  }, [previewHtml]);

  // Write decline preview into iframe
  useEffect(() => {
    if (!declinePreviewFrameRef.current || !declinePreviewHtml) return;
    const doc = declinePreviewFrameRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box;}body{margin:0;padding:0;background:#f8fafc;}</style></head><body>${declinePreviewHtml}</body></html>`);
      doc.close();
    }
  }, [declinePreviewHtml]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  // effectiveRole declared at top level

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { banner_size, banner_position, banner_theme, banner_primary_color, banner_accent_color, banner_layout, banner_text_color, banner_url, logo_url, background_url, disclaimer_checkbox_label, ...submitData } = formData;
      const payload: any = {
        ...submitData,
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        sender_email: formData.sender_email || null,
        sender_name: formData.sender_name || null,
        reply_to: formData.reply_to || null,
        start_date: formData.start_date,
        allowed_domains: formData.allowed_domains
          ? formData.allowed_domains.split(",").map(d => d.trim().toLowerCase()).filter(d => d)
          : [],
        banner_settings: {
          size: formData.banner_size,
          position: formData.banner_position,
          theme: formData.banner_theme,
          primary_color: formData.banner_primary_color || "",
          accent_color: formData.banner_accent_color || "",
          layout: formData.banner_layout || "",
          text_color: formData.banner_text_color || "",
          disclaimer_checkbox_label: formData.disclaimer_checkbox_label || "",
        },
        registration_start: formData.registration_start || null,
        registration_end: formData.registration_end || null,
      };
      if (formData.banner_url !== originalBanner) payload.banner_url = formData.banner_url;
      if (formData.logo_url !== originalLogo) payload.logo_url = formData.logo_url;
      if (formData.background_url !== originalBg) payload.background_url = formData.background_url;
      // Always send confirmation/decline template IDs so they can be cleared back to null
      payload.confirmation_template_id = formData.confirmation_template_id || null;
      payload.decline_template_id = formData.decline_template_id || null;
      payload.registration_form_template_id = formData.registration_form_template_id || null;

      const response = await fetch(`/api/py/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-email": session?.user?.email || "" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push(`/admin/events/${id}`);
      } else {
        let errorMessage = "Failed to update event";
        try { const error = await response.json(); errorMessage = error.detail || errorMessage; } catch { try { errorMessage = await response.text(); } catch { } }
        alert(`Error: ${errorMessage}`);
      }
    } catch (err) {
      console.error("Failed to update event", err);
      alert("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone and will delete all registrations.")) return;
    try {
      const response = await fetch(`/api/py/events/${id}`, { method: "DELETE", headers: { "x-user-email": session?.user?.email || "" } });
      if (response.ok) { router.push("/admin"); } else { alert("Failed to delete event."); }
    } catch (err) { console.error("Failed to delete event", err); alert("An error occurred."); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (name === "banner_theme") {
      const defaults = THEME_DEFAULTS[value as keyof typeof THEME_DEFAULTS];
      setFormData((prev) => ({ ...prev, banner_theme: value, banner_primary_color: defaults?.primary || "", banner_accent_color: defaults?.accent || "" }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : (name === "capacity" || name === "duration_days" ? parseInt(value) : value),
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="animate-spin text-[#1e293b]" size={48} />
      </div>
    );
  }

  if (!loading && effectiveRole === "staff") {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
            <Lock className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-[#0f172a] mb-4 uppercase italic font-bricolage tracking-tight dark:text-white">Access <span className="text-red-500">Restricted</span></h1>
          <p className="text-slate-500 font-medium max-w-md dark:text-slate-400">You do not have the clearance level required to edit events. Please contact a system administrator.</p>
        </div>
      </AdminLayout>
    );
  }

  // Resolve which template is active for display purposes
  const activeConfTemplate = formData.confirmation_template_id
    ? templates.find((t) => t.id === formData.confirmation_template_id)
    : (formData.confirmation_template_key === "global"
        ? templates.find((t) => t.key === "registration_confirmed")
        : templates.find((t) => t.key === formData.confirmation_template_key));
  const activeConfTemplateName = activeConfTemplate ? activeConfTemplate.name : (formData.confirmation_template_key === "global" ? "Global Default" : formData.confirmation_template_key);

  const activeDeclineTemplate = formData.decline_template_id
    ? templates.find((t) => t.id === formData.decline_template_id)
    : (formData.decline_template_key === "global"
        ? templates.find((t) => t.key === "registration_declined")
        : templates.find((t) => t.key === formData.decline_template_key));
  const activeDeclineTemplateName = activeDeclineTemplate ? activeDeclineTemplate.name : (formData.decline_template_key === "global" ? "Global Decline Default" : formData.decline_template_key);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto font-outfit">
        <div className="flex justify-between items-center mb-10">
          <Link
            href={`/admin/events/${id}`}
            className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-colors text-sm font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={18} />
            Back to Event
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-500 hover:text-red-650 font-bold px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/35"
          >
            <Trash2 size={20} />
            Delete Event
          </button>
        </div>

        <div className="bg-white dark:bg-[#0a0f1d]/40 dark:backdrop-blur-md rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-2xl dark:shadow-none">
          {/* Header */}
          <div className="bg-[#1e293b] dark:bg-slate-900/50 px-10 py-10 dark:border-b dark:border-white/5">
            <h1 className="text-3xl font-black text-white italic tracking-tight font-bricolage uppercase">Edit Event Settings</h1>
            <p className="text-slate-450 dark:text-slate-500 font-medium mt-2">Configure event details, email templates, and registration preferences.</p>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-slate-900/30 px-10">
            {[
              { id: "details", label: "Event Details", icon: Building2 },
              { id: "email", label: "Email & Templates", icon: Mail },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                    active
                      ? "border-yellow-400 text-slate-800 dark:text-yellow-400"
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ===== DETAILS TAB ===== */}
          {activeTab === "details" && (
            <form onSubmit={handleSubmit} className="p-10 space-y-12">
              {/* 1. Core Parameters */}
              <div className="space-y-6">
                <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                  <h3 className="text-xs font-black text-[#1e293b] dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400 dark:text-slate-500" /> 1. Core Parameters
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Event Title</label>
                    <RichTextEditor 
                      value={formData.title || ""} 
                      onChange={(val) => setFormData(prev => ({ ...prev, title: val }))} 
                      placeholder="e.g. Excellence Gala 2026"
                      minHeight="80px"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">URL Slug</label>
                    <input required type="text" name="slug" value={formData.slug} onChange={handleChange}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60" />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Building2 size={14} /> Brand Client
                    </label>
                    <select name="client_id" value={formData.client_id} onChange={handleChange}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60 appearance-none cursor-pointer">
                      {clients.map((c) => (
                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Date &amp; Time</label>
                    <input required type="datetime-local" name="start_date" value={formData.start_date} onChange={handleChange}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60" />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Venue</label>
                    <input required type="text" name="location" value={formData.location} onChange={handleChange}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60" />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Address</label>
                    <input required type="text" name="address" value={formData.address} onChange={handleChange}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60" />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Capacity</label>
                    <input required type="number" name="capacity" value={formData.capacity} onChange={handleChange}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60" />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Duration (Days)</label>
                    <input required type="number" min={1} name="duration_days" value={formData.duration_days} onChange={handleChange}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60" />
                  </div>
                </div>
              </div>

              {/* 2. Page Styling & Background */}
              <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-white/5">
                <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                  <h3 className="text-xs font-black text-[#1e293b] dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400 dark:text-slate-500" /> 2. Page Styling &amp; Background
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-between justify-between">
                      Background Banner
                      {formData.banner_url && <button type="button" onClick={() => setFormData({ ...formData, banner_url: "" })} className="text-red-500 hover:underline text-[9px] uppercase font-bold tracking-widest">Remove</button>}
                    </label>
                    <div className="relative group">
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await uploadImageFile(file);
                            setFormData(prev => ({ ...prev, banner_url: url }));
                          } catch {
                            try { const compressed = await compressImage(file, 1600, 1600, 0.85); setFormData(prev => ({ ...prev, banner_url: compressed })); }
                            catch { const reader = new FileReader(); reader.onloadend = () => setFormData(prev => ({ ...prev, banner_url: reader.result as string })); reader.readAsDataURL(file); }
                          }
                        }
                      }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className={`w-full h-24 rounded-2xl border-2 border-dashed ${formData.banner_url ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20" : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60"} relative transition-all overflow-hidden`}>
                        {formData.banner_url ? (
                          <div className="absolute inset-0">
                            <div className="absolute inset-0" style={{ backgroundImage: `url(${formData.banner_url})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Upload Banner Image</p>
                            <p className="text-[8px] text-slate-300 dark:text-slate-600 uppercase mt-1">Recommended: 1920x1080</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center justify-between">
                      Registration Page Background Image (Optional)
                      {formData.background_url && <button type="button" onClick={() => setFormData({ ...formData, background_url: "" })} className="text-red-500 hover:underline text-[9px] uppercase font-bold tracking-widest">Remove</button>}
                    </label>
                    <div className="relative group">
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await uploadImageFile(file);
                            setFormData(prev => ({ ...prev, background_url: url }));
                          } catch {
                            try { const compressed = await compressImage(file, 1600, 1600, 0.85); setFormData(prev => ({ ...prev, background_url: compressed })); }
                            catch { const reader = new FileReader(); reader.onloadend = () => setFormData(prev => ({ ...prev, background_url: reader.result as string })); reader.readAsDataURL(file); }
                          }
                        }
                      }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className={`w-full h-24 rounded-2xl border-2 border-dashed ${formData.background_url ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20" : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60"} relative transition-all overflow-hidden`}>
                        {formData.background_url ? (
                          <div className="absolute inset-0">
                            {formData.banner_size === "contain" && <div className="absolute inset-0 scale-110 blur-md opacity-60 bg-cover bg-center" style={{ backgroundImage: `url(${formData.background_url})` }} />}
                            <div className="absolute inset-0" style={{ backgroundImage: `url(${formData.background_url})`, backgroundSize: formData.banner_size, backgroundPosition: formData.banner_position, backgroundRepeat: "no-repeat" }} />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Upload Background Image</p>
                            <p className="text-[8px] text-slate-300 dark:text-slate-600 uppercase mt-1">Recommended: 1920x1080</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {(formData.banner_url || formData.background_url) && (
                    <div className="space-y-3 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Banner &amp; Background Display Settings</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                        <div>
                          <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 block mb-1">Fit / Scale</label>
                          <select name="banner_size" value={formData.banner_size} onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-xs text-slate-700 dark:text-white bg-white dark:bg-slate-900 cursor-pointer">
                            <option value="cover">Cover (Fill Screen)</option>
                            <option value="contain">Contain (Show Full Image)</option>
                            <option value="100% 100%">Stretch to Fit</option>
                            <option value="auto 100%">Fit Height (Top to Bottom)</option>
                            <option value="100% auto">Fit Width</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 block mb-1">Focus / Position</label>
                          <select name="banner_position" value={formData.banner_position} onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-xs text-slate-700 dark:text-white bg-white dark:bg-slate-900 cursor-pointer">
                            <option value="center">Center</option>
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Form Design & Layout */}
              <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-white/5">
                <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                  <h3 className="text-xs font-black text-[#1e293b] dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <Layers size={16} className="text-slate-400 dark:text-slate-500" /> 3. Form Design &amp; Layout
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center justify-between">
                      Event Email Logo Override
                      {formData.logo_url && <button type="button" onClick={() => setFormData({ ...formData, logo_url: "" })} className="text-red-500 hover:underline text-[9px] uppercase font-bold tracking-widest">Remove</button>}
                    </label>
                    <div className="relative group">
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await uploadImageFile(file);
                            setFormData(prev => ({ ...prev, logo_url: url }));
                          } catch {
                            try { const compressed = await compressImage(file, 800, 800, 0.85); setFormData(prev => ({ ...prev, logo_url: compressed })); }
                            catch { const reader = new FileReader(); reader.onloadend = () => setFormData(prev => ({ ...prev, logo_url: reader.result as string })); reader.readAsDataURL(file); }
                          }
                        }
                      }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className={`w-full h-24 rounded-2xl border-2 border-dashed ${formData.logo_url ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20" : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60"} relative transition-all overflow-hidden`}>
                        {formData.logo_url ? (
                          <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-900/5">
                            <img src={formData.logo_url} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Upload Custom Email Logo</p>
                            <p className="text-[8px] text-slate-300 dark:text-slate-655 uppercase mt-1">Overrides client/default logo for this event</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Registration Form Design Style</label>
                    <select name="banner_theme" value={formData.banner_theme} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-xs text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60 cursor-pointer">
                      <option value="cyber_dark">Cyber Dark (Premium Black &amp; Gold)</option>
                      <option value="minimal_light">Minimal Light (Clean White &amp; Slate)</option>
                      <option value="glassmorphism">Glassmorphism (Frosted Glass Overlay)</option>
                      <option value="brutalist_retro">Brutalist Retro (Bold Typography &amp; Retro Tech)</option>
                      <option value="midnight_luxury">Midnight Luxury (Deep Royal Blue &amp; Gold)</option>
                      <option value="neon_horizon">Neon Horizon (Synthwave &amp; Neon Glow)</option>
                      <option value="forest_zen">Forest Zen (Deep Emerald &amp; Sage Stacked)</option>
                      <option value="aurora_glow">Aurora Glow (Dynamic Gradient &amp; Glassmorphism)</option>
                      <option value="crimson_sunset">Crimson Sunset (Burgundy &amp; Warm Coral)</option>
                      <option value="cyberpunk_terminal">Cyberpunk Terminal (Matrix Green &amp; Scanlines)</option>
                      <option value="corporate_mono">Corporate Mono (Slate Grey &amp; Pure Minimalist)</option>
                      <option value="nordic_alabaster">Nordic Alabaster (Off-White &amp; Editorial Serif)</option>
                      <option value="midnight_executive">Midnight Executive (Deep Charcoal &amp; Electric Blue)</option>
                      <option value="champagne_lounge">Champagne Lounge (Warm Alabaster &amp; Brushed Gold)</option>
                      <option value="logistics_glass">Logistics Glass (Translucent Slate &amp; Steel Borders)</option>
                    </select>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Registration Form Layout</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        { id: "", label: "Default", desc: "Theme default" },
                        { id: "stacked", label: "Stacked", desc: "Top Banner" },
                        { id: "split", label: "Split Right", desc: "Form on Right" },
                        { id: "reversed", label: "Split Left", desc: "Form on Left" },
                        { id: "centered", label: "Centered", desc: "Centered Card" }
                      ].map((lay) => {
                        const active = formData.banner_layout === lay.id;
                        return (
                          <button key={lay.id} type="button" onClick={() => setFormData(prev => ({ ...prev, banner_layout: lay.id }))}
                            className={`flex flex-col items-center justify-between p-2.5 rounded-xl border text-center transition-all bg-white dark:bg-slate-900 hover:border-slate-350 dark:hover:border-slate-700 ${active ? "border-slate-800 dark:border-yellow-400 ring-2 ring-slate-800/10 dark:ring-yellow-400/25 shadow-sm" : "border-slate-100 dark:border-slate-800 shadow-sm opacity-80 hover:opacity-100"}`}>
                            {lay.id === "" && <div className="relative w-full h-10 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center border border-slate-200/60 dark:border-slate-700 mb-2 overflow-hidden"><div className="text-[9px] font-black tracking-tighter text-slate-400 dark:text-slate-500 uppercase">Default</div></div>}
                            {lay.id === "stacked" && <div className="flex flex-col gap-0.5 w-full h-10 bg-slate-150 dark:bg-slate-800 rounded p-1 border border-slate-200/60 dark:border-slate-700 mb-2"><div className="bg-slate-350 dark:bg-slate-700 h-2 w-full rounded-sm"></div><div className="bg-white dark:bg-slate-900 h-5 w-4/5 mx-auto rounded-sm border border-slate-200 dark:border-slate-750 flex items-center justify-center"><span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></span></div></div>}
                            {lay.id === "split" && <div className="flex gap-0.5 w-full h-10 bg-slate-150 dark:bg-slate-800 rounded p-1 border border-slate-200/60 dark:border-slate-700 mb-2"><div className="bg-slate-350 dark:bg-slate-700 w-2/5 h-full rounded-sm"></div><div className="bg-white dark:bg-slate-900 w-3/5 h-full rounded-sm border border-slate-200 dark:border-slate-750 flex items-center justify-center"><span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></span></div></div>}
                            {lay.id === "reversed" && <div className="flex gap-0.5 w-full h-10 bg-slate-150 dark:bg-slate-800 rounded p-1 border border-slate-200/60 dark:border-slate-700 mb-2"><div className="bg-white dark:bg-slate-900 w-3/5 h-full rounded-sm border border-slate-200 dark:border-slate-750 flex items-center justify-center"><span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></span></div><div className="bg-slate-350 dark:bg-slate-700 w-2/5 h-full rounded-sm"></div></div>}
                            {lay.id === "centered" && <div className="relative w-full h-10 bg-slate-200 dark:bg-slate-800 rounded p-1 border border-slate-250 dark:border-slate-700 mb-2 flex items-center justify-center"><div className="bg-white dark:bg-slate-900 w-3/4 h-6 rounded-sm border border-slate-300 dark:border-slate-750 shadow-sm flex items-center justify-center"><span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></span></div></div>}
                            <span className="text-[10px] font-black tracking-tight text-slate-800 dark:text-slate-200 block leading-tight">{lay.label}</span>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold block">{lay.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Registration Form Template</label>
                    <select 
                      name="registration_form_template_id" 
                      value={formData.registration_form_template_id || ""} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ 
                          ...formData, 
                          registration_form_template_id: val ? parseInt(val) : null 
                        });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-xs text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60 cursor-pointer"
                    >
                      <option value="">Default Form (Custom questions managed below)</option>
                      {regTemplates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.description || "No description"})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Custom Color Overrides</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                      {[
                        { name: "banner_primary_color", label: "Custom Primary Color Override", placeholder: "e.g. #0f172a" },
                        { name: "banner_accent_color", label: "Custom Accent Color Override", placeholder: "e.g. #eab308" },
                        { name: "banner_text_color", label: "Custom Text Color Override", placeholder: "e.g. #ffffff" },
                      ].map((field) => (
                        <div key={field.name} className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 block">{field.label}</label>
                          <div className="flex items-center gap-3">
                            <input type="color" name={field.name} value={(formData as any)[field.name] || "#000000"} onChange={handleChange}
                              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer p-0 bg-transparent shrink-0" />
                            <input type="text" name={field.name} value={(formData as any)[field.name]} onChange={handleChange}
                              placeholder={field.placeholder}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 outline-none font-bold text-xs text-slate-700 dark:text-white bg-white dark:bg-slate-900" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Intelligence / Description</label>
                    <RichTextEditor 
                      value={formData.description || ""} 
                      onChange={(val) => setFormData(prev => ({ ...prev, description: val }))} 
                      placeholder="Type event description here..."
                      minHeight="120px"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Access Rules & Options */}
              <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-white/5">
                <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                  <h3 className="text-xs font-black text-[#1e293b] dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <Award size={16} className="text-slate-400 dark:text-slate-500" /> 4. Access Rules &amp; Options
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Approved Email Domains (Optional - comma separated)</label>
                    <input type="text" name="allowed_domains" value={formData.allowed_domains} onChange={handleChange}
                      placeholder="e.g. bmdcomputing.com, companyname.co.za"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60" />
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest ml-1">Guests will only be permitted to register if their email ends in one of these domains.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Registration Options</label>
                    <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                      <label className="flex items-center gap-4 cursor-pointer">
                        <input type="checkbox" name="collect_company" checked={formData.collect_company} onChange={handleChange}
                          className="w-5 h-5 rounded border-slate-300 dark:border-slate-750 text-[#1e293b] dark:text-yellow-500 focus:ring-yellow-400/20 dark:bg-slate-850" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-350">Collect Organization / Company name from guests</span>
                      </label>
                      {formData.collect_company && (
                        <label className="flex items-center gap-4 pl-9 mt-2 cursor-pointer border-t border-slate-100/50 dark:border-slate-800/50 pt-2">
                          <input type="checkbox" name="company_required" checked={formData.company_required} onChange={handleChange}
                            className="w-5 h-5 rounded border-slate-300 dark:border-slate-750 text-[#1e293b] dark:text-yellow-500 focus:ring-yellow-400/20 dark:bg-slate-850" />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-350">Organization / Company is required</span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Registration Access & Disclaimer */}
              <div className="border-t border-slate-100 dark:border-white/5 pt-8 mt-6 space-y-6">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                  <Lock size={16} className="text-slate-400 dark:text-slate-500" /> 5. Registration Access &amp; Disclaimer
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Registration Availability</label>
                    <label className="flex items-center gap-4 p-5 bg-slate-50/50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <input type="checkbox" name="registration_active" checked={formData.registration_active} onChange={handleChange}
                        className="w-5 h-5 rounded border-slate-300 dark:border-slate-750 text-yellow-500 focus:ring-yellow-400/20 dark:bg-slate-850" />
                      <div>
                        <p className="text-xs font-bold text-[#1e293b] dark:text-white">Registration Form Active</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Toggle this off to immediately suspend all public registrations.</p>
                      </div>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Schedule Open Date &amp; Time (Optional)</label>
                    <input type="datetime-local" name="registration_start" value={formData.registration_start} onChange={handleChange}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60" />
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest ml-1">Leave empty to open immediately</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Schedule Close Date &amp; Time (Optional)</label>
                    <input type="datetime-local" name="registration_end" value={formData.registration_end} onChange={handleChange}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60" />
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest ml-1">Leave empty to keep open indefinitely</p>
                  </div>
                  <div className="space-y-3 md:col-span-2 border-t border-slate-100 dark:border-white/5 pt-6 mt-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Disclaimer &amp; Indemnity</label>
                    <label className="flex items-center gap-4 p-5 bg-slate-50/50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <input type="checkbox" name="disclaimer_enabled" checked={formData.disclaimer_enabled} onChange={handleChange}
                        className="w-5 h-5 rounded border-slate-300 dark:border-slate-750 text-yellow-500 focus:ring-yellow-400/20 dark:bg-slate-855" />
                      <div>
                        <p className="text-xs font-bold text-[#1e293b] dark:text-white">Enable Disclaimer &amp; Indemnity</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Show a custom terms/indemnity agreement that guests must accept to register.</p>
                      </div>
                    </label>
                    {formData.disclaimer_enabled && (
                      <div className="space-y-2 mt-3">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Custom Checkbox Phrasing Text</label>
                        <input type="text" name="disclaimer_checkbox_label" value={formData.disclaimer_checkbox_label} onChange={handleChange}
                          placeholder="I have read and accept the Disclaimer and Indemnity"
                          className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60" />
                      </div>
                    )}
                  </div>
                  {formData.disclaimer_enabled && (
                    <div className="space-y-3 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Disclaimer Content</label>
                      <textarea required={formData.disclaimer_enabled} name="disclaimer_text" value={formData.disclaimer_text} onChange={handleChange} rows={4}
                        placeholder="Enter the disclaimer and indemnity statement that guests must read and accept..."
                        className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/50 dark:bg-slate-900/60 resize-none" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" disabled={saving}
                  className="w-full bg-[#1e293b] hover:bg-[#0f172a] disabled:bg-slate-300 text-white font-black py-5 rounded-2xl shadow-2xl shadow-slate-200 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm">
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {saving ? "Deploying Changes..." : "Commit Changes"}
                </button>
              </div>
            </form>
          )}

          {/* ===== EMAIL TAB ===== */}
          {activeTab === "email" && (
            <form onSubmit={handleSubmit} className="p-10 space-y-8">

              {/* Notification */}
              {saveEmailNotification && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-bold ${saveEmailNotification.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30" : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-450 border border-red-100 dark:border-red-900/30"}`}>
                  {saveEmailNotification.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {saveEmailNotification.text}
                </div>
              )}

              {/* Sender Configuration */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 bg-[#1e293b] dark:bg-slate-800 rounded-xl flex items-center justify-center">
                    <Mail size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#1e293b] dark:text-white uppercase tracking-widest">Sender Configuration</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Override the global "from" address and display name for this event</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/60 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <Mail size={12} /> Sender Email Domain
                    </label>
                    <div className="relative">
                      <select name="sender_email" value={formData.sender_email} onChange={handleChange}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-850 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-white dark:bg-slate-900 appearance-none cursor-pointer">
                        <option value="">Default (events@eelogistics.co.za)</option>
                        {(senderEmails.length > 0 ? senderEmails : ["events@eelogistics.co.za", "events@bmdcomputing.com"]).map((email) => (
                          <option key={email} value={email}>{email}</option>
                        ))}
                      </select>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-1.5 ml-1">
                        Select from pre-approved domains managed in Admin Settings.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <Type size={12} /> Sender Display Name
                    </label>
                    <input type="text" name="sender_name" value={formData.sender_name} onChange={handleChange}
                      placeholder="e.g. EEL Events"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-850 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-white dark:bg-slate-900" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <Mail size={12} /> Reply-To Email Address
                    </label>
                    <input type="email" name="reply_to" value={formData.reply_to} onChange={handleChange}
                      placeholder="e.g. events@yourdomain.com"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-850 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-white dark:bg-slate-900" />
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-1 ml-1">
                      If left blank, replies will default to the client-level Reply-To address.
                    </p>
                  </div>

                  <div className="md:col-span-2 border-t border-slate-100 dark:border-white/5 pt-5 mt-2 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-[#1e293b] dark:text-white uppercase tracking-wider">Enable Confirmation Emails</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-550 font-medium mt-0.5">Toggle automatic ticket and confirmation email triggers for this event</p>
                    </div>
                    <input 
                      type="checkbox" 
                      name="send_emails" 
                      checked={formData.send_emails} 
                      onChange={handleChange}
                      className="w-4 h-4 text-yellow-500 dark:text-yellow-400 bg-white dark:bg-slate-950/20 border-slate-300 dark:border-slate-700 rounded focus:ring-yellow-500 focus:ring-2 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Template Selectors */}
              <div className="space-y-8">
                {/* Confirmation Email Template */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#1e293b] dark:bg-slate-800 rounded-xl flex items-center justify-center">
                        <Eye size={16} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#1e293b] dark:text-white uppercase tracking-widest">Confirmation Email Template</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-555 font-medium mt-0.5">Choose the design used when sending confirmation emails for this event</p>
                      </div>
                    </div>
                    <Link
                      href="/admin/settings"
                      target="_blank"
                      className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-[#1e293b] dark:hover:text-yellow-400 uppercase tracking-widest transition-colors"
                    >
                      <ExternalLink size={12} />
                      Customise Templates
                    </Link>
                  </div>

                  {loadingTemplates ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-slate-400" size={24} />
                      <span className="ml-3 text-sm text-slate-400 font-medium">Loading templates...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={formData.confirmation_template_id ? formData.confirmation_template_id.toString() : "global"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "global") {
                            setFormData(prev => ({ ...prev, confirmation_template_id: null, confirmation_template_key: "global" }));
                          } else {
                            const tplId = parseInt(val);
                            const tpl = templates.find(t => t.id === tplId);
                            if (tpl) {
                              setFormData(prev => ({ ...prev, confirmation_template_id: tplId, confirmation_template_key: tpl.key }));
                            }
                          }
                        }}
                        className="w-full px-5 py-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/20 dark:bg-slate-950/20 appearance-none cursor-pointer pr-10"
                      >
                        <option value="global">Use Global Default (Inherits global email settings)</option>
                        {templates.map((tpl) => (
                          <option key={tpl.id!} value={tpl.id!.toString()}>
                            {tpl.name} {tpl.subject ? `— Subject: ${tpl.subject}` : ""}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Decline Registrant Email Template */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#1e293b] dark:bg-slate-800 rounded-xl flex items-center justify-center">
                        <AlertCircle size={16} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#1e293b] dark:text-white uppercase tracking-widest">Decline Registrant Email Template</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-555 font-medium mt-0.5">Choose the design used when a guest declines to attend this event</p>
                      </div>
                    </div>
                  </div>

                  {loadingTemplates ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-slate-400" size={24} />
                      <span className="ml-3 text-sm text-slate-400 font-medium">Loading templates...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={formData.decline_template_id ? formData.decline_template_id.toString() : "global"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "global") {
                            setFormData(prev => ({ ...prev, decline_template_id: null, decline_template_key: "global" }));
                          } else {
                            const tplId = parseInt(val);
                            const tpl = templates.find(t => t.id === tplId);
                            if (tpl) {
                              setFormData(prev => ({ ...prev, decline_template_id: tplId, decline_template_key: tpl.key }));
                            }
                          }
                        }}
                        className="w-full px-5 py-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-[#1e293b] dark:focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-slate-700 dark:text-white bg-slate-50/20 dark:bg-slate-950/20 appearance-none cursor-pointer pr-10"
                      >
                        <option value="global">Use Global Decline Default (Inherits global decline settings)</option>
                        {templates.map((tpl) => (
                          <option key={tpl.id!} value={tpl.id!.toString()}>
                            {tpl.name} {tpl.subject ? `— Subject: ${tpl.subject}` : ""}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Email Previews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Confirmation Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[10px] font-black text-[#1e293b] dark:text-white uppercase tracking-widest">Confirmation Email Preview</h3>
                      <p className="text-[9px] text-slate-450 dark:text-slate-500 font-medium mt-0.5">Rendered with this event's branding — banner, logo and colours</p>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-full">
                      {activeConfTemplateName}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900" style={{ height: "500px" }}>
                    {previewHtml ? (
                      <iframe
                        ref={previewFrameRef}
                        title="Confirmation Email Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin text-slate-350 dark:text-slate-700" size={28} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Decline Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[10px] font-black text-[#1e293b] dark:text-white uppercase tracking-widest">Decline Email Preview</h3>
                      <p className="text-[9px] text-slate-450 dark:text-slate-500 font-medium mt-0.5">Rendered with this event's branding — banner, logo and colours</p>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-full">
                      {activeDeclineTemplateName}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900" style={{ height: "500px" }}>
                    {declinePreviewHtml ? (
                      <iframe
                        ref={declinePreviewFrameRef}
                        title="Decline Email Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin text-slate-350 dark:text-slate-700" size={28} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[9px] text-slate-300 dark:text-slate-600 text-center font-medium mt-4">
                To edit the template content and subject line, use{" "}
                <Link href="/admin/settings" target="_blank" className="underline hover:text-slate-400 dark:hover:text-yellow-400 transition-colors">
                  Settings → Email Templates
                </Link>
              </p>

              {/* Save button */}
              <div className="pt-2">
                <button type="submit" disabled={saving}
                  className="w-full bg-[#1e293b] dark:bg-yellow-400 hover:bg-[#0f172a] dark:hover:bg-yellow-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white dark:text-slate-950 font-black py-5 rounded-2xl shadow-2xl dark:shadow-none transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm">
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {saving ? "Deploying Changes..." : "Commit Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
