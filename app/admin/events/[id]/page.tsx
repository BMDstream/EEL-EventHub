"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  ArrowLeft, 
  Users, 
  UserX,
  Search,
  Download, 
  Trash2, 
  Calendar, 
  MapPin, 
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  Settings,
  Sparkles,
  ArrowUpRight,
  Eye,
  Upload,
  RefreshCw,
  Wifi,
  WifiOff,
  UserPlus,
  ArrowUpAZ,
  ArrowDownAZ,
  X,
  Printer,
  Mail
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import FormBuilder from "@/components/FormBuilder";
import QRScanner from "@/components/QRScanner";
import StaffAssignment from "@/components/StaffAssignment";
import * as dbOffline from "@/lib/indexedDb";
import { unescapeHtmlLinks } from "@/lib/utils";

const getAnswerString = (ans: any): string => {
  if (ans === null || ans === undefined) return "—";
  if (typeof ans === "object") {
    if (ans.first_name || ans.last_name || ans.email) {
      return `${ans.first_name || ""} ${ans.last_name || ""} (${ans.email || ""})`.trim();
    }
    return JSON.stringify(ans);
  }
  return String(ans);
};

const getCustomAnswer = (customAnswers: any, fieldDef: any): any => {
  if (!customAnswers || !fieldDef) return "";
  
  const fieldId = fieldDef.id;
  const fieldKey = fieldDef.key;
  const fieldLabel = (fieldDef.label || fieldDef.title || "").replace(/<[^>]*>/g, "").trim().toLowerCase();
  
  // 1. Direct ID / Key match
  if (fieldId && customAnswers[fieldId] !== undefined) return customAnswers[fieldId];
  if (fieldKey && customAnswers[fieldKey] !== undefined) return customAnswers[fieldKey];
  
  // 1b. Legacy Padel (ID 19) mapping
  const padelLegacyMap: Record<string, string> = {
    "dietary_requirements": "field_1779962054556",
    "dietary_other": "field_1779962096590",
    "entry_role": "field_1779962137331",
    "padel_category": "field_1779962172868",
    "t_shirt_size": "field_1779962303585",
    "partner_card": "field_1781088483505",
    "partner_t_shirt": "field_1781158985365",
  };
  
  if (fieldId && padelLegacyMap[fieldId] && customAnswers[padelLegacyMap[fieldId]] !== undefined) {
    return customAnswers[padelLegacyMap[fieldId]];
  }
  
  // 2. Exact label match (case insensitive)
  const keys = Object.keys(customAnswers);
  for (const k of keys) {
    const cleanK = k.toLowerCase().trim();
    if (fieldLabel && cleanK === fieldLabel) {
      return customAnswers[k];
    }
  }
  
  // 3. Fuzzy label prefix match (for truncated Excel headers like "Player or Spe")
  if (fieldLabel && fieldLabel.length >= 4) {
    for (const k of keys) {
      const cleanK = k.toLowerCase().trim();
      if (cleanK.length >= 4 && (fieldLabel.startsWith(cleanK) || cleanK.startsWith(fieldLabel))) {
        return customAnswers[k];
      }
    }
  }
  
  return "";
};

interface Attendee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company: string | null;
}

interface Registration {
  id: string;
  status: string;
  checked_in: boolean;
  created_at: string;
  custom_answers?: Record<string, any>;
  pin?: string;
  attendee: Attendee;
  checked_in_days?: number[];
}

interface Event {
  id: number;
  slug: string;
  title: string;
  description: string;
  start_date: string;
  location: string;
  address?: string;
  capacity: number;
  custom_fields_schema: any[];
  client?: any;
  duration_days?: number;
  registration_active?: boolean;
  registration_start?: string;
  registration_end?: string;
  disclaimer_enabled?: boolean;
  disclaimer_text?: string;
  registration_form_template?: any;
}

