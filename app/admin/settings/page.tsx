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
  Award,
  Sliders,
  Palette,
  Type,
  Layout,
  AlertTriangle,
  Link,
  Bold,
  Italic,
  Underline,
  Upload
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
    details_html: `<div style="background: #ffffff; padding: 32px; border: 1px solid #f1f5f9; border-radius: 32px; margin-bottom: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: #eab308; margin-bottom: 24px;">Engagement Details</p>
      
      <div style="margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0;">Event</p>
        <p style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">Padels Tournament 2026</p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0;">Date & Time</p>
        <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">Thursday, June 25, 2026 @ 10:00 AM</p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0;">Venue</p>
        <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">Arena Center</p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0;">Address</p>
        <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0;">123 Padel Court Way</p>
        <a href="#" style="display: inline-block; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; background-color: #0f172a; text-decoration: none; padding: 10px 20px; border-radius: 12px; margin-top: 4px;">
          🗺️ Open in Google Maps
        </a>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #eab308; margin: 0 0 4px 0;">Matchup Details</p>
        <p style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">John Doe vs Jane Smith</p>
        <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">Sports Tournament Series</p>
      </div>
    </div>`,
    qr_block_html: `<div style="background: #f8fafc; padding: 48px; border-radius: 32px; text-align: center; border: 1px solid #f1f5f9; margin-bottom: 40px; position: relative; overflow: hidden; font-family: sans-serif;">
      <div style="width: 200px; height: 200px; background-color: #0f172a; margin: 0 auto 32px auto; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: bold; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);">[QR CODE PREVIEW]</div>
      <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: #64748b; margin-bottom: 16px; font-family: sans-serif;">Ticket Reference ID</p>
      <div style="display: inline-block; background: #ffffff; padding: 16px 32px; border-radius: 20px; border: 2px solid #0f172a;">
        <code style="font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: 0.25em; font-family: monospace;">ABCDEF</code>
      </div>
    </div>`,
    warning_block_html: `<div style="background: #fffbeb; padding: 28px; border-radius: 24px; border: 1px solid #fef3c7; margin-bottom: 40px; text-align: center; font-family: sans-serif;">
      <p style="color: #b45309; font-size: 14px; font-weight: 700; margin: 0; line-height: 1.5; text-transform: uppercase; letter-spacing: 0.05em;">Please present this QR code or code at the check-in desk.</p>
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

const DEFAULT_FORM_FIELDS: Record<string, Record<string, string>> = {
  registration_confirmed: {
    primary_color: "#0f172a",
    accent_color: "#94a3b8",
    logo_text: "BMD",
    logo_image_url: "",
    show_logo: "true",
    heading_title: "Registration",
    heading_subtitle: "Confirmed",
    body_text: "Your registration has been successfully confirmed. Below are your secure credentials for terminal verification.",
    warning_text: "Please present this QR code or code at the check-in desk.",
    details_title: "Matchup Details",
    engagement_title: "Engagement Details",
    sender_name: "",
    footer_text: "Excellence Logistics & Entertainment\nAutomated Event Hub System",
  },
  registration_declined: {
    primary_color: "#0f172a",
    accent_color: "#94a3b8",
    logo_text: "BMD",
    logo_image_url: "",
    show_logo: "true",
    heading_title: "Response",
    heading_subtitle: "Recorded",
    body_text: "We have recorded your response that you are unable to attend the event. Thank you for letting us know, and we hope to connect with you at future events.",
    sender_name: "",
    footer_text: "Excellence Logistics & Entertainment\nAutomated Event Hub System",
  },
  partner_pending: {
    primary_color: "#0f172a",
    accent_color: "#eab308",
    logo_text: "BMD",
    logo_image_url: "",
    show_logo: "true",
    heading_title: "Action",
    heading_subtitle: "Required",
    urgent_title: "⚠️ Action Required ASAP",
    urgent_body: "Complete your registration details to secure your spot. Your partner has registered you, but we still need your specific information (such as T-shirt size and dietary preferences) to complete your booking.",
    body_text: "Your partner has registered you. Please complete your ticket details to finalize your registration.",
    button_text: "Update Your Ticket Details",
    details_title: "Matchup Details",
    engagement_title: "Engagement Details",
    sender_name: "",
    footer_text: "Excellence Logistics & Entertainment\nAutomated Event Hub System",
  },
  broadcast: {
    primary_color: "#0f172a",
    accent_color: "#eab308",
    logo_text: "BMD",
    logo_image_url: "",
    show_logo: "true",
    body_text: "This is a customized broadcast update message for you. Please make sure to arrive 30 minutes before the start time.",
    signature: "The Championship Tournament Team",
    sender_name: "",
    footer_text: "Automated Event Management System • Security Tier 4",
  },
  tournament_matchup: {
    primary_color: "#030712",
    accent_color: "#eab308",
    logo_text: "BMD",
    logo_image_url: "",
    show_logo: "true",
    heading_title: "Championship",
    heading_subtitle: "Access Granted",
    body_text: "Hello, you have been registered as the Challenger.",
    details_title: "Partnered With",
    pin_label: "Backup Clearance PIN",
    button_text: "Update Your Ticket Details",
    sender_name: "",
    footer_text: "EXCELLENCE ENTERTAINMENT LOGISTICS\nClearance Level: Tier 1 Authorized Tournament Series",
  }
};

const parseTemplateMeta = (html: string): Record<string, string> | null => {
  if (!html || typeof html !== "string") return null;
  const match = html.match(/<!-- TEMPLATE_META: ({.*?}) -->/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error("Failed to parse template meta", e);
    }
  }
  return null;
};

const compileTemplateHtml = (key: string, values: Record<string, string> = {}, fontFamily = "Calibri, sans-serif", fontSize = "16px") => {
  const metaComment = `<!-- TEMPLATE_META: ${JSON.stringify(values)} -->`;
  let html = "";
  if (key === "registration_confirmed") {
    const warningHtml = values.warning_text ? `
            <div style="background: #fffbeb; padding: 28px; border-radius: 24px; border: 1px solid #fef3c7; margin-bottom: 40px; text-align: center;">
                <p style="color: #b45309; font-size: 14px; font-weight: 700; margin: 0; line-height: 1.5; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif;">
                    ${values.warning_text}
                </p>
            </div>
    ` : "";

    html = `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: ${values.primary_color || ""}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
        <tr>
          <td style="padding: 40px; font-family: ${fontFamily}; font-size: ${fontSize};">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
              <tr>
                <td align="left" valign="middle">
                  <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                    <tr>
                      <td align="center" style="background: ${values.primary_color || ""}; padding: 12px 28px; border-radius: 16px;">
                        <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: #ffffff;">Attendee Pass</span>
                      </td>
                    </tr>
                  </table>
                </td>
                {logo_html}
              </tr>
            </table>
            <h2 style="font-size: 38px; font-weight: 900; color: ${values.primary_color || ""}; margin-bottom: 28px; text-transform: uppercase; font-style: italic; letter-spacing: -0.04em; line-height: 1; margin-top: 0;">
                ${values.heading_title || ""} <span style="color: ${values.accent_color || ""};">${values.heading_subtitle || ""}</span>
            </h2>
            <p style="font-size: ${fontSize}; line-height: 1.7; margin-bottom: 40px; color: #475569;">
                Hello <strong>{first_name}</strong>,<br><br>
                ${(values.body_text || "").replace(/\n/g, "<br>")}
            </p>
            {details_html}
            {qr_block_html}
            ${warningHtml}
            {button_block_html}
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0;">
                      ${(values.footer_text || "").replace(/\n/g, "<br>")}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">
                      This confirmation email was sent to {to_email}.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
  } else if (key === "registration_declined") {
    html = `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: ${values.primary_color || ""}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
        <tr>
          <td style="padding: 40px; font-family: ${fontFamily}; font-size: ${fontSize};">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
              <tr>
                <td align="left" valign="middle">
                  <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                    <tr>
                      <td align="center" style="background: ${values.primary_color || ""}; padding: 12px 28px; border-radius: 16px;">
                        <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: #ffffff;">Response Recorded</span>
                      </td>
                    </tr>
                  </table>
                </td>
                {logo_html}
              </tr>
            </table>
            <h2 style="font-size: 38px; font-weight: 900; color: ${values.primary_color || ""}; margin-bottom: 28px; text-transform: uppercase; font-style: italic; letter-spacing: -0.04em; line-height: 1; margin-top: 0;">
                ${values.heading_title || ""} <span style="color: ${values.accent_color || ""};">${values.heading_subtitle || ""}</span>
            </h2>
            <p style="font-size: ${fontSize}; line-height: 1.7; margin-bottom: 40px; color: #475569;">
                Hello <strong>{first_name}</strong>,<br><br>
                ${(values.body_text || "").replace(/\n/g, "<br>")}
            </p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0;">
                      ${(values.footer_text || "").replace(/\n/g, "<br>")}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">
                      This email was sent to {to_email}.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
  } else if (key === "partner_pending") {
    html = `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: ${values.primary_color || ""}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
        <tr>
          <td style="padding: 40px; font-family: ${fontFamily}; font-size: ${fontSize};">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
              <tr>
                <td align="left" valign="middle">
                  <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                    <tr>
                      <td align="center" style="background: ${values.primary_color || ""}; padding: 12px 28px; border-radius: 16px;">
                        <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: #ffffff;">Action Required</span>
                      </td>
                    </tr>
                  </table>
                </td>
                {logo_html}
              </tr>
            </table>
            <h2 style="font-size: 38px; font-weight: 900; color: ${values.primary_color || ""}; margin-bottom: 28px; text-transform: uppercase; font-style: italic; letter-spacing: -0.04em; line-height: 1; margin-top: 0;">
                ${values.heading_title || ""} <span style="color: ${values.accent_color || ""};">${values.heading_subtitle || ""}</span>
            </h2>
            
            <div style="background-color: #fff7ed; border: 2px solid #ea580c; padding: 24px; border-radius: 20px; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <p style="color: #c2410c; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-family: sans-serif;">
                    ${values.urgent_title || ""}
                </p>
                <p style="color: #7c2d12; font-size: 15px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.4; font-family: sans-serif;">
                    Complete your registration details to secure your spot.
                </p>
                <p style="color: #9a3412; font-size: 13px; line-height: 1.5; margin: 0; font-family: sans-serif;">
                    ${(values.urgent_body || "").replace(/\n/g, "<br>")}
                </p>
            </div>
            
            <p style="font-size: ${fontSize}; line-height: 1.7; margin-bottom: 40px; color: #475569;">
                Hello <strong>{first_name}</strong>,<br><br>
                ${(values.body_text || "").replace(/\n/g, "<br>")}
            </p>
            
            <div style="text-align: center; margin-top: 10px; margin-bottom: 40px;">
                <a href="{profile_update_link}" target="_blank" style="background-color: #eab308; color: #000000; padding: 16px 32px; border-radius: 16px; font-size: 13px; font-weight: 950; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 4px 12px rgba(234,179,8,0.2); font-family: sans-serif;">
                    ${values.button_text || ""}
                </a>
                <p style="font-size: 11px; color: #b45309; margin-top: 10px; margin-bottom: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif;">
                    ⚠️ MUST DO ASAP - Required to finalize registration!
                </p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0;">
                      ${(values.footer_text || "").replace(/\n/g, "<br>")}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
                      This email was sent to {to_email}.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
  } else if (key === "broadcast") {
    html = `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: ${values.primary_color || ""}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
        <tr>
          <td style="padding: 40px; font-family: ${fontFamily}; font-size: ${fontSize};">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
              <tr>
                <td align="left" valign="middle">
                  <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                    <tr>
                      <td align="center" style="background: ${values.primary_color || ""}; padding: 12px 28px; border-radius: 16px;">
                        <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: #ffffff;">Broadcast Dispatch</span>
                      </td>
                    </tr>
                  </table>
                </td>
                {logo_html}
              </tr>
            </table>
            <p style="font-size: ${fontSize}; line-height: 1.7; margin-bottom: 40px; color: #475569;">
                Hello <strong>{first_name}</strong>,<br><br>
                ${(values.body_text || "").replace(/\n/g, "<br>")}
            </p>
            {details_html}
            <p style="font-size: 15px; font-weight: 800; color: ${values.primary_color || ""}; margin-top: 30px;">
                ${(values.signature || "").replace(/\n/g, "<br>")}
            </p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0;">
                      ${(values.footer_text || "").replace(/\n/g, "<br>")}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">
                      This email was sent to {to_email}.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
  } else if (key === "tournament_matchup") {
    html = `
<div style="font-family: ${fontFamily}; font-size: ${fontSize}; background-color: ${values.primary_color || ""}; color: #ffffff; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
    <div style="text-align: center; margin-bottom: 30px;">
        <span style="background-color: ${values.accent_color || ""}; color: #000000; padding: 8px 16px; border-radius: 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; font-family: sans-serif;">Tournament Dispatch</span>
    </div>
    
    <h2 style="font-size: 28px; font-weight: 900; color: #ffffff; margin-bottom: 10px; font-style: italic; text-transform: uppercase; letter-spacing: -0.02em; text-align: center; font-family: sans-serif;">
        ${values.heading_title || ""} <span style="color: ${values.accent_color || ""};">${values.heading_subtitle || ""}</span>
    </h2>
    
    <p style="font-size: ${fontSize}; color: #9ca3af; text-align: center; margin-bottom: 30px; font-weight: 500; font-family: sans-serif;">
        ${(values.body_text || "").replace(/\n/g, "<br>")}
    </p>

    <div style="background-color: #090d16; border: 1px solid #1e293b; border-radius: 20px; padding: 24px; margin-bottom: 30px; text-align: center;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: ${values.accent_color || ""}; margin: 0 0 10px 0; font-family: sans-serif;">${values.details_title || ""}</p>
        <p style="font-size: 18px; font-weight: 800; color: #ffffff; margin: 0; font-family: sans-serif;">{name} vs {opponent_name}</p>
        <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0; font-family: sans-serif;">Sports Tournament Series</p>
    </div>

    <div style="background-color: #ffffff; padding: 32px; border-radius: 20px; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
        <img src="{qr_code_url}" width="200" height="200" alt="Check-in QR Code" style="display: block; margin: 0 auto 20px auto; border-radius: 12px;" />
        <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; color: #64748b; margin: 0 0 8px 0; font-family: sans-serif;">${values.pin_label || ""}</p>
        <div style="display: inline-block; background-color: #f1f5f9; padding: 8px 20px; border-radius: 10px; border: 1.5px solid #0f172a;">
            <code style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 0.15em; font-family: monospace;">{pin}</code>
        </div>
    </div>

    <div style="text-align: center; margin-top: 10px; margin-bottom: 20px;">
      <a href="#" style="background-color: ${values.accent_color || ""}; color: #000000; padding: 12px 24px; border-radius: 8px; font-size: 12px; font-weight: 900; text-decoration: none; text-transform: uppercase; display: inline-block; font-family: sans-serif;">
        ${values.button_text || ""}
      </a>
    </div>

    <div style="background-color: #1c1917; padding: 20px; border-radius: 16px; border: 1px solid #292524; text-align: center; margin-bottom: 30px;">
        <p style="color: #e7e5e4; font-size: 12px; font-weight: 600; margin: 0; line-height: 1.5; font-family: sans-serif;">
            ${(values.footer_text || "").replace(/\n/g, "<br>")}
        </p>
    </div>
</div>`;
  }
  return (metaComment + "\n" + html).trim();
};

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = (session?.user as any)?.role || "staff";

  // Tab State
  const [activeTab, setActiveTab] = useState<"templates" | "global">("templates");

  // ==========================================
  // EMAIL TEMPLATE STATES
  // ==========================================
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("registration_confirmed");
  const [subject, setSubject] = useState<string>("");
  const [bodyHtml, setBodyHtml] = useState<string>("");
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);
  const [resettingTemplate, setResettingTemplate] = useState<boolean>(false);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testEmail, setTestEmail] = useState<string>("");
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [templateNotification, setTemplateNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const [editorMode, setEditorMode] = useState<"visual" | "html">("visual");
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Synchronize contentEditable editor when template or tab changes
  useEffect(() => {
    if (activeTab === "templates" && editorRef.current) {
      const current = templates.find((t) => t.key === selectedKey);
      if (current) {
        const meta = parseTemplateMeta(current.body_html);
        const defaults = DEFAULT_FORM_FIELDS[selectedKey] || {};
        const bodyVal = meta?.body_text || defaults.body_text || "";
        if (editorRef.current.innerHTML !== bodyVal) {
          editorRef.current.innerHTML = bodyVal;
        }
      }
    }
  }, [selectedKey, activeTab, templates]);

  // ==========================================
  // GLOBAL SETTINGS STATES
  // ==========================================
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
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);



  // ==========================================
  // FETCH EFFECTS
  // ==========================================
  
  // Load Global Settings
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
        setLoadingSettings(false);
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
      setLoadingSettings(false);
    }
  }, [session, userRole]);

  // Load Email Templates
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
          setTemplates(Array.isArray(data) ? data : []);
          
          // Initialize form with default selected template
          const current = Array.isArray(data) ? data.find((t: EmailTemplate) => t.key === selectedKey) : null;
          if (current) {
            setSubject(current.subject);
            setBodyHtml(current.body_html);
            
            // Sync Form values
            const meta = parseTemplateMeta(current.body_html);
            const defaults = DEFAULT_FORM_FIELDS[selectedKey] || {};
            setFormValues({ ...defaults, ...meta });
          }
        }
      } catch (err) {
        console.error("Failed to load templates", err);
      } finally {
        setLoadingTemplates(false);
      }
    }
    
    // Only fetch if session is loaded and user is authorized
    if (session?.user?.email && userRole === "admin") {
      loadTemplates();
    } else if (sessionStatus === "unauthenticated" || (sessionStatus === "authenticated" && userRole !== "admin")) {
      setLoadingTemplates(false);
    }
  }, [session, sessionStatus, selectedKey, userRole]);

  // Write compiled content directly into iframe (Templates visual preview)
  useEffect(() => {
    if (activeTab === "templates" && previewFrameRef.current && userRole === "admin") {
      const iframe = previewFrameRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(getPreviewHtml());
        doc.close();
      }
    }
  }, [bodyHtml, selectedKey, activeTab, userRole]);

  // Warn before unload if there are unsaved template changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Re-compile template preview when font or size config changes
  useEffect(() => {
    if (activeTab === "templates") {
      const compiled = compileTemplateHtml(selectedKey, formValues, config.font_family, config.font_size);
      setBodyHtml(compiled);
    }
  }, [config.font_family, config.font_size, selectedKey, activeTab]);


  // ==========================================
  // EMAIL TEMPLATES HANDLERS
  // ==========================================

  const triggerEditorChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setFormValues(prev => ({ ...prev, body_text: html }));
      const compiled = compileTemplateHtml(selectedKey, { ...formValues, body_text: html }, config.font_family, config.font_size);
      setBodyHtml(compiled);
      setHasUnsavedChanges(true);
    }
  };

  const applyBold = () => {
    document.execCommand("bold");
    triggerEditorChange();
  };

  const applyItalic = () => {
    document.execCommand("italic");
    triggerEditorChange();
  };

  const applyUnderline = () => {
    document.execCommand("underline");
    triggerEditorChange();
  };

  const applyFontFamily = (fontFamily: string) => {
    const selection = window.getSelection();
    const hasSelection = selection && !selection.isCollapsed && selection.toString().length > 0;
    
    if (hasSelection && editorRef.current?.contains(selection.anchorNode)) {
      document.execCommand("fontName", false, "temp-font");
      const fontElems = editorRef.current?.querySelectorAll("font[face='temp-font']");
      if (fontElems) {
        fontElems.forEach((elem) => {
          elem.removeAttribute("face");
          (elem as HTMLElement).style.fontFamily = fontFamily;
        });
      }
      triggerEditorChange();
    } else {
      setConfig(prev => ({ ...prev, font_family: fontFamily }));
      setHasUnsavedChanges(true);
    }
  };

  const applyFontSize = (size: string) => {
    const selection = window.getSelection();
    const hasSelection = selection && !selection.isCollapsed && selection.toString().length > 0;
    
    if (hasSelection && editorRef.current?.contains(selection.anchorNode)) {
      document.execCommand("fontSize", false, "7");
      const fontElems = editorRef.current?.querySelectorAll("font[size='7']");
      if (fontElems) {
        fontElems.forEach((elem) => {
          elem.removeAttribute("size");
          (elem as HTMLElement).style.fontSize = size;
        });
      }
      triggerEditorChange();
    } else {
      setConfig(prev => ({ ...prev, font_size: size }));
      setHasUnsavedChanges(true);
    }
  };

  // Compile preview HTML locally
  const getPreviewHtml = () => {
    let html = bodyHtml;
    const mockVars = { ...(MOCK_PREVIEW_DATA[selectedKey] || {}) };
    
    // Construct dynamic logo_html based on formValues
    const logoText = formValues.logo_text || "BMD";
    const logoImgUrl = formValues.logo_image_url || "";
    const primaryCol = formValues.primary_color || "#0f172a";
    const accentCol = formValues.accent_color || "#eab308";
    const showLogo = formValues.show_logo !== "false";
    
    let logoHtmlStr = "";
    if (showLogo) {
      if (logoImgUrl) {
        logoHtmlStr = `<td align="right" valign="middle"><img src="${logoImgUrl}" style="max-height: 48px; max-width: 140px; object-fit: contain; display: block;" alt="Logo" /></td>`;
      } else {
        logoHtmlStr = `<td align="right" valign="middle"><div style="background-color:${primaryCol};padding:8px 16px;border-radius:8px;color:#fff;font-weight:bold;font-size:14px;display:inline-block;font-family:sans-serif;">${logoText}</div></td>`;
      }
    }
    
    mockVars.logo_html = logoHtmlStr;

    // Dynamically replace theme colors and details title in mock blocks
    if (mockVars.details_html) {
      const detailsTitle = formValues.details_title || "Matchup Details";
      const engagementTitle = formValues.engagement_title || "Engagement Details";
      mockVars.details_html = mockVars.details_html
        .replaceAll("#0f172a", primaryCol)
        .replaceAll("#eab308", accentCol)
        .replace("Matchup Details", detailsTitle)
        .replace("Engagement Details", engagementTitle);
    }
    if (mockVars.qr_block_html) {
      mockVars.qr_block_html = mockVars.qr_block_html
        .replaceAll("#0f172a", primaryCol);
    }
    if (mockVars.warning_block_html) {
      mockVars.warning_block_html = mockVars.warning_block_html
        .replaceAll("#b45309", accentCol === "#eab308" ? "#b45309" : accentCol);
    }
    if (mockVars.button_block_html) {
      mockVars.button_block_html = mockVars.button_block_html
        .replaceAll("#0f172a", primaryCol)
        .replaceAll("#eab308", accentCol);
    }
    
    // Perform simple string replacements
    const finalVars = {
      ...mockVars,
      font_family: config.font_family || "Calibri, sans-serif",
      font_size: config.font_size || "16px"
    };

    Object.entries(finalVars).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      html = html.replaceAll(placeholder, value);
    });
    
    return html;
  };

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
      
      const meta = parseTemplateMeta(target.body_html);
      const defaults = DEFAULT_FORM_FIELDS[key] || {};
      setFormValues({ ...defaults, ...meta });
    }
  };

  const handleFormChange = (field: string, val: string) => {
    const nextValues = { ...formValues, [field]: val };
    setFormValues(nextValues);
    const compiled = compileTemplateHtml(selectedKey, nextValues, config.font_family, config.font_size);
    setBodyHtml(compiled);
    setHasUnsavedChanges(true);
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    setTemplateNotification(null);
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
        setTemplates(prev => prev.map(t => t.key === selectedKey ? updated : t));
        setHasUnsavedChanges(false);
        setTemplateNotification({ type: "success", text: "Template changes deployed successfully!" });
      } else {
        throw new Error("Failed to save changes");
      }
    } catch (err) {
      setTemplateNotification({ type: "error", text: "Failed to save template. Please try again." });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleResetTemplate = async () => {
    if (!confirm("Are you sure you want to restore this template to the system default? All customizations will be lost.")) {
      return;
    }
    setResettingTemplate(true);
    setTemplateNotification(null);
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
        
        // Reset Visual Form Fields
        const meta = parseTemplateMeta(resetTemplate.body_html);
        const defaults = DEFAULT_FORM_FIELDS[selectedKey] || {};
        setFormValues({ ...defaults, ...meta });
        
        setTemplateNotification({ type: "success", text: "Template restored to default layout successfully!" });
      } else {
        throw new Error("Failed to reset template");
      }
    } catch (err) {
      setTemplateNotification({ type: "error", text: "Failed to restore template defaults." });
    } finally {
      setResettingTemplate(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    setSendingTest(true);
    setTemplateNotification(null);
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
        setTemplateNotification({ type: "success", text: `Test email dispatched to ${testEmail}!` });
        setIsTestModalOpen(false);
      } else {
        throw new Error(data.details || "SMTP transfer failed");
      }
    } catch (err: any) {
      setTemplateNotification({ type: "error", text: `Test delivery failed: ${err.message || err}` });
    } finally {
      setSendingTest(false);
    }
  };

  const handleCopyVariable = (name: string) => {
    const format = `{${name}}`;
    navigator.clipboard.writeText(format);
    setCopiedVar(name);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const handleModeToggle = (mode: "visual" | "html") => {
    if (mode === "visual") {
      const meta = parseTemplateMeta(bodyHtml);
      const defaults = DEFAULT_FORM_FIELDS[selectedKey] || {};
      if (meta) {
        setFormValues({ ...defaults, ...meta });
      }
    }
    setEditorMode(mode);
  };


  // ==========================================
  // GLOBAL SETTINGS HANDLERS
  // ==========================================

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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage(null);
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
        setSettingsMessage({ type: "success", text: "Global settings saved successfully!" });
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      setSettingsMessage({ type: "error", text: "Failed to save settings. Please try again." });
    } finally {
      setSavingSettings(false);
    }
  };


  // ==========================================
  // RENDER LOADING STATES
  // ==========================================
  if (sessionStatus === "loading" || (activeTab === "templates" ? loadingTemplates : loadingSettings)) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="animate-spin text-[#0f172a]" size={48} />
        </div>
      </AdminLayout>
    );
  }

  // Access check for staff clearance
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
            You do not have the clearance level required to view settings.
          </p>
        </div>
      </AdminLayout>
    );
  }

  // Templates page only allows admin role
  if (activeTab === "templates" && userRole !== "admin") {
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
            You do not have the admin clearance level required to customize email templates. Please use the Global Settings tab.
          </p>
          <button
            onClick={() => setActiveTab("global")}
            className="mt-6 px-6 py-3 bg-[#0f172a] text-white hover:bg-black font-black uppercase text-xs tracking-widest rounded-xl dark:bg-yellow-400 dark:text-black transition-all"
          >
            Go to Global Settings
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto px-4">
        {/* Header Title Banner */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-[#0f172a] tracking-tighter font-bricolage italic mb-2 uppercase dark:text-white">
            SYSTEM <span className="text-slate-300 dark:text-slate-600">SETTINGS & TEMPLATES</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg dark:text-slate-400">
            Configure system parameters, verified sender domains, default branding, and visual email templates.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-10">
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                if (!confirm("You have unsaved template changes. Switching tabs will lose these changes. Proceed?")) {
                  return;
                }
              }
              setActiveTab("templates");
            }}
            className={`px-8 py-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 -mb-[2px] ${
              activeTab === "templates"
                ? "border-yellow-400 text-[#0f172a] dark:text-white"
                : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
            }`}
          >
            Email Templates
          </button>
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                if (!confirm("You have unsaved template changes. Switching tabs will lose these changes. Proceed?")) {
                  return;
                }
              }
              setActiveTab("global");
            }}
            className={`px-8 py-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 -mb-[2px] ${
              activeTab === "global"
                ? "border-yellow-400 text-[#0f172a] dark:text-white"
                : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
            }`}
          >
            Global Settings
          </button>
        </div>

        {/* ======================================================== */}
        {/* EMAIL TEMPLATES TAB CONTENT */}
        {/* ======================================================== */}
        {activeTab === "templates" && (
          <div className="space-y-8">
            {/* Top Toolbar Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                Template Editor
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-widest">
                <button
                  onClick={handleResetTemplate}
                  disabled={resettingTemplate || savingTemplate}
                  className="flex items-center gap-2 px-6 py-4 rounded-xl border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-100 hover:bg-red-50/30 transition-all disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-red-950/20"
                >
                  {resettingTemplate ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                  Restore Default
                </button>

                <button
                  onClick={() => {
                    setTestEmail(session?.user?.email || "");
                    setIsTestModalOpen(true);
                  }}
                  disabled={savingTemplate || resettingTemplate}
                  className="flex items-center gap-2 px-6 py-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-black transition-all disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Send size={14} />
                  Send Test
                </button>

                <button
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate || resettingTemplate || !hasUnsavedChanges}
                  className={`flex items-center gap-2 px-8 py-4 rounded-xl font-black transition-all shadow-xl ${
                    hasUnsavedChanges 
                      ? "bg-[#0f172a] text-white hover:bg-black shadow-slate-200 dark:bg-yellow-400 dark:text-black dark:shadow-yellow-500/10"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600"
                  }`}
                >
                  {savingTemplate ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Deploy Changes
                </button>
              </div>
            </div>

            {/* Global Templates Notifications */}
            <AnimatePresence>
              {templateNotification && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold ${
                    templateNotification.type === "success" 
                      ? "bg-green-50 text-green-600 border border-green-100 dark:bg-green-950/20 dark:border-green-900/30" 
                      : "bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30"
                  }`}
                >
                  {templateNotification.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {templateNotification.text}
                  <button 
                    onClick={() => setTemplateNotification(null)}
                    className="ml-auto hover:opacity-75 text-xs underline font-medium"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-8">
              {/* Top Row: Template Selection & Cheat Sheet */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 1. Template Selection */}
                <div className="lg:col-span-6 space-y-4">
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
                </div>

                {/* Template Variables Cheat Sheet */}
                <div className="lg:col-span-6 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                    Placeholders
                  </h3>
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800">
                    <h4 className="text-xs font-black uppercase tracking-[0.1em] text-[#0f172a] mb-4 flex items-center gap-2 dark:text-white">
                      <Info size={14} className="text-blue-500" />
                      Variables Guide
                    </h4>
                    <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed">
                      Click any variable key to copy it into your clipboard, then paste it in the subject or body editor.
                    </p>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
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
              </div>

              {/* Bottom Row: Customize Layout & Real-time Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Subject Line & Editor */}
                <div className="lg:col-span-6 space-y-6">
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

                  {/* Main Editor Card */}
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 flex flex-col h-[720px]">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <Sliders size={12} /> Customize Layout
                      </span>
                      
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                          onClick={() => handleModeToggle("visual")}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                            editorMode === "visual"
                              ? "bg-white text-black shadow-sm dark:bg-[#0f172a] dark:text-yellow-400"
                              : "text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
                          }`}
                        >
                          Visual Editor
                        </button>
                        <button
                          onClick={() => handleModeToggle("html")}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                            editorMode === "html"
                              ? "bg-white text-black shadow-sm dark:bg-[#0f172a] dark:text-yellow-400"
                              : "text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
                          }`}
                        >
                          HTML Code
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                      {editorMode === "html" ? (
                        <textarea
                          value={bodyHtml}
                          onChange={(e) => {
                            setBodyHtml(e.target.value);
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full flex-1 p-6 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none font-mono text-xs leading-relaxed resize-none overflow-y-auto h-[500px]"
                          style={{ tabSize: 2 }}
                          spellCheck={false}
                        />
                      ) : (
                        <div className="space-y-6 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                          {/* Theme Colors Section */}
                          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a] dark:text-white flex items-center gap-2">
                              <Palette size={12} className="text-yellow-500" />
                              Theme & Color Palette
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                  Primary Color
                                </label>
                                <div className="flex gap-2.5">
                                  <input 
                                    type="color"
                                    value={formValues.primary_color || "#0f172a"}
                                    onChange={(e) => handleFormChange("primary_color", e.target.value)}
                                    className="w-12 h-12 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0"
                                  />
                                  <input 
                                    type="text"
                                    value={formValues.primary_color || ""}
                                    onChange={(e) => handleFormChange("primary_color", e.target.value)}
                                    placeholder="#000000"
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                  />
                                </div>
                              </div>

                              {selectedKey !== "broadcast" && (
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                    Accent Color
                                  </label>
                                  <div className="flex gap-2.5">
                                    <input 
                                      type="color"
                                      value={formValues.accent_color || "#eab308"}
                                      onChange={(e) => handleFormChange("accent_color", e.target.value)}
                                      className="w-12 h-12 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0"
                                    />
                                    <input 
                                      type="text"
                                      value={formValues.accent_color || ""}
                                      onChange={(e) => handleFormChange("accent_color", e.target.value)}
                                      placeholder="#000000"
                                      className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Logo & Branding Header Section */}
                          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a] dark:text-white flex items-center gap-2">
                              <Sparkles size={12} className="text-purple-500" />
                              Logo & Branding Header
                            </h4>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                  Show Logo in Email Header
                                </label>
                                <input
                                  type="checkbox"
                                  checked={formValues.show_logo !== "false"}
                                  onChange={(e) => handleFormChange("show_logo", e.target.checked ? "true" : "false")}
                                  className="w-4 h-4 text-yellow-500 bg-slate-100 border-slate-300 rounded focus:ring-yellow-500 focus:ring-2 dark:bg-slate-800"
                                />
                              </div>

                              {formValues.show_logo !== "false" && (
                                <>
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                      Logo Type
                                    </label>
                                    <div className="flex gap-4">
                                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="logo_type"
                                          checked={!formValues.logo_image_url}
                                          onChange={() => handleFormChange("logo_image_url", "")}
                                          className="text-yellow-500 focus:ring-yellow-500"
                                        />
                                        Text Logo
                                      </label>
                                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="logo_type"
                                          checked={!!formValues.logo_image_url}
                                          onChange={() => handleFormChange("logo_image_url", "https://")}
                                          className="text-yellow-500 focus:ring-yellow-500"
                                        />
                                        Image URL Logo
                                      </label>
                                    </div>
                                  </div>

                                  {formValues.logo_image_url !== "" ? (
                                    <div className="space-y-3">
                                      <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                          Upload Logo / Image File
                                        </label>
                                        
                                        <div
                                          onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                          }}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onloadend = () => {
                                                handleFormChange("logo_image_url", reader.result as string);
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                          onClick={() => {
                                            const input = document.createElement("input");
                                            input.type = "file";
                                            input.accept = "image/*";
                                            input.onchange = (e) => {
                                              const file = (e.target as HTMLInputElement).files?.[0];
                                              if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                  handleFormChange("logo_image_url", reader.result as string);
                                                };
                                                reader.readAsDataURL(file);
                                              }
                                            };
                                            input.click();
                                          }}
                                          className="w-full h-28 rounded-2xl border-2 border-dashed border-slate-200 hover:border-yellow-400/50 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-slate-100/30 group relative overflow-hidden"
                                        >
                                          {formValues.logo_image_url && formValues.logo_image_url !== "https://" ? (
                                            <div className="relative w-full h-full p-2 flex items-center justify-center">
                                              <img src={formValues.logo_image_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleFormChange("logo_image_url", "https://");
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-[10px] font-black uppercase shadow-md transition-all"
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          ) : (
                                            <>
                                              <Upload className="text-slate-400 group-hover:text-yellow-500 transition-colors mb-1" size={24} />
                                              <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">Drag & Drop Logo Here</span>
                                              <span className="text-[9px] text-slate-400 font-medium">Or click to browse files</span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                          Or enter Logo Image URL
                                        </label>
                                        <input
                                          type="text"
                                          value={formValues.logo_image_url === "https://" ? "" : formValues.logo_image_url}
                                          onChange={(e) => handleFormChange("logo_image_url", e.target.value || "https://")}
                                          placeholder="https://example.com/logo.png"
                                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-medium text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                        Logo Text
                                      </label>
                                      <input
                                        type="text"
                                        value={formValues.logo_text || "BMD"}
                                        onChange={(e) => handleFormChange("logo_text", e.target.value)}
                                        placeholder="e.g. BMD"
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                      />
                                    </div>
                                  )}
                                </>
                              )}

                              <hr className="border-slate-100 dark:border-slate-800/80 my-3" />

                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                  Email Sender Name (Override)
                                </label>
                                <input
                                  type="text"
                                  value={formValues.sender_name || ""}
                                  onChange={(e) => handleFormChange("sender_name", e.target.value)}
                                  placeholder="Leave blank to use system settings default"
                                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                />
                                <p className="text-[9px] text-slate-400 italic">Overrides the global system settings sender name.</p>
                              </div>
                            </div>
                          </div>

                          {/* Header Titles Section */}
                          {["registration_confirmed", "registration_declined", "partner_pending", "tournament_matchup"].includes(selectedKey) && (
                            <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a] dark:text-white flex items-center gap-2">
                                <Type size={12} className="text-blue-500" />
                                Header Titles
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                    Heading Title
                                  </label>
                                  <input 
                                    type="text"
                                    value={formValues.heading_title || ""}
                                    onChange={(e) => handleFormChange("heading_title", e.target.value)}
                                    placeholder="e.g. Registration"
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                  />
                                </div>
                                
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                    Heading Subtitle (Colored)
                                  </label>
                                  <input 
                                    type="text"
                                    value={formValues.heading_subtitle || ""}
                                    onChange={(e) => handleFormChange("heading_subtitle", e.target.value)}
                                    placeholder="e.g. Confirmed"
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Alerts and Special Banners */}
                          {selectedKey === "partner_pending" && (
                            <div className="space-y-4 bg-orange-50/30 dark:bg-orange-950/10 p-5 rounded-2xl border border-orange-100/50 dark:border-orange-900/30">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-605 dark:text-orange-400 flex items-center gap-2">
                                <AlertTriangle size={12} />
                                Urgent Call-out Alert Block
                              </h4>
                              
                              <div className="space-y-3">
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-orange-500/80 block">
                                    Alert Heading/Title
                                  </label>
                                  <input 
                                    type="text"
                                    value={formValues.urgent_title || ""}
                                    onChange={(e) => handleFormChange("urgent_title", e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-orange-200/50 focus:border-orange-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-750 dark:text-white"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-orange-500/80 block">
                                    Alert Details Body Text
                                  </label>
                                  <textarea 
                                    rows={3}
                                    value={formValues.urgent_body || ""}
                                    onChange={(e) => handleFormChange("urgent_body", e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-orange-200/50 focus:border-orange-400 outline-none font-medium text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-750 dark:text-white resize-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Primary Text Content Section */}
                          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a] dark:text-white flex items-center gap-2">
                              <Layout size={12} className="text-green-500" />
                              Message Wording
                            </h4>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                Main Body Message
                              </label>
                              
                              {/* Rich Text Toolbar */}
                              <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-t-2xl border-t border-x border-slate-200 dark:border-slate-700">
                                <select
                                  value={config.font_family || "Calibri, sans-serif"}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      applyFontFamily(e.target.value);
                                    }
                                  }}
                                  onMouseDown={(e) => e.preventDefault()}
                                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                                >
                                  <option value="Calibri, sans-serif">Calibri</option>
                                  <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</option>
                                  <option value="'Inter', sans-serif">Inter</option>
                                  <option value="'Outfit', sans-serif">Outfit</option>
                                  <option value="'Bricolage Grotesque', sans-serif">Bricolage</option>
                                  <option value="Georgia, serif">Georgia</option>
                                  <option value="'Courier New', Courier, monospace">Courier</option>
                                  <option value="'Times New Roman', Times, serif">Times New Roman</option>
                                  <option value="Arial, sans-serif">Arial</option>
                                  <option value="sans-serif">System Sans-Serif</option>
                                </select>

                                <select
                                  value={config.font_size || "16px"}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      applyFontSize(e.target.value);
                                    }
                                  }}
                                  onMouseDown={(e) => e.preventDefault()}
                                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                                >
                                  <option value="12px">12px</option>
                                  <option value="14px">14px</option>
                                  <option value="15px">15px</option>
                                  <option value="16px">16px</option>
                                  <option value="17px">17px</option>
                                  <option value="18px">18px</option>
                                  <option value="20px">20px</option>
                                  <option value="24px">24px</option>
                                  <option value="32px">32px</option>
                                </select>

                                <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1.5" />

                                <button
                                  type="button"
                                  onClick={applyBold}
                                  onMouseDown={(e) => e.preventDefault()}
                                  className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                                  title="Bold"
                                >
                                  <Bold size={14} />
                                </button>

                                <button
                                  type="button"
                                  onClick={applyItalic}
                                  onMouseDown={(e) => e.preventDefault()}
                                  className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                                  title="Italic"
                                >
                                  <Italic size={14} />
                                </button>

                                <button
                                  type="button"
                                  onClick={applyUnderline}
                                  onMouseDown={(e) => e.preventDefault()}
                                  className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                                  title="Underline"
                                >
                                  <Underline size={14} />
                                </button>
                              </div>

                              <div
                                id="body-text-editor"
                                ref={editorRef}
                                contentEditable
                                suppressContentEditableWarning
                                onInput={(e) => {
                                  const html = e.currentTarget.innerHTML;
                                  setFormValues(prev => ({ ...prev, body_text: html }));
                                  const compiled = compileTemplateHtml(selectedKey, { ...formValues, body_text: html }, config.font_family, config.font_size);
                                  setBodyHtml(compiled);
                                  setHasUnsavedChanges(true);
                                }}
                                onBlur={(e) => {
                                  handleFormChange("body_text", e.currentTarget.innerHTML);
                                }}
                                style={{
                                  fontFamily: config.font_family || "Calibri, sans-serif",
                                  fontSize: config.font_size || "16px"
                                }}
                                className="w-full min-h-[220px] max-h-[400px] overflow-y-auto p-4 rounded-b-2xl bg-white border border-t-0 border-slate-200 focus:border-yellow-400 outline-none text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              />
                              <p className="text-[10px] text-slate-400 leading-normal pt-0.5">
                                Supports dynamic variables like <code>{`{first_name}`}</code> and <code>{`{event_title}`}</code>.
                              </p>
                            </div>

                            {/* Warning copy for Confirmation Template */}
                            {selectedKey === "registration_confirmed" && (
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                  Alert Note (QR check-in instructions)
                                </label>
                                <input 
                                  type="text"
                                  value={formValues.warning_text || ""}
                                  onChange={(e) => handleFormChange("warning_text", e.target.value)}
                                  placeholder="e.g. Please present this QR code at the check-in desk."
                                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-medium text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                />
                              </div>
                            )}

                            {/* Button text config */}
                            {["partner_pending", "tournament_matchup"].includes(selectedKey) && (
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1.5">
                                  <Link size={10} /> Button Call-to-Action Label
                                </label>
                                <input 
                                  type="text"
                                  value={formValues.button_text || ""}
                                  onChange={(e) => handleFormChange("button_text", e.target.value)}
                                  placeholder="e.g. Update Your Ticket Details"
                                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                />
                              </div>
                            )}

                            {/* Broadcaster signature config */}
                            {selectedKey === "broadcast" && (
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                  Sender Signature / Sign-off
                                </label>
                                <textarea 
                                  rows={2}
                                  value={formValues.signature || ""}
                                  onChange={(e) => handleFormChange("signature", e.target.value)}
                                  placeholder="e.g. The Championship Tournament Team"
                                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-medium text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
                                />
                              </div>
                            )}

                            {/* Matchup & Card Wording customization */}
                            {["registration_confirmed", "partner_pending", "tournament_matchup"].includes(selectedKey) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                    Matchup Header Label
                                  </label>
                                  <input 
                                    type="text"
                                    value={formValues.details_title || ""}
                                    onChange={(e) => handleFormChange("details_title", e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                  />
                                </div>

                                {["registration_confirmed", "partner_pending"].includes(selectedKey) && (
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                      Engagement Card Title
                                    </label>
                                    <input 
                                      type="text"
                                      value={formValues.engagement_title || ""}
                                      onChange={(e) => handleFormChange("engagement_title", e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    />
                                  </div>
                                )}
                                
                                {selectedKey === "tournament_matchup" && (
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                      PIN Instruction Label
                                    </label>
                                    <input 
                                      type="text"
                                      value={formValues.pin_label || ""}
                                      onChange={(e) => handleFormChange("pin_label", e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Footer Section */}
                          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a] dark:text-white flex items-center gap-2">
                              <Layout size={12} className="text-purple-500" />
                              Footer & Legal note
                            </h4>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                Footer Text Copy
                              </label>
                              <textarea 
                                rows={3}
                                value={formValues.footer_text || ""}
                                onChange={(e) => handleFormChange("footer_text", e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-medium text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Editor Save layout button */}
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                          {hasUnsavedChanges ? "⚠️ You have unsaved changes" : "✅ All changes deployed"}
                        </span>
                        
                        <button
                          type="button"
                          onClick={handleSaveTemplate}
                          disabled={savingTemplate || resettingTemplate || !hasUnsavedChanges}
                          className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl ${
                            hasUnsavedChanges 
                              ? "bg-[#0f172a] text-white hover:bg-black shadow-slate-200 dark:bg-yellow-400 dark:text-black dark:shadow-yellow-500/10"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-700"
                          }`}
                        >
                          {savingTemplate ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                          {savingTemplate ? "Deploying..." : "Save Layout"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Preview Iframe */}
                <div className="lg:col-span-6 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                    <Eye size={12} /> Real-time Preview
                  </h3>
                  
                  <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 flex flex-col h-[870px]">
                    <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700 mb-4 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      <div className="flex-1 min-w-0 text-xs font-bold text-slate-500 dark:text-slate-400 truncate pl-2">
                        Subject: {subject || <span className="italic opacity-55">(No Subject)</span>}
                      </div>
                    </div>

                    <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white relative">
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
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* GLOBAL SETTINGS TAB CONTENT */}
        {/* ======================================================== */}
        {activeTab === "global" && (
          <form onSubmit={handleSaveSettings} className="space-y-8">
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
                  <h2 className="text-xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight dark:text-white">Global Communication Defaults</h2>
                  <p className="text-sm text-slate-400 font-medium">Customize branding, verification sender, typography, and default wording.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Theme Colors & Fonts */}
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
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Courier New', Courier, monospace">Courier</option>
                      <option value="'Times New Roman', Times, serif">Times New Roman</option>
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
                      <option value="24px">24px</option>
                      <option value="32px">32px</option>
                    </select>
                  </div>
                </div>

                {/* Text Fields & Sender Customization */}
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
                      <p className="text-[10px] text-slate-400 italic">This name will appear as the sender in recipient inboxes.</p>
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
                      <p className="text-[10px] text-slate-400 italic">The email address used to send emails (must be verified domain).</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Wordings */}
              <div className="mt-10 space-y-8 border-t border-slate-100 dark:border-slate-800 pt-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                    <Layout size={12} /> Default Body Message Template
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
                    <Layout size={12} /> Default Footer Text
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
              {settingsMessage && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold ${
                    settingsMessage.type === "success" ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                  }`}
                >
                  {settingsMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {settingsMessage.text}
                </motion.div>
              )}
              <div className="flex-1" />
              <button 
                type="submit" 
                disabled={savingSettings}
                className="flex items-center gap-3 bg-[#0f172a] hover:bg-black text-white px-10 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs disabled:opacity-50 dark:bg-yellow-400 dark:text-black"
              >
                {savingSettings ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {savingSettings ? "Saving Settings..." : "Save System Config"}
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* EMAIL TEST DELIVERY MODAL */}
        {/* ======================================================== */}
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

                <form onSubmit={handleSendTestEmail} className="space-y-6">
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
