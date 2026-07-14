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
  Upload,
  Calendar,
  Image,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import RegistrationTemplateManager from "@/components/RegistrationTemplateManager";
import RichTextEditor from "@/components/RichTextEditor";
import { unescapeHtmlLinks } from "@/lib/utils";

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
  banner_email: Calendar,
};

const MOCK_PREVIEW_DATA: Record<string, Record<string, string>> = {
  registration_confirmed: {
    first_name: "John",
    last_name: "Doe",
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
      <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: #ENG_COLOR#; margin-bottom: 24px;">Engagement Details</p>
      
      <div style="margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #ENG_COLOR#; opacity: 0.8; margin: 0 0 4px 0;">Event</p>
        <p style="font-size: 18px; font-weight: 800; color: #ENG_COLOR#; margin: 0;">Padels Tournament 2026</p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #ENG_COLOR#; opacity: 0.8; margin: 0 0 4px 0;">Date & Time</p>
        <p style="font-size: 16px; font-weight: 700; color: #ENG_COLOR#; margin: 0;">Thursday, June 25, 2026 @ 10:00 AM</p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #ENG_COLOR#; opacity: 0.8; margin: 0 0 4px 0;">Venue</p>
        <p style="font-size: 16px; font-weight: 700; color: #ENG_COLOR#; margin: 0;">Arena Center</p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #ENG_COLOR#; opacity: 0.8; margin: 0 0 4px 0;">Address</p>
        <p style="font-size: 16px; font-weight: 700; color: #ENG_COLOR#; margin: 0 0 10px 0;">123 Padel Court Way</p>
        <a href="#" style="display: inline-block; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; background-color: #ENG_COLOR#; text-decoration: none; padding: 10px 20px; border-radius: 12px; margin-top: 4px;">
          🗺️ Open in Google Maps
        </a>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #ENG_COLOR#; margin: 0 0 4px 0;">Matchup Details</p>
        <p style="font-size: 18px; font-weight: 800; color: #ENG_COLOR#; margin: 0;">John Doe vs Jane Smith</p>
        <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">Sports Tournament Series</p>
      </div>
    </div>`,
    qr_block_html: `<div style="background: #f8fafc; padding: 48px; border-radius: 32px; text-align: center; border: 1px solid #f1f5f9; margin-bottom: 40px; position: relative; overflow: hidden; font-family: sans-serif;">
      <div style="width: 200px; height: 200px; background-color: #0f172a; margin: 0 auto 32px auto; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: bold; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);">[QR CODE PREVIEW]</div>
      <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: #64748b; margin-bottom: 16px; font-family: sans-serif;">unique access pass number</p>
      <div style="display: inline-block; background: #ffffff; padding: 16px 32px; border-radius: 20px; border: 2px solid #0f172a;">
        <code style="font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: 0.25em; font-family: monospace;">ABCDEF</code>
      </div>
    </div>`,
    warning_block_html: `<div style="background: #fffbeb; padding: 28px; border-radius: 24px; border: 1px solid #fef3c7; margin-bottom: 40px; text-align: center; font-family: sans-serif;">
      <p style="color: #b45309; font-size: 14px; font-weight: 700; margin: 0; line-height: 1.5; text-transform: uppercase; letter-spacing: 0.05em;">Please present this QR code OR number at the registration desk.</p>
    </div>`,
    button_block_html: "",
    footer_text: "Automated Event Management System • Security Tier 4",
    profile_update_link: ""
  },
  registration_declined: {
    first_name: "John",
    last_name: "Doe",
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
    last_name: "Doe",
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
  },
  banner_email: {
    first_name: "Hein",
    last_name: "Engelbrecht",
    event_title: "2025 MAZIV GOLF DAY",
    to_email: "hein@example.com",
    primary_color: "#18181b",
    accent_color: "#ec4899",
    heading_title: "MAZIV",
    heading_subtitle: "GROUP",
    body_text: "Thank you once again for confirming that you will be joining us at the **Johannesburg Country Club** for the **2025 MAZIV GOLF DAY**, below is more information for the day.",
    itinerary_title: "Date: 16th October 2025",
    itinerary_body: "Registration & Breakfast: 8:30 til 10:45\nShot Gun Start: 11:00 til 13:00\nLunch @ Halfway House: 13:00 til 14:00\nContinue Shotgun: 14:00 til 18:00\nAwards & Dinner: 18:00 til late",
    bring_along_title: "BRING ALONG",
    bring_along_body: "Golf Clubs, Tee & Gloves\nSunscreen\nSunglasses\nBasic Attire",
    bring_along_note: "*Golf T-shirt & Cap will be provided*",
    included_title: "PLEASE NOTE THE FOLLOWING WILL BE INCLUDED:",
    included_body: "All food, beverages and snacks\nBalls\nSpot Prizes",
    footer_text: "events@maziv.com",
    logo_html: ""
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
  ],
  banner_email: [
    { name: "first_name", description: "First name of the attendee" },
    { name: "last_name", description: "Last name of the attendee" },
    { name: "event_title", description: "Title of the event" },
    { name: "to_email", description: "Recipient's email address" },
    { name: "primary_color", description: "Card background color hex" },
    { name: "accent_color", description: "Main accent styling color hex" },
    { name: "body_html", description: "Editable email body copy block" },
    { name: "itinerary_html", description: "Formatted HTML schedule of events list" },
    { name: "bring_along_html", description: "Formatted HTML bring along items list" },
    { name: "included_html", description: "Formatted HTML inclusions list" },
    { name: "footer_text", description: "Contact email or details in footer" }
  ]
};

const DEFAULT_FORM_FIELDS: Record<string, Record<string, string>> = {
  registration_confirmed: {
    primary_color: "#0f172a",
    accent_color: "#94a3b8",
    logo_text: "BMD",
    logo_image_url: "",
    show_logo: "true",
    show_banner: "false",
    banner_image_url: "",
    heading_title: "Registration",
    heading_subtitle: "Confirmed",
    body_text: "Your registration has been successfully confirmed. Below are your secure credentials for terminal verification.",
    warning_text: "Please present this QR code OR number at the registration desk.",
    details_title: "Matchup Details",
    engagement_title: "Engagement Details",
    sender_name: "",
    footer_text: "Excellence Logistics & Entertainment\nAutomated Event Hub System",
    onscreen_title: "YOUR REGISTRATION HAS BEEN CONFIRMED.",
    onscreen_description: "Your registration for [Event Name] is complete. A formal confirmation email with your itinerary, travel coordinates, and unique access ID QR code has been sent to [Email Address]",
  },
  registration_declined: {
    primary_color: "#0f172a",
    accent_color: "#94a3b8",
    logo_text: "BMD",
    logo_image_url: "",
    show_logo: "true",
    show_banner: "false",
    banner_image_url: "",
    heading_title: "Response",
    heading_subtitle: "Recorded",
    body_text: "We have recorded your response that you are unable to attend the event. Thank you for letting us know, and we hope to connect with you at future events.",
    sender_name: "",
    footer_text: "Excellence Logistics & Entertainment\nAutomated Event Hub System",
    onscreen_title: "RESPONSE RECORDED.",
    onscreen_description: "We've noted that you are unable to attend. Thank you for letting us know.",
  },
  partner_pending: {
    primary_color: "#0f172a",
    accent_color: "#eab308",
    logo_text: "BMD",
    logo_image_url: "",
    show_logo: "true",
    show_banner: "false",
    banner_image_url: "",
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
    show_banner: "false",
    banner_image_url: "",
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
    show_banner: "false",
    banner_image_url: "",
    heading_title: "Championship",
    heading_subtitle: "Access Granted",
    body_text: "Hello, you have been registered as the Challenger.",
    details_title: "Partnered With",
    pin_label: "Backup Clearance PIN",
    button_text: "Update Your Ticket Details",
    sender_name: "",
    footer_text: "EXCELLENCE ENTERTAINMENT LOGISTICS\nClearance Level: Tier 1 Authorized Tournament Series",
  },
  banner_email: {
    primary_color: "#18181b",
    accent_color: "#ec4899",
    logo_text: "MAZIV",
    logo_image_url: "",
    show_logo: "false",
    show_banner: "true",
    banner_image_url: "",
    heading_title: "MAZIV",
    heading_subtitle: "GROUP",
    body_text: "Thank you once again for confirming that you will be joining us at the **Johannesburg Country Club** for the **2025 MAZIV GOLF DAY**, below is more information for the day.",
    itinerary_title: "Date: 16th October 2025",
    itinerary_body: "Registration & Breakfast: 8:30 til 10:45\nShot Gun Start: 11:00 til 13:00\nLunch @ Halfway House: 13:00 til 14:00\nContinue Shotgun: 14:00 til 18:00\nAwards & Dinner: 18:00 til late",
    bring_along_title: "BRING ALONG",
    bring_along_body: "Golf Clubs, Tee & Gloves\nSunscreen\nSunglasses\nBasic Attire",
    bring_along_note: "*Golf T-shirt & Cap will be provided*",
    included_title: "PLEASE NOTE THE FOLLOWING WILL BE INCLUDED:",
    included_body: "All food, beverages and snacks\nBalls\nSpot Prizes",
    footer_text: "events@maziv.com",
    sender_name: "",
  }
};

const resolveBaseTemplateKey = (key: string, templates: EmailTemplate[] = []): string => {
  const SYSTEM_KEYS = ["registration_confirmed", "registration_declined", "partner_pending", "broadcast", "tournament_matchup", "banner_email"];
  if (SYSTEM_KEYS.includes(key)) {
    return key;
  }
  
  // Find template in list to inspect its content or name
  const tpl = templates.find(t => t.key === key);
  const bodyHtml = tpl?.body_html || "";
  const name = tpl?.name || "";
  
  if (bodyHtml) {
    if (bodyHtml.includes("Attendee Pass") || bodyHtml.includes("qr_block_html") || bodyHtml.includes("warning_block_html")) {
      return "registration_confirmed";
    }
    if (bodyHtml.includes("Response Recorded") || bodyHtml.includes("registration_declined")) {
      return "registration_declined";
    }
    if (bodyHtml.includes("partner_pending") || bodyHtml.includes("urgent_title") || bodyHtml.includes("urgent_body")) {
      return "partner_pending";
    }
    if (bodyHtml.includes("Broadcast Dispatch") || bodyHtml.includes("signature")) {
      return "broadcast";
    }
    if (bodyHtml.includes("opponent_name") || bodyHtml.includes("tournament_matchup") || bodyHtml.includes("Tournament Dispatch")) {
      return "tournament_matchup";
    }
    if (bodyHtml.includes("itinerary_title") || bodyHtml.includes("included_title") || bodyHtml.includes("included_body") || bodyHtml.includes("banner_email")) {
      return "banner_email";
    }
  }
  
  // Check the key / name strings
  const lowerStr = (key + " " + name).toLowerCase();
  if (lowerStr.includes("confirmed") || lowerStr.includes("confirm") || lowerStr.includes("attendee")) {
    return "registration_confirmed";
  }
  if (lowerStr.includes("declined") || lowerStr.includes("decline")) {
    return "registration_declined";
  }
  if (lowerStr.includes("partner") || lowerStr.includes("pending")) {
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

const parseTemplateMeta = (html: string): Record<string, any> | null => {
  if (!html || typeof html !== "string") return null;
  const match = html.match(/<!-- TEMPLATE_META: ({.*?}) -->/);
  if (match) {
    try {
      const meta = JSON.parse(match[1]);
      if (!meta.sections) {
        meta.sections = {
          mainBodyMessage: {
            text: meta.body_text || "",
            fontFamily: meta.font_family || "Calibri, sans-serif",
            fontSize: meta.font_size || "16px"
          },
          engagementDetails: {
            fontFamily: meta.engagement_details_font_family || "Calibri, sans-serif",
            fontSize: meta.engagement_details_font_size || "14px"
          },
          alertNote: {
            fontFamily: meta.alert_note_font_family || "Calibri, sans-serif",
            fontSize: meta.alert_note_font_size || "14px"
          }
        };
      }
      return meta;
    } catch (e) {
      console.error("Failed to parse template meta", e);
    }
  }
  return null;
};

const normalizeFormValues = (meta: Record<string, any> | null, baseKey: string) => {
  const defaults = DEFAULT_FORM_FIELDS[baseKey] || {};
  const merged = { ...defaults, ...meta };
  
  if (merged.show_details_card === undefined) merged.show_details_card = "true";
  if (merged.show_button === undefined) merged.show_button = "true";
  if (merged.button_text === undefined) {
    merged.button_text = baseKey === "partner_pending" || baseKey === "tournament_matchup" 
      ? "Update Your Ticket Details" 
      : "Update Details";
  }
  if (merged.show_badge === undefined) merged.show_badge = "true";
  if (merged.badge_text === undefined) {
    if (baseKey === "registration_confirmed") merged.badge_text = "Attendee Pass";
    else if (baseKey === "registration_declined") merged.badge_text = "Response Recorded";
    else if (baseKey === "partner_pending") merged.badge_text = "Action Required";
    else if (baseKey === "broadcast") merged.badge_text = "Broadcast Dispatch";
    else if (baseKey === "tournament_matchup") merged.badge_text = "Championship Access";
    else merged.badge_text = "Attendee Pass";
  }

  if (!merged.sections) {
    merged.sections = {
      mainBodyMessage: {
        text: merged.body_text || "",
        fontFamily: merged.font_family || "Calibri, sans-serif",
        fontSize: merged.font_size || "16px"
      },
      engagementDetails: {
        fontFamily: "Calibri, sans-serif",
        fontSize: "14px"
      },
      alertNote: {
        fontFamily: "Calibri, sans-serif",
        fontSize: "14px"
      }
    };
  }
  return merged;
};

const compileTemplateHtml = (key: string, values: Record<string, any> = {}, fontFamily = "Calibri, sans-serif", fontSize = "16px", config?: Record<string, any>) => {
  const baseKey = resolveBaseTemplateKey(key);
  const metaComment = `<!-- TEMPLATE_META: ${JSON.stringify(values)} -->`;
  let html = "";
  const greetingPrefix = values.greeting_prefix !== undefined ? values.greeting_prefix : "Hello";
  const greetingNameType = values.greeting_name_type || "first_name";
  const greetingNameCustom = values.greeting_name_custom || "";

  let nameToken = "";
  if (greetingNameType === "first_name") {
    nameToken = " <strong>{first_name}</strong>";
  } else if (greetingNameType === "full_name") {
    nameToken = " <strong>{first_name} {last_name}</strong>";
  } else if (greetingNameType === "custom" && greetingNameCustom) {
    nameToken = ` <strong>${greetingNameCustom}</strong>`;
  }

  let greetingHtml = "";
  if (greetingPrefix === "None") {
    if (nameToken) {
      greetingHtml = `${nameToken.trim()},<br><br>`;
    }
  } else {
    greetingHtml = `${greetingPrefix}${nameToken},<br><br>`;
  }
  
  const sections = values.sections || {};
  const mainBodyFontFamily = sections.mainBodyMessage?.fontFamily || fontFamily;
  const mainBodyFontSize = sections.mainBodyMessage?.fontSize || fontSize;
  const detailsFontFamily = sections.engagementDetails?.fontFamily || fontFamily;
  const detailsFontSize = sections.engagementDetails?.fontSize || "14px";
  const alertFontFamily = sections.alertNote?.fontFamily || fontFamily;
  const alertFontSize = sections.alertNote?.fontSize || "14px";

  const getInlineFontStyleWeightStyle = (fontStyleWeight?: string, defaultWeight = "400", defaultStyle = "normal") => {
    if (!fontStyleWeight) return `font-weight: ${defaultWeight}; font-style: ${defaultStyle};`;
    const lower = fontStyleWeight.toLowerCase();
    let weight = defaultWeight;
    let style = defaultStyle;
    
    if (lower.includes("light")) weight = "300";
    else if (lower.includes("regular")) weight = "400";
    else if (lower.includes("bold")) weight = "700";
    else if (lower.includes("black")) weight = "900";
    
    if (lower.includes("italic")) style = "italic";
    else style = "normal";
    
    return `font-weight: ${weight}; font-style: ${style};`;
  };

  const mainBodyStyles = getInlineFontStyleWeightStyle(sections.mainBodyMessage?.fontStyleWeight, "400", "normal");
  const alertStyles = getInlineFontStyleWeightStyle(sections.alertNote?.fontStyleWeight, "700", "normal");

  const showBanner = values.show_banner === "true" || (baseKey === "banner_email" && values.show_banner !== "false");
  const bannerUrl = values.banner_image_url || config?.banner_url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800";
  const bannerHtml = showBanner ? `
        <tr>
          <td align="center" style="padding: 0; margin: 0; line-height: 0;">
            <img src="${bannerUrl}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border-top-left-radius: 38px; border-top-right-radius: 38px; margin: 0; padding: 0;" alt="Event Banner" />
          </td>
        </tr>
  ` : "";

  const showBadge = values.show_badge !== "false";
  const badgeText = values.badge_text || (
    baseKey === "registration_confirmed" ? "Attendee Pass" :
    baseKey === "registration_declined" ? "Response Recorded" :
    baseKey === "partner_pending" ? "Action Required" :
    baseKey === "broadcast" ? "Broadcast Dispatch" :
    baseKey === "tournament_matchup" ? "Championship Access" : "Attendee Pass"
  );
  
  const badgeBgColor = baseKey === "registration_confirmed"
    ? (values.attendeePassBgColor || config?.attendeePassBgColor || "#000000")
    : (values.primary_color || "#0f172a");

  const badgeHtml = showBadge ? `
                  <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                    <tr>
                      <td align="center" style="background: ${badgeBgColor}; padding: 12px 28px; border-radius: 16px;">
                        <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: #ffffff;">${badgeText}</span>
                      </td>
                    </tr>
                  </table>
  ` : "";

  if (baseKey === "registration_confirmed") {
    const warningHtml = values.warning_text ? `
            <div style="background: #fffbeb; padding: 28px; border-radius: 24px; border: 1px solid #fef3c7; margin-bottom: 40px; text-align: center;">
                <p style="color: #b45309; font-size: ${alertFontSize}; ${alertStyles} margin: 0; line-height: 1.5; text-transform: uppercase; letter-spacing: 0.05em; font-family: ${alertFontFamily};">
                    ${values.warning_text}
                </p>
            </div>
    ` : "";

    html = `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: ${values.primary_color || ""}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
        ${bannerHtml}
        <tr>
          <td style="padding: 40px; font-family: ${fontFamily}; font-size: ${fontSize};">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
              <tr>
                <td align="left" valign="middle">
                  ${badgeHtml}
                </td>
                {logo_html}
              </tr>
            </table>
            <h2 style="font-size: 38px; font-weight: 900; color: ${values.primary_color || ""}; margin-bottom: 28px; text-transform: uppercase; font-style: italic; letter-spacing: -0.04em; line-height: 1; margin-top: 0;">
                ${values.heading_title || ""} <span style="color: ${values.accent_color || ""};">${values.heading_subtitle || ""}</span>
            </h2>
            <p style="font-family: ${mainBodyFontFamily}; font-size: ${mainBodyFontSize}; ${mainBodyStyles} line-height: 1.7; margin-bottom: 40px; color: #475569;">
                ${greetingHtml}${(values.body_text || "").replace(/\n/g, "<br>")}
            </p>
            ${values.show_details_card !== "false" ? "{details_html}" : ""}
            {qr_block_html}
            ${warningHtml}
            ${values.show_button !== "false" ? "{button_block_html}" : ""}
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0; font-family: ${fontFamily};">
                      ${(values.footer_text || "").replace(/\n/g, "<br>")}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; font-family: ${fontFamily};">
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
  } else if (baseKey === "registration_declined") {
    html = `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: ${values.primary_color || ""}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
        ${bannerHtml}
        <tr>
          <td style="padding: 40px; font-family: ${fontFamily}; font-size: ${fontSize};">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
              <tr>
                <td align="left" valign="middle">
                  ${badgeHtml}
                </td>
                {logo_html}
              </tr>
            </table>
            <h2 style="font-size: 38px; font-weight: 900; color: ${values.primary_color || ""}; margin-bottom: 28px; text-transform: uppercase; font-style: italic; letter-spacing: -0.04em; line-height: 1; margin-top: 0;">
                ${values.heading_title || ""} <span style="color: ${values.accent_color || ""};">${values.heading_subtitle || ""}</span>
            </h2>
            <p style="font-family: ${mainBodyFontFamily}; font-size: ${mainBodyFontSize}; ${mainBodyStyles} line-height: 1.7; margin-bottom: 40px; color: #475569;">
                ${greetingHtml}${(values.body_text || "").replace(/\n/g, "<br>")}
            </p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0; font-family: ${fontFamily};">
                      ${(values.footer_text || "").replace(/\n/g, "<br>")}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; font-family: ${fontFamily};">
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
  } else if (baseKey === "partner_pending") {
    html = `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: ${values.primary_color || ""}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
        ${bannerHtml}
        <tr>
          <td style="padding: 40px; font-family: ${fontFamily}; font-size: ${fontSize};">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
              <tr>
                <td align="left" valign="middle">
                  ${badgeHtml}
                </td>
                {logo_html}
              </tr>
            </table>
            <h2 style="font-size: 38px; font-weight: 900; color: ${values.primary_color || ""}; margin-bottom: 28px; text-transform: uppercase; font-style: italic; letter-spacing: -0.04em; line-height: 1; margin-top: 0;">
                ${values.heading_title || ""} <span style="color: ${values.accent_color || ""};">${values.heading_subtitle || ""}</span>
            </h2>
            
            <div style="background-color: #fff7ed; border: 2px solid #ea580c; padding: 24px; border-radius: 20px; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <p style="color: #c2410c; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px 0; font-family: ${fontFamily};">
                    ${values.urgent_title || ""}
                </p>
                <p style="color: #7c2d12; font-size: 15px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.4; font-family: ${fontFamily};">
                    Complete your registration details to secure your spot.
                </p>
                <p style="color: #9a3412; font-size: 13px; line-height: 1.5; margin: 0; font-family: ${fontFamily};">
                    ${(values.urgent_body || "").replace(/\n/g, "<br>")}
                </p>
            </div>
            
            <p style="font-family: ${mainBodyFontFamily}; font-size: ${mainBodyFontSize}; ${mainBodyStyles} line-height: 1.7; margin-bottom: 40px; color: #475569;">
                ${greetingHtml}${(values.body_text || "").replace(/\n/g, "<br>")}
            </p>
            
            <div style="text-align: center; margin-top: 10px; margin-bottom: 40px;">
                <a href="{profile_update_link}" target="_blank" style="background-color: #eab308; color: #000000; padding: 16px 32px; border-radius: 16px; font-size: 13px; font-weight: 950; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 4px 12px rgba(234,179,8,0.2); font-family: ${fontFamily};">
                    ${values.button_text || ""}
                </a>
                <p style="font-size: 11px; color: #b45309; margin-top: 10px; margin-bottom: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-family: ${fontFamily};">
                    ⚠️ MUST DO ASAP - Required to finalize registration!
                </p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0; font-family: ${fontFamily};">
                      ${(values.footer_text || "").replace(/\n/g, "<br>")}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.15em; margin: 0; font-family: ${fontFamily};">
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
  } else if (baseKey === "broadcast") {
    html = `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #f1f5f9; border-radius: 40px; background-color: #ffffff; color: ${values.primary_color || ""}; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;">
        ${bannerHtml}
        <tr>
          <td style="padding: 40px; font-family: ${fontFamily}; font-size: ${fontSize};">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 48px;">
              <tr>
                <td align="left" valign="middle">
                  ${badgeHtml}
                </td>
                {logo_html}
              </tr>
            </table>
            <p style="font-family: ${mainBodyFontFamily}; font-size: ${mainBodyFontSize}; ${mainBodyStyles} line-height: 1.7; margin-bottom: 40px; color: #475569;">
                ${greetingHtml}${(values.body_text || "").replace(/\n/g, "<br>")}
            </p>
            ${values.show_details_card !== "false" ? "{details_html}" : ""}
            <p style="font-size: 15px; font-weight: 800; color: ${values.primary_color || ""}; margin-top: 30px;">
                ${(values.signature || "").replace(/\n/g, "<br>")}
            </p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 40px; margin-top: 40px;" />
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <p style="font-size: 11px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; margin-top: 0; font-family: ${fontFamily};">
                      ${(values.footer_text || "").replace(/\n/g, "<br>")}
                  </p>
                  <p style="font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; font-family: ${fontFamily};">
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
  } else if (baseKey === "tournament_matchup") {
    html = `
<div style="font-family: ${fontFamily}; font-size: ${fontSize}; background-color: ${values.primary_color || ""}; color: #ffffff; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
    <div style="text-align: center; margin-bottom: 30px;">
        <span style="background-color: ${values.accent_color || ""}; color: #000000; padding: 8px 16px; border-radius: 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; font-family: ${fontFamily};">Tournament Dispatch</span>
    </div>
    
    <h2 style="font-size: 28px; font-weight: 900; color: #ffffff; margin-bottom: 10px; font-style: italic; text-transform: uppercase; letter-spacing: -0.02em; text-align: center; font-family: ${fontFamily};">
        ${values.heading_title || ""} <span style="color: ${values.accent_color || ""};">${values.heading_subtitle || ""}</span>
    </h2>
    
    <p style="font-family: ${mainBodyFontFamily}; font-size: ${mainBodyFontSize}; color: #9ca3af; text-align: center; margin-bottom: 30px; ${mainBodyStyles}">
        ${(values.body_text || "").replace(/\n/g, "<br>")}
    </p>
 
    <div style="background-color: #090d16; border: 1px solid #1e293b; border-radius: 20px; padding: 24px; margin-bottom: 30px; text-align: center;">
        <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: ${values.accent_color || ""}; margin: 0 0 10px 0; font-family: ${detailsFontFamily};">${values.details_title || ""}</p>
        <p style="font-size: 18px; font-weight: 800; color: #ffffff; margin: 0; font-family: ${detailsFontFamily};">{name} vs {opponent_name}</p>
        <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0; font-family: ${detailsFontFamily};">Sports Tournament Series</p>
    </div>
 
    <div style="background-color: #ffffff; padding: 32px; border-radius: 20px; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
        <img src="{qr_code_url}" width="200" height="200" alt="Check-in QR Code" style="display: block; margin: 0 auto 20px auto; border-radius: 12px;" />
        <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; color: #64748b; margin: 0 0 8px 0; font-family: ${fontFamily};">${values.pin_label || ""}</p>
        <div style="display: inline-block; background-color: #f1f5f9; padding: 8px 20px; border-radius: 10px; border: 1.5px solid #0f172a;">
            <code style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 0.15em; font-family: monospace;">{pin}</code>
        </div>
    </div>
 
    <div style="text-align: center; margin-top: 10px; margin-bottom: 20px;">
      <a href="#" style="background-color: ${values.accent_color || ""}; color: #000000; padding: 12px 24px; border-radius: 8px; font-size: 12px; font-weight: 900; text-decoration: none; text-transform: uppercase; display: inline-block; font-family: ${fontFamily};">
        ${values.button_text || ""}
      </a>
    </div>
 
    <div style="background-color: #1c1917; padding: 20px; border-radius: 16px; border: 1px solid #292524; text-align: center; margin-bottom: 30px;">
        <p style="color: #e7e5e4; font-size: 12px; font-weight: 600; margin: 0; line-height: 1.5; font-family: ${fontFamily};">
            ${(values.footer_text || "").replace(/\n/g, "<br>")}
        </p>
    </div>
</div>`;
  } else if (baseKey === "banner_email") {
    const itineraryHtml = ((values.itinerary_body as string) || "")
      .split("\n")
      .map((line: string) => {
        const parts = line.split(":");
        if (parts.length > 1) {
          return `<div style="margin-bottom: 6px; font-family: ${detailsFontFamily};"><strong>${parts[0].trim()}:</strong> ${parts.slice(1).join(":").trim()}</div>`;
        }
        return `<div style="margin-bottom: 6px; font-family: ${detailsFontFamily};">${line.trim()}</div>`;
      })
      .join("");

    const bringAlongHtml = ((values.bring_along_body as string) || "")
      .split("\n")
      .map((line: string) => `<div style="margin-bottom: 4px; font-family: ${detailsFontFamily};">${line.trim()}</div>`)
      .join("");

    const includedHtml = ((values.included_body as string) || "")
      .split("\n")
      .map((line: string) => `<li style="margin-bottom: 4px; font-family: ${detailsFontFamily};">${line.trim()}</li>`)
      .join("");

    html = `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; table-layout: fixed; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; border: 1px solid #27272a; border-radius: 40px; background-color: ${values.primary_color || "#18181b"}; color: #f5f5f4; box-shadow: 0 20px 50px rgba(0,0,0,0.3); overflow: hidden; border-collapse: separate;">
        ${bannerHtml}
        <tr>
          <td style="padding: 40px; font-family: ${fontFamily}; font-size: ${fontSize};">
            <p style="font-family: ${mainBodyFontFamily}; font-size: ${mainBodyFontSize}; ${mainBodyStyles} line-height: 1.7; margin-bottom: 24px; color: #e7e5e4;">
                Dear <strong>{first_name}</strong>,
            </p>
            <p style="font-family: ${mainBodyFontFamily}; font-size: ${mainBodyFontSize}; ${mainBodyStyles} line-height: 1.7; margin-bottom: 32px; color: #d6d3d1;">
                ${(values.body_text || "").replace(/\n/g, "<br>")}
            </p>
            
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-top: 1px solid #27272a; padding-top: 32px; margin-top: 32px;">
              <tr>
                <td width="45%" valign="bottom" style="padding-right: 20px; font-family: ${fontFamily}; font-size: ${fontSize}; color: #e7e5e4;">
                  <p style="font-size: 13px; color: #a1a1aa; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; font-family: ${fontFamily};">Kind regards,</p>
                  <p style="font-size: 16px; font-weight: 900; color: ${values.accent_color || "#ec4899"}; margin: 0 0 4px 0; text-transform: uppercase; font-family: ${fontFamily};">${values.heading_title || ""} ${values.heading_subtitle || ""}</p>
                  <a href="mailto:events@maziv.com" style="font-size: 13px; color: #38bdf8; text-decoration: underline; font-family: ${fontFamily};">${values.footer_text || ""}</a>
                </td>
                <td width="5%" style="border-right: 1px solid #27272a;">&nbsp;</td>
                <td width="50%" valign="top" style="padding-left: 20px; text-align: center; font-family: ${fontFamily}; color: #e7e5e4;">
                  <div style="margin-bottom: 32px;">
                    <h4 style="font-size: 13px; font-weight: 900; color: ${values.accent_color || "#ec4899"}; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1.5px solid ${values.accent_color || "#ec4899"}; display: inline-block; padding-bottom: 4px; margin: 0 0 16px 0; font-family: ${fontFamily};">
                      ${values.itinerary_title || ""}
                    </h4>
                    <div style="font-size: 13px; line-height: 1.8; color: #e7e5e4; font-family: ${fontFamily}; text-align: center;">
                      ${itineraryHtml}
                    </div>
                  </div>

                  <div style="margin-bottom: 32px;">
                    <h4 style="font-size: 13px; font-weight: 900; color: ${values.accent_color || "#ec4899"}; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1.5px solid ${values.accent_color || "#ec4899"}; display: inline-block; padding-bottom: 4px; margin: 0 0 16px 0; font-family: ${fontFamily};">
                      ${values.bring_along_title || ""}
                    </h4>
                    <div style="font-size: 13px; line-height: 1.8; color: #d6d3d1; margin-bottom: 12px; font-family: ${fontFamily}; text-align: center;">
                      ${bringAlongHtml}
                    </div>
                    <p style="font-size: 11px; font-style: italic; font-weight: bold; color: ${values.accent_color || "#ec4899"}; margin: 0; font-family: ${fontFamily};">
                      ${values.bring_along_note || ""}
                    </p>
                  </div>

                  <div>
                    <h4 style="font-size: 12px; font-weight: 900; color: ${values.accent_color || "#ec4899"}; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0; font-family: ${fontFamily};">
                      ${values.included_title || ""}
                    </h4>
                    <ul style="display: inline-block; text-align: left; font-size: 13px; color: #d6d3d1; margin: 0; padding-left: 20px; line-height: 1.8; font-family: ${fontFamily};">
                      ${includedHtml}
                    </ul>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
  }
  return (metaComment + "\n" + html).trim();
};