export default function EventDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "form" ? "form" : "registrants";
  
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [hideResendButton, setHideResendButton] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: session } = useSession();
  const sessionRole = (session?.user as any)?.role || "staff";
  const [eventUserRole, setEventUserRole] = useState<string>("staff");
  const userRole = sessionRole === "admin" ? "admin" : eventUserRole;
  const [activeTab, setActiveTab] = useState<"registrants" | "form" | "scanner" | "communications" | "staff">(initialTab as any || "registrants");
  const [pin, setPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinStatus, setPinStatus] = useState<"idle" | "success" | "error" | "processing" | "warning">("idle");
  const [pinMessage, setPinMessage] = useState("");
  const [checkedInReg, setCheckedInReg] = useState<any | null>(null);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, any>>({});
  const [isSavingAnswers, setIsSavingAnswers] = useState(false);
  const [detailsEditedAnswers, setDetailsEditedAnswers] = useState<Record<string, any>>({});
  const [isSavingDetailsAnswers, setIsSavingDetailsAnswers] = useState(false);

  useEffect(() => {
    if (checkedInReg) {
      setEditedAnswers(checkedInReg.custom_answers || {});
    } else {
      setEditedAnswers({});
    }
  }, [checkedInReg]);

  useEffect(() => {
    if (selectedReg) {
      setDetailsEditedAnswers(selectedReg.custom_answers || {});
    } else {
      setDetailsEditedAnswers({});
    }
  }, [selectedReg]);

  const handleAnswerChange = (key: string, value: any) => {
    setEditedAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleDetailsAnswerChange = (key: string, value: any) => {
    setDetailsEditedAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleCancelDetailsEdit = () => {
    if (selectedReg) {
      setDetailsEditedAnswers(selectedReg.custom_answers || {});
    }
  };

  const handleSaveDetailsAnswers = async () => {
    if (!selectedReg) return;
    setIsSavingDetailsAnswers(true);
    try {
      const res = await fetch(`/api/py/registrations/${selectedReg.id}/custom-answers`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify(detailsEditedAnswers),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to save answers");
      }

      const data = await res.json();
      
      const updatedReg = {
        ...selectedReg,
        custom_answers: data.custom_answers
      };
      setSelectedReg(updatedReg);
      setRegistrations(prev => prev.map(r => r.id === selectedReg.id ? updatedReg : r));
    } catch (err: any) {
      alert(err.message || "An error occurred while saving custom answers.");
    } finally {
      setIsSavingDetailsAnswers(false);
    }
  };

  const isDetailsAnswersDirty = selectedReg 
    ? JSON.stringify(detailsEditedAnswers) !== JSON.stringify(selectedReg.custom_answers || {})
    : false;

  const [resendingRegId, setResendingRegId] = useState<string | null>(null);
  const [bulkResending, setBulkResending] = useState(false);
  const [selectedScanDay, setSelectedScanDay] = useState<number | "auto">("auto");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedRegistrants, setParsedRegistrants] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<"date" | "venue" | "enrollment" | "declined" | "checked_in" | null>(null);
  
  // Custom states for check-in filtering and walk-ins
  const [checkInFilter, setCheckInFilter] = useState<"all" | "checked_in" | "not_checked_in">("all");
  const [sortBy, setSortBy] = useState<"registration_date" | "alphabetical">("registration_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);
  const [walkinFormData, setWalkinFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    company: "",
    custom_answers: {} as Record<string, any>
  });
  const [isSubmittingWalkin, setIsSubmittingWalkin] = useState(false);

  // Flatten custom fields from active schema
  const activeSchema = (event?.custom_fields_schema && event.custom_fields_schema.length > 0)
    ? event.custom_fields_schema
    : (event?.registration_form_template?.layout_schema || []);

  let flatFields: any[] = [];
  for (const item of activeSchema) {
    if (item && typeof item === "object" && "fields" in item && Array.isArray(item.fields)) {
      flatFields.push(...item.fields);
    } else {
      flatFields.push(item);
    }
  }
  const customFields = flatFields.filter(f => f && (f.key || f.id) && !["first_name", "last_name", "email", "company"].includes(f.key || f.id));
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [selectedBroadcastKey, setSelectedBroadcastKey] = useState("");
  const [selectedSurveyKey, setSelectedSurveyKey] = useState("");

  // Controlled states for Broadcast Dispatch form
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSignature, setBroadcastSignature] = useState("Kind regards, BMD Team");

  // Controlled states for Survey Feedback form
  const [surveySubject, setSurveySubject] = useState("");
  const [surveyUrl, setSurveyUrl] = useState("");
  const [surveyBody, setSurveyBody] = useState("Hi {first_name},\n\nThank you for attending our event! We hope you had a great experience. We'd love to hear your feedback so we can make future events even better.");

  const compileBroadcastPreview = (tmpl: any): string => {
    if (!tmpl || !tmpl.body_html) return "";
    let html = tmpl.body_html;
    
    const primaryCol = "#0f172a";
    const accentCol = "#eab308";
    
    let meta: Record<string, any> = {};
    const metaMatch = html.match(/<!--\s*TEMPLATE_META:\s*([\s\S]*?)\s*-->/);
    if (metaMatch) {
      try {
        meta = JSON.parse(metaMatch[1]);
      } catch (e) {}
    }

    const brandPrimary = meta.primary_color || primaryCol;
    const brandAccent = meta.accent_color || accentCol;
    
    const showLogo = meta.show_logo !== "false";
    let logoHtmlStr = "";
    if (showLogo) {
      if (meta.logo_image_url) {
        logoHtmlStr = `<td align="right" valign="middle"><img src="${meta.logo_image_url}" style="max-height: 48px; max-width: 140px; object-fit: contain; display: block;" alt="Logo" /></td>`;
      } else {
        logoHtmlStr = `<td align="right" valign="middle"><div style="background-color:${brandPrimary};padding:8px 16px;border-radius:8px;color:#fff;font-weight:bold;font-size:14px;display:inline-block;font-family:sans-serif;">${meta.logo_text || "BMD"}</div></td>`;
      }
    }

    const showBanner = meta.show_banner === "true";
    let bannerHtmlStr = "";
    if (showBanner && meta.banner_image_url) {
      bannerHtmlStr = `
      <tr>
        <td align="center" style="padding: 0; margin: 0; line-height: 0;">
          <img src="${meta.banner_image_url}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border-top-left-radius: 38px; border-top-right-radius: 38px; margin: 0; padding: 0;" alt="Event Banner" />
        </td>
      </tr>
      `;
    }

    const showQr = meta.show_qr_code !== "false";
    const showPin = meta.show_pin !== "false";

    const qrImgSnippet = showQr
      ? `<div style="width: 200px; height: 200px; background-color: ${brandPrimary}; margin: 0 auto 32px auto; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: bold; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);">[QR CODE PREVIEW]</div>`
      : "";

    const pinSnippet = showPin
      ? `<p style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: #64748b; margin-bottom: 16px; font-family: sans-serif;">unique access pass number</p>
        <div style="display: inline-block; background: #ffffff; padding: 16px 32px; border-radius: 20px; border: 2px solid ${brandPrimary}; font-family: sans-serif;">
          <code style="font-size: 32px; font-weight: 900; color: ${brandPrimary}; letter-spacing: 0.25em; font-family: monospace;">ABCDEF</code>
        </div>`
      : "";

    const qrBlockHtmlStr = (showQr || showPin)
      ? `<div style="background: #f8fafc; padding: 48px; border-radius: 32px; text-align: center; border: 1px solid #f1f5f9; margin-bottom: 40px; position: relative; overflow: hidden; font-family: sans-serif;">
            ${qrImgSnippet}
            ${pinSnippet}
         </div>`
      : "";

    const warningBlockHtmlStr = `
    <div style="background: #fffbeb; padding: 28px; border-radius: 24px; border: 1px solid #fef3c7; margin-bottom: 40px; text-align: center; font-family: sans-serif;">
        <p style="color: #b45309; font-size: 14px; font-weight: 700; margin: 0; line-height: 1.5; text-transform: uppercase; letter-spacing: 0.05em;">
            ${meta.warning_text || "Please present this QR code OR number at the registration desk."}
        </p>
    </div>
    `;

    const buttonBlockHtmlStr = `
    <div style="text-align: center; margin-top: 10px; margin-bottom: 40px;">
        <a href="${surveyUrl || '#'}" style="background-color: ${brandAccent}; color: #000000; padding: 16px 32px; border-radius: 16px; font-size: 13px; font-weight: 950; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; font-family: sans-serif;">
            ${meta.button_text || "Update Details"}
        </a>
    </div>
    `;

    const vars: Record<string, string> = {
      first_name: "John",
      last_name: "Doe",
      event_title: event?.title?.replace(/<[^>]*>/g, "") || "Golf Invitational 2026",
      location: event?.location || "Highland Gate Golf Estate",
      start_date: event?.start_date ? new Date(event.start_date).toLocaleDateString() : "TBA",
      primary_color: brandPrimary,
      accent_color: brandAccent,
      logo_html: logoHtmlStr,
      banner_html: bannerHtmlStr,
      details_html: `<div style="background: #ffffff; padding: 24px; border: 1px solid #f1f5f9; border-radius: 24px; margin-bottom: 24px; margin-top: 24px; font-family: sans-serif;">
          <p style="font-size: 15px; font-weight: 800; color: ${brandPrimary}; margin: 0;">Event Details</p>
          <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Venue: ${event?.location || 'TBA'}</p>
        </div>`,
      broadcast_body: html.includes("broadcast_body") ? "This is a sample live preview of your broadcast announcement email body. Attending guests will see this layout." : "Thank you for registering.",
      broadcast_signature: "The BMD Team",
      footer_text: "Automated Event Management System",
      qr_code: `<div style="background: #f8fafc; padding: 32px; border-radius: 24px; text-align: center; border: 1px solid #e2e8f0; margin: 24px auto; max-width: 240px;"><div style="width: 160px; height: 160px; background: #000; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white;">[QR CODE]</div></div>`,
      qr_block_html: qrBlockHtmlStr,
      warning_block_html: warningBlockHtmlStr,
      button_block_html: buttonBlockHtmlStr,
      survey_url: surveyUrl
    };

    let compiled = html;
    Object.entries(vars).forEach(([key, val]) => {
      compiled = compiled.replaceAll(`{${key}}`, val);
    });

    return unescapeHtmlLinks(compiled);
  };

  // Initialize subjects when event changes
  useEffect(() => {
    if (event?.title) {
      const cleanTitle = event.title.replace(/<[^>]*>/g, "").trim();
      setBroadcastSubject(`Update for ${cleanTitle}`);
      setSurveySubject(`Thank you for attending ${cleanTitle} - Feedback Survey`);
    }
  }, [event]);

  const [isOnline, setIsOnline] = useState(true);
  const [offlineStats, setOfflineStats] = useState<{ cachedCount: number; checkedInCount: number } | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isCaching, setIsCaching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastCachedAt, setLastCachedAt] = useState<string | null>(null);

  const formatOperatorFields = (reg: any): Array<{ label: string, value: string }> => {
    if (!reg || !event) return [];
    const template = event?.registration_form_template;
    const opConfig = template?.operator_config;
    
    // Fallback standard fields
    const displayFields = opConfig?.display_fields && opConfig.display_fields.length > 0 
      ? opConfig.display_fields 
      : ["first_name", "last_name", "email", "company"];

    const activeSchema = (event?.custom_fields_schema && event.custom_fields_schema.length > 0)
      ? event.custom_fields_schema
      : (template?.layout_schema || []);
    let flatFields: any[] = [];
    if (activeSchema.length > 0 && "fields" in activeSchema[0]) {
      for (const section of activeSchema) {
        flatFields.push(...(section.fields || []));
      }
    } else {
      flatFields = activeSchema;
    }

    const fieldMap = new Map<string, any>();
    for (const f of flatFields) {
      fieldMap.set(f.key || f.id, f);
    }

    const standardLabels: Record<string, string> = {
      first_name: "First Name",
      last_name: "Last Name",
      email: "Email Address",
      company: "Organization / Company"
    };

    const results: Array<{ label: string, value: string }> = [];

    for (const fieldKey of displayFields) {
      const fieldDef = fieldMap.get(fieldKey);
      const label = fieldDef?.label || standardLabels[fieldKey] || fieldKey;
      
      let val: any = "";
      if (["first_name", "last_name", "email", "company"].includes(fieldKey)) {
        val = reg.attendee?.[fieldKey] || "";
      } else {
        val = reg.custom_answers?.[fieldKey] || reg.custom_answers?.[fieldDef?.id] || "";
        if (typeof val === "boolean") {
          val = val ? "Yes" : "No";
        } else if (typeof val === "object" && val !== null) {
          val = `${val.first_name || ""} ${val.last_name || ""}`.trim();
        }
      }

      if (val) {
        const cleanLabel = label.replace(/<[^>]*>/g, "").trim();
        results.push({ label: cleanLabel, value: String(val) });
      }
    }

    return results;
  };

  const compileOperatorCustomLayout = (layoutText: string, reg: any): string => {
    if (!layoutText || !reg) return "";
    let compiled = layoutText;
    
    // Resolve standard fields
    const standards: Record<string, string> = {
      first_name: reg.attendee?.first_name || "",
      last_name: reg.attendee?.last_name || "",
      email: reg.attendee?.email || "",
      company: reg.attendee?.company || "",
      clearance_id: reg.pin || reg.clearance_id || ""
    };
    
    Object.entries(standards).forEach(([key, val]) => {
      const regex = new RegExp(`\\[${key}\\]`, "gi");
      compiled = compiled.replace(regex, val);
    });
    
    // Resolve custom fields
    const template = event?.registration_form_template;
    
    // Get flat fields from event schema (activeSchema)
    const eventSchema = event?.custom_fields_schema || [];
    let eventFlatFields: any[] = [];
    if (eventSchema.length > 0 && "fields" in eventSchema[0]) {
      for (const section of eventSchema) {
        eventFlatFields.push(...(section.fields || []));
      }
    } else {
      eventFlatFields = eventSchema;
    }
    
    // Get flat fields from template schema
    const templateSchema = template?.layout_schema || [];
    let templateFlatFields: any[] = [];
    if (templateSchema.length > 0 && "fields" in templateSchema[0]) {
      for (const section of templateSchema) {
        templateFlatFields.push(...(section.fields || []));
      }
    } else {
      templateFlatFields = templateSchema;
    }
    
    // Build a map of label (lowercase, trimmed) to answer value in reg.custom_answers
    const labelToAnswer = new Map<string, any>();
    
    eventFlatFields.forEach(f => {
      const fieldId = f.id;
      const fieldKey = f.key;
      const fieldLabel = (f.label || "").replace(/<[^>]*>/g, "").trim().toLowerCase();
      
      let answer = getCustomAnswer(reg.custom_answers, f);
      if (typeof answer === "boolean") {
        answer = answer ? "Yes" : "No";
      } else if (typeof answer === "object" && answer !== null) {
        answer = `${answer.first_name || ""} ${answer.last_name || ""}`.trim();
      }
      
      if (answer !== undefined && answer !== null && answer !== "") {
        if (fieldLabel) labelToAnswer.set(fieldLabel, answer);
        if (fieldId) labelToAnswer.set(fieldId.toLowerCase(), answer);
        if (fieldKey) labelToAnswer.set(fieldKey.toLowerCase(), answer);
      }
    });

    const replacements = new Map<string, string>();
    
    // Map standard fields
    Object.entries(standards).forEach(([key, val]) => {
      replacements.set(key.toLowerCase(), String(val));
    });
    
    // Map template fields using matched answers by label or ID
    templateFlatFields.forEach(f => {
      const fieldId = f.id;
      const fieldKey = f.key;
      const fieldLabel = (f.label || "").replace(/<[^>]*>/g, "").trim().toLowerCase();
      
      let answer = "";
      if (fieldLabel && labelToAnswer.has(fieldLabel)) {
        answer = labelToAnswer.get(fieldLabel);
      } else if (fieldId && labelToAnswer.has(fieldId.toLowerCase())) {
        answer = labelToAnswer.get(fieldId.toLowerCase());
      } else if (fieldKey && labelToAnswer.has(fieldKey.toLowerCase())) {
        answer = labelToAnswer.get(fieldKey.toLowerCase());
      } else {
        let rawAnswer = reg.custom_answers?.[fieldId] || reg.custom_answers?.[fieldKey] || "";
        if (typeof rawAnswer === "boolean") {
          answer = rawAnswer ? "Yes" : "No";
        } else if (typeof rawAnswer === "object" && rawAnswer !== null) {
          answer = `${rawAnswer.first_name || ""} ${rawAnswer.last_name || ""}`.trim();
        } else {
          answer = String(rawAnswer);
        }
      }
      
      if (fieldId) replacements.set(fieldId.toLowerCase(), answer);
      if (fieldKey) replacements.set(fieldKey.toLowerCase(), answer);
      if (fieldLabel) replacements.set(fieldLabel, answer);
    });

    // Also add all event-specific keys/labels as replacements
    eventFlatFields.forEach(f => {
      const fieldId = f.id;
      const fieldKey = f.key;
      const fieldLabel = (f.label || "").replace(/<[^>]*>/g, "").trim().toLowerCase();
      
      let answer = "";
      if (fieldId && labelToAnswer.has(fieldId.toLowerCase())) {
        answer = labelToAnswer.get(fieldId.toLowerCase());
      } else if (fieldKey && labelToAnswer.has(fieldKey.toLowerCase())) {
        answer = labelToAnswer.get(fieldKey.toLowerCase());
      } else if (fieldLabel && labelToAnswer.has(fieldLabel)) {
        answer = labelToAnswer.get(fieldLabel);
      }
      
      if (fieldId) replacements.set(fieldId.toLowerCase(), answer);
      if (fieldKey) replacements.set(fieldKey.toLowerCase(), answer);
      if (fieldLabel) replacements.set(fieldLabel, answer);
    });

    // Replace brackets in compiled layout text
    const matches = compiled.match(/\[([^\]]+)\]/g);
    if (matches) {
      matches.forEach(match => {
        const token = match.slice(1, -1).trim();
        const tokenLower = token.toLowerCase();
        if (replacements.has(tokenLower)) {
          const val = replacements.get(tokenLower) || "";
          const escapedToken = token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`\\[${escapedToken}\\]`, "gi");
          compiled = compiled.replace(regex, val);
        }
      });
    }
    
    return compiled;
  };

  const downloadRegistrantTemplate = () => {
    import("xlsx").then((XLSX) => {
      const customFields = event?.custom_fields_schema || [];
      const customHeaders = customFields.map(f => f.label || f.id);
      const headers = ["first_name", "last_name", "email", "company", ...customHeaders];
      
      const sampleRow1: any = {
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        company: "Acme Corp"
      };
      
      const sampleRow2: any = {
        first_name: "Jane",
        last_name: "Smith",
        email: "jane.smith@example.com",
        company: "Innovate LLC"
      };
      
      // Add blank or option hints for custom questions
      customFields.forEach(f => {
        const headerName = f.label || f.id;
        if (f.type === "select" && f.options && f.options.length > 0) {
          sampleRow1[headerName] = f.options[0];
          sampleRow2[headerName] = f.options[1] || f.options[0];
        } else if (f.type === "checkbox") {
          sampleRow1[headerName] = "True";
          sampleRow2[headerName] = "False";
        } else {
          sampleRow1[headerName] = "";
          sampleRow2[headerName] = "";
        }
      });
      
      const data = [sampleRow1, sampleRow2];
      
      const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "RegistrantsTemplate");
      
      const cols = [
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 }
      ];
      customHeaders.forEach(() => {
        cols.push({ wch: 25 });
      });
      worksheet["!cols"] = cols;
      
      XLSX.writeFile(workbook, `registrants_import_template.xlsx`);
    });
  };

  const handleImportFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        import("xlsx").then((XLSX) => {
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

          const customFields = event?.custom_fields_schema || [];

          const parsed = jsonData.map((row: any) => {
            const email = row.email || row.Email || row.EMAIL || row["Email"] || "";
            const first_name = row.first_name || row.First_Name || row["First Name"] || row.firstName || row.FirstName || "";
            const last_name = row.last_name || row.Last_Name || row["Last Name"] || row.lastName || row.LastName || "";
            const company = row.company || row.Company || row.COMPANY || row["Organization"] || row["Company Name"] || "";
            
            // Gather custom field answers, mapping the spreadsheet headers to standard schema field IDs
            const standardKeys = ["email", "first_name", "last_name", "company", "Email", "First_Name", "Last_Name", "Company", "EMAIL", "COMPANY", "firstName", "lastName", "FirstName", "LastName", "First Name", "Last Name", "Organization", "Company Name"];
            const custom_answers: Record<string, any> = {};
            Object.keys(row).forEach(key => {
              if (!standardKeys.includes(key)) {
                // Check if key matches a label or ID in event.custom_fields_schema (supporting fuzzy prefix matches for truncated keys)
                const matchedField = customFields.find(
                  f => {
                    const cleanLabel = (f.label || "").toLowerCase().trim();
                    const cleanKey = key.toLowerCase().trim();
                    if (cleanLabel === cleanKey) return true;
                    if (cleanLabel.length >= 4 && cleanKey.length >= 4 && (cleanLabel.startsWith(cleanKey) || cleanKey.startsWith(cleanLabel))) return true;
                    return f.id.toLowerCase().trim() === cleanKey;
                  }
                );
                if (matchedField) {
                  custom_answers[matchedField.id] = row[key];
                } else {
                  custom_answers[key] = row[key];
                }
              }
            });

            return {
              email: email.toString().trim(),
              first_name: first_name.toString().trim(),
              last_name: last_name.toString().trim(),
              company: company.toString().trim(),
              custom_answers
            };
          }).filter(u => u.email !== "");

          if (parsed.length === 0) {
            alert("No valid rows found. Make sure headers are: email, first_name, last_name, company.");
            return;
          }

          setParsedRegistrants(parsed);
        });
      } catch (err) {
        console.error(err);
        alert("Failed to parse file. Make sure it is a valid CSV or Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkRegistrantsImport = async () => {
    if (!parsedRegistrants.length || !event) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/py/events/${event.id}/registrations/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify(parsedRegistrants)
      });
      if (res.ok) {
        const result = await res.json();
        if (result.errors.length > 0) {
          alert(`Successfully imported ${result.created.length} registrants.\n\nErrors encountered:\n- ${result.errors.join("\n- ")}`);
        } else {
          alert(`Successfully imported ${result.created.length} registrants!`);
        }
        
        // Refresh registrants list
        const regRes = await fetch(`/api/py/events/${id}/registrations`, {
          headers: { "x-user-email": session?.user?.email || "" }
        });
        const regData = await regRes.json();
        setRegistrations(regData);
        
        setIsImportModalOpen(false);
        setParsedRegistrants([]);
      } else {
        const err = await res.json();
        alert(`Import failed: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error importing registrants");
    } finally {
      setImporting(false);
    }
  };

  const handleResendEmail = async (regId: string) => {
    setResendingRegId(regId);
    try {
      const res = await fetch(`/api/py/registrations/${regId}/resend-email`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Confirmation email containing PIN and QR code has been resent!");
      } else {
        const err = await res.json();
        alert(`Failed to resend: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      alert("Error resending email");
    } finally {
      setResendingRegId(null);
    }
  };

  const handleBulkResend = async () => {
    if (!event) return;
    const confirmedCount = registrations.filter(r => r.status === "confirmed").length;
    if (confirmedCount === 0) {
      alert("There are no confirmed registrants to send tickets to.");
      return;
    }
    if (!confirm(`Are you sure you want to resend credentials & QR codes to all ${confirmedCount} confirmed attendees? This will run in the background.`)) {
      return;
    }
    
    setBulkResending(true);
    try {
      const res = await fetch(`/api/py/events/${event.id}/resend-all-tickets`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Bulk ticket dispatch started successfully in the background.");
      } else {
        const err = await res.json();
        alert(`Failed to start bulk dispatch: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      alert("Error starting bulk ticket dispatch");
    } finally {
      setBulkResending(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);

  const fetchRegistrations = async () => {
    if (!session?.user?.email) return;
    setRefreshing(true);
    try {
      const regRes = await fetch(`/api/py/events/${id}/registrations`, {
        headers: { "x-user-email": session.user.email || "" }
      });
      const regData = await regRes.json();
      setRegistrations(regData);
      setSelectedIds([]);
    } catch (err) {
      console.error("Failed to refresh registrations", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Read network connection and update offline status
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      autoSyncOfflineScans();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial IndexedDB stats load
    updateOfflineStats();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [id]);

  const updateOfflineStats = async () => {
    try {
      const stats = await dbOffline.getOfflineStats();
      setOfflineStats(stats);
      const pending = await dbOffline.getPendingScans();
      setPendingSyncCount(pending.length);
      
      const cachedTime = localStorage.getItem(`eel_cached_time_${id}`);
      setLastCachedAt(cachedTime);
    } catch (e) {
      console.error("Failed to load local DB stats", e);
    }
  };

  const downloadManifestForOffline = async () => {
    if (!event) return;
    setIsCaching(true);
    try {
      const res = await fetch(`/api/py/events/${id}/registrations`, {
        headers: { "x-user-email": session?.user?.email || "" }
      });
      if (!res.ok) throw new Error("Failed to fetch fresh registrations");
      const regData = await res.json();
      
      await dbOffline.saveOfflineEvent(event, regData);
      
      const nowStr = new Date().toLocaleTimeString();
      localStorage.setItem(`eel_cached_time_${id}`, nowStr);
      setLastCachedAt(nowStr);
      
      await updateOfflineStats();
      alert("Attendee manifest successfully cached for offline use!");
    } catch (e) {
      console.error(e);
      alert("Error caching attendee manifest");
    } finally {
      setIsCaching(false);
    }
  };

  const autoSyncOfflineScans = async () => {
    // Prevent overlapping syncs
    if (isSyncing) return;
    
    try {
      const pending = await dbOffline.getPendingScans();
      if (pending.length === 0) return;
      
      setIsSyncing(true);
      
      const res = await fetch(`/api/py/events/${id}/bulk-checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify(pending)
      });
      
      if (res.ok) {
        const result = await res.json();
        const syncedIds = pending.map(p => p.id).filter((id): id is number => id !== undefined);
        await dbOffline.markScansSynced(syncedIds);
        
        fetchRegistrations();
        await updateOfflineStats();
      }
    } catch (e) {
      console.error("Auto sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const forceSyncOfflineScans = async () => {
    if (!isOnline) {
      alert("Cannot sync: device is currently offline.");
      return;
    }
    setIsSyncing(true);
    try {
      const pending = await dbOffline.getPendingScans();
      if (pending.length === 0) {
        alert("No pending offline scans to sync.");
        return;
      }
      
      const res = await fetch(`/api/py/events/${id}/bulk-checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify(pending)
      });
      
      if (res.ok) {
        const result = await res.json();
        const syncedIds = pending.map(p => p.id).filter((id): id is number => id !== undefined);
        await dbOffline.markScansSynced(syncedIds);
        
        fetchRegistrations();
        await updateOfflineStats();
        
        alert(`Sync complete!\nSuccessfully Synced: ${result.synced.length}\nConflicts (Already checked in): ${result.conflicts.length}\nErrors: ${result.errors.length}`);
      } else {
        alert("Failed to sync scans with the server.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during sync.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.email) return;
    const fetchData = async () => {
      try {
        setError(null);
        const eventRes = await fetch(`/api/py/events/id/${id}`, {
          headers: { "x-user-email": session.user.email || "" }
        });
        if (!eventRes.ok) {
          const detail = await eventRes.text();
          throw new Error(`Failed to fetch Event Details: HTTP ${eventRes.status} - ${detail}`);
        }
        const eventData = await eventRes.json();
        setEvent(eventData);
        setEventUserRole(eventData.user_role_for_client || "staff");

        const regRes = await fetch(`/api/py/events/${id}/registrations`, {
          headers: { "x-user-email": session.user.email || "" }
        });
        if (!regRes.ok) {
          const detail = await regRes.text();
          throw new Error(`Failed to fetch Event Registrations: HTTP ${regRes.status} - ${detail}`);
        }
        const regData = await regRes.json();
        setRegistrations(regData);

        // Load global email templates
        try {
          const templatesRes = await fetch(`/api/py/settings/templates`, {
            headers: { "x-user-email": session.user.email || "" }
          });
          if (templatesRes.ok) {
            const templatesData = await templatesRes.json();
            setEmailTemplates(Array.isArray(templatesData) ? templatesData : []);
          }
        } catch (templateErr) {
          console.error("Failed to load email templates", templateErr);
        }
      } catch (err: any) {
        console.error("Failed to fetch event details", err);
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, session]);

  const handleDeleteRegistration = async (regId: string) => {
    if (!confirm("Are you sure you want to remove this registrant?")) return;
    setDeletingId(regId);
    try {
      const res = await fetch(`/api/py/registrations/${regId}`, { 
        method: "DELETE",
        headers: {
          "x-user-email": session?.user?.email || ""
        }
      });
      if (res.ok) {
        setRegistrations(prev => prev.filter(r => r.id !== regId));
        // Remove from selected list if present
        setSelectedIds(prev => prev.filter(id => id !== regId));
      }
    } catch (err) {
      console.error("Failed to delete registration", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected registrants? This action cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/py/registrations/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({ registration_ids: selectedIds })
      });
      if (res.ok) {
        setRegistrations(prev => prev.filter(r => !selectedIds.includes(r.id)));
        setSelectedIds([]);
      } else {
        alert("Failed to delete selected registrants.");
      }
    } catch (err) {
      console.error("Failed to execute bulk delete", err);
      alert("An error occurred during bulk deletion.");
    } finally {
      setBulkDeleting(false);
    }
  };

  const exportToExcel = () => {
    if (filteredRegistrations.length === 0) return;
    
    // Flatten schema fields (supporting custom layout sections)
    const activeSchema = (event?.custom_fields_schema && event.custom_fields_schema.length > 0)
      ? event.custom_fields_schema
      : (event?.registration_form_template?.layout_schema || []);

    let flatFields: any[] = [];
    for (const item of activeSchema) {
      if (item && typeof item === "object" && "fields" in item && Array.isArray(item.fields)) {
        flatFields.push(...item.fields);
      } else {
        flatFields.push(item);
      }
    }

    // Filter out basic identity fields already exported separately
    const displayFields = flatFields.filter(f => f && !["first_name", "last_name", "email", "company"].includes(f.key || f.id || ""));

    // Define headers
    const headers = [
      "First Name", 
      "Last Name", 
      "Email", 
      "Organization", 
      "Status", 
      "Clearance PIN",
      "QR Code Link",
      "Checked In (Any)", 
      ...(event?.duration_days && event.duration_days > 1
        ? ["Checked In Days", ...Array.from({ length: event.duration_days }, (_, i) => `Day ${i + 1} Check In`)]
        : []
      ),
      "Registered At",
      ...displayFields.map(f => {
        const lbl = (f.label || f.title || "").replace(/<[^>]*>/g, "").trim();
        return `"${lbl.replace(/"/g, '""')}"`;
      })
    ];

    // Helper to escape CSV values (wrap in quotes, escape existing quotes)
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return "";
      let str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredRegistrations.map(reg => {
      const checkedInDaysStr = reg.checked_in_days && reg.checked_in_days.length > 0
        ? reg.checked_in_days.map(d => `Day ${d}`).join(", ")
        : "None";

      const dailyCheckIns = event?.duration_days && event.duration_days > 1
        ? Array.from({ length: event.duration_days }, (_, i) => {
            const dayNum = i + 1;
            return reg.checked_in_days?.includes(dayNum) ? "Yes" : "No";
          })
        : [];

      const pinVal = reg.pin || reg.id.substring(0, 8);
      const qrLinkVal = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${pinVal}`;

      const basicInfo = [
        escapeCSV(reg.attendee.first_name),
        escapeCSV(reg.attendee.last_name),
        escapeCSV(reg.attendee.email),
        escapeCSV(reg.attendee.company || ""),
        escapeCSV(reg.status),
        escapeCSV(pinVal),
        escapeCSV(qrLinkVal),
        escapeCSV(reg.checked_in ? "Yes" : "No"),
        ...(event?.duration_days && event.duration_days > 1
          ? [escapeCSV(checkedInDaysStr), ...dailyCheckIns]
          : []
        ),
        escapeCSV(new Date(reg.created_at).toLocaleString()),
      ];

      const customInfo = displayFields.map(f => {
        const val = getCustomAnswer(reg.custom_answers, f);
        if (val === null || val === undefined || val === "") return "";
        if (typeof val === "boolean") return val ? "Yes" : "No";
        if (Array.isArray(val)) return escapeCSV(val.join(", "));
        if (typeof val === "object") {
          if (val.first_name || val.last_name || val.email) {
            return escapeCSV(`${val.first_name || ""} ${val.last_name || ""} (${val.email || ""})`.trim());
          }
          return escapeCSV(JSON.stringify(val));
        }
        return escapeCSV(val);
      });

      return [...basicInfo, ...customInfo];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `registrants_${event?.title?.replace(/\s+/g, '_') || 'event'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const declinedCount = registrations.filter(r => r.status === "declined").length;
  const confirmedCount = registrations.filter(r => r.status === "confirmed").length;
  const checkedInCount = registrations.filter(r => r.checked_in).length;

  // Get unique companies for the company filter
  const uniqueCompanies = Array.from(
    new Set(
      registrations
        .map((r) => r.attendee?.company?.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Get unique registration dates (formatted as YYYY-MM-DD) for the date filter
  const uniqueDates = Array.from(
    new Set(
      registrations
        .map((r) => r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : "")
        .filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a));

  const filteredRegistrations = registrations
    .filter(reg => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        (reg.attendee?.first_name || "").toLowerCase().includes(search) ||
        (reg.attendee?.last_name || "").toLowerCase().includes(search) ||
        (reg.attendee?.email || "").toLowerCase().includes(search) ||
        (reg.attendee?.company || "").toLowerCase().includes(search)
      );
      if (!matchesSearch) return false;
      
      if (checkInFilter === "checked_in") return reg.checked_in;
      if (checkInFilter === "not_checked_in") return !reg.checked_in;
      return true;
    })
    .filter(reg => {
      if (companyFilter !== "all" && reg.attendee?.company?.trim() !== companyFilter) {
        return false;
      }
      return true;
    })
    .filter(reg => {
      if (dateFilter !== "all") {
        const regDate = reg.created_at ? new Date(reg.created_at).toISOString().split('T')[0] : "";
        if (regDate !== dateFilter) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "alphabetical") {
        const nameA = `${a.attendee?.first_name || ""} ${a.attendee?.last_name || ""}`.trim().toLowerCase();
        const nameB = `${b.attendee?.first_name || ""} ${b.attendee?.last_name || ""}`.trim().toLowerCase();
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      } else {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
    });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-[#0f172a]" size={48} />
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>
        <div className="text-center py-20 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Event not found</h1>
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl font-mono text-xs text-left mb-6 whitespace-pre-wrap break-all">
              {error}
            </div>
          )}
          <Link href="/admin/events" className="text-blue-600 hover:underline">Return to Catalog</Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto font-outfit">
        <Link 
          href="/admin/events" 
          className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-[#0f172a] transition-colors mb-4 block"
        >
          ← Back to Catalog
        </Link>

        {/* Event Header Card */}
        <div className="bg-white dark:bg-[#0d1527] rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden mb-8">
          <div className="p-10 lg:p-14">
            <div className="flex flex-col md:flex-row justify-between items-start gap-12 min-w-0">
              <div className="flex-1 min-w-0 w-full">
                 <div className="flex flex-wrap items-center gap-3 mb-6">
                    {event.client?.logo_url && (
                      <div className="h-6 w-6 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={event.client.logo_url} alt={event.client.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span className="px-3 py-1 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-yellow-400/20">
                      {event.client?.name || "Command Panel"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 dark:text-slate-600">ID: {id}</span>
                    {(() => {
                      const now = new Date();
                      let statusText = "Active";
                      let badgeClass = "bg-green-50 text-green-600 border-green-200/50";
                      
                      if (event.registration_active === false) {
                        statusText = "Closed / Paused";
                        badgeClass = "bg-red-50 text-red-600 border-red-200/50";
                      } else {
                        if (event.registration_start) {
                          const startDate = new Date(event.registration_start);
                          if (now < startDate) {
                            statusText = `Scheduled (Opens ${startDate.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })})`;
                            badgeClass = "bg-blue-50 text-blue-600 border-blue-200/50";
                          }
                        }
                        if (event.registration_end) {
                          const endDate = new Date(event.registration_end);
                          if (now > endDate) {
                            statusText = "Closed (Expired)";
                            badgeClass = "bg-red-50 text-red-600 border-red-200/50";
                          }
                        }
                      }
                      
                      return (
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border ${badgeClass} dark:bg-slate-900/40`}>
                          Registration: {statusText}
                        </span>
                      );
                    })()}
                 </div>
                <h1 
                  className={`text-3xl sm:text-4xl md:text-5xl font-black text-[#0f172a] dark:text-white tracking-tighter italic font-bricolage leading-[1.1] ${(userRole === "admin" || userRole === "manager") ? "mb-6" : "mb-10"}`}
                >
                  {(event.title || "").replace(/<[^>]*>/g, "")}
                </h1>
                {(userRole === "admin" || userRole === "manager") && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-10 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 group min-w-0">
                     <p className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest ml-1 shrink-0">Public Link:</p>
                     <code className="text-xs font-bold text-[#0f172a] dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700 flex-1 min-w-0 truncate">
                       {typeof window !== 'undefined' ? `${window.location.origin}/register/${event.slug}` : `/register/${event.slug}`}
                     </code>
                     <button 
                       onClick={() => {
                         const url = `${window.location.origin}/register/${event.slug}`;
                         navigator.clipboard.writeText(url);
                         alert("Link copied!");
                       }}
                       className="px-4 py-2 bg-[#0f172a] dark:bg-yellow-400 text-white dark:text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-black dark:hover:bg-yellow-500 transition-all shrink-0"
                     >
                       Copy Link
                     </button>
                     <a 
                       href={`/register/${event.slug}`} 
                       target="_blank" 
                       className="p-2 text-slate-400 hover:text-[#0f172a] dark:hover:text-white transition-all shrink-0"
                     >
                       <ArrowUpRight size={16} />
                     </a>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5 gap-y-8 gap-x-4 sm:gap-x-6">
                  {/* Date Button */}
                  <button 
                    onClick={() => setSelectedMetric("date")}
                    className="flex flex-col justify-between gap-4 min-w-0 text-left bg-white dark:bg-[#0f172a]/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-[2rem] transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm active:scale-[0.98] w-full shadow-xs"
                  >
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-[#0f172a] dark:text-white rounded-2xl shrink-0 self-start">
                      <Calendar size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Date</p>
                      <p className="font-bold text-[#0f172a] dark:text-slate-200 text-sm sm:text-base whitespace-nowrap mt-1">{new Date(event.start_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                    </div>
                  </button>

                  {/* Venue Button */}
                  <button 
                    onClick={() => setSelectedMetric("venue")}
                    className="flex flex-col justify-between gap-4 min-w-0 text-left bg-white dark:bg-[#0f172a]/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-[2rem] transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm active:scale-[0.98] w-full shadow-xs"
                  >
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-[#0f172a] dark:text-white rounded-2xl shrink-0 self-start">
                      <MapPin size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Venue</p>
                      <p className="font-bold text-[#0f172a] dark:text-slate-200 text-sm sm:text-base truncate mt-1" title={event.location}>{event.location}</p>
                      {event.address && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider truncate mt-0.5" title={event.address}>{event.address}</p>
                      )}
                    </div>
                  </button>

                  {/* Enrollment Button */}
                  <button 
                    onClick={() => setSelectedMetric("enrollment")}
                    className="flex flex-col justify-between gap-4 min-w-0 text-left bg-white dark:bg-[#0f172a]/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-[2rem] transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm active:scale-[0.98] w-full shadow-xs"
                  >
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-[#0f172a] dark:text-white rounded-2xl shrink-0 self-start">
                      <Users size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Enrollment</p>
                      <p className="font-bold text-[#0f172a] dark:text-slate-200 text-sm sm:text-base whitespace-nowrap mt-1">{confirmedCount} / {event.capacity}</p>
                    </div>
                  </button>

                  {/* Declined Button */}
                  <button 
                    onClick={() => setSelectedMetric("declined")}
                    className="flex flex-col justify-between gap-4 min-w-0 text-left bg-white dark:bg-[#0f172a]/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-[2rem] transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm active:scale-[0.98] w-full shadow-xs"
                  >
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-2xl shrink-0 self-start">
                      <UserX size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Declined</p>
                      <p className="font-bold text-red-500 dark:text-red-400 text-sm sm:text-base whitespace-nowrap mt-1">{declinedCount}</p>
                    </div>
                  </button>

                  {/* Checked In Button */}
                  <button 
                    onClick={() => setSelectedMetric("checked_in")}
                    className="flex flex-col justify-between gap-4 min-w-0 text-left bg-white dark:bg-[#0f172a]/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-[2rem] transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm active:scale-[0.98] w-full col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-1 2xl:col-span-1 shadow-xs"
                  >
                    <div className="p-2.5 bg-green-50 dark:bg-green-950/30 text-green-600 rounded-2xl shrink-0 self-start">
                      <CheckCircle2 size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Checked In</p>
                      <div className="flex items-baseline gap-1.5 flex-wrap min-w-0 mt-1">
                        <p className="font-bold text-green-600 dark:text-green-400 text-sm sm:text-base whitespace-nowrap">{checkedInCount}</p>
                        {event.duration_days && event.duration_days > 1 && (
                          <span className="text-[8px] text-slate-400 font-bold uppercase whitespace-nowrap">(Unique)</span>
                        )}
                      </div>
                      {event.duration_days && event.duration_days > 1 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Array.from({ length: event.duration_days }, (_, i) => i + 1).map(d => (
                            <span key={d} className="px-1.5 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-[8px] font-bold rounded border border-green-200/50 dark:border-green-900/50 shrink-0">
                              Day {d}: {registrations.filter(r => r.checked_in_days?.includes(d)).length}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
              {(userRole === "admin" || userRole === "manager") && (
                <div className="flex flex-col gap-4 w-full md:w-auto">
                  <button
                    onClick={exportToExcel}
                    disabled={registrations.length === 0}
                    className="flex items-center justify-center gap-3 bg-[#0f172a] hover:bg-black disabled:bg-slate-200 dark:bg-yellow-400 dark:hover:bg-yellow-500 dark:text-[#0f172a] dark:disabled:bg-slate-800 dark:disabled:text-slate-500 text-white px-8 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-slate-200 dark:shadow-none uppercase tracking-widest text-xs"
                  >
                    <Download size={20} />
                    Export to Excel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/py/events/${event.id}/qrcodes/zip`, {
                          headers: { "x-user-email": session?.user?.email || "" }
                        });
                        if (!res.ok) {
                          const errData = await res.json();
                          throw new Error(errData.detail || "Failed to download ZIP");
                        }
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${event.slug}_qrcodes.zip`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      } catch (err: any) {
                        alert(`Error: ${err.message}`);
                      }
                    }}
                    disabled={registrations.length === 0}
                    className="flex items-center justify-center gap-3 bg-[#eab308] hover:bg-[#ca8a04] disabled:bg-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 text-[#0f172a] px-8 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-yellow-500/10 dark:shadow-none uppercase tracking-widest text-xs"
                  >
                    <Download size={20} />
                    Download QR Codes (ZIP)
                  </button>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/view/${event.slug}`;
                      navigator.clipboard.writeText(url);
                      alert("Client dashboard link copied to clipboard!");
                    }}
                    className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0f172a] dark:text-slate-200 px-8 py-5 rounded-2xl font-black transition-all border border-slate-200 dark:border-slate-700 uppercase tracking-widest text-xs"
                  >
                    <Eye size={20} />
                    Share Client Link
                  </button>
                  <Link
                    href={`/admin/events/${id}/badges`}
                    className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0f172a] dark:text-slate-200 px-8 py-5 rounded-2xl font-black transition-all border border-slate-200 dark:border-slate-700 uppercase tracking-widest text-xs text-center"
                  >
                    <Printer size={20} />
                    Print Badges
                  </Link>
                  <button
                    onClick={async () => {
                      const confirmedCount = registrations.filter(r => r.status === "confirmed").length;
                      if (confirmedCount === 0) {
                        alert("No confirmed attendees to remind.");
                        return;
                      }
                      if (confirm(`Are you sure you want to send pre-event reminder notifications to ${confirmedCount} confirmed attendee(s)?`)) {
                        try {
                          const res = await fetch(`/api/py/events/${id}/remind`, {
                            method: "POST",
                            headers: { "x-user-email": session?.user?.email || "" }
                          });
                          if (res.ok) {
                            const data = await res.json();
                            alert(data.message || "Reminders queued successfully!");
                          } else {
                            const err = await res.json();
                            alert(`Failed to send reminders: ${err.detail || "Unknown error"}`);
                          }
                        } catch (err) {
                          alert("An error occurred while sending reminders.");
                        }
                      }
                    }}
                    className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0f172a] dark:text-slate-200 px-8 py-5 rounded-2xl font-black transition-all border border-slate-200 dark:border-slate-700 uppercase tracking-widest text-xs"
                  >
                    <Mail size={20} />
                    Send Reminders
                  </button>
                  <Link
                    href={`/admin/events/${id}/edit`}
                    className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0f172a] dark:text-slate-200 px-8 py-5 rounded-2xl font-black transition-all border border-slate-200 dark:border-slate-700 uppercase tracking-widest text-xs text-center"
                  >
                    Edit Configuration
                  </Link>
                  {(userRole === "admin" || userRole === "manager") && (
                    <button
                      onClick={async () => {
                        if (confirm(`Are you sure you want to duplicate this event?`)) {
                          try {
                            const res = await fetch(`/api/py/events/${id}/duplicate`, {
                              method: "POST",
                              headers: { "x-user-email": session?.user?.email || "" }
                            });
                            if (res.ok) {
                              const duplicateData = await res.json();
                              alert("Event duplicated successfully!");
                              router.push(`/admin/events/${duplicateData.id}`);
                            } else {
                              const err = await res.json();
                              alert(`Failed to duplicate: ${err.detail || "Unknown error"}`);
                            }
                          } catch (err) {
                            alert("An error occurred while duplicating the event.");
                          }
                        }
                      }}
                      className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0f172a] dark:text-slate-200 px-8 py-5 rounded-2xl font-black transition-all border border-slate-200 dark:border-slate-700 uppercase tracking-widest text-xs"
                    >
                      Duplicate Event
                    </button>
                  )}
                  {userRole === "admin" && (
                    <button
                      onClick={async () => {
                        const email = prompt("Enter test email address:");
                        if (!email) return;
                        try {
                          const res = await fetch(`/api/py/events/${id}/test-email`, {
                            method: "POST",
                            headers: { 
                              "Content-Type": "application/json",
                              "x-user-email": session?.user?.email || ""
                            },
                            body: JSON.stringify({ email })
                          });
                          if (res.ok) alert("Test email dispatched!");
                          else {
                            const err = await res.json();
                            alert(`Failed: ${err.detail || "Unknown error"}`);
                          }
                        } catch (err) {
                          alert("Error sending test email");
                        }
                      }}
                      className="flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 text-[#0f172a] px-8 py-5 rounded-2xl font-black transition-all border border-slate-100 uppercase tracking-widest text-xs"
                    >
                      Test Email Service
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="px-10 flex border-t border-slate-50 dark:border-slate-800 bg-slate-50/20 overflow-x-auto whitespace-nowrap scrollbar-hide">
             <button 
               onClick={() => setActiveTab("registrants")}
               className={`px-6 md:px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 shrink-0 ${activeTab === "registrants" ? "border-yellow-400 text-[#0f172a] dark:text-white" : "border-transparent text-slate-400"}`}
             >
                Registrants
             </button>
             {(userRole === "admin" || userRole === "manager") && (
                <button 
                  onClick={() => setActiveTab("form")}
                  className={`px-6 md:px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 shrink-0 ${activeTab === "form" ? "border-yellow-400 text-[#0f172a] dark:text-white" : "border-transparent text-slate-400"}`}
                >
                  Form Studio
               </button>
             )}
              <button 
                onClick={() => setActiveTab("scanner")}
                className={`px-6 md:px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 shrink-0 ${activeTab === "scanner" ? "border-yellow-400 text-[#0f172a] dark:text-white" : "border-transparent text-slate-400"}`}
              >
                Live Scanner
             </button>
             {(userRole === "admin" || userRole === "manager") && (
                <button 
                  onClick={() => setActiveTab("communications")}
                  className={`px-6 md:px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 shrink-0 ${activeTab === "communications" ? "border-yellow-400 text-[#0f172a] dark:text-white" : "border-transparent text-slate-400"}`}
                >
                  Communications
               </button>
             )}
             {(userRole === "admin" || userRole === "manager") && (
                <button 
                  onClick={() => setActiveTab("staff")}
                  className={`px-6 md:px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 shrink-0 ${activeTab === "staff" ? "border-yellow-400 text-[#0f172a] dark:text-white" : "border-transparent text-slate-400"}`}
                >
                  Staff Assignment
               </button>
             )}
          </div>
        </div>

        {activeTab === "registrants" ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0d1527] rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800/80 p-8 flex flex-col gap-6">
              {/* Row 1: Search and Check-in Tabs */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                 <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" size={20} />
                    <input 
                      type="text" 
                      placeholder="Search by name, email or company..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] dark:text-white placeholder-slate-300 dark:placeholder-slate-600 transition-all"
                    />
                 </div>
                 <div className="flex flex-wrap items-center gap-4">
                   <div className="flex bg-slate-100/85 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex-wrap items-center gap-1">
                     <button
                       onClick={() => setCheckInFilter("all")}
                       className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${checkInFilter === "all" ? "bg-[#0f172a] dark:bg-yellow-400 text-white dark:text-black shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
                     >
                       All ({registrations.length})
                     </button>
                     <button
                       onClick={() => setCheckInFilter("checked_in")}
                       className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${checkInFilter === "checked_in" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"}`}
                     >
                       Checked In ({registrations.filter(r => r.checked_in).length})
                     </button>
                     <button
                       onClick={() => setCheckInFilter("not_checked_in")}
                       className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${checkInFilter === "not_checked_in" ? "bg-slate-900 dark:bg-slate-800 text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
                     >
                       Not Checked In ({registrations.filter(r => !r.checked_in).length})
                     </button>
                   </div>
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={fetchRegistrations}
                        disabled={refreshing}
                        className="px-5 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all text-[#0f172a] dark:text-slate-300 disabled:text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
                        title="Refresh List"
                      >
                         <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                      </button>
                      <div className="flex items-center gap-4 px-6 py-4 bg-slate-50 dark:bg-[#121b2e] rounded-2xl">
                         <span className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest">Showing:</span>
                         <span className="text-xs font-black text-[#0f172a] dark:text-slate-200">{filteredRegistrations.length} Registrants</span>
                      </div>
                   </div>
                 </div>
              </div>
              
              {/* Row 2: Advanced Filtering and Sorting */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 border-t border-slate-50 dark:border-slate-800/80 pt-6">
                 {/* Company Filter Dropdown */}
                 <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Filter by Company</label>
                    <select
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 outline-none font-bold text-xs text-[#0f172a] dark:text-slate-200 cursor-pointer transition-all"
                    >
                      <option value="all">All Companies</option>
                      {uniqueCompanies.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                 </div>

                 {/* Date Filter Dropdown */}
                 <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Filter by Reg Date</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 outline-none font-bold text-xs text-[#0f172a] dark:text-slate-200 cursor-pointer transition-all"
                    >
                      <option value="all">All Dates</option>
                      {uniqueDates.map((d) => {
                        const formattedDate = new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
                        return <option key={d} value={d}>{formattedDate}</option>;
                      })}
                    </select>
                 </div>

                 {/* Sort By Dropdown */}
                 <div className="flex flex-col gap-1.5 min-w-[180px]">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Sort by</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 outline-none font-bold text-xs text-[#0f172a] dark:text-slate-200 cursor-pointer transition-all"
                    >
                      <option value="registration_date">Registration Date</option>
                      <option value="alphabetical">Alphabetical Order</option>
                    </select>
                 </div>

                 {/* Sort Order Toggle Button */}
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Order</label>
                    <button
                      onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                      className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all text-xs font-black uppercase tracking-wider text-[#0f172a] dark:text-slate-300 flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
                    >
                      {sortOrder === "asc" ? <ArrowUpAZ size={16} /> : <ArrowDownAZ size={16} />}
                      {sortOrder === "asc" ? "Asc" : "Desc"}
                    </button>
                 </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0d1527] rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden">
              <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/30">
                <h2 className="text-xl font-black text-[#0f172a] dark:text-white font-bricolage italic uppercase tracking-tight">Active <span className="text-slate-300 dark:text-slate-600">Registrants</span></h2>
                <div className="flex items-center gap-3">
                  {selectedIds.length > 0 && (userRole === "admin" || userRole === "manager") && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 animate-fade-in"
                    >
                      {bulkDeleting ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete Selected ({selectedIds.length})
                    </button>
                  )}
                  {(userRole === "admin" || userRole === "manager") && (
                    <button 
                      onClick={() => setIsWalkinOpen(true)}
                      className="flex items-center gap-2 bg-[#eab308] hover:bg-[#ca8a04] text-[#0f172a] px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      <UserPlus size={14} />
                      Add Registrant
                    </button>
                  )}
                  {userRole === "admin" && (
                    <button 
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-2 bg-[#0f172a] hover:bg-black text-white dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border dark:border-slate-700"
                    >
                      <Upload size={14} />
                      Import Registrants
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-auto max-h-[650px] pb-4 relative">
                <table className="w-full text-left min-w-[1100px] border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-[#0d1527] z-10">
                  <tr className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] bg-white dark:bg-[#0d1527]">
                    {(userRole === "admin" || userRole === "manager") && (
                      <th className="pl-10 pr-2 py-6 bg-white dark:bg-[#0d1527] border-b border-slate-100 dark:border-slate-800/80 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredRegistrations.length > 0 && selectedIds.length === filteredRegistrations.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(filteredRegistrations.map((r) => r.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          className="w-4 h-4 text-yellow-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded focus:ring-yellow-500 focus:ring-2 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className={`${(userRole === "admin" || userRole === "manager") ? "px-6" : "px-10"} py-6 bg-white dark:bg-[#0d1527] border-b border-slate-100 dark:border-slate-800/80`}>Attendee Details</th>
                    <th className="px-10 py-6 bg-white dark:bg-[#0d1527] border-b border-slate-100 dark:border-slate-800/80">Organization</th>
                    <th className="px-10 py-6 bg-white dark:bg-[#0d1527] border-b border-slate-100 dark:border-slate-800/80">Status</th>
                    <th className="px-10 py-6 bg-white dark:bg-[#0d1527] border-b border-slate-100 dark:border-slate-800/80">Verified On</th>
                    <th className="px-10 py-6 text-right bg-white dark:bg-[#0d1527] border-b border-slate-100 dark:border-slate-800/80">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={(userRole === "admin" || userRole === "manager") ? 6 : 5} className="px-10 py-24 text-center">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Users className="text-slate-200" size={32} />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No matching registrations found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors group">
                        {(userRole === "admin" || userRole === "manager") && (
                          <td className="pl-10 pr-2 py-8 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(reg.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds((prev) => [...prev, reg.id]);
                                } else {
                                  setSelectedIds((prev) => prev.filter((id) => id !== reg.id));
                                }
                              }}
                              className="w-4 h-4 text-yellow-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded focus:ring-yellow-500 focus:ring-2 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className={`${(userRole === "admin" || userRole === "manager") ? "px-6" : "px-10"} py-8`}>
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-[#0f172a] dark:bg-slate-800 text-white rounded-xl flex items-center justify-center font-bold text-xs uppercase border dark:border-slate-700">
                                {reg.attendee.first_name[0]}{reg.attendee.last_name[0]}
                             </div>
                             <div>
                                <p className="font-bold text-[#0f172a] dark:text-white">{reg.attendee.first_name} {reg.attendee.last_name}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{reg.attendee.email}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-slate-600 dark:text-slate-400 font-bold text-xs">
                          {reg.attendee.company || "—"}
                        </td>
                        <td className="px-10 py-8">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                            reg.status === "confirmed" 
                              ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30" 
                              : reg.status === "declined"
                                ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30"
                                : "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/30"
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              reg.status === "confirmed" ? "bg-green-500" : reg.status === "declined" ? "bg-red-500" : "bg-yellow-500"
                            }`}></div>
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-10 py-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          {new Date(reg.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                          {event.duration_days && event.duration_days > 1 ? (
                            <div className="flex gap-1.5">
                              {Array.from({ length: event.duration_days }, (_, i) => i + 1).map(dayNum => {
                                const isCheckedInForDay = reg.checked_in_days?.includes(dayNum);
                                return (
                                  <button
                                    key={dayNum}
                                    disabled={reg.status === "declined"}
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/py/registrations/${reg.id}/checkin?day=${dayNum}`, { method: "PUT" });
                                        if (res.ok) {
                                          const updated = await res.json();
                                          setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, checked_in: updated.checked_in, checked_in_days: updated.checked_in_days ?? [] } : r));
                                        }
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                      reg.status === "declined"
                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-650 cursor-not-allowed opacity-55"
                                        : isCheckedInForDay 
                                          ? "bg-green-500 text-white shadow-sm shadow-green-500/20" 
                                          : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    }`}
                                  >
                                    Day {dayNum}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <button
                              disabled={reg.status === "declined"}
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/py/registrations/${reg.id}/checkin`, { method: "PUT" });
                                  if (res.ok) {
                                    const updated = await res.json();
                                    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, checked_in: updated.checked_in, checked_in_days: updated.checked_in_days ?? [] } : r));
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                reg.status === "declined"
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-55"
                                  : reg.checked_in 
                                    ? "bg-green-500 text-white shadow-lg shadow-green-500/20" 
                                    : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                            >
                              {reg.checked_in ? "Checked In" : "Check In"}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setHideResendButton(false);
                              setSelectedReg(reg);
                            }}
                            className="p-2 text-slate-300 dark:text-slate-600 hover:text-[#0f172a] dark:hover:text-white transition-all"
                          >
                            <MoreVertical size={18} />
                          </button>
                          {(userRole === "admin" || userRole === "manager") && (
                            <button
                              onClick={() => handleDeleteRegistration(reg.id)}
                              disabled={deletingId === reg.id}
                              className="text-slate-300 hover:text-red-500 p-2 transition-all"
                            >
                              {deletingId === reg.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ) : activeTab === "form" ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-14">
             <FormBuilder 
               eventId={id as string} 
               templateId={event.registration_form_template?.id}
               initialSchema={event.custom_fields_schema} 
               onSave={(newSchema) => setEvent({ ...event, custom_fields_schema: newSchema })} 
             />
          </div>
        ) : activeTab === "scanner" ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-24">
             <div className="max-w-2xl mx-auto text-center mb-10">
                <h2 className="text-5xl font-black text-[#0f172a] mb-6 tracking-tight font-bricolage italic uppercase">LIVE <span className="text-slate-300">SCANNER</span></h2>
                <p className="text-slate-500 font-medium">Scan attendee QR codes or enter their Unique Clearance ID for instantaneous verification.</p>
             </div>
             
             {event.duration_days && event.duration_days > 1 && (
               <div className="max-w-md mx-auto mb-16 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="text-center sm:text-left">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Check-In Day</label>
                   <p className="text-[11px] text-slate-400 font-medium">Auto-detect or lock to a specific event day</p>
                 </div>
                 <select
                   value={selectedScanDay}
                   onChange={(e) => {
                     const val = e.target.value;
                     setSelectedScanDay(val === "auto" ? "auto" : parseInt(val));
                   }}
                   className="w-full sm:w-auto px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-bold text-xs text-[#0f172a]"
                 >
                   <option value="auto">Auto-Detect Day</option>
                   {Array.from({ length: event.duration_days }, (_, i) => i + 1).map(d => (
                     <option key={d} value={d}>Day {d}</option>
                   ))}
                 </select>
               </div>
             )}
             
             {/* Offline Setup & Control Panel */}
             <div className="max-w-4xl mx-auto mb-12 bg-slate-50 border border-slate-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="space-y-2 text-center md:text-left">
                 <div className="flex items-center justify-center md:justify-start gap-2.5">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0f172a]">Offline Scanner Configuration</h3>
                   <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                     isOnline ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                   }`}>
                     {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                     {isOnline ? "Online" : "Offline Mode"}
                   </span>
                 </div>
                 <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                   {lastCachedAt ? `Manifest cached at ${lastCachedAt}` : "Manifest not cached for offline scanning"}
                 </p>
                 {offlineStats && (
                   <div className="flex gap-4 pt-1.5 justify-center md:justify-start text-[10px] font-black uppercase tracking-wider text-slate-500">
                     <span>Cached Attendees: <strong className="text-[#0f172a]">{offlineStats.cachedCount}</strong></span>
                     <span>•</span>
                     <span>Total Checked-in: <strong className="text-[#0f172a]">{offlineStats.checkedInCount}</strong></span>
                     {pendingSyncCount > 0 && (
                       <>
                         <span>•</span>
                         <span className="text-yellow-600 font-black">Unsynced Scans: <strong>{pendingSyncCount}</strong></span>
                       </>
                     )}
                   </div>
                 )}
               </div>
               
               <div className="flex flex-wrap justify-center gap-3">
                 <button
                   onClick={downloadManifestForOffline}
                   disabled={isCaching}
                   className="px-5 py-3.5 bg-white border border-slate-200/80 hover:border-yellow-400 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0f172a] disabled:text-slate-300 transition-all flex items-center gap-2"
                 >
                   {isCaching ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                   {isCaching ? "Downloading..." : "Cache offline manifest"}
                 </button>
                 {pendingSyncCount > 0 && (
                   <button
                     onClick={forceSyncOfflineScans}
                     disabled={isSyncing}
                     className="px-5 py-3.5 bg-yellow-400 hover:bg-yellow-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0f172a] disabled:bg-slate-200 transition-all flex items-center gap-2 shadow-lg shadow-yellow-400/20 animate-pulse"
                   >
                     {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                     Sync Scans ({pendingSyncCount})
                   </button>
                 )}
               </div>
             </div>
             
             <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
               <div className="space-y-8">
                 <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-1">QR Verification</h3>
                   <QRScanner 
                     operatorConfig={event?.registration_form_template?.operator_config}
                     onScan={async (regId) => {
                       const targetDay = selectedScanDay === "auto" ? 1 : selectedScanDay;
                       
                       if (!isOnline) {
                         const localReg = await dbOffline.getLocalRegistration(regId);
                         if (!localReg) {
                           throw new Error("Clearance credential not found in local offline cache.");
                         }
                         if (localReg.status === "declined") {
                           throw new Error("Declined registrations cannot be checked in.");
                         }
                         const checkedInDays = localReg.checked_in_days || [];
                         if (checkedInDays.includes(targetDay)) {
                           throw new Error(`Attendee already checked in for Day ${targetDay}`);
                         }
                         
                         const scanObj: dbOffline.OfflineScan = {
                           registration_id: localReg.id,
                           day: targetDay,
                           timestamp: new Date().toISOString(),
                           mode: "checkin",
                           synced: false
                         };
                         await dbOffline.addOfflineScan(scanObj);
                         await updateOfflineStats();
                         
                         const resultObj = {
                           id: localReg.id,
                           attendee: localReg.attendee,
                           checked_in: true,
                           checked_in_days: [...checkedInDays, targetDay]
                         };
                         return {
                           ...resultObj,
                           operator_fields: formatOperatorFields(resultObj),
                           card_layout_text: event?.registration_form_template?.operator_config?.card_layout_text 
                             ? compileOperatorCustomLayout(event.registration_form_template.operator_config.card_layout_text, resultObj)
                             : null
                         };
                       }
                       
                       const query = selectedScanDay === "auto" ? "mode=checkin" : `mode=checkin&day=${selectedScanDay}`;
                       const res = await fetch(`/api/py/registrations/${regId}/checkin?${query}`, { 
                         method: "PUT",
                         headers: { "x-user-email": session?.user?.email || "" }
                       });
                       if (!res.ok) {
                         const error = await res.json();
                         throw new Error(error.detail || "Authentication Failed");
                       }
                       const updated = await res.json();
                       setRegistrations(prev => prev.map(r => r.id === updated.id ? { ...r, checked_in: updated.checked_in, checked_in_days: updated.checked_in_days ?? [] } : r));
                       
                       dbOffline.initDb().then(async (db) => {
                         const tx = db.transaction(["registrations"], "readwrite");
                         tx.objectStore("registrations").put(updated);
                       }).catch(() => {});
                       
                       return {
                         ...updated,
                         operator_fields: formatOperatorFields(updated),
                         card_layout_text: event?.registration_form_template?.operator_config?.card_layout_text 
                           ? compileOperatorCustomLayout(event.registration_form_template.operator_config.card_layout_text, updated)
                           : null
                       };
                     }}
                     onViewDetails={(registrant) => {
                        const fullReg = registrations.find(r => r.id === registrant.id) || registrant;
                        setHideResendButton(true);
                        setSelectedReg(fullReg);
                      }}
                   />
                 </div>
               </div>

               <div className="space-y-8">
                 <div className="bg-slate-50 p-10 rounded-[2rem] border border-slate-100">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-1">Manual PIN Entry</h3>
                   {pinStatus === "idle" ? (
                     <div className="space-y-4">
                       <input 
                         type="text" 
                         maxLength={6}
                         placeholder="ENTER CLEARANCE PIN"
                         value={pin}
                         onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                         className="w-full text-center text-2xl md:text-4xl font-black py-8 bg-white rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none text-[#0f172a] placeholder-slate-200 tracking-[0.2em] md:tracking-[0.5em]"
                       />
                       <button 
                         onClick={async () => {
                           if (pin.length !== 4 && pin.length !== 6) return;
                           setPinStatus("processing");
                           setPinMessage("Verifying PIN...");
                           
                           const targetDay = selectedScanDay === "auto" ? 1 : selectedScanDay;
                           
                           if (!isOnline) {
                             try {
                               const localReg = await dbOffline.getLocalRegistration(pin);
                               if (!localReg) {
                                 setPinStatus("error");
                                 setPinMessage("Clearance PIN not found in offline cache.");
                                 return;
                               }
                               if (localReg.status === "declined") {
                                 setPinStatus("error");
                                 setPinMessage("Declined registration cannot be checked in.");
                                 return;
                               }
                               const checkedInDays = localReg.checked_in_days || [];
                               if (checkedInDays.includes(targetDay)) {
                                 setPinStatus("warning");
                                 setPinMessage(`Already Checked In for Day ${targetDay}`);
                                 setCheckedInReg(localReg);
                                 return;
                               }
                               
                               const scanObj: dbOffline.OfflineScan = {
                                 registration_id: localReg.id,
                                 day: targetDay,
                                 timestamp: new Date().toISOString(),
                                 mode: "checkin",
                                 synced: false
                               };
                               await dbOffline.addOfflineScan(scanObj);
                               await updateOfflineStats();
                               
                               setPinStatus("success");
                               setPinMessage(`Check-in Successful: ${localReg.attendee?.first_name || 'Guest'}`);
                               setCheckedInReg(localReg);
                               setPin("");
                             } catch (err) {
                               setPinStatus("error");
                               setPinMessage("Local verification error");
                             }
                             return;
                           }
                           
                           try {
                             const payload: Record<string, any> = { pin };
                             if (selectedScanDay !== "auto") {
                               payload.day = selectedScanDay;
                             }
                             const res = await fetch(`/api/py/events/${id}/checkin-by-pin`, {
                               method: "POST",
                               headers: { 
                                 "Content-Type": "application/json",
                                 "x-user-email": session?.user?.email || ""
                               },
                               body: JSON.stringify(payload)
                             });
                             if (res.ok) {
                               const updated = await res.json();
                               setRegistrations(prev => prev.map(r => r.id === updated.id ? { ...r, checked_in: updated.checked_in, checked_in_days: updated.checked_in_days ?? [] } : r));
                               setPinStatus("success");
                               setPinMessage(`Check-in Successful: ${updated.attendee?.first_name || 'Guest'}`);
                               setCheckedInReg(updated);
                               setPin("");
                               dbOffline.initDb().then(async (db) => {
                                 const tx = db.transaction(["registrations"], "readwrite");
                                 tx.objectStore("registrations").put(updated);
                               }).catch(() => {});
                             } else {
                               const err = await res.json().catch(() => ({}));
                               const errMsg = err.detail || "Invalid PIN";
                               if (err.already_checked_in && err.registration) {
                                 setPinStatus("warning");
                                 setPinMessage(errMsg);
                                 setCheckedInReg(err.registration);
                               } else if (errMsg.toLowerCase().includes("already checked in")) {
                                 setPinStatus("warning");
                                 setPinMessage(errMsg);
                               } else {
                                 setPinStatus("error");
                                 setPinMessage(errMsg);
                               }
                             }
                           } catch (err) {
                             setPinStatus("error");
                             setPinMessage("Verification error");
                           }
                         }}
                         disabled={pin.length !== 4 && pin.length !== 6}
                        className="w-full bg-[#0f172a] hover:bg-black disabled:bg-slate-200 text-white font-black py-6 rounded-2xl transition-all uppercase tracking-widest text-xs"
                       >
                         Verify & Check In
                       </button>
                     </div>
                   ) : (
                     <div 
                        style={{
                          backgroundColor: pinStatus === "success"
                            ? (event?.registration_form_template?.operator_config?.success_bg_color || "#22c55e")
                            : pinStatus === "warning"
                            ? "#f97316"
                            : pinStatus === "error"
                            ? "#ef4444"
                            : "#0f172a"
                        }}
                        className="flex flex-col items-center gap-6 px-5 py-8 md:p-8 rounded-[1.5rem] shadow-lg w-full animate-in zoom-in-95 duration-300 text-white"
                      >
                       {pinStatus === "processing" && <Loader2 className="animate-spin" size={48} />}
                       {pinStatus === "success" && <CheckCircle2 size={48} />}
                       {pinStatus === "error" && <XCircle size={48} />}
                       {pinStatus === "warning" && <AlertCircle size={48} />}
                       
                       <div className="text-center w-full">
                          <p className="text-xl font-black italic uppercase tracking-tighter font-bricolage leading-tight">{pinMessage}</p>
                          {(pinStatus === "success" || pinStatus === "warning") && checkedInReg && (
                             <>
                               {event?.registration_form_template?.operator_config?.card_layout_text ? (
                                 <div className="bg-white/10 p-5 rounded-2xl border border-white/5 text-left mt-6 w-full max-h-60 overflow-y-auto pr-1">
                                   <pre className="text-sm font-semibold text-white whitespace-pre-wrap font-sans leading-relaxed">
                                     {compileOperatorCustomLayout(event.registration_form_template.operator_config.card_layout_text, checkedInReg)}
                                   </pre>
                                 </div>
                               ) : (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mt-6 w-full max-h-60 overflow-y-auto pr-1">
                                   {formatOperatorFields(checkedInReg).map((f: any, idx: number) => (
                                     <div key={idx} className="bg-white/10 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between animate-in fade-in slide-in-from-top-1">
                                       <span className="text-[8px] uppercase tracking-widest text-white/60 font-black">{f.label}</span>
                                       <span className="text-xs font-bold text-white mt-0.5 break-words">{f.value}</span>
                                     </div>
                                   ))}
                                 </div>
                               )}

                                <button
                                   type="button"
                                   onClick={() => {
                                     const fullReg = registrations.find(r => r.id === checkedInReg?.id) || checkedInReg;
                                     setHideResendButton(true);
                                     setSelectedReg(fullReg);
                                     setPinStatus("idle");
                                     setCheckedInReg(null);
                                   }}
                                   className="w-full mt-5 bg-white/15 hover:bg-white/25 text-white border border-white/10 font-black py-3 px-4 rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                                 >
                                   <Eye size={14} />
                                   View Registrant Details & Edit
                                 </button>

                               {/* Interactive Custom Questions Form inside the Scanner card */}
                               <div className="mt-6 border-t border-white/10 pt-5 text-left w-full space-y-4">
                                 <span className="text-[10px] font-black text-white/70 uppercase tracking-widest block mb-2">Update Custom Answers</span>
                                 {(() => {
                                   const activeSchema = (event?.custom_fields_schema && event.custom_fields_schema.length > 0)
                                     ? event.custom_fields_schema
                                     : (event?.registration_form_template?.layout_schema || []);
                                   let flatFields: any[] = [];
                                   if (activeSchema.length > 0 && "fields" in activeSchema[0]) {
                                     for (const section of activeSchema) {
                                       flatFields.push(...(section.fields || []));
                                     }
                                   } else {
                                     flatFields = activeSchema;
                                   }
                                   const getCustomAnswer = (answers: any, field: any) => {
                                      const key = field.key || field.id;
                                      if (event.id === 19) {
                                         const map: Record<string, string> = { "p2_skill": "skill_level", "p2_preferred_partner": "partner_name" };
                                         return answers[key] ?? answers[map[key]] ?? "";
                                      }
                                      return answers[key] ?? "";
                                   };
                                   const customFields = flatFields.filter(f => f && (f.key || f.id) && !["first_name", "last_name", "email", "company"].includes(f.key || f.id));
                                   
                                   if (customFields.length === 0) {
                                     return <p className="text-[10px] text-white/50 italic">No custom questions configured for this event form.</p>;
                                   }
                                   
                                   return (
                                     <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                                       {customFields.map((field) => {
                                         const label = (field.label || "").replace(/<[^>]*>/g, "").trim();
                                         const fieldKey = field.key || field.id;
                                         const val = getCustomAnswer(editedAnswers, field);
                                         
                                         return (
                                           <div key={fieldKey} className="space-y-1.5">
                                             <label className="text-[9px] font-black text-white/65 uppercase tracking-wider block">{label}</label>
                                             {field.type === "select" && field.options && field.options.length > 0 ? (
                                               <select
                                                 value={val}
                                                 onChange={(e) => handleAnswerChange(fieldKey, e.target.value)}
                                                 className="w-full px-3 py-2 bg-white/15 rounded-xl border border-white/10 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-yellow-400"
                                               >
                                                 <option value="" className="text-slate-800">Select option...</option>
                                                 {field.options.map((opt: string) => (
                                                   <option key={opt} value={opt} className="text-slate-800">{opt}</option>
                                                 ))}
                                               </select>
                                             ) : field.type === "checkbox" ? (
                                               <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-white">
                                                 <input
                                                   type="checkbox"
                                                   checked={val === "Yes" || val === true}
                                                   onChange={(e) => handleAnswerChange(fieldKey, e.target.checked ? "Yes" : "No")}
                                                   className="w-4 h-4 rounded text-[#0f172a]"
                                                 />
                                                 Check if true
                                               </label>
                                             ) : (
                                               <input
                                                 type="text"
                                                 value={val}
                                                 onChange={(e) => handleAnswerChange(fieldKey, e.target.value)}
                                                 placeholder={`Enter ${label.toLowerCase()}...`}
                                                 className="w-full px-3 py-2 bg-white/15 rounded-xl border border-white/10 text-xs font-semibold text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-yellow-400"
                                               />
                                             )}
                                           </div>
                                         );
                                       })}
                                     </div>
                                   );
                                 })()}
                                 
                                 <button
                                   onClick={async () => {
                                     try {
                                       setIsSavingAnswers(true);
                                       const res = await fetch(`/api/py/registrations/${checkedInReg.id}/custom-answers`, {
                                         method: "PUT",
                                         headers: { 
                                           "Content-Type": "application/json",
                                           "x-user-email": session?.user?.email || ""
                                         },
                                         body: JSON.stringify(editedAnswers)
                                       });
                                       if (res.ok) {
                                         const data = await res.json();
                                         setRegistrations(prev => prev.map(r => r.id === checkedInReg.id ? { ...r, custom_answers: data.custom_answers } : r));
                                         setCheckedInReg((prev: any) => prev ? { ...prev, custom_answers: data.custom_answers } : null);
                                         alert("Answers saved successfully!");
                                       } else {
                                         alert("Failed to save answers.");
                                       }
                                     } catch (err) {
                                       console.error(err);
                                       alert("Connection error while saving answers.");
                                     } finally {
                                       setIsSavingAnswers(false);
                                     }
                                   }}
                                   disabled={isSavingAnswers}
                                   className="w-full mt-2 bg-white hover:bg-slate-100 text-slate-900 font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
                                 >
                                   {isSavingAnswers ? "Saving..." : "Save Custom Answers"}
                                 </button>
                               </div>
                             </>
                          )}
                          {pinStatus !== "processing" && (
                            <button 
                              onClick={() => { setPinStatus("idle"); setCheckedInReg(null); }}
                              className={`mt-6 px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                                pinStatus === "warning" ? "bg-white/20 hover:bg-white/30 border-white/10" : "bg-white/20 hover:bg-white/30 border-white/10"
                              }`}
                            >
                              {pinStatus === "success" || pinStatus === "warning" ? "Scan Next Guest" : "Close & Resume"}
                            </button>
                          )}
                       </div>
                     </div>
                   )}
                 </div>

                 <div className="p-8 bg-yellow-400/5 rounded-[2rem] border border-yellow-400/10">
                   <p className="text-[10px] font-medium text-yellow-600/70 leading-relaxed uppercase tracking-wider">
                     Attendees can find their Unique Clearance ID (4 or 6 digits) at the bottom of their confirmation email or below their QR code.
                   </p>
                 </div>
               </div>
             </div>
          </div>
        ) : activeTab === "staff" ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-14">
             <StaffAssignment 
               eventId={id as string} 
               clientId={event.client?.id}
             />
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 lg:p-24">
             <div className="max-w-2xl mx-auto mb-16">
                <h2 className="text-5xl font-black text-[#0f172a] mb-6 tracking-tight font-bricolage italic uppercase text-center">BROADCAST <span className="text-slate-300">DISPATCH</span></h2>
                <p className="text-slate-500 font-medium text-center">Send updates or reminders to all {registrations.length} confirmed attendees.</p>
             </div>

             <div className={`${(selectedBroadcastKey || selectedSurveyKey) ? "max-w-6xl" : "max-w-xl"} mx-auto space-y-12 transition-all duration-300`}>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    
                    const fileInput = document.getElementById("attachments") as HTMLInputElement;
                    const files = fileInput?.files ? Array.from(fileInput.files) : [];
                    
                    const readAsBase64 = (file: File): Promise<string> => {
                      return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => {
                          const base64String = reader.result?.toString().split(",")[1] || "";
                          resolve(base64String);
                        };
                        reader.onerror = (error) => reject(error);
                      });
                    };
                    
                    if (!confirm(`Are you sure you want to send this broadcast to ${registrations.length} attendees?`)) return;
                    
                    try {
                      const attachments = await Promise.all(
                        files.map(async (file) => ({
                          filename: file.name,
                          content: await readAsBase64(file)
                        }))
                      );
                      
                      let bodyPayload = broadcastBody;
                      let subjectPayload = broadcastSubject;
                      
                      if (selectedBroadcastKey) {
                        const tmpl = emailTemplates.find(t => t.key === selectedBroadcastKey);
                        if (tmpl) {
                          bodyPayload = tmpl.body_html || "";
                          subjectPayload = tmpl.subject || `Update for ${event.title}`;
                        }
                      }
                      
                      const res = await fetch(`/api/py/events/${id}/broadcast`, {
                        method: "POST",
                        headers: { 
                          "Content-Type": "application/json",
                          "x-user-email": session?.user?.email || ""
                        },
                        body: JSON.stringify({ 
                          subject: subjectPayload, 
                          body: bodyPayload, 
                          signature: selectedBroadcastKey ? "" : broadcastSignature, 
                          attachments 
                        })
                      });
                      if (res.ok) {
                        alert("Broadcast successfully queued in the background!");
                        if (!selectedBroadcastKey) {
                          setBroadcastBody("");
                        }
                        if (fileInput) fileInput.value = "";
                      } else {
                        alert("Failed to send broadcast. Ensure RESEND_API_KEY is configured.");
                      }
                    } catch (err) {
                      console.error(err);
                      alert("An error occurred during dispatch.");
                    }
                  }}
                  className="space-y-8"
                >
                   {/* Load Prebuilt Template Selector */}
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Broadcast Template</label>
                      <select 
                        value={selectedBroadcastKey}
                        onChange={(e) => {
                          const key = e.target.value;
                          setSelectedBroadcastKey(key);
                          if (key) {
                            const tmpl = emailTemplates.find(t => t.key === key);
                            if (tmpl) {
                              setBroadcastSubject(tmpl.subject || "");
                              setBroadcastBody(tmpl.body_html || "");
                            }
                          } else {
                            setBroadcastSubject("");
                            setBroadcastBody("");
                          }
                        }}
                        className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] appearance-none cursor-pointer"
                      >
                        <option value="">-- Write a custom manual message --</option>
                        {emailTemplates.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                   </div>

                   {selectedBroadcastKey ? (
                     // Split Preview Layout for Broadcast
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
                       <div className="lg:col-span-4 space-y-6">
                         <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">File Attachments (Optional)</label>
                           <input 
                             type="file" 
                             id="attachments" 
                             multiple 
                             className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-500 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-[#0f172a] file:text-white hover:file:bg-black cursor-pointer"
                           />
                           <p className="text-[10px] text-slate-400 font-medium ml-1">Attach documents or media directly to the email body.</p>
                         </div>
                         
                         <button type="submit" className="w-full bg-[#0f172a] hover:bg-black text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-slate-200 transition-all uppercase tracking-[0.3em] text-xs active:scale-[0.98]">
                            Dispatch Broadcast Template
                         </button>
                       </div>

                       <div className="lg:col-span-8 space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Live Template Preview</label>
                         <div className="bg-slate-50 rounded-3xl border border-slate-200/60 p-4 h-[750px] flex flex-col relative overflow-hidden">
                           <iframe 
                             title="Broadcast Template Preview"
                             srcDoc={compileBroadcastPreview(emailTemplates.find(t => t.key === selectedBroadcastKey))}
                             className="w-full h-full border-none rounded-2xl bg-white"
                           />
                         </div>
                       </div>
                     </div>
                   ) : (
                     // Manual Input Fields
                     <div className="space-y-6 animate-in fade-in duration-300">
                       {/* Personalization Help card */}
                       <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 lg:p-8 space-y-4">
                          <h4 className="text-[10px] font-black text-[#0f172a] uppercase tracking-widest">Personalization Tags</h4>
                          <p className="text-slate-400 font-medium text-xs leading-relaxed">
                             Use these tags to dynamically customize the email for each guest:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                             <div className="text-slate-600"><code className="bg-white border border-slate-200/60 px-1.5 py-0.5 rounded text-yellow-600">{"{first_name}"}</code> - Guest's first name</div>
                             <div className="text-slate-600"><code className="bg-white border border-slate-200/60 px-1.5 py-0.5 rounded text-yellow-600">{"{last_name}"}</code> - Guest's last name</div>
                             <div className="text-slate-600"><code className="bg-white border border-slate-200/60 px-1.5 py-0.5 rounded text-yellow-600">{"{pin}"}</code> - Guest's unique Clearance PIN</div>
                             <div className="text-slate-600"><code className="bg-white border border-slate-200/60 px-1.5 py-0.5 rounded text-yellow-600">{"{qr_code}"}</code> - Unique Check-in QR code</div>
                          </div>
                       </div>

                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Line</label>
                          <input 
                            required 
                            name="subject" 
                            value={broadcastSubject}
                            onChange={(e) => setBroadcastSubject(e.target.value)}
                            placeholder={`Update for ${(event.title || "").replace(/<[^>]*>/g, "")}`} 
                            className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a]" 
                          />
                       </div>
                       
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Body</label>
                          <textarea 
                            required 
                            name="body" 
                            rows={8} 
                            value={broadcastBody}
                            onChange={(e) => setBroadcastBody(e.target.value)}
                            placeholder="Type your message here..." 
                            className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] resize-y font-mono text-sm leading-relaxed" 
                          />
                       </div>
                       
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">File Attachments (Optional)</label>
                          <input 
                            type="file" 
                            id="attachments" 
                            multiple 
                            className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-500 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-[#0f172a] file:text-white hover:file:bg-black cursor-pointer"
                          />
                          <p className="text-[10px] text-slate-400 font-medium ml-1">Attach documents or media directly to the email body.</p>
                       </div>

                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Signature (Optional)</label>
                          <textarea 
                            name="signature" 
                            rows={2} 
                            value={broadcastSignature}
                            onChange={(e) => setBroadcastSignature(e.target.value)}
                            placeholder="Kind regards, BMD Team" 
                            className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] resize-none text-sm" 
                          />
                       </div>
                       
                       <button type="submit" className="w-full bg-[#0f172a] hover:bg-black text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-slate-200 transition-all uppercase tracking-[0.3em] text-xs">
                          Dispatch Broadcast
                       </button>
                     </div>
                   )}
                </form>

                <div className="pt-12 border-t border-slate-100 space-y-6">
                    <h3 className="text-xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">Bulk Credential Dispatch</h3>
                    <p className="text-slate-500 font-medium text-sm">
                       This will resend individual registration confirmation emails (including their unique PIN and QR code) to all confirmed attendees of this event. 
                       Recommended to do a few days before the event as a credentials reminder.
                    </p>
                    <button 
                       type="button"
                       onClick={handleBulkResend}
                       disabled={bulkResending}
                       className="w-full flex items-center justify-center gap-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-200 text-[#0f172a] font-black py-6 rounded-[2rem] transition-all uppercase tracking-widest text-xs"
                    >
                       {bulkResending ? <Loader2 size={18} className="animate-spin" /> : null}
                       Resend Tickets to All Confirmed Guests
                    </button>
                 </div>

                 <div className="pt-12 border-t border-slate-100 space-y-8">
                     <h3 className="text-xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">Follow-Up Feedback Surveys</h3>
                     <p className="text-slate-500 font-medium text-sm">
                        Send a follow-up survey link to all attendees who checked in for this event. 
                        This targets only the <strong>{registrations.filter(r => r.checked_in).length}</strong> checked-in guests.
                     </p>
                     <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          
                          let bodyPayload = surveyBody;
                          let subjectPayload = surveySubject;
                          
                          if (selectedSurveyKey) {
                            const tmpl = emailTemplates.find(t => t.key === selectedSurveyKey);
                            if (tmpl) {
                              bodyPayload = tmpl.body_html || "";
                              subjectPayload = tmpl.subject || `Feedback Survey`;
                            }
                          } else {
                            bodyPayload = `${surveyBody}\n\nPlease complete our feedback survey here: ${surveyUrl}`;
                          }
                          
                          const targetCount = registrations.filter(r => r.checked_in).length;
                          if (!confirm(`Are you sure you want to send this survey to the ${targetCount} checked-in attendees?`)) return;
                          
                          try {
                            const res = await fetch(`/api/py/events/${id}/broadcast`, {
                              method: "POST",
                              headers: { 
                                "Content-Type": "application/json",
                                "x-user-email": session?.user?.email || ""
                              },
                              body: JSON.stringify({
                                subject: subjectPayload,
                                body: bodyPayload,
                                target: "checked_in",
                                survey_url: surveyUrl
                              })
                            });
                            if (res.ok) {
                              alert("Feedback survey broadcast successfully queued!");
                              if (!selectedSurveyKey) {
                                setSurveyUrl("");
                              }
                            } else {
                              alert("Failed to dispatch survey. Ensure RESEND_API_KEY is configured.");
                            }
                          } catch (err) {
                            console.error(err);
                            alert("An error occurred during dispatch.");
                          }
                        }}
                        className="space-y-6"
                      >
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Survey Template</label>
                          <select 
                            value={selectedSurveyKey}
                            onChange={(e) => {
                              const key = e.target.value;
                              setSelectedSurveyKey(key);
                              if (key) {
                                const tmpl = emailTemplates.find(t => t.key === key);
                                if (tmpl) {
                                  setSurveySubject(tmpl.subject || "");
                                  setSurveyBody(tmpl.body_html || "");
                                }
                              } else {
                                setSurveySubject("");
                                setSurveyBody("");
                              }
                            }}
                            className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] appearance-none cursor-pointer"
                          >
                            <option value="">-- Write a custom manual message --</option>
                            {emailTemplates.map((t) => (
                              <option key={t.key} value={t.key}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedSurveyKey ? (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
                            <div className="lg:col-span-4 space-y-6">
                              <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Survey Link (Google Forms / Typeform)</label>
                                <input 
                                  required 
                                  name="surveyUrl" 
                                  type="url" 
                                  value={surveyUrl}
                                  onChange={(e) => setSurveyUrl(e.target.value)}
                                  placeholder="https://forms.google.com/your-survey-link" 
                                  className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a]" 
                                />
                              </div>
                              <button 
                                type="submit" 
                                disabled={registrations.filter(r => r.checked_in).length === 0} 
                                className="w-full bg-[#0f172a] hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-6 rounded-[2rem] shadow-xl transition-all uppercase tracking-[0.2em] text-xs active:scale-[0.98]"
                              >
                                Dispatch Survey Template
                              </button>
                            </div>

                            <div className="lg:col-span-8 space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Live Template Preview</label>
                              <div className="bg-slate-50 rounded-3xl border border-slate-200/60 p-4 h-[750px] flex flex-col relative overflow-hidden">
                                <iframe 
                                  title="Survey Template Preview"
                                  srcDoc={compileBroadcastPreview(emailTemplates.find(t => t.key === selectedSurveyKey))}
                                  className="w-full h-full border-none rounded-2xl bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Survey Email Subject</label>
                              <input 
                                required 
                                name="surveySubject" 
                                value={surveySubject}
                                onChange={(e) => setSurveySubject(e.target.value)}
                                className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a]" 
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Survey Link (Google Forms / Typeform)</label>
                              <input 
                                required 
                                name="surveyUrl" 
                                type="url" 
                                value={surveyUrl}
                                onChange={(e) => setSurveyUrl(e.target.value)}
                                placeholder="https://forms.google.com/your-survey-link" 
                                className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a]" 
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Body</label>
                              <textarea 
                                required 
                                name="surveyBody" 
                                rows={6} 
                                value={surveyBody}
                                onChange={(e) => setSurveyBody(e.target.value)}
                                className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-yellow-400/20 outline-none font-bold text-[#0f172a] resize-y font-mono text-xs leading-relaxed" 
                              />
                            </div>
                            <button type="submit" disabled={registrations.filter(r => r.checked_in).length === 0} className="w-full bg-[#0f172a] hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-6 rounded-[2rem] shadow-xl transition-all uppercase tracking-[0.2em] text-xs">
                              Dispatch Survey to Checked-in Attendees
                            </button>
                          </div>
                        )}
                      </form>
                  </div>
             </div>
           </div>
        )}
        {/* Details Modal */}
        {selectedReg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 font-outfit">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedReg(null)}></div>
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border dark:border-slate-800">
              <div className="p-10 border-b border-slate-50 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#0f172a] dark:bg-slate-800 text-white rounded-[1.2rem] flex items-center justify-center font-black text-lg border dark:border-slate-700">
                    {(selectedReg.attendee?.first_name?.[0] || "")}{(selectedReg.attendee?.last_name?.[0] || "")}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#0f172a] dark:text-white font-bricolage italic uppercase tracking-tight">Registration <span className="text-slate-300 dark:text-slate-600">Details</span></h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{selectedReg.attendee?.first_name || ""} {selectedReg.attendee?.last_name || ""}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedReg(null)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                   <ArrowLeft size={20} />
                </button>
              </div>
              <div className="p-10 max-h-[60vh] overflow-y-auto space-y-8">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                       <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Status</p>
                       <p className="font-bold text-[#0f172a] dark:text-white capitalize">{selectedReg.status}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Company</p>
                       <p className="font-bold text-[#0f172a] dark:text-white">{selectedReg.attendee?.company || "—"}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Email Address</p>
                       <p className="font-bold text-[#0f172a] dark:text-white">{selectedReg.attendee?.email || ""}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Registered On</p>
                       <p className="font-bold text-[#0f172a] dark:text-white">{selectedReg.created_at ? new Date(selectedReg.created_at).toLocaleString() : "—"}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Clearance ID (PIN)</p>
                       <p className="font-mono font-bold text-[#0f172a] dark:text-white bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded border border-slate-100 dark:border-slate-700 inline-block text-lg tracking-wider">{selectedReg.pin || "—"}</p>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-slate-50 dark:border-slate-800/80">
                    <h4 className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">Custom Field Responses</h4>
                    <div className="space-y-6">
                       {(() => {
                         const activeSchema = (event?.custom_fields_schema && event.custom_fields_schema.length > 0)
                           ? event.custom_fields_schema
                           : (event?.registration_form_template?.layout_schema || []);
                         
                         let flatFields: any[] = [];
                         for (const item of activeSchema) {
                           if (item && typeof item === "object" && "fields" in item && Array.isArray(item.fields)) {
                             flatFields.push(...item.fields);
                           } else {
                             flatFields.push(item);
                           }
                         }

                         const displayFields = flatFields.filter(f => f && !["first_name", "last_name", "email", "company"].includes(f.key || f.id || ""));

                         if (displayFields.length === 0) {
                           return <p className="text-slate-400 dark:text-slate-650 text-xs italic">No custom fields responses.</p>;
                         }
                         return displayFields.map(field => {
                            const label = (field.label || field.title || "").replace(/<[^>]*>/g, "").trim();
                            
                            let targetKey = field.id || field.key || "";
                            if (selectedReg.custom_answers) {
                              const fieldId = field.id;
                              const fieldKey = field.key;
                              const fieldLabel = (field.label || field.title || "").replace(/<[^>]*>/g, "").trim().toLowerCase();
                              if (fieldId && selectedReg.custom_answers[fieldId] !== undefined) {
                                targetKey = fieldId;
                              } else if (fieldKey && selectedReg.custom_answers[fieldKey] !== undefined) {
                                targetKey = fieldKey;
                              } else {
                                const cleanLabel = fieldLabel;
                                const keys = Object.keys(selectedReg.custom_answers);
                                for (const k of keys) {
                                  if (k.toLowerCase().trim() === cleanLabel) {
                                    targetKey = k;
                                    break;
                                  }
                                }
                              }
                            }

                            const val = getCustomAnswer(detailsEditedAnswers, field);
                            const valStr = val === undefined || val === null ? "" : String(val);
                            
                            const handleChange = (newVal: string) => {
                              handleDetailsAnswerChange(targetKey, newVal);
                            };

                            return (
                              <div key={field.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                 <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2">{label}</p>
                                 <input 
                                   type="text"
                                   value={valStr}
                                   onChange={(e) => handleChange(e.target.value)}
                                   className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none font-bold text-[#0f172a] dark:text-white text-sm"
                                 />
                              </div>
                            );
                          });
                       })()}
                    </div>
                 </div>
              </div>
              <div className="p-10 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  {isDetailsAnswersDirty ? (
                    <>
                      <button 
                        onClick={handleCancelDetailsEdit}
                        className="px-8 py-4 bg-slate-200 hover:bg-slate-350 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveDetailsAnswers}
                        disabled={isSavingDetailsAnswers}
                        className="px-8 py-4 bg-green-500 hover:bg-green-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-green-200 dark:shadow-none"
                      >
                        {isSavingDetailsAnswers ? <Loader2 size={14} className="animate-spin" /> : null}
                        Save Answers
                      </button>
                    </>
                  ) : (
                    <>
                      {hideResendButton ? <div /> : (
                        <button 
                          onClick={() => handleResendEmail(selectedReg.id)}
                          disabled={resendingRegId === selectedReg.id}
                          className="px-6 py-4 bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 text-[#0f172a] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2"
                        >
                           {resendingRegId === selectedReg.id ? <Loader2 size={14} className="animate-spin" /> : null}
                           Resend Ticket Email
                        </button>
                      )}
                      <button 
                        onClick={() => setSelectedReg(null)}
                        className="px-8 py-4 bg-[#0f172a] dark:bg-slate-850 text-white dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black dark:hover:bg-slate-700 transition-all shadow-xl shadow-slate-200 dark:shadow-none"
                      >
                         Close Review
                      </button>
                    </>
                  )}
               </div>
            </div>
          </div>
        )}
        {/* Walk-in (Manual Registrant) Modal */}
        {isWalkinOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-outfit">
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
              <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h3 className="text-xl font-black text-[#0f172a] dark:text-white font-bricolage italic uppercase tracking-tight">On-The-Day <span className="text-slate-300 dark:text-slate-650">Walk-in</span></h3>
                  <p className="text-slate-400 dark:text-slate-555 font-bold uppercase tracking-widest text-[9px] mt-1">Register Guest Directly Into Database</p>
                </div>
                <button 
                  onClick={() => setIsWalkinOpen(false)}
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmittingWalkin(true);
                  try {
                    const res = await fetch(`/api/py/events/${event.id}/registrations/walk-in`, {
                      method: "POST",
                      headers: { 
                        "Content-Type": "application/json",
                        "x-user-email": session?.user?.email || ""
                      },
                      body: JSON.stringify(walkinFormData)
                    });
                    if (res.ok) {
                      alert("Walk-in registrant added and checked in successfully!");
                      setIsWalkinOpen(false);
                      // Clear form
                      setWalkinFormData({
                        first_name: "",
                        last_name: "",
                        email: "",
                        company: "",
                        custom_answers: {}
                      });
                      // Refresh registrant list
                      fetchRegistrations();
                    } else {
                      const errData = await res.json();
                      alert(`Failed to add registrant: ${errData.detail || "Unknown error"}`);
                    }
                  } catch (err) {
                    console.error("Walk-in error", err);
                    alert("A connection error occurred while creating walk-in registration.");
                  } finally {
                    setIsSubmittingWalkin(false);
                  }
                }}
                className="p-10 space-y-6 overflow-y-auto flex-1 text-left"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">First Name *</label>
                    <input 
                      type="text" 
                      required
                      value={walkinFormData.first_name}
                      onChange={(e) => setWalkinFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="e.g. Jane"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-semibold text-[#0f172a] dark:text-white focus:ring-2 focus:ring-yellow-400 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Last Name *</label>
                    <input 
                      type="text" 
                      required
                      value={walkinFormData.last_name}
                      onChange={(e) => setWalkinFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="e.g. Doe"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-semibold text-[#0f172a] dark:text-white focus:ring-2 focus:ring-yellow-400 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    value={walkinFormData.email}
                    onChange={(e) => setWalkinFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                    placeholder="e.g. jane.doe@company.com"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-semibold text-[#0f172a] dark:text-white focus:ring-2 focus:ring-yellow-400 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Company / Organization</label>
                  <input 
                    type="text" 
                    value={walkinFormData.company}
                    onChange={(e) => setWalkinFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="e.g. Vumatel"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-semibold text-[#0f172a] dark:text-white focus:ring-2 focus:ring-yellow-400 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                  />
                </div>

                {/* Custom Fields section */}
                {customFields.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Custom Answers</h4>
                    {customFields.map((field: any) => {
                      const label = (field.label || "").replace(/<[^>]*>/g, "").trim();
                      const fieldKey = field.key || field.id;
                      const val = walkinFormData.custom_answers[fieldKey] || "";

                      return (
                        <div key={fieldKey} className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            {label} {field.required && "*"}
                          </label>
                          {field.type === "select" && field.options && field.options.length > 0 ? (
                            <select
                              required={field.required}
                              value={val}
                              onChange={(e) => setWalkinFormData(prev => ({
                                ...prev,
                                custom_answers: { ...prev.custom_answers, [fieldKey]: e.target.value }
                              }))}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-yellow-400 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all cursor-pointer"
                            >
                              <option value="">Select option...</option>
                              {field.options.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : field.type === "checkbox" ? (
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-350">
                              <input
                                type="checkbox"
                                checked={val === "Yes" || val === true}
                                onChange={(e) => setWalkinFormData(prev => ({
                                  ...prev,
                                  custom_answers: { ...prev.custom_answers, [fieldKey]: e.target.checked ? "Yes" : "No" }
                                }))}
                                className="w-4 h-4 rounded text-[#0f172a] border-slate-300 focus:ring-yellow-400 dark:bg-slate-800 dark:border-slate-700"
                              />
                              Yes
                            </label>
                          ) : (
                            <input
                              type="text"
                              required={field.required}
                              value={val}
                              onChange={(e) => setWalkinFormData(prev => ({
                                ...prev,
                                custom_answers: { ...prev.custom_answers, [fieldKey]: e.target.value }
                              }))}
                              placeholder={`Enter ${label.toLowerCase()}...`}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-semibold text-[#0f172a] dark:text-white focus:ring-2 focus:ring-yellow-400 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsWalkinOpen(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingWalkin}
                    className="flex-1 px-6 py-4 bg-[#eab308] hover:bg-[#ca8a04] text-[#0f172a] rounded-2xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingWalkin ? <Loader2 className="animate-spin" size={14} /> : null}
                    Submit & Check In
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-outfit">
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
              <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                  <div>
                    <h3 className="text-xl font-black text-[#0f172a] dark:text-white font-bricolage italic uppercase tracking-tight">Bulk Import <span className="text-slate-300 dark:text-slate-650">Registrants</span></h3>
                    <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-1">Upload CSV or Excel file</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setParsedRegistrants([]);
                    }}
                    className="w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
              </div>

              <div className="p-10 overflow-y-auto space-y-6 flex-1">
                <p className="text-slate-500 dark:text-slate-450 font-medium text-sm">
                  Import a bulk register of attendees. The system will automatically add them, generate a unique clearance PIN, create a QR code, and send the registration confirmation email.
                </p>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Supported Columns</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    Must contain headers: <code className="bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">first_name</code>, <code className="bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">last_name</code>, <code className="bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">email</code>, and <code className="bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">company</code>. Additional columns are automatically parsed as custom responses.
                  </p>
                  <button
                    onClick={downloadRegistrantTemplate}
                    className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#0f172a] dark:text-slate-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    <Download size={14} />
                    Download Excel Template
                  </button>
                </div>

                {!parsedRegistrants.length ? (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-yellow-400 rounded-3xl p-12 text-center transition-all cursor-pointer relative bg-slate-50/30 dark:bg-slate-900/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleImportFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
                    <p className="text-sm font-bold text-[#0f172a] dark:text-white">Choose a file or drag it here</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Supports CSV, XLSX, and XLS formats</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Parsed Attendees ({parsedRegistrants.length})</span>
                      <button 
                        onClick={() => setParsedRegistrants([])}
                        className="text-xs font-bold text-red-500 hover:underline uppercase"
                      >
                        Clear File
                      </button>
                    </div>
                    
                    <div className="max-h-[220px] overflow-y-auto pr-2 border border-slate-100 dark:border-slate-850 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80">
                      {parsedRegistrants.map((u, index) => (
                        <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <div>
                            <p className="font-bold text-sm text-[#0f172a] dark:text-white">{u.first_name} {u.last_name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{u.email}</p>
                          </div>
                          {u.company && (
                            <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
                              {u.company}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-10 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setParsedRegistrants([]);
                  }}
                  className="px-8 py-4 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkRegistrantsImport}
                  disabled={!parsedRegistrants.length || importing}
                  className="px-8 py-4 bg-[#0f172a] dark:bg-slate-800 text-white dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black dark:hover:bg-slate-750 transition-all disabled:bg-slate-200 dark:disabled:bg-slate-850 dark:disabled:text-slate-500 flex items-center gap-2 shadow-xl shadow-slate-200 dark:shadow-none border dark:border-slate-700"
                >
                  {importing ? <Loader2 size={14} className="animate-spin" /> : null}
                  Confirm & Sync Attendees
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal for Logistics Stats */}
        {selectedMetric && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer" 
              onClick={() => setSelectedMetric(null)}
            />
            
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 max-w-md w-full overflow-hidden relative z-10 transform scale-100 transition-all duration-300">
              <button 
                onClick={() => setSelectedMetric(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-[#0f172a] dark:hover:text-white transition-all"
              >
                <X size={18} />
              </button>

              <div className="p-10 font-outfit">
                {selectedMetric === "date" && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 text-[#0f172a] dark:text-white rounded-[1.5rem] border dark:border-slate-700">
                        <Calendar size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest block">Details</span>
                        <h2 className="text-2xl font-black text-[#0f172a] dark:text-white tracking-tight italic font-bricolage leading-none">Event Schedule</h2>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">Start Date & Time</span>
                        <p className="font-bold text-[#0f172a] dark:text-white text-sm">
                          {new Date(event.start_date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                      </div>
                      {event.duration_days && event.duration_days > 1 && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">End Date & Time (Estimated)</span>
                          <p className="font-bold text-[#0f172a] dark:text-white text-sm">
                            {(() => {
                              const start = new Date(event.start_date);
                              const end = new Date(start);
                              end.setDate(start.getDate() + (event.duration_days - 1));
                              return end.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });
                            })()}
                          </p>
                        </div>
                      )}
                      {event.duration_days && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 tracking-wider uppercase block">Duration</span>
                            <p className="font-bold text-[#0f172a] dark:text-white text-sm">{event.duration_days} Day(s)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedMetric === "venue" && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 text-[#0f172a] dark:text-white rounded-[1.5rem] border dark:border-slate-700">
                        <MapPin size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest block">Details</span>
                        <h2 className="text-2xl font-black text-[#0f172a] dark:text-white tracking-tight italic font-bricolage leading-none">Venue Information</h2>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">Location Name</span>
                        <p className="font-bold text-[#0f172a] dark:text-white text-base leading-snug">{event.location}</p>
                      </div>
                      
                      {event.address && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">Street Address</span>
                          <p className="font-bold text-[#0f172a] dark:text-white text-sm leading-relaxed">{event.address}</p>
                        </div>
                      )}

                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${event.location} ${event.address || ''}`);
                            alert("Address copied to clipboard!");
                          }}
                          className="flex-1 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Copy Address
                        </button>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location + ' ' + (event.address || ''))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3.5 bg-[#0f172a] dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-750 text-white rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all border dark:border-slate-700"
                        >
                          Open in Maps
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMetric === "enrollment" && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 text-[#0f172a] dark:text-white rounded-[1.5rem] border dark:border-slate-700">
                        <Users size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest block">Details</span>
                        <h2 className="text-2xl font-black text-[#0f172a] dark:text-white tracking-tight italic font-bricolage leading-none">Enrollment Status</h2>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">Confirmed</span>
                          <p className="text-2xl font-black text-[#0f172a] dark:text-white">{confirmedCount}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">Capacity</span>
                          <p className="text-2xl font-black text-[#0f172a] dark:text-white">{event.capacity}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider">Fill Rate</span>
                          <span className="text-xs font-bold text-[#0f172a] dark:text-white">
                            {event.capacity > 0 ? Math.round((confirmedCount / event.capacity) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-850 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-yellow-400 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${event.capacity > 0 ? Math.min(100, Math.round((confirmedCount / event.capacity) * 100)) : 0}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block mt-3">
                          {Math.max(0, event.capacity - confirmedCount)} spots remaining
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMetric === "declined" && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-[1.5rem] border dark:border-red-900/30">
                        <UserX size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest block">Details</span>
                        <h2 className="text-2xl font-black text-red-500 tracking-tight italic font-bricolage leading-none">Declined Invites</h2>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-red-50/20 dark:bg-red-950/10 p-5 rounded-2xl border border-red-100 dark:border-red-900/30 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-black text-red-650/70 dark:text-red-400 uppercase tracking-wider block mb-1">Declined Registrants</span>
                          <p className="text-3xl font-black text-red-600 dark:text-red-400">{declinedCount}</p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">Impact Summary</span>
                        <p className="text-xs font-bold text-[#0f172a] dark:text-slate-200 leading-relaxed mt-1">
                          {declinedCount > 0 
                            ? `${declinedCount} invitee(s) declined attendance. Their slots are released back to the general capacity pool.`
                            : "Excellent! Currently, no invitees have declined attendance."
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMetric === "checked_in" && (
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-[1.5rem] border dark:border-green-900/30">
                        <CheckCircle2 size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest block">Details</span>
                        <h2 className="text-2xl font-black text-green-600 tracking-tight italic font-bricolage leading-none">Check-in Status</h2>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">Checked In</span>
                          <p className="text-2xl font-black text-green-600">{checkedInCount}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">Attendance Rate</span>
                          <p className="text-2xl font-black text-[#0f172a] dark:text-white">
                            {confirmedCount > 0 ? Math.round((checkedInCount / confirmedCount) * 100) : 0}%
                          </p>
                        </div>
                      </div>

                      {event.duration_days && event.duration_days > 1 && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-3">Daily Attendance Breakdown</span>
                          <div className="space-y-2">
                            {Array.from({ length: event.duration_days }, (_, i) => i + 1).map(d => {
                              const dailyCount = registrations.filter(r => r.checked_in_days?.includes(d)).length;
                              const rate = confirmedCount > 0 ? Math.round((dailyCount / confirmedCount) * 100) : 0;
                              return (
                                <div key={d} className="flex justify-between items-center text-xs font-bold py-1 border-b border-slate-100 dark:border-slate-850 last:border-0">
                                  <span className="text-[#0f172a] dark:text-white">Day {d}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 dark:text-slate-500">{rate}%</span>
                                    <span className="text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-md font-mono">{dailyCount} check-ins</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