export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = (session?.user as any)?.role || "staff";

  // Tab State
  const [activeTab, setActiveTab] = useState<"templates" | "global" | "registration">("templates");

  // ==========================================
  // EMAIL TEMPLATE STATES
  // ==========================================
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("registration_confirmed");
  const baseKey = resolveBaseTemplateKey(selectedKey, templates);
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

  // Create / Delete template modal state
  const SYSTEM_TEMPLATE_KEYS = new Set(["registration_confirmed","registration_declined","partner_pending","broadcast","tournament_matchup","banner_email"]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplKey, setNewTplKey] = useState("");
  const [creatingTpl, setCreatingTpl] = useState(false);
  const [deletingTplKey, setDeletingTplKey] = useState<string | null>(null);
  const [duplicateSubject, setDuplicateSubject] = useState("");
  const [duplicateBodyHtml, setDuplicateBodyHtml] = useState("");

  const [editorMode, setEditorMode] = useState<"visual" | "html">("visual");
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  const saveSelection = () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range;
      }
    }
  };

  const restoreSelection = () => {
    if (typeof window === "undefined" || !savedSelectionRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  // Synchronize contentEditable editor when template or tab changes
  // Synchronize contentEditable editor when template, tab, mode or values change
  useEffect(() => {
    if (activeTab === "templates" && editorRef.current && editorMode === "visual") {
      const current = templates.find((t) => t.key === selectedKey);
      const defaults = DEFAULT_FORM_FIELDS[baseKey] || {};
      
      // Get the current source of truth for body text
      // If we have unsaved changes, use the current formValues.body_text
      // Otherwise, load from the saved template meta
      const bodyVal = hasUnsavedChanges 
        ? (formValues.body_text || "")
        : (current ? (parseTemplateMeta(current.body_html)?.body_text || defaults.body_text || "") : "");
        
      if (document.activeElement !== editorRef.current && editorRef.current.innerHTML !== bodyVal) {
        editorRef.current.innerHTML = bodyVal;
      }
    }
  }, [selectedKey, baseKey, activeTab, templates, editorMode, hasUnsavedChanges, formValues.body_text]);

  // ==========================================
  // GLOBAL SETTINGS STATES
  // ==========================================
  const [config, setConfig] = useState({
    primary_color: "#0f172a",
    accent_color: "#94a3b8",
    engagementDetailsColor: "",
    attendeePassBgColor: "",
    heading_text: "Access Granted.",
    body_text: "Your registration for **{event_title}** has been confirmed. Below are your secure credentials for terminal verification.",
    footer_text: "Automated Event Management System\nSecurity Tier: Level 4 Authorized",
    logo_url: "",
    sender_name: "BMD-EventHub",
    sender_email: "",
    font_family: "Calibri, sans-serif",
    font_size: "16px",
    show_banner_in_email: false,
    confirmation_template_key: "registration_confirmed",
    banner_url: ""
  });
  const [senderEmails, setSenderEmails] = useState<string[]>([]);
  const [newSenderEmail, setNewSenderEmail] = useState("");
  const [isSavingSenderEmails, setIsSavingSenderEmails] = useState(false);

  const saveApprovedSenderEmails = async (updatedList: string[]) => {
    setIsSavingSenderEmails(true);
    try {
      const res = await fetch("/api/py/settings/sender-emails", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({ emails: updatedList })
      });
      if (res.ok) {
        setSenderEmails(updatedList);
      } else {
        const err = await res.json();
        alert(`Failed to save: ${err.detail || "Unknown error"}`);
      }
    } catch (e) {
      alert("Network error: failed to update approved sender emails.");
    } finally {
      setIsSavingSenderEmails(false);
    }
  };
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
  }, [session?.user?.email, userRole]);

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
            
            const meta = parseTemplateMeta(current.body_html);
            setFormValues(normalizeFormValues(meta, baseKey));
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
  }, [session?.user?.email, sessionStatus, selectedKey, baseKey, userRole]);

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
  }, [bodyHtml, selectedKey, baseKey, activeTab, userRole]);

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

  // Re-compile template preview when font, size or banner config changes
  useEffect(() => {
    if (activeTab === "templates") {
      const compiled = compileTemplateHtml(baseKey, formValues, config.font_family, config.font_size, config);
      setBodyHtml(compiled);
    }
  }, [config.font_family, config.font_size, config.show_banner_in_email, selectedKey, baseKey, activeTab]);


  // ==========================================
  // EMAIL TEMPLATES HANDLERS
  // ==========================================

  const triggerEditorChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setFormValues(prev => ({ ...prev, body_text: html }));
      const compiled = compileTemplateHtml(baseKey, { ...formValues, body_text: html }, config.font_family, config.font_size, config);
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
    restoreSelection();
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
      handleSectionStyleChange("mainBodyMessage", "fontFamily", fontFamily);
    }
  };

  const applyFontSize = (size: string) => {
    restoreSelection();
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
      handleSectionStyleChange("mainBodyMessage", "fontSize", size);
    }
  };

  // Compile preview HTML locally
  const getPreviewHtml = () => {
    const activeFont = config.font_family || "Calibri, sans-serif";
    const sections = formValues.sections || {};
    const detailsFont = sections.engagementDetails?.fontFamily || activeFont;
    const alertFont = sections.alertNote?.fontFamily || activeFont;
    const alertFontSize = sections.alertNote?.fontSize || "14px";

    const getWeightStyleValues = (fontStyleWeight?: string, defaultWeight = "400", defaultStyle = "normal") => {
      if (!fontStyleWeight) return { weight: defaultWeight, style: defaultStyle };
      const lower = fontStyleWeight.toLowerCase();
      let weight = defaultWeight;
      let style = defaultStyle;
      
      if (lower.includes("light")) weight = "300";
      else if (lower.includes("regular")) weight = "400";
      else if (lower.includes("bold")) weight = "700";
      else if (lower.includes("black")) weight = "900";
      
      if (lower.includes("italic")) style = "italic";
      else style = "normal";
      
      return { weight, style };
    };

    const detailsStyles = getWeightStyleValues(sections.engagementDetails?.fontStyleWeight, "700", "normal");
    
    let html = bodyHtml;
    const baseKey = resolveBaseTemplateKey(selectedKey, templates);
    const mockVars = { ...(MOCK_PREVIEW_DATA[baseKey] || {}) };
    
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
        logoHtmlStr = `<td align="right" valign="middle"><div style="background-color:${primaryCol};padding:8px 16px;border-radius:8px;color:#fff;font-weight:bold;font-size:14px;display:inline-block;font-family:${activeFont};">${logoText}</div></td>`;
      }
    }
    
    mockVars.logo_html = logoHtmlStr;

    // Dynamically replace theme colors, details title, and font-family in mock blocks
    if (mockVars.details_html) {
      const detailsTitle = formValues.details_title || "Matchup Details";
      const engagementTitle = formValues.engagement_title || "Engagement Details";
      const engCol = formValues.engagementDetailsColor || config.engagementDetailsColor || primaryCol;
      mockVars.details_html = mockVars.details_html
        .replaceAll("#ENG_COLOR#", engCol)
        .replaceAll("#0f172a", primaryCol)
        .replaceAll("#eab308", accentCol)
        .replaceAll("font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;", `font-family: ${detailsFont};`)
        .replaceAll("font-family: sans-serif;", `font-family: ${detailsFont};`)
        .replaceAll("font-weight: 900;", `font-weight: ${detailsStyles.weight}; font-style: ${detailsStyles.style};`)
        .replaceAll("font-weight: 800;", `font-weight: ${detailsStyles.weight}; font-style: ${detailsStyles.style};`)
        .replaceAll("font-weight: 700;", `font-weight: ${detailsStyles.weight}; font-style: ${detailsStyles.style};`)
        .replace("Matchup Details", detailsTitle)
        .replace("Engagement Details", engagementTitle);
    }
    if (mockVars.qr_block_html) {
      const showQr = formValues.show_qr_code !== "false";
      const showPin = formValues.show_pin !== "false";

      if (!showQr && !showPin) {
        mockVars.qr_block_html = "";
      } else {
        const qrSnippet = showQr
          ? `<div style="width: 200px; height: 200px; background-color: ${primaryCol}; margin: 0 auto 32px auto; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: bold; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);">[QR CODE PREVIEW]</div>`
          : "";

        const pinSnippet = showPin
          ? `<p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: #64748b; margin-bottom: 16px; font-family: ${activeFont};">unique access pass number</p>
            <div style="display: inline-block; background: #ffffff; padding: 16px 32px; border-radius: 20px; border: 2px solid ${primaryCol}; font-family: ${activeFont};">
              <code style="font-size: 32px; font-weight: 900; color: ${primaryCol}; letter-spacing: 0.25em; font-family: monospace;">ABCDEF</code>
            </div>`
          : "";

        mockVars.qr_block_html = `
        <div style="background: #f8fafc; padding: 48px; border-radius: 32px; text-align: center; border: 1px solid #f1f5f9; margin-bottom: 40px; position: relative; overflow: hidden; font-family: ${activeFont};">
          ${qrSnippet}
          ${pinSnippet}
        </div>`;
      }
    }
    if (mockVars.warning_block_html) {
      mockVars.warning_block_html = mockVars.warning_block_html
        .replaceAll("#b45309", accentCol === "#eab308" ? "#b45309" : accentCol)
        .replaceAll("font-family: sans-serif;", `font-family: ${activeFont};`);
    }
    if (mockVars.button_block_html) {
      mockVars.button_block_html = mockVars.button_block_html
        .replaceAll("#0f172a", primaryCol)
        .replaceAll("#eab308", accentCol)
        .replaceAll("font-family: sans-serif;", `font-family: ${activeFont};`);
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

    // Collapse logo spacer table if badge and logo are both hidden
    const showBadge = formValues.show_badge !== "false";
    if (!showBadge && !showLogo) {
      const emptyHeaderTablePattern = /<table[^>]*>\s*<tr>\s*<td[^>]*>\s*<\/td>\s*<\/tr>\s*<\/table>/gi;
      html = html.replace(emptyHeaderTablePattern, '');
    }

    // Clean up nested divs inside paragraph tags to avoid rendering issues
    try {
      html = html.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, pAttrs, pContent) => {
        const cleanedContent = pContent.replace(/<\/?div[^>]*>/gi, '<br>');
        return `<p${pAttrs}>${cleanedContent}</p>`;
      });
      html = html.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
    } catch (e) {
      console.error("Error sanitizing nested divs in preview HTML:", e);
    }
    
    return unescapeHtmlLinks(html);
  };

  const handleCreateTemplate = async () => {
    if (!newTplName.trim() || !newTplKey.trim()) return;
    setCreatingTpl(true);
    try {
      const payload: any = { key: newTplKey.trim(), name: newTplName.trim() };
      if (duplicateSubject) {
        payload.subject = duplicateSubject;
      }
      if (duplicateBodyHtml) {
        payload.body_html = duplicateBodyHtml;
      }
      
      const res = await fetch("/api/py/settings/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": (session?.user?.email || "") },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setTemplateNotification({ type: "error", text: err.detail || "Failed to create template" });
        return;
      }
      const created: EmailTemplate = await res.json();
      setTemplates(prev => [...prev, created]);
      setSelectedKey(created.key);
      setSubject(created.subject);
      setBodyHtml(created.body_html);
      setShowCreateModal(false);
      setNewTplName("");
      setNewTplKey("");
      setDuplicateSubject("");
      setDuplicateBodyHtml("");
      setTemplateNotification({ type: "success", text: `Template "${created.name}" created successfully.` });
    } catch (e) {
      setTemplateNotification({ type: "error", text: "Network error creating template." });
    } finally {
      setCreatingTpl(false);
    }
  };


  const handleDeleteTemplate = async (key: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the template "${name}"? Any events using it will revert to the system default.`)) return;
    setDeletingTplKey(key);
    try {
      const res = await fetch(`/api/py/settings/templates/${key}`, {
        method: "DELETE",
        headers: { "x-user-email": (session?.user?.email || "") },
      });
      if (!res.ok) {
        const err = await res.json();
        setTemplateNotification({ type: "error", text: err.detail || "Failed to delete template" });
        return;
      }
      setTemplates(prev => prev.filter(t => t.key !== key));
      // If the deleted template was selected, fall back to first system template
      if (selectedKey === key) {
        const fallback = templates.find(t => t.key !== key);
        if (fallback) {
          setSelectedKey(fallback.key);
          setSubject(fallback.subject);
          setBodyHtml(fallback.body_html);
        }
      }
      setTemplateNotification({ type: "success", text: `Template "${name}" deleted.` });
    } catch (e) {
      setTemplateNotification({ type: "error", text: "Network error deleting template." });
    } finally {
      setDeletingTplKey(null);
    }
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
      setFormValues(normalizeFormValues(meta, resolveBaseTemplateKey(key, templates)));
    }
  };

  const handleFormChange = (field: string, val: string) => {
    const nextValues = { ...formValues, [field]: val };
    // sync text value back to mainBodyMessage.text if body_text changes
    if (field === "body_text" && nextValues.sections?.mainBodyMessage) {
      nextValues.sections.mainBodyMessage.text = val;
    }
    setFormValues(nextValues);
    const compiled = compileTemplateHtml(baseKey, nextValues, config.font_family, config.font_size, config);
    setBodyHtml(compiled);
    setHasUnsavedChanges(true);
  };

  const handleSectionStyleChange = (section: string, property: string, value: string) => {
    const nextSections = {
      ...(formValues.sections || {}),
      [section]: {
        ...(formValues.sections?.[section] || {}),
        [property]: value
      }
    };
    const nextValues = {
      ...formValues,
      sections: nextSections
    };
    setFormValues(nextValues);
    const compiled = compileTemplateHtml(baseKey, nextValues, config.font_family, config.font_size, config);
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
        
        const meta = parseTemplateMeta(resetTemplate.body_html);
        setFormValues(normalizeFormValues(meta, baseKey));
        
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
        setFormValues(normalizeFormValues(meta, selectedKey));
      }
    }
    setEditorMode(mode);
  };

  const uploadImageFile = async (file: File, onUploadSuccess: (url: string) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/py/media/upload", {
        method: "POST",
        headers: {
          "x-user-email": session?.user?.email || ""
        },
        body: formData
      });
      if (!res.ok) {
        throw new Error("Failed to upload image to media server");
      }
      const data = await res.json();
      onUploadSuccess(data.url);
    } catch (err: any) {
      console.error("Image upload failed, falling back to base64 encoding", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        onUploadSuccess(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  // ==========================================
  // GLOBAL SETTINGS HANDLERS
  // ==========================================

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageFile(file, (url) => {
        setConfig(prev => ({ ...prev, logo_url: url }));
      });
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
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                if (!confirm("You have unsaved template changes. Switching tabs will lose these changes. Proceed?")) {
                  return;
                }
              }
              setActiveTab("registration");
            }}
            className={`px-8 py-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 -mb-[2px] ${
              activeTab === "registration"
                ? "border-yellow-400 text-[#0f172a] dark:text-white"
                : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
            }`}
          >
            Registration Forms
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
                  <div className="flex items-center justify-between ml-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                      Select Template
                    </h3>
                    <button
                      onClick={() => { setNewTplName(""); setNewTplKey(""); setDuplicateSubject(""); setDuplicateBodyHtml(""); setShowCreateModal(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                    >
                      <Plus size={11} />
                      New Template
                    </button>
                  </div>
                  <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 space-y-2">
                    {templates.map((t) => {
                      const Icon = TEMPLATE_ICONS[t.key] || Mail;
                      const isSelected = t.key === selectedKey;
                      const isSystem = SYSTEM_TEMPLATE_KEYS.has(t.key);
                      return (
                        <div key={t.key} className="relative group/row font-bold">
                          <button
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
                            <div className="flex-1 min-w-0 pr-16">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold truncate">{t.name}</p>
                                {isSystem && (
                                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">System</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{t.key}</p>
                            </div>
                            <ChevronRight size={14} className={`opacity-40 transition-transform ${isSelected ? "translate-x-1" : ""}`} />
                          </button>
                          
                          {/* Copy button — available for ALL templates */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewTplName(`${t.name} (Copy)`);
                              setNewTplKey(`${t.key}_copy`);
                              setDuplicateSubject(t.subject || "");
                              setDuplicateBodyHtml(t.body_html || "");
                              setShowCreateModal(true);
                            }}
                            title="Copy template"
                            className={`absolute ${isSystem ? "right-14" : "right-24"} top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity p-2 rounded-xl text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                          >
                            <Copy size={14} />
                          </button>

                          {/* Delete button — only for custom (non-system) templates */}
                          {!isSystem && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.key, t.name); }}
                              disabled={deletingTplKey === t.key}
                              title="Delete template"
                              className="absolute right-14 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              {deletingTplKey === t.key ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>


                {/* Create Template Modal */}
                <AnimatePresence>
                  {showCreateModal && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                      onClick={() => setShowCreateModal(false)}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-[#0f172a] rounded-[2rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md mx-4"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-black text-[#0f172a] dark:text-white">{duplicateSubject ? "Copy Template" : "Create New Template"}</h3>
                          <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            <X size={18} className="text-slate-400" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Template Name</label>
                            <input
                              type="text"
                              value={newTplName}
                              onChange={(e) => {
                                setNewTplName(e.target.value);
                                // Auto-generate key from name
                                setNewTplKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
                              }}
                              placeholder="e.g. Maziv Golf Day Invite"
                              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              autoFocus
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Template Key (slug)</label>
                            <input
                              type="text"
                              value={newTplKey}
                              onChange={(e) => setNewTplKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                              placeholder="e.g. maziv_golf_invite"
                              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-mono text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                            <p className="text-[10px] text-slate-400">Lowercase letters, numbers and underscores only. Cannot be changed later.</p>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() => setShowCreateModal(false)}
                              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleCreateTemplate}
                              disabled={creatingTpl || !newTplName.trim() || !newTplKey.trim()}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0f172a] text-white font-black text-sm hover:bg-[#1e293b] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                              {creatingTpl ? <Loader2 size={16} className="animate-spin" /> : (duplicateSubject ? <Copy size={16} /> : <Plus size={16} />)}
                              {duplicateSubject ? "Copy Template" : "Create Template"}
                            </button>
                          </div>

                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                      {CHEATSHEET_VARIABLES[baseKey]?.map((variable) => {
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
                               <div className="flex flex-wrap gap-[1.5rem] pt-1">
                              <div className="space-y-2 flex-1 min-w-[200px] max-w-[280px]">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                  Primary Color
                                </label>
                                <div className="flex gap-2.5">
                                  <input 
                                    type="color"
                                    value={formValues.primary_color || "#0f172a"}
                                    onChange={(e) => handleFormChange("primary_color", e.target.value)}
                                    className="w-12 h-12 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 shrink-0"
                                  />
                                  <input 
                                    type="text"
                                    value={formValues.primary_color || ""}
                                    onChange={(e) => handleFormChange("primary_color", e.target.value)}
                                    placeholder="#000000"
                                    className="w-28 px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                  />
                                </div>
                              </div>

                              {baseKey !== "broadcast" && (
                                <div className="space-y-2 flex-1 min-w-[200px] max-w-[280px]">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                    Accent Color
                                  </label>
                                  <div className="flex gap-2.5">
                                    <input 
                                      type="color"
                                      value={formValues.accent_color || "#eab308"}
                                      onChange={(e) => handleFormChange("accent_color", e.target.value)}
                                      className="w-12 h-12 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 shrink-0"
                                    />
                                    <input 
                                      type="text"
                                      value={formValues.accent_color || ""}
                                      onChange={(e) => handleFormChange("accent_color", e.target.value)}
                                      placeholder="#000000"
                                      className="w-28 px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2 flex-1 min-w-[200px] max-w-[280px]">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                  Engagement Details Color
                                </label>
                                <div className="flex gap-2.5">
                                  <input 
                                    type="color"
                                    value={formValues.engagementDetailsColor || formValues.primary_color || "#0f172a"}
                                    onChange={(e) => handleFormChange("engagementDetailsColor", e.target.value)}
                                    className="w-12 h-12 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 shrink-0"
                                  />
                                  <input 
                                    type="text"
                                    value={formValues.engagementDetailsColor || ""}
                                    onChange={(e) => handleFormChange("engagementDetailsColor", e.target.value)}
                                    placeholder="#000000"
                                    className="w-28 px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2 flex-1 min-w-[200px] max-w-[280px]">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                  Attendee Pass Color
                                </label>
                                <div className="flex gap-2.5">
                                  <input 
                                    type="color"
                                    value={formValues.attendeePassBgColor || "#000000"}
                                    onChange={(e) => handleFormChange("attendeePassBgColor", e.target.value)}
                                    className="w-12 h-12 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 shrink-0"
                                  />
                                  <input 
                                    type="text"
                                    value={formValues.attendeePassBgColor || ""}
                                    onChange={(e) => handleFormChange("attendeePassBgColor", e.target.value)}
                                    placeholder="#000000"
                                    className="w-28 px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                  />
                                </div>
                              </div>
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
                                              uploadImageFile(file, (url) => {
                                                handleFormChange("logo_image_url", url);
                                              });
                                            }
                                          }}
                                          onClick={() => {
                                            const input = document.createElement("input");
                                            input.type = "file";
                                            input.accept = "image/*";
                                            input.onchange = (e) => {
                                              const file = (e.target as HTMLInputElement).files?.[0];
                                              if (file) {
                                                uploadImageFile(file, (url) => {
                                                  handleFormChange("logo_image_url", url);
                                                });
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

                          {/* Modular Confirmation Email Builder Section (rendered unconditionally) */}
                          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a] dark:text-white flex items-center gap-2">
                              <Sparkles size={12} className="text-yellow-500" />
                              Modular Ticket Elements
                            </h4>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                  Show QR Code in Email
                                </label>
                                <input
                                  type="checkbox"
                                  checked={formValues.show_qr_code !== "false"}
                                  onChange={(e) => handleFormChange("show_qr_code", e.target.checked ? "true" : "false")}
                                  className="w-4 h-4 text-yellow-500 bg-slate-100 border-slate-300 rounded focus:ring-yellow-500 focus:ring-2 dark:bg-slate-800"
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                  Show Unique Pass PIN in Email
                                </label>
                                <input
                                  type="checkbox"
                                  checked={formValues.show_pin !== "false"}
                                  onChange={(e) => handleFormChange("show_pin", e.target.checked ? "true" : "false")}
                                  className="w-4 h-4 text-yellow-500 bg-slate-100 border-slate-300 rounded focus:ring-yellow-500 focus:ring-2 dark:bg-slate-800"
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                  Show Event Details Card
                                </label>
                                <input
                                  type="checkbox"
                                  checked={formValues.show_details_card !== "false"}
                                  onChange={(e) => handleFormChange("show_details_card", e.target.checked ? "true" : "false")}
                                  className="w-4 h-4 text-yellow-500 bg-slate-100 border-slate-300 rounded focus:ring-yellow-500 focus:ring-2 dark:bg-slate-800"
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                  Show Action Button
                                </label>
                                <input
                                  type="checkbox"
                                  checked={formValues.show_button !== "false"}
                                  onChange={(e) => handleFormChange("show_button", e.target.checked ? "true" : "false")}
                                  className="w-4 h-4 text-yellow-500 bg-slate-100 border-slate-300 rounded focus:ring-yellow-500 focus:ring-2 dark:bg-slate-800"
                                />
                              </div>

                              {formValues.show_button !== "false" && (
                                <div className="space-y-1.5 pt-1">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                    Action Button Text
                                  </label>
                                  <input
                                    type="text"
                                    value={formValues.button_text || ""}
                                    onChange={(e) => handleFormChange("button_text", e.target.value)}
                                    placeholder="e.g. Update Details"
                                    className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                  />
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                  Show Attendee Pass Badge
                                </label>
                                <input
                                  type="checkbox"
                                  checked={formValues.show_badge !== "false"}
                                  onChange={(e) => handleFormChange("show_badge", e.target.checked ? "true" : "false")}
                                  className="w-4 h-4 text-yellow-500 bg-slate-100 border-slate-300 rounded focus:ring-yellow-500 focus:ring-2 dark:bg-slate-800"
                                />
                              </div>

                              {formValues.show_badge !== "false" && (
                                <div className="space-y-1.5 pt-1">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                    Badge Text
                                  </label>
                                  <input
                                    type="text"
                                    value={formValues.badge_text || ""}
                                    onChange={(e) => handleFormChange("badge_text", e.target.value)}
                                    placeholder="e.g. Attendee Pass"
                                    className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Email Banner Section */}
                          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a] dark:text-white flex items-center gap-2">
                              <Image size={12} className="text-blue-500" />
                              Email Banner Image
                            </h4>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                  Show Banner in Email
                                </label>
                                <input
                                  type="checkbox"
                                  checked={formValues.show_banner === "true"}
                                  onChange={(e) => handleFormChange("show_banner", e.target.checked ? "true" : "false")}
                                  className="w-4 h-4 text-yellow-500 bg-slate-100 border-slate-300 rounded focus:ring-yellow-500 focus:ring-2 dark:bg-slate-800"
                                />
                              </div>

                              {formValues.show_banner === "true" && (
                                <>
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                      Upload Email Banner File
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
                                          uploadImageFile(file, (url) => {
                                            handleFormChange("banner_image_url", url);
                                          });
                                        }
                                      }}
                                      onClick={() => {
                                        const input = document.createElement("input");
                                        input.type = "file";
                                        input.accept = "image/*";
                                        input.onchange = (e) => {
                                          const file = (e.target as HTMLInputElement).files?.[0];
                                          if (file) {
                                            uploadImageFile(file, (url) => {
                                              handleFormChange("banner_image_url", url);
                                            });
                                          }
                                        };
                                        input.click();
                                      }}
                                      className="w-full h-28 rounded-2xl border-2 border-dashed border-slate-200 hover:border-yellow-400/50 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-slate-100/30 group relative overflow-hidden"
                                    >
                                      {formValues.banner_image_url ? (
                                        <div className="relative w-full h-full p-2 flex items-center justify-center">
                                          <img src={formValues.banner_image_url} alt="Email Banner" className="max-h-full max-w-full object-contain" />
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleFormChange("banner_image_url", "");
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-[10px] font-black uppercase shadow-md transition-all"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <Upload className="text-slate-400 group-hover:text-yellow-500 transition-colors mb-1" size={24} />
                                          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">Drag & Drop Banner Here</span>
                                          <span className="text-[9px] text-slate-400 font-medium">Or click to browse files</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                      Or enter Email Banner Image URL
                                    </label>
                                    <input
                                      type="text"
                                      value={formValues.banner_image_url || ""}
                                      onChange={(e) => handleFormChange("banner_image_url", e.target.value)}
                                      placeholder="https://example.com/banner.png"
                                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-medium text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Header Titles Section */}
                          {["registration_confirmed", "registration_declined", "partner_pending", "tournament_matchup"].includes(baseKey) && (
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
                          {baseKey === "partner_pending" && (
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                  On-screen Post-Reg Title
                                </label>
                                <input
                                  type="text"
                                  value={formValues.onscreen_title || ""}
                                  onChange={(e) => handleFormChange("onscreen_title", e.target.value)}
                                  placeholder="e.g. YOUR REGISTRATION HAS BEEN CONFIRMED."
                                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                  On-screen Post-Reg Description
                                </label>
                                <textarea
                                  rows={1}
                                  value={formValues.onscreen_description || ""}
                                  onChange={(e) => handleFormChange("onscreen_description", e.target.value)}
                                  placeholder="e.g. Your registration is complete."
                                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-medium text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
                                />
                              </div>
                            </div>
                            
                            {(() => {
                              const predefinedPrefixes = ["Hello", "Dear", "Hi", "None"];
                              const currentPrefix = formValues.greeting_prefix || "Hello";
                              const isCustomPrefix = !predefinedPrefixes.includes(currentPrefix);
                              
                              const nameType = formValues.greeting_name_type || "first_name";
                              const customName = formValues.greeting_name_custom || "";

                              return (
                                <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Greeting Prefix */}
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                        Greeting Prefix
                                      </label>
                                      <div className="flex gap-2">
                                        <select
                                          value={isCustomPrefix ? "Custom" : currentPrefix}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "Custom") {
                                              handleFormChange("greeting_prefix", "Custom prefix...");
                                            } else {
                                              handleFormChange("greeting_prefix", val);
                                            }
                                          }}
                                          className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        >
                                          <option value="Hello">Hello</option>
                                          <option value="Dear">Dear</option>
                                          <option value="Hi">Hi</option>
                                          <option value="None">None (No prefix)</option>
                                          <option value="Custom">Custom...</option>
                                        </select>
                                        
                                        {(isCustomPrefix || currentPrefix === "Custom prefix...") && (
                                          <input
                                            type="text"
                                            value={currentPrefix === "Custom prefix..." ? "" : currentPrefix}
                                            onChange={(e) => handleFormChange("greeting_prefix", e.target.value)}
                                            placeholder="e.g. Greetings"
                                            className="w-32 px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                          />
                                        )}
                                      </div>
                                    </div>

                                    {/* Greeting Name */}
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                        Greeting Name
                                      </label>
                                      <div className="flex gap-2">
                                        <select
                                          value={nameType}
                                          onChange={(e) => handleFormChange("greeting_name_type", e.target.value)}
                                          className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        >
                                          <option value="first_name">First Name (John)</option>
                                          <option value="full_name">Full Name (John Doe)</option>
                                          <option value="custom">Custom Text...</option>
                                          <option value="none">None (No Name)</option>
                                        </select>

                                        {nameType === "custom" && (
                                          <input
                                            type="text"
                                            value={customName}
                                            onChange={(e) => handleFormChange("greeting_name_custom", e.target.value)}
                                            placeholder="e.g. Guest"
                                            className="w-32 px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                Main Body Message
                              </label>
                              <RichTextEditor 
                                value={formValues.body_text || ""}
                                onChange={(val) => {
                                  const nextSections = {
                                    ...(formValues.sections || {}),
                                    mainBodyMessage: {
                                      ...(formValues.sections?.mainBodyMessage || {}),
                                      text: val
                                    }
                                  };
                                  const nextValues = {
                                    ...formValues,
                                    body_text: val,
                                    sections: nextSections
                                  };
                                  setFormValues(nextValues);
                                  const compiled = compileTemplateHtml(baseKey, nextValues, config.font_family, config.font_size, config);
                                  setBodyHtml(compiled);
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="Type the main body of the email..."
                                minHeight="250px"
                                availableTokens={["{first_name}", "{event_title}", "{to_email}", "{pin}"]}
                              />
                            </div>

                            {/* Warning copy for Confirmation Template */}
                             {baseKey === "registration_confirmed" && (
                               <div className="space-y-3">
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
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                        Alert Font Family
                                      </label>
                                      <select
                                        value={formValues.sections?.alertNote?.fontFamily || "Calibri, sans-serif"}
                                        onChange={(e) => handleSectionStyleChange("alertNote", "fontFamily", e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none text-xs font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                      >
                                        <option value="Calibri, sans-serif">Calibri</option>
                                        <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</option>
                                        <option value="'Inter', sans-serif">Inter</option>
                                        <option value="'Outfit', sans-serif">Outfit</option>
                                        <option value="'Bricolage Grotesque', sans-serif">Bricolage</option>
                                        <option value="Georgia, serif">Georgia</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                        Alert Font Size
                                      </label>
                                      <select
                                        value={formValues.sections?.alertNote?.fontSize || "14px"}
                                        onChange={(e) => handleSectionStyleChange("alertNote", "fontSize", e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none text-xs font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                      >
                                        <option value="12px">12px</option>
                                        <option value="13px">13px</option>
                                        <option value="14px">14px</option>
                                        <option value="15px">15px</option>
                                        <option value="16px">16px</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                        Alert Font Style & Weight
                                      </label>
                                      <select
                                        value={formValues.sections?.alertNote?.fontStyleWeight || "Regular"}
                                        onChange={(e) => handleSectionStyleChange("alertNote", "fontStyleWeight", e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none text-xs font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                      >
                                        <option value="Light">Light</option>
                                        <option value="Light Italic">Light Italic</option>
                                        <option value="Regular">Regular</option>
                                        <option value="Regular Italic">Regular Italic</option>
                                        <option value="Bold">Bold</option>
                                        <option value="Bold Italic">Bold Italic</option>
                                        <option value="Black">Black</option>
                                        <option value="Black Italic">Black Italic</option>
                                      </select>
                                    </div>
                                  </div>
                               </div>
                             )}

                            {/* Button text config */}
                            {["partner_pending", "tournament_matchup"].includes(baseKey) && (
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
                            {baseKey === "broadcast" && (
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
                            {["registration_confirmed", "partner_pending", "tournament_matchup"].includes(baseKey) && (
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

                                {["registration_confirmed", "partner_pending"].includes(baseKey) && (
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
                                
                                {baseKey === "tournament_matchup" && (
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

                            {["registration_confirmed", "partner_pending", "tournament_matchup", "banner_email"].includes(baseKey) && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                    Engagement Font Family
                                  </label>
                                  <select
                                    value={formValues.sections?.engagementDetails?.fontFamily || "Calibri, sans-serif"}
                                    onChange={(e) => handleSectionStyleChange("engagementDetails", "fontFamily", e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none text-xs font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                  >
                                    <option value="Calibri, sans-serif">Calibri</option>
                                    <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</option>
                                    <option value="'Inter', sans-serif">Inter</option>
                                    <option value="'Outfit', sans-serif">Outfit</option>
                                    <option value="'Bricolage Grotesque', sans-serif">Bricolage</option>
                                    <option value="Georgia, serif">Georgia</option>
                                  </select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                    Engagement Font Size
                                  </label>
                                  <select
                                    value={formValues.sections?.engagementDetails?.fontSize || "14px"}
                                    onChange={(e) => handleSectionStyleChange("engagementDetails", "fontSize", e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none text-xs font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                  >
                                    <option value="12px">12px</option>
                                    <option value="13px">13px</option>
                                    <option value="14px">14px</option>
                                    <option value="15px">15px</option>
                                    <option value="16px">16px</option>
                                  </select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                    Engagement Font Style & Weight
                                  </label>
                                  <select
                                    value={formValues.sections?.engagementDetails?.fontStyleWeight || "Regular"}
                                    onChange={(e) => handleSectionStyleChange("engagementDetails", "fontStyleWeight", e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none text-xs font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                  >
                                    <option value="Light">Light</option>
                                    <option value="Light Italic">Light Italic</option>
                                    <option value="Regular">Regular</option>
                                    <option value="Regular Italic">Regular Italic</option>
                                    <option value="Bold">Bold</option>
                                    <option value="Bold Italic">Bold Italic</option>
                                    <option value="Black">Black</option>
                                    <option value="Black Italic">Black Italic</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            {/* Banner Email Custom Schedule & Inclusions Config */}
                            {baseKey === "banner_email" && (
                              <div className="space-y-6 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a] dark:text-white flex items-center gap-2">
                                  <Calendar size={12} className="text-pink-500" />
                                  Itinerary & Details Layout
                                </h4>

                                <div className="space-y-4">
                                  {/* Heading overrides */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Greeting Company Name (e.g. MAZIV)</label>
                                      <input 
                                        type="text"
                                        value={formValues.heading_title || ""}
                                        onChange={(e) => handleFormChange("heading_title", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Greeting Company Suffix (e.g. GROUP)</label>
                                      <input 
                                        type="text"
                                        value={formValues.heading_subtitle || ""}
                                        onChange={(e) => handleFormChange("heading_subtitle", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800/50 pt-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Itinerary Column Title</label>
                                      <input 
                                        type="text"
                                        value={formValues.itinerary_title || ""}
                                        onChange={(e) => handleFormChange("itinerary_title", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Itinerary Events (One per line - Label: Time)</label>
                                      <textarea 
                                        rows={4}
                                        value={formValues.itinerary_body || ""}
                                        onChange={(e) => handleFormChange("itinerary_body", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-medium text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800/50 pt-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Bring Along Column Title</label>
                                      <input 
                                        type="text"
                                        value={formValues.bring_along_title || ""}
                                        onChange={(e) => handleFormChange("bring_along_title", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Bring Along Items (One per line)</label>
                                      <textarea 
                                        rows={4}
                                        value={formValues.bring_along_body || ""}
                                        onChange={(e) => handleFormChange("bring_along_body", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-medium text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Bring Along Footer Note (Italicized)</label>
                                    <input 
                                      type="text"
                                      value={formValues.bring_along_note || ""}
                                      onChange={(e) => handleFormChange("bring_along_note", e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-medium text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800/50 pt-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Inclusions Column Title</label>
                                      <input 
                                        type="text"
                                        value={formValues.included_title || ""}
                                        onChange={(e) => handleFormChange("included_title", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Inclusions Items (One per line)</label>
                                      <textarea 
                                        rows={4}
                                        value={formValues.included_body || ""}
                                        onChange={(e) => handleFormChange("included_body", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-medium text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>
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
          <>
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

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                      <Palette size={12} /> Engagement Details Color
                    </label>
                    <div className="flex gap-4">
                      <input 
                        type="color" 
                        value={config.engagementDetailsColor || config.primary_color || "#0f172a"}
                        onChange={(e) => setConfig({ ...config, engagementDetailsColor: e.target.value })}
                        className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 bg-transparent"
                      />
                      <input 
                        type="text" 
                        value={config.engagementDetailsColor || ""}
                        onChange={(e) => setConfig({ ...config, engagementDetailsColor: e.target.value })}
                        placeholder="#000000"
                        className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                      <Palette size={12} /> Attendee Pass Color
                    </label>
                    <div className="flex gap-4">
                      <input 
                        type="color" 
                        value={config.attendeePassBgColor || "#000000"}
                        onChange={(e) => setConfig({ ...config, attendeePassBgColor: e.target.value })}
                        className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 bg-transparent"
                      />
                      <input 
                        type="text" 
                        value={config.attendeePassBgColor || ""}
                        onChange={(e) => setConfig({ ...config, attendeePassBgColor: e.target.value })}
                        placeholder="#000000"
                        className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
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

                  <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a] dark:text-white flex items-center gap-2">
                          <Sparkles size={12} className="text-yellow-500" />
                          Show Event Banner in Email
                        </label>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Display the banner image at the top of RSVP emails.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.show_banner_in_email || false}
                        onChange={(e) => setConfig({ ...config, show_banner_in_email: e.target.checked })}
                        className="w-5 h-5 text-yellow-500 bg-slate-100 border-slate-300 rounded focus:ring-yellow-500 focus:ring-2 dark:bg-slate-800 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Default Email Banner</label>
                      
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
                            uploadImageFile(file, (url) => {
                              setConfig({ ...config, banner_url: url });
                            });
                          }
                        }}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              uploadImageFile(file, (url) => {
                                setConfig({ ...config, banner_url: url });
                              });
                            }
                          };
                          input.click();
                        }}
                        className="w-full h-28 rounded-2xl border-2 border-dashed border-slate-200 hover:border-yellow-400/50 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-slate-100/30 group relative overflow-hidden mb-2"
                      >
                        {config.banner_url ? (
                          <div className="relative w-full h-full p-2 flex items-center justify-center">
                            <img src={config.banner_url} alt="Default Email Banner" className="max-h-full max-w-full object-contain" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfig({ ...config, banner_url: "" });
                              }}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-[10px] font-black uppercase shadow-md transition-all"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="text-slate-400 group-hover:text-yellow-500 transition-colors mb-1" size={24} />
                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">Drag & Drop Default Banner Here</span>
                            <span className="text-[9px] text-slate-400 font-medium">Or click to browse files</span>
                          </>
                        )}
                      </div>

                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Or enter Default Email Banner URL</label>
                      <input
                        type="text"
                        value={config.banner_url && !config.banner_url.startsWith("data:") ? config.banner_url : ""}
                        onChange={(e) => setConfig({ ...config, banner_url: e.target.value })}
                        placeholder="https://example.com/banner.png"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-yellow-400 outline-none font-medium text-sm text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                      <p className="text-[10px] text-slate-400 italic">Fallback banner image URL if an event doesn't specify one (or customize it per event under Event Edit).</p>
                    </div>
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

                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                      <Layout size={12} /> Active Confirmation Template
                    </label>
                    <select
                      value={config.confirmation_template_key || "registration_confirmed"}
                      onChange={(e) => setConfig({ ...config, confirmation_template_key: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
                    >
                      <option value="registration_confirmed">Attendee Confirmation Email (Standard)</option>
                      <option value="banner_email">Banner Email (Premium Dark)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 italic">Select which template is used when sending registration confirmation emails.</p>
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

          {/* Approved Sender Emails Manager (Admin Only) */}
          {userRole === "admin" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-8 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-yellow-50 text-[#eab308] rounded-2xl dark:bg-yellow-950/20">
                  <Mail size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight dark:text-white">Approved Sender Emails</h2>
                  <p className="text-sm text-slate-400 font-medium">Manage pre-approved emails that Managers can select from when configuring events.</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Add email input bar */}
                <div className="flex gap-4 max-w-xl">
                  <input 
                    type="email" 
                    value={newSenderEmail}
                    onChange={(e) => setNewSenderEmail(e.target.value)}
                    placeholder="e.g. event@maziv.com"
                    className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-yellow-400 outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={isSavingSenderEmails || !newSenderEmail}
                    onClick={async () => {
                      const trimmed = newSenderEmail.trim().toLowerCase();
                      if (!trimmed.includes("@")) {
                        alert("Please enter a valid email address.");
                        return;
                      }
                      if (senderEmails.includes(trimmed)) {
                        alert("This email is already in the approved list.");
                        return;
                      }
                      const updated = [...senderEmails, trimmed];
                      await saveApprovedSenderEmails(updated);
                      setNewSenderEmail("");
                    }}
                    className="flex items-center gap-2 bg-[#0f172a] hover:bg-black text-white px-6 py-4 rounded-2xl font-black transition-all text-xs uppercase tracking-widest disabled:opacity-50 dark:bg-yellow-400 dark:text-black"
                  >
                    {isSavingSenderEmails ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                    Add Email
                  </button>
                </div>

                {/* List of approved emails */}
                <div className="max-w-2xl border border-slate-50 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-slate-50/20">
                  {senderEmails.length === 0 ? (
                    <div className="px-6 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                      No custom sender emails defined. Fallbacks are active.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {senderEmails.map((email) => (
                        <div key={email} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/30">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{email}</span>
                          <button
                            type="button"
                            disabled={isSavingSenderEmails}
                            onClick={async () => {
                              if (confirm(`Remove "${email}" from the approved list?`)) {
                                const updated = senderEmails.filter(e => e !== email);
                                await saveApprovedSenderEmails(updated);
                              }
                            }}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete Sender Email"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          </>
        )}

        {/* ======================================================== */}
        {/* REGISTRATION FORM TEMPLATES TAB CONTENT */}
        {/* ======================================================== */}
        {activeTab === "registration" && (
          <div className="bg-slate-50/30 rounded-[2.5rem] p-8 border border-slate-100 dark:bg-slate-900/10 dark:border-slate-800">
            <RegistrationTemplateManager />
          </div>
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
