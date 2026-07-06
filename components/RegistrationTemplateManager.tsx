"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Trash2, Copy, Save, Loader2, Edit3, Type, CheckSquare, 
  List, Palette, FileText, CheckCircle2, AlertCircle, ChevronRight, XCircle,
  ArrowUp, ArrowDown, Layout, HelpCircle, Mail, Award, Eye, EyeOff, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import RichTextEditor from "./RichTextEditor";

interface FormField {
  id: string;
  key: string;
  label: string;
  type: "text" | "select" | "checkbox" | "partner_card" | "numeric" | "email" | "section_header";
  required: boolean;
  visible: boolean;
  placeholder?: string;
  options?: string[]; // For select type
  dependsOn?: {
    fieldId: string;
    value: string;
  };
  image_url?: string;
  inactive?: boolean;
  showBeforeAttendance?: boolean;
}

interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

interface RegistrationFormTemplate {
  id: number;
  name: string;
  description?: string;
  theme_config: {
    primary_color?: string;
    accent_color?: string;
    logo_url?: string;
    banner_url?: string;
    background_pattern?: string;
    form_bg_color?: string;
    feedback_bg_color?: string;
    typography_font?: string;
    force_sentence_case?: boolean;
    strip_trailing_periods?: boolean;
    force_text_visibility?: boolean;
    attendance_label?: string;
    attending_label?: string;
    not_attending_label?: string;
    form_heading?: string;
    form_subheading?: string;
    form_text_color?: string;
    attendeePassBgColor?: string;
    engagementDetailsColor?: string;
    base_font_size?: string | number;
    heading_weight?: string;
    body_weight?: string;
    question_weight?: string;
    success_title_weight?: string;
    success_desc_weight?: string;
    disclaimerCheckboxLabel?: string;
    question_font_size?: string | number;
  };
  layout_schema: FormField[];
  post_submit_config: {
    onscreen_title?: string;
    onscreen_description?: string;
    onscreen_decline_title?: string;
    onscreen_decline_description?: string;
    clearance_label?: string;
    success_icon_url?: string;
    decline_icon_url?: string;
    success_icon_style?: string;
    decline_icon_style?: string;
    onscreen_capacity_title?: string;
    onscreen_capacity_description?: string;
    capacity_icon_url?: string;
    capacity_icon_style?: string;
  };
  email_config?: {
    subject_template?: string;
    body_template?: string;
    show_qr_code?: boolean;
    show_pin?: boolean;
  };
  operator_config?: {
    display_fields?: string[];
    card_layout_text?: string;
    success_bg_color?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export default function RegistrationTemplateManager() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const compileOperatorPreviewText = (layoutText: string) => {
    if (!layoutText || !selectedTemplate) return "";
    let compiled = layoutText;
    
    const standards: Record<string, string> = {
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      company: "Excellence Logistics",
      clearance_id: "EEL-1234"
    };
    
    Object.entries(standards).forEach(([key, val]) => {
      const regex = new RegExp(`\\[${key}\\]`, "gi");
      compiled = compiled.replace(regex, val);
    });
    
    (selectedTemplate.layout_schema || []).forEach(f => {
      const fieldKey = f.key || f.id;
      const fieldLabel = (f.label || "").replace(/<[^>]*>/g, "").trim();
      const mockVal = f.type === "partner_card" ? "VIP" : f.options?.[0] || "Sample Answer";
      
      if (fieldKey) {
        const keyRegex = new RegExp(`\\[${fieldKey}\\]`, "gi");
        compiled = compiled.replace(keyRegex, mockVal);
      }
      if (fieldLabel) {
        const escapedLabel = fieldLabel.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const labelRegex = new RegExp(`\\[${escapedLabel}\\]`, "gi");
        compiled = compiled.replace(labelRegex, mockVal);
      }
    });
    
    return compiled;
  };

  const [templates, setTemplates] = useState<RegistrationFormTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RegistrationFormTemplate | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);

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

  const handleTemplateImageUpload = async (secId: string, fieldId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    try {
      const url = await uploadImageFile(file);
      updateFieldProperty(fieldId, "image_url", url);
    } catch (e) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateFieldProperty(fieldId, "image_url", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Tabs within editor: theme, layout, postSubmit, operator
  const [editorTab, setEditorTab] = useState<"theme" | "layout" | "postSubmit" | "operator">("theme");
  
  // Real-time Preview Mode: "form", "confirmation", "decline", or "operator"
  const [previewMode, setPreviewMode] = useState<"form" | "confirmation" | "decline" | "waitlist" | "operator">("form");

  // Sync previewMode with editorTab changes for optimal real-time feedback
  useEffect(() => {
    if (editorTab === "theme" || editorTab === "layout") {
      setPreviewMode("form");
    } else if (editorTab === "postSubmit") {
      setPreviewMode("confirmation");
    } else if (editorTab === "operator") {
      setPreviewMode("operator");
    }
  }, [editorTab]);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplDesc, setNewTplDesc] = useState("");

  const flattenSchema = (schema: any[]): any[] => {
    if (!schema || !Array.isArray(schema)) return [];
    const isSectioned = schema.some((item: any) => item && typeof item === "object" && "fields" in item && Array.isArray(item.fields));
    if (!isSectioned) return schema;

    const flat: any[] = [];
    schema.forEach((section: any) => {
      if (section && typeof section === "object" && "fields" in section) {
        flat.push({
          id: section.id || `section_${Date.now()}_${Math.random()}`,
          key: section.id || `section_${Date.now()}_${Math.random()}`,
          label: section.title || section.label || "",
          type: "section_header",
          required: false,
          visible: true
        });
        if (Array.isArray(section.fields)) {
          section.fields.forEach((field: any) => {
            if (field) {
              flat.push(field);
            }
          });
        }
      } else {
        flat.push(section);
      }
    });
    return flat;
  };

  const nestSchema = (flat: any[]): any[] => {
    if (!flat || !Array.isArray(flat)) return [];
    
    const sections: any[] = [];
    let currentSection: any = null;

    flat.forEach((item: any) => {
      if (!item) return;

      if (item.type === "section_header") {
        currentSection = {
          id: item.id || item.key || `section_${Date.now()}_${Math.random()}`,
          title: item.label || item.title || "",
          fields: []
        };
        sections.push(currentSection);
      } else {
        if (!currentSection) {
          currentSection = {
            id: "default_section",
            title: "",
            fields: []
          };
          sections.push(currentSection);
        }
        currentSection.fields.push(item);
      }
    });

    return sections;
  };

  const ensureStandardFields = (tpl: any): any => {
    if (!tpl || !Array.isArray(tpl.layout_schema)) return tpl;
    
    const flatSchema = flattenSchema(tpl.layout_schema);
    
    const hasFirstName = flatSchema.some((f: any) => f.key === "first_name" || f.id === "field_first_name");
    const hasLastName = flatSchema.some((f: any) => f.key === "last_name" || f.id === "field_last_name");
    const hasEmail = flatSchema.some((f: any) => f.key === "email" || f.id === "field_email");
    const hasCompany = flatSchema.some((f: any) => f.key === "company" || f.id === "field_company");

    const missing: any[] = [];
    if (!hasFirstName) {
      missing.push({ id: "field_first_name", key: "first_name", label: "First Name", placeholder: "e.g. Alan", type: "text", required: true, visible: true, showBeforeAttendance: true });
    }
    if (!hasLastName) {
      missing.push({ id: "field_last_name", key: "last_name", label: "Last Name", placeholder: "e.g. Turing", type: "text", required: true, visible: true, showBeforeAttendance: true });
    }
    if (!hasEmail) {
      missing.push({ id: "field_email", key: "email", label: "Secure Email Address", placeholder: "e.g. turing@bletchleypark.org.uk", type: "email", required: true, visible: true, showBeforeAttendance: true });
    }
    if (!hasCompany) {
      missing.push({ id: "field_company", key: "company", label: "Organization / Company", placeholder: "e.g. GC&CS", type: "text", required: false, visible: true, showBeforeAttendance: true });
    }

    if (missing.length > 0) {
      return {
        ...tpl,
        layout_schema: [...missing, ...flatSchema]
      };
    }
    return {
      ...tpl,
      layout_schema: flatSchema
    };
  };

  // Load all templates
  const loadTemplates = async (selectIdToActivate?: number) => {
    if (!session?.user?.email) return;
    try {
      setLoading(true);
      const res = await fetch("/api/py/settings/registration-templates", {
        headers: { "x-user-email": session.user.email }
      });
      if (!res.ok) throw new Error("Failed to load registration templates");
      const data = await res.json();
      setTemplates(data);
      
      if (data.length > 0) {
        const idToSelect = selectIdToActivate || data[0].id;
        setSelectedId(idToSelect);
        const tpl = data.find((t: any) => t.id === idToSelect) || data[0];
        setSelectedTemplate(ensureStandardFields(JSON.parse(JSON.stringify(tpl)))); // deep copy
      } else {
        setSelectedId(null);
        setSelectedTemplate(null);
      }
    } catch (err: any) {
      console.error(err);
      showNotification("error", err.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      loadTemplates();
    }
  }, [session?.user?.email]);

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSelectTemplate = (id: number) => {
    if (hasUnsavedChanges) {
      if (!confirm("You have unsaved changes on the active template. Do you want to switch and discard changes?")) {
        return;
      }
    }
    setSelectedId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setSelectedTemplate(ensureStandardFields(JSON.parse(JSON.stringify(tpl))));
      setHasUnsavedChanges(false);
    }
  };

  // CREATE NEW TEMPLATE
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName.trim()) return;

    try {
      const res = await fetch("/api/py/settings/registration-templates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({
          name: newTplName,
          description: newTplDesc,
          theme_config: {
            background_pattern: "none",
            form_bg_color: "#ffffff",
            feedback_bg_color: "#f1f5f9",
            typography_font: "Calibri, sans-serif",
            force_sentence_case: true,
            strip_trailing_periods: true,
            force_text_visibility: true,
            attendeePassBgColor: "#000000",
            engagementDetailsColor: "#0f172a",
            question_weight: "Regular Italic",
            success_title_weight: "Bold",
            success_desc_weight: "Regular"
          },
          layout_schema: [
            {
              id: "personal_info",
              title: "Personal Profile",
              fields: []
            }
          ],
          post_submit_config: {
            onscreen_title: "YOUR REGISTRATION HAS BEEN CONFIRMED.",
            onscreen_description: "Your registration for [Event Name] is confirmed. Verification has been dispatched to [Email Address]",
            onscreen_decline_title: "RSVP RESPONSE RECORDED.",
            onscreen_decline_description: "We have recorded that you are unable to attend [Event Name]. Thank you for letting us know.",
            clearance_label: "unique access pass number"
          }
        })
      });
      if (!res.ok) throw new Error("Failed to create template");
      const newTpl = await res.json();
      showNotification("success", `Template "${newTpl.name}" created successfully.`);
      setShowCreateModal(false);
      setNewTplName("");
      setNewTplDesc("");
      loadTemplates(newTpl.id);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to create template");
    }
  };

  // DUPLICATE TEMPLATE
  const handleDuplicateTemplate = async (tpl: RegistrationFormTemplate) => {
    try {
      const res = await fetch("/api/py/settings/registration-templates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({
          name: `${tpl.name} (Copy)`,
          description: tpl.description || `Copy of ${tpl.name}`,
          theme_config: tpl.theme_config,
          layout_schema: tpl.layout_schema,
          post_submit_config: tpl.post_submit_config
        })
      });
      if (!res.ok) throw new Error("Failed to duplicate template");
      const duplicated = await res.json();
      showNotification("success", `Template copied as "${duplicated.name}".`);
      loadTemplates(duplicated.id);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to duplicate template");
    }
  };

  // DELETE TEMPLATE
  const handleDeleteTemplate = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name}"? Any active events referencing this template will revert to default registration forms.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/py/settings/registration-templates/${id}`, {
        method: "DELETE",
        headers: { "x-user-email": session?.user?.email || "" }
      });
      if (!res.ok) throw new Error("Failed to delete template");
      showNotification("success", `Template "${name}" deleted.`);
      loadTemplates();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete template");
    }
  };

  // SAVE CHANGES
  const handleSaveChanges = async () => {
    if (!selectedTemplate || !selectedId) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/py/settings/registration-templates/${selectedId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({
          name: selectedTemplate.name,
          description: selectedTemplate.description,
          theme_config: selectedTemplate.theme_config,
          layout_schema: nestSchema(selectedTemplate.layout_schema),
          post_submit_config: selectedTemplate.post_submit_config,
          email_config: selectedTemplate.email_config,
          operator_config: selectedTemplate.operator_config
        })
      });
      if (!res.ok) throw new Error("Failed to save changes");
      const updated = await res.json();
      showNotification("success", "Template changes deployed successfully.");
      setHasUnsavedChanges(false);
      
      // Update template in list
      setTemplates(templates.map((t) => t.id === selectedId ? updated : t));
    } catch (err: any) {
      showNotification("error", err.message || "Failed to deploy template changes");
    } finally {
      setSaving(false);
    }
  };

  // Update specific selectedTemplate sub-field
  const updateThemeConfig = (key: string, value: any) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      theme_config: {
        ...selectedTemplate.theme_config,
        [key]: value
      }
    });
    setHasUnsavedChanges(true);
  };

  const updatePostSubmitConfig = (key: string, value: any) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      post_submit_config: {
        ...selectedTemplate.post_submit_config,
        [key]: value
      }
    });
    setHasUnsavedChanges(true);
  };

  const updateEmailConfig = (key: string, value: any) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      email_config: {
        ...selectedTemplate.email_config,
        [key]: value
      }
    });
    setHasUnsavedChanges(true);
  };

  const updateOperatorConfig = (key: string, value: any) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      operator_config: {
        ...selectedTemplate.operator_config,
        [key]: value
      }
    });
    setHasUnsavedChanges(true);
  };

  const updateLayoutSchema = (newSchema: FormField[]) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      layout_schema: newSchema
    });
    setHasUnsavedChanges(true);
  };

  // Layout editor helpers for a flat array of fields
  const addField = (type: "text" | "select" | "checkbox" | "partner_card" | "numeric" | "email" | "section_header") => {
    if (!selectedTemplate) return;
    const newId = `field_${Date.now()}`;
    const newField: FormField = {
      id: newId,
      key: type === "section_header" ? `section_${Date.now()}` : `custom_${Date.now()}`,
      label: type === "section_header" ? "New Section Divider" : "New Question",
      type: type,
      required: false,
      visible: true,
      placeholder: ""
    };
    updateLayoutSchema([...selectedTemplate.layout_schema, newField]);
  };

  const removeField = (fieldId: string) => {
    if (!selectedTemplate) return;
    const newSchema = selectedTemplate.layout_schema
      .filter(f => f.id !== fieldId)
      .map(f => {
        if (f.dependsOn?.fieldId === fieldId) {
          const { dependsOn, ...rest } = f;
          return rest;
        }
        return f;
      });
    updateLayoutSchema(newSchema);
  };

  const updateFieldProperty = (fieldId: string, property: keyof FormField, value: any) => {
    if (!selectedTemplate) return;
    const newSchema = selectedTemplate.layout_schema.map(f => 
      f.id === fieldId ? { ...f, [property]: value } : f
    );
    updateLayoutSchema(newSchema);
  };

  const updateFieldProperties = (fieldId: string, updates: Partial<FormField>) => {
    if (!selectedTemplate) return;
    const newSchema = selectedTemplate.layout_schema.map(f => 
      f.id === fieldId ? { ...f, ...updates } : f
    );
    updateLayoutSchema(newSchema);
  };

  const moveFieldOrder = (index: number, direction: "up" | "down") => {
    if (!selectedTemplate) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedTemplate.layout_schema.length) return;
    
    const reordered = [...selectedTemplate.layout_schema];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, item);
    updateLayoutSchema(reordered);
  };

  const getAllPrecedingFields = (fieldId: string) => {
    if (!selectedTemplate) return [];
    const fieldsList: { id: string; label: string }[] = [];
    for (const field of selectedTemplate.layout_schema) {
      if (field.id === fieldId) {
        return fieldsList;
      }
      if (field.type === "select") {
        fieldsList.push({ id: field.id, label: field.label });
      }
    }
    return fieldsList;
  };

  // Apply typography rules to preview titles
  const formatHeading = (text: string) => {
    if (!text) return "";
    let formatted = text;
    if (selectedTemplate?.theme_config?.force_sentence_case) {
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
    }
    if (selectedTemplate?.theme_config?.strip_trailing_periods) {
      formatted = formatted.replace(/\.+$/, "");
    }
    return formatted;
  };

  // Replace post submit templates with dummy variables
  const formatPostSubmit = (templateText: string) => {
    if (!templateText) return "";
    return templateText
      .replace(/\[Name\]/g, "Barton Delaney")
      .replace(/\[Event Name\]/g, "Exclusive Logistics VIP Gala")
      .replace(/\[Email Address\]/g, "barton@bmdcomputing.com")
      .replace(/\[Clearance ID\]/g, "EEL-987A");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-400 mb-4" size={32} />
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Registration Templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top action toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">
          Registration Form Template Editor
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-widest">
          <button
            onClick={handleSaveChanges}
            disabled={saving || !selectedTemplate || !hasUnsavedChanges || !isAdmin}
            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-black transition-all shadow-xl ${
              hasUnsavedChanges && isAdmin
                ? "bg-[#0f172a] text-white hover:bg-black shadow-slate-200 dark:bg-yellow-400 dark:text-black dark:shadow-yellow-500/10"
                : "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600"
            }`}
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Deploy Template Changes
          </button>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold ${
              notification.type === "success" 
                ? "bg-green-50 text-green-600 border border-green-100 dark:bg-green-950/20 dark:border-green-900/30" 
                : "bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30"
            }`}
          >
            {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {notification.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <div className="flex items-center justify-between ml-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Select Template
          </h3>
          {isAdmin && (
            <button
              onClick={() => { setShowCreateModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
            >
              <Plus size={11} />
              New
            </button>
          )}
        </div>
        <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 flex flex-row items-center gap-4 overflow-x-auto whitespace-nowrap min-h-[110px] scrollbar-thin">
          {templates.map((t) => {
            const isSelected = t.id === selectedId;
            return (
              <div key={t.id} className="relative group/row font-bold inline-block min-w-[240px] shrink-0">
                <button
                  onClick={() => handleSelectTemplate(t.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all ${
                    isSelected 
                      ? "bg-[#0f172a]/5 text-[#0f172a] font-black dark:bg-yellow-400/10 dark:text-yellow-400"
                      : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-10">
                    <p className="text-sm font-bold truncate">{t.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{t.description || "No description provided."}</p>
                  </div>
                  <ChevronRight size={14} className={`opacity-40 transition-transform shrink-0 ${isSelected ? "translate-x-1" : ""}`} />
                </button>
                
                {/* Actions */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-1 bg-white/95 rounded-xl px-1.5 py-1 shadow-sm border border-slate-100 dark:bg-[#0f172a]">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDuplicateTemplate(t); }}
                    title="Copy template"
                    className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Copy size={13} />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id, t.name); }}
                      title="Delete template"
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start mt-8">
        {/* Left Column: Template Editor */}
        <div className="xl:col-span-8 space-y-6">
              {selectedTemplate ? (
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 space-y-8 max-h-[750px] overflow-y-auto pr-4">
                  {/* Title & description editing */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Template Name</label>
                      <input 
                        type="text" 
                        value={selectedTemplate.name} 
                        onChange={(e) => { setSelectedTemplate({ ...selectedTemplate, name: e.target.value }); setHasUnsavedChanges(true); }}
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Description</label>
                      <input 
                        type="text" 
                        value={selectedTemplate.description || ""} 
                        onChange={(e) => { setSelectedTemplate({ ...selectedTemplate, description: e.target.value }); setHasUnsavedChanges(true); }}
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#1e293b] outline-none font-medium text-slate-650 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Settings tabs */}
                  <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
                    {[
                      { id: "theme", label: "Theme", icon: Palette },
                      { id: "layout", label: "Form Fields", icon: Layout },
                      { id: "postSubmit", label: "Post-Submit Screens", icon: FileText },
                      { id: "operator", label: "Operator check-in", icon: Award }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const active = editorTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setEditorTab(tab.id as any)}
                          className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                            active
                              ? "border-[#1e293b] text-[#1e293b] dark:border-yellow-400 dark:text-white"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          <Icon size={14} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* ================================================= */}
                  {/* TAB 1: THEME & TYPOGRAPHY */}
                  {/* ================================================= */}
                  {editorTab === "theme" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Background Theme Mode</label>
                          <select 
                            value={selectedTemplate.theme_config.background_pattern || "none"}
                            onChange={(e) => updateThemeConfig("background_pattern", e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-slate-700 bg-slate-50 cursor-pointer dark:bg-slate-800 dark:text-white"
                          >
                            <option value="none">None (Clean Solid Color)</option>
                            <option value="cyber_dark">Cyber Dark Pattern</option>
                            <option value="minimal_light">Minimal Light Pattern</option>
                            <option value="glassmorphism">Glassmorphism Frosted Pattern</option>
                            <option value="brutalist_retro">Brutalist Retro Grid</option>
                            <option value="midnight_executive">Midnight Executive Blue Gradient</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Font Family Selection</label>
                          <select 
                            value={selectedTemplate.theme_config.typography_font || "'Carlito', Calibri, sans-serif"}
                            onChange={(e) => updateThemeConfig("typography_font", e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-slate-700 bg-slate-50 cursor-pointer dark:bg-slate-800 dark:text-white"
                          >
                            <option value="'Carlito', Calibri, sans-serif">Calibri Stack (Default Flagship)</option>
                            <option value="'Fluent Calibri', 'Carlito', Calibri, sans-serif">Fluent Calibri Stack</option>
                            <option value="'Fluent Sitka', serif">Sitka Small Stack</option>
                            <option value="'Segoe UI', sans-serif">Segoe UI</option>
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="Inter, sans-serif">Inter</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-4 border-t border-slate-100/50 dark:border-slate-800/30">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                            Base Font Size: {selectedTemplate.theme_config.base_font_size || 16}px
                          </label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="range" 
                              min="14" 
                              max="20" 
                              value={selectedTemplate.theme_config.base_font_size || 16}
                              onChange={(e) => updateThemeConfig("base_font_size", parseInt(e.target.value))}
                              className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0f172a] dark:accent-white"
                            />
                            <span className="text-xs font-black text-slate-500 w-8 text-right shrink-0">{selectedTemplate.theme_config.base_font_size || 16}px</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                            Question Font Size: {selectedTemplate.theme_config.question_font_size || 14}px
                          </label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="range" 
                              min="10" 
                              max="24" 
                              value={selectedTemplate.theme_config.question_font_size || 14}
                              onChange={(e) => updateThemeConfig("question_font_size", parseInt(e.target.value))}
                              className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0f172a] dark:accent-white"
                            />
                            <span className="text-xs font-black text-slate-500 w-8 text-right shrink-0">{selectedTemplate.theme_config.question_font_size || 14}px</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Body Font Weight & Style</label>
                          <select 
                            value={selectedTemplate.theme_config.body_weight || "Regular"}
                            onChange={(e) => updateThemeConfig("body_weight", e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-slate-700 bg-slate-50 cursor-pointer dark:bg-slate-800 dark:text-white"
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
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Heading Font Weight & Style</label>
                          <select 
                            value={selectedTemplate.theme_config.heading_weight || "Bold"}
                            onChange={(e) => updateThemeConfig("heading_weight", e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-slate-700 bg-slate-50 cursor-pointer dark:bg-slate-800 dark:text-white"
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
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Question Font Weight & Style</label>
                          <select 
                            value={selectedTemplate.theme_config.question_weight || "Regular Italic"}
                            onChange={(e) => updateThemeConfig("question_weight", e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-slate-700 bg-slate-50 cursor-pointer dark:bg-slate-800 dark:text-white"
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
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Success Title Weight & Style</label>
                          <select 
                            value={selectedTemplate.theme_config.success_title_weight || "Bold"}
                            onChange={(e) => updateThemeConfig("success_title_weight", e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-slate-700 bg-slate-50 cursor-pointer dark:bg-slate-800 dark:text-white"
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
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Success Desc Weight & Style</label>
                          <select 
                            value={selectedTemplate.theme_config.success_desc_weight || "Regular"}
                            onChange={(e) => updateThemeConfig("success_desc_weight", e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-slate-700 bg-slate-50 cursor-pointer dark:bg-slate-800 dark:text-white"
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

                      <div className="flex flex-wrap gap-6">
                        <div className="space-y-2 flex-1 min-w-[220px]">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Primary Brand Color</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={selectedTemplate.theme_config.primary_color || "#0f172a"} 
                              onChange={(e) => updateThemeConfig("primary_color", e.target.value)}
                              className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0" 
                            />
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.primary_color || "#0f172a"} 
                              onChange={(e) => updateThemeConfig("primary_color", e.target.value)}
                              className="w-24 shrink-0 px-3 py-2.5 rounded-xl border border-slate-100 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2 flex-1 min-w-[220px]">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Form Card Background Color</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={selectedTemplate.theme_config.form_bg_color || "#ffffff"} 
                              onChange={(e) => updateThemeConfig("form_bg_color", e.target.value)}
                              className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0" 
                            />
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.form_bg_color || "#ffffff"} 
                              onChange={(e) => updateThemeConfig("form_bg_color", e.target.value)}
                              className="w-24 shrink-0 px-3 py-2.5 rounded-xl border border-slate-100 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2 flex-1 min-w-[220px]">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Form Text Color</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={selectedTemplate.theme_config.form_text_color || "#0f172a"} 
                              onChange={(e) => updateThemeConfig("form_text_color", e.target.value)}
                              className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0" 
                            />
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.form_text_color || "#0f172a"} 
                              onChange={(e) => updateThemeConfig("form_text_color", e.target.value)}
                              className="w-24 shrink-0 px-3 py-2.5 rounded-xl border border-slate-100 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2 flex-1 min-w-[220px]">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Feedback Blocks Background</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={selectedTemplate.theme_config.feedback_bg_color || "#f1f5f9"} 
                              onChange={(e) => updateThemeConfig("feedback_bg_color", e.target.value)}
                              className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0" 
                            />
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.feedback_bg_color || "#f1f5f9"} 
                              onChange={(e) => updateThemeConfig("feedback_bg_color", e.target.value)}
                              className="w-24 shrink-0 px-3 py-2.5 rounded-xl border border-slate-100 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2 flex-1 min-w-[220px]">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Attendee Pass Badge Color</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={selectedTemplate.theme_config.attendeePassBgColor || "#000000"} 
                              onChange={(e) => updateThemeConfig("attendeePassBgColor", e.target.value)}
                              className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0" 
                            />
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.attendeePassBgColor || "#000000"} 
                              onChange={(e) => updateThemeConfig("attendeePassBgColor", e.target.value)}
                              className="w-24 shrink-0 px-3 py-2.5 rounded-xl border border-slate-100 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800 font-mono" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2 flex-1 min-w-[220px]">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Engagement Details Color</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={selectedTemplate.theme_config.engagementDetailsColor || "#0f172a"} 
                              onChange={(e) => updateThemeConfig("engagementDetailsColor", e.target.value)}
                              className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0" 
                            />
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.engagementDetailsColor || "#0f172a"} 
                              onChange={(e) => updateThemeConfig("engagementDetailsColor", e.target.value)}
                              className="w-24 shrink-0 px-3 py-2.5 rounded-xl border border-slate-100 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800 font-mono" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 pt-12 pb-6 border-t border-slate-100 dark:border-slate-800 mt-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Public Form Header Config</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Form Title Heading</label>
                            <RichTextEditor 
                              value={selectedTemplate.theme_config.form_heading || ""} 
                              onChange={(val) => updateThemeConfig("form_heading", val)}
                              placeholder="e.g. Register."
                              minHeight="80px"
                              variant="simple"
                            />
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Form Subheading / Description</label>
                            <RichTextEditor 
                              value={selectedTemplate.theme_config.form_subheading || ""} 
                              onChange={(val) => updateThemeConfig("form_subheading", val)}
                              placeholder="e.g. Secure your credentials for this exclusive engagement."
                              minHeight="80px"
                              variant="simple"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 pt-12 pb-6 border-t border-slate-100 dark:border-slate-800 mt-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Attendance Selector Config</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Question Label</label>
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.attendance_label || ""} 
                              onChange={(e) => updateThemeConfig("attendance_label", e.target.value)}
                              placeholder="e.g. Attendance Status"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-[#0f172a] dark:text-white" 
                            />
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">"Attending" Option</label>
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.attending_label || ""} 
                              onChange={(e) => updateThemeConfig("attending_label", e.target.value)}
                              placeholder="e.g. I am attending"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-[#0f172a] dark:text-white" 
                            />
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">"Not Attending" Option</label>
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.not_attending_label || ""} 
                              onChange={(e) => updateThemeConfig("not_attending_label", e.target.value)}
                              placeholder="e.g. Unable to attend"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-[#0f172a] dark:text-white" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 pt-12 pb-6 border-t border-slate-100 dark:border-slate-800 mt-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Typography & Accessibility Rules</h4>
                        
                        <div className="space-y-5">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={!!selectedTemplate.theme_config.force_sentence_case}
                              onChange={(e) => updateThemeConfig("force_sentence_case", e.target.checked)}
                              className="w-4 h-4 rounded text-[#0f172a] focus:ring-0 border-slate-300"
                            />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                              Format headers to Sentence Case (e.g. "Personal profile" instead of "PERSONAL PROFILE.")
                            </span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={!!selectedTemplate.theme_config.strip_trailing_periods}
                              onChange={(e) => updateThemeConfig("strip_trailing_periods", e.target.checked)}
                              className="w-4 h-4 rounded text-[#0f172a] focus:ring-0 border-slate-300"
                            />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                              Strip trailing full stops from all heading titles automatically
                            </span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={!!selectedTemplate.theme_config.force_text_visibility}
                              onChange={(e) => updateThemeConfig("force_text_visibility", e.target.checked)}
                              className="w-4 h-4 rounded text-[#0f172a] focus:ring-0 border-slate-300"
                            />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                              Force explicit options list text colors (fixes hover text black on black visibility issue)
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-6 pt-12 pb-6 border-t border-slate-100 dark:border-slate-800 mt-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Disclaimer & Consent Config</h4>
                        <div className="space-y-4">
                          <div className="space-y-2.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Custom Checkbox Phrasing Text</label>
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.disclaimerCheckboxLabel || ""} 
                              onChange={(e) => updateThemeConfig("disclaimerCheckboxLabel", e.target.value)}
                              placeholder="I have read and accept the Disclaimer and Indemnity"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-[#0f172a] dark:text-white" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ================================================= */}
                  {/* TAB 2: LAYOUT & BRANCHING BUILDER */}
                  {/* ================================================= */}
                  {editorTab === "layout" && (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-4">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-400">Unified Form Fields Layout Schema</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Reorder standard and custom fields, and customize their labels or placeholders.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => addField("text")}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-white transition-all"
                          >
                            + Text Field
                          </button>
                          <button
                            onClick={() => addField("email")}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-white transition-all"
                          >
                            + Email Field
                          </button>
                          <button
                            onClick={() => addField("numeric")}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-white transition-all"
                          >
                            + Phone Field
                          </button>
                          <button
                            onClick={() => addField("select")}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-white transition-all"
                          >
                            + Select Dropdown
                          </button>
                          <button
                            onClick={() => addField("checkbox")}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-white transition-all"
                          >
                            + Checkbox
                          </button>
                          <button
                            onClick={() => addField("partner_card")}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-white transition-all"
                          >
                            + Partner Card
                          </button>
                          <button
                            onClick={() => addField("section_header")}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:border-indigo-900/30 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider transition-all"
                          >
                            + Section Header
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {selectedTemplate.layout_schema.map((field, index) => {
                          const precedingFields = getAllPrecedingFields(field.id);
                          const isStandardField = ["first_name", "last_name", "email", "company"].includes(field.key);
                          
                          return (
                            <div key={field.id} className={`rounded-2xl p-5 border shadow-sm space-y-4 transition-all ${
                              field.type === "section_header"
                                ? "bg-indigo-50/10 border-indigo-100 dark:bg-indigo-950/5 dark:border-indigo-900/30"
                                : "bg-white border-slate-100 dark:bg-slate-900/20 dark:border-slate-800"
                            }`}>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">#{index + 1}</span>
                                  <div className="relative">
                                    <select
                                      value={field.type}
                                      disabled={isStandardField}
                                      onChange={(e) => {
                                        const newType = e.target.value as any;
                                        updateFieldProperties(field.id, { 
                                          type: newType, 
                                          options: newType === "select" ? (field.options || ["Option 1", "Option 2"]) : undefined
                                        });
                                      }}
                                      className={`text-[9px] pl-2 pr-6 py-0.5 rounded-lg font-black uppercase tracking-wide border border-slate-200 outline-none appearance-none cursor-pointer focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/5 dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                                        field.type === "section_header"
                                          ? "bg-indigo-150 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                          : "bg-slate-150 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                      }`}
                                    >
                                      <option value="text">Text Field</option>
                                      <option value="numeric">Number Field</option>
                                      <option value="email">Email Field</option>
                                      <option value="select">Select Dropdown</option>
                                      <option value="checkbox">Checkbox</option>
                                      <option value="partner_card">Partner Card</option>
                                      <option value="section_header">Section Header</option>
                                    </select>
                                    {!isStandardField && (
                                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown size={10} />
                                      </div>
                                    )}
                                  </div>
                                  {isStandardField && (
                                    <span className="text-[8px] bg-amber-50 border border-amber-250 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                      System Field
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => moveFieldOrder(index, "up")}
                                    disabled={index === 0}
                                    className="p-1 text-slate-400 hover:text-[#0f172a] disabled:opacity-30"
                                    title="Move Up"
                                  >
                                    <ArrowUp size={14} />
                                  </button>
                                  <button
                                    onClick={() => moveFieldOrder(index, "down")}
                                    disabled={index === selectedTemplate.layout_schema.length - 1}
                                    className="p-1 text-slate-400 hover:text-[#0f172a] disabled:opacity-30"
                                    title="Move Down"
                                  >
                                    <ArrowDown size={14} />
                                  </button>
                                  <button
                                    onClick={() => updateFieldProperty(field.id, "visible", !field.visible)}
                                    className={`p-1 ${field.visible ? "text-blue-500" : "text-slate-400"}`}
                                    title={field.visible ? "Visible on form" : "Hidden on form"}
                                  >
                                    {field.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                  </button>
                                  <button
                                    onClick={() => removeField(field.id)}
                                    className="p-1 text-slate-400 hover:text-red-500"
                                    title="Delete Field"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">Field ID / Key (JSON output key)</label>
                                    <input 
                                      type="text"
                                      disabled={isStandardField}
                                      value={field.key}
                                      onChange={(e) => updateFieldProperty(field.id, "key", e.target.value)}
                                      placeholder="e.g. ticket_type"
                                      className="w-full px-3 py-2 rounded-lg border border-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800 text-[#0f172a] dark:text-white"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">Field Label Phrasing / Section Title</label>
                                    <RichTextEditor 
                                      value={field.label || ""}
                                      onChange={(val) => updateFieldProperty(field.id, "label", val)}
                                      placeholder="e.g. What is your t-shirt size?"
                                      minHeight="60px"
                                      variant="simple"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  {field.type !== "section_header" && field.type !== "checkbox" && field.type !== "partner_card" && (
                                    <div className="space-y-1">
                                      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">Placeholder Text</label>
                                      <input 
                                        type="text"
                                        value={field.placeholder || ""}
                                        onChange={(e) => updateFieldProperty(field.id, "placeholder", e.target.value)}
                                        placeholder="e.g. Select size..."
                                        className="w-full px-3 py-2 rounded-lg border border-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800 text-[#0f172a] dark:text-white"
                                      />
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-4 pt-2">
                                    {field.type !== "section_header" && (
                                      <label className="flex items-center gap-2 cursor-pointer select-none text-[10px] font-bold">
                                        <input 
                                          type="checkbox"
                                          checked={field.required}
                                          onChange={(e) => updateFieldProperty(field.id, "required", e.target.checked)}
                                          className="w-3.5 h-3.5 text-[#0f172a] rounded"
                                        />
                                        Required Field
                                      </label>
                                    )}
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-[10px] font-bold">
                                      <input 
                                        type="checkbox"
                                        checked={field.visible}
                                        onChange={(e) => updateFieldProperty(field.id, "visible", e.target.checked)}
                                        className="w-3.5 h-3.5 text-[#0f172a] rounded"
                                      />
                                      Visible on Form
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-[10px] font-bold" title="Renders this field before the attending/not attending selection">
                                      <input 
                                        type="checkbox"
                                        checked={!!(field as any).showBeforeAttendance}
                                        onChange={(e) => updateFieldProperty(field.id, "showBeforeAttendance", e.target.checked)}
                                        className="w-3.5 h-3.5 text-[#0f172a] rounded"
                                      />
                                      Render before RSVP Selector
                                    </label>
                                  </div>

                                  {field.type === "select" && (
                                    <div className="space-y-1">
                                      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">Dropdown Options (Comma separated)</label>
                                      <input 
                                        type="text" 
                                        placeholder="e.g. Small, Medium, Large"
                                        value={field.options?.join(", ") || ""}
                                        onChange={(e) => updateFieldProperty(
                                          field.id, 
                                          "options", 
                                          e.target.value.split(",").map(o => o.trim()).filter(Boolean)
                                        )}
                                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 border border-slate-100"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Conditional Branching visibility */}
                              {field.type !== "section_header" && (
                                <div className="pt-2 border-t border-slate-50 dark:border-slate-800">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                    Conditional Branching Rule
                                    <span title="Only show this field if a preceding dropdown selection matches a specific value."><HelpCircle size={10} /></span>
                                  </label>
                                  {field.dependsOn ? (
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <select 
                                        value={field.dependsOn.fieldId}
                                        onChange={(e) => updateFieldProperty(field.id, "dependsOn", {
                                          ...field.dependsOn,
                                          fieldId: e.target.value
                                        })}
                                        className="text-[10px] font-bold text-slate-650 bg-slate-50 dark:bg-slate-800 rounded p-1.5 border border-slate-100"
                                      >
                                        {precedingFields.map(pf => (
                                          <option key={pf.id} value={pf.id}>{pf.label}</option>
                                        ))}
                                      </select>
                                      <span className="text-[10px] text-slate-400 font-bold uppercase">equals</span>
                                      <input 
                                        type="text" 
                                        value={field.dependsOn.value}
                                        onChange={(e) => updateFieldProperty(field.id, "dependsOn", {
                                          ...field.dependsOn,
                                          value: e.target.value
                                        })}
                                        className="text-[10px] font-bold text-slate-650 bg-slate-50 dark:bg-slate-800 rounded p-1.5 border border-slate-100 w-32"
                                        placeholder="Match value..."
                                      />
                                      <button
                                        onClick={() => updateFieldProperty(field.id, "dependsOn", undefined)}
                                        className="text-[9px] font-black text-red-500 hover:underline uppercase shrink-0"
                                      >
                                        Remove Rule
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (precedingFields.length === 0) {
                                          alert("No preceding select dropdown fields found to branch on. Add a select dropdown above this field first.");
                                          return;
                                        }
                                        updateFieldProperty(field.id, "dependsOn", {
                                          fieldId: precedingFields[0].id,
                                          value: ""
                                        });
                                      }}
                                      className="text-[9px] font-black text-blue-500 hover:underline uppercase block mt-1"
                                    >
                                      + Add Visibility Rule
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ================================================= */}
                  {/* TAB 3: POST SUBMIT EXPERIENCE */}
                  {/* ================================================= */}
                  {editorTab === "postSubmit" && (
                    <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                        Custom Onscreen Success & Decline Screen variables
                      </h4>

                      <div className="space-y-6">
                        {/* SUCCESS SCREEN SECTION */}
                        <div className="space-y-4 bg-slate-50/30 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500">Onscreen Confirmation (Success) View</h5>
                          
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Confirmation Header</label>
                            <RichTextEditor 
                              value={selectedTemplate.post_submit_config.onscreen_title || ""}
                              onChange={(val) => updatePostSubmitConfig("onscreen_title", val)}
                              placeholder="e.g. YOUR REGISTRATION HAS BEEN CONFIRMED."
                              minHeight="80px"
                              variant="simple"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Confirmation Description template</label>
                            <RichTextEditor 
                              value={selectedTemplate.post_submit_config.onscreen_description || ""}
                              onChange={(val) => updatePostSubmitConfig("onscreen_description", val)}
                              placeholder="e.g. Your registration for [Event Name] is confirmed."
                              minHeight="100px"
                              availableTokens={["[Name]", "[Event Name]", "[Email Address]", "[Clearance ID]"]}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1 block">Custom Success Logo/Icon</label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    uploadImageFile(file)
                                      .then((url) => updatePostSubmitConfig("success_icon_url", url))
                                      .catch(() => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          updatePostSubmitConfig("success_icon_url", reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                      });
                                  }
                                }}
                                className="hidden"
                                id="success-icon-upload"
                              />
                              <label 
                                htmlFor="success-icon-upload"
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 cursor-pointer dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                Upload Image
                              </label>
                              {selectedTemplate.post_submit_config.success_icon_url && (
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={selectedTemplate.post_submit_config.success_icon_url} 
                                    alt="Success icon" 
                                    className="w-10 h-10 object-contain rounded border border-slate-200 p-0.5 bg-white" 
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => updatePostSubmitConfig("success_icon_url", "")}
                                    className="text-[9px] text-red-500 font-bold hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Success Logo Fitting</label>
                            <select 
                              value={selectedTemplate.post_submit_config.success_icon_style || "contain"}
                              onChange={(e) => updatePostSubmitConfig("success_icon_style", e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            >
                              <option value="contain">Fit Inside (Contain)</option>
                              <option value="cover">Fill Shape (Cover)</option>
                              <option value="fill">Stretch to Shape (Fill)</option>
                            </select>
                          </div>
                        </div>

                        {/* DECLINE SCREEN SECTION */}
                        <div className="space-y-4 bg-slate-50/30 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Onscreen RSVP Decline View</h5>
                          
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Decline Header</label>
                            <RichTextEditor 
                              value={selectedTemplate.post_submit_config.onscreen_decline_title || ""}
                              onChange={(val) => updatePostSubmitConfig("onscreen_decline_title", val)}
                              placeholder="e.g. RSVP Response Recorded."
                              minHeight="80px"
                              variant="simple"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Decline Description template</label>
                            <RichTextEditor 
                              value={selectedTemplate.post_submit_config.onscreen_decline_description || ""}
                              onChange={(val) => updatePostSubmitConfig("onscreen_decline_description", val)}
                              placeholder="e.g. We have recorded your decline RSVP response for [Event Name]."
                              minHeight="100px"
                              availableTokens={["[Name]", "[Event Name]", "[Email Address]"]}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1 block">Custom Decline Logo/Icon</label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    uploadImageFile(file)
                                      .then((url) => updatePostSubmitConfig("decline_icon_url", url))
                                      .catch(() => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          updatePostSubmitConfig("decline_icon_url", reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                      });
                                  }
                                }}
                                className="hidden"
                                id="decline-icon-upload"
                              />
                              <label 
                                htmlFor="decline-icon-upload"
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 cursor-pointer dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                Upload Image
                              </label>
                              {selectedTemplate.post_submit_config.decline_icon_url && (
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={selectedTemplate.post_submit_config.decline_icon_url} 
                                    alt="Decline icon" 
                                    className="w-10 h-10 object-contain rounded border border-slate-200 p-0.5 bg-white" 
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => updatePostSubmitConfig("decline_icon_url", "")}
                                    className="text-[9px] text-red-500 font-bold hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Decline Logo Fitting</label>
                            <select 
                              value={selectedTemplate.post_submit_config.decline_icon_style || "contain"}
                              onChange={(e) => updatePostSubmitConfig("decline_icon_style", e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            >
                              <option value="contain">Fit Inside (Contain)</option>
                              <option value="cover">Fill Shape (Cover)</option>
                              <option value="fill">Stretch to Shape (Fill)</option>
                            </select>
                          </div>
                        </div>

                        {/* CAPACITY FULL SCREEN SECTION */}
                        <div className="space-y-4 bg-slate-50/30 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Onscreen Waitlist / Capacity Full View</h5>
                          
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Waitlist Header</label>
                            <RichTextEditor 
                              value={selectedTemplate.post_submit_config.onscreen_capacity_title || ""}
                              onChange={(val) => updatePostSubmitConfig("onscreen_capacity_title", val)}
                              placeholder="e.g. EVENT IS FULL / WAITLISTED."
                              minHeight="80px"
                              variant="simple"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Waitlist Description template</label>
                            <RichTextEditor 
                              value={selectedTemplate.post_submit_config.onscreen_capacity_description || ""}
                              onChange={(val) => updatePostSubmitConfig("onscreen_capacity_description", val)}
                              placeholder="e.g. We are sorry, this event is currently at maximum capacity. We have added you to our waitlist."
                              minHeight="100px"
                              availableTokens={["[Name]", "[Event Name]", "[Email Address]"]}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1 block">Custom Capacity Logo/Icon</label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    uploadImageFile(file)
                                      .then((url) => updatePostSubmitConfig("capacity_icon_url", url))
                                      .catch(() => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          updatePostSubmitConfig("capacity_icon_url", reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                      });
                                  }
                                }}
                                className="hidden"
                                id="capacity-icon-upload"
                              />
                              <label 
                                htmlFor="capacity-icon-upload"
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 cursor-pointer dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                Upload Image
                              </label>
                              {selectedTemplate.post_submit_config.capacity_icon_url && (
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={selectedTemplate.post_submit_config.capacity_icon_url} 
                                    alt="Capacity icon" 
                                    className="w-10 h-10 object-contain rounded border border-slate-200 p-0.5 bg-white" 
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => updatePostSubmitConfig("capacity_icon_url", "")}
                                    className="text-[9px] text-red-500 font-bold hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Capacity Logo Fitting</label>
                            <select 
                              value={selectedTemplate.post_submit_config.capacity_icon_style || "contain"}
                              onChange={(e) => updatePostSubmitConfig("capacity_icon_style", e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            >
                              <option value="contain">Fit Inside (Contain)</option>
                              <option value="cover">Fill Shape (Cover)</option>
                              <option value="fill">Stretch to Shape (Fill)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Clearance Code Box Label</label>
                          <input 
                            type="text" 
                            value={selectedTemplate.post_submit_config.clearance_label || "unique access pass number"}
                            onChange={(e) => updatePostSubmitConfig("clearance_label", e.target.value)}
                            placeholder="e.g. unique access pass number"
                            className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}



                  {editorTab === "operator" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <h4 className="text-xs font-black uppercase text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                        Custom Operator Check-In Screen Builder
                      </h4>

                      <div className="space-y-4">
                        <p className="text-[10px] text-slate-500">
                          Type and design your check-in card display layout. Wrap any field names or custom question labels/keys in brackets (e.g. <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[9px] font-bold">[first_name]</code>) to dynamically inject attendee answers when passes are scanned.
                        </p>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block ml-1">
                            Operator Success Card Background Color
                          </label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={selectedTemplate.operator_config?.success_bg_color || "#0f172a"} 
                              onChange={(e) => updateOperatorConfig("success_bg_color", e.target.value)}
                              className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0" 
                            />
                            <input 
                              type="text" 
                              value={selectedTemplate.operator_config?.success_bg_color || "#0f172a"} 
                              onChange={(e) => updateOperatorConfig("success_bg_color", e.target.value)}
                              className="w-24 shrink-0 px-3 py-2.5 rounded-xl border border-slate-100 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800" 
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                            Display Card Content Layout Editor
                          </label>
                          <textarea
                            value={selectedTemplate.operator_config?.card_layout_text || ""}
                            onChange={(e) => updateOperatorConfig("card_layout_text", e.target.value)}
                            placeholder={`Name: [first_name] [last_name]\nCompany: [company]\nDietary Requirements: [dietary_requirements]`}
                            className="w-full h-36 px-4 py-3 rounded-2xl bg-white border border-slate-200 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none font-bold text-sm text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-white font-mono leading-relaxed"
                          />
                        </div>

                        <div className="space-y-3">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                            Available Field Tokens (Click to insert)
                          </span>
                          
                          <div className="flex flex-wrap gap-2">
                             {[
                              { label: "First Name", token: "[first_name]" },
                              { label: "Last Name", token: "[last_name]" },
                              { label: "Email Address", token: "[email]" },
                              { label: "Company", token: "[company]" },
                              { label: "Clearance ID", token: "[clearance_id]" },
                              ...(() => {
                                const fields: any[] = [];
                                if (Array.isArray(selectedTemplate.layout_schema)) {
                                  selectedTemplate.layout_schema.forEach((item: any) => {
                                    if (item && Array.isArray(item.fields)) {
                                      fields.push(...item.fields);
                                    } else if (item) {
                                      fields.push(item);
                                    }
                                  });
                                }
                                return fields
                                  .filter(f => f && (f.key || f.id) && !["first_name", "last_name", "email", "company"].includes(f.key || f.id))
                                  .map(f => ({
                                    label: (f.label || "").replace(/<[^>]*>/g, "").trim(),
                                    token: `[${f.key || f.id}]`
                                  }));
                              })()
                            ].map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  const currentText = selectedTemplate.operator_config?.card_layout_text || "";
                                  updateOperatorConfig("card_layout_text", currentText ? currentText + " " + item.token : item.token);
                                }}
                                className="px-3 py-1.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/10 dark:hover:bg-slate-900/30 text-[10px] font-black text-slate-700 dark:text-slate-300 transition-all active:scale-95"
                              >
                                {item.label} <code className="text-yellow-500 font-mono font-bold text-[9px] ml-1">{item.token}</code>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-[2.5rem] p-10 text-center border border-slate-100 dark:bg-slate-900/10 dark:border-slate-800 py-20">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Create a template to begin</p>
                </div>
              )}
        </div>

        {/* Right Column: Real-time Form / Success Screen preview panel */}
        <div className="xl:col-span-4 sticky top-6 space-y-4">
          <div className="flex items-center justify-between ml-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Live Preview
            </h3>
            
            <div className="bg-slate-100 rounded-xl p-1 flex flex-wrap gap-1 text-[8.5px] font-black uppercase tracking-wider text-slate-400 dark:bg-slate-800 shrink-0 max-w-full">
              <button
                onClick={() => setPreviewMode("form")}
                className={`px-2 py-1 rounded-lg transition-all ${previewMode === "form" ? "bg-white text-[#0f172a] shadow-sm font-black dark:bg-[#0f172a] dark:text-white" : "hover:text-slate-600"}`}
              >
                Form
              </button>
              <button
                onClick={() => setPreviewMode("confirmation")}
                className={`px-2 py-1 rounded-lg transition-all ${previewMode === "confirmation" ? "bg-white text-[#0f172a] shadow-sm font-black dark:bg-[#0f172a] dark:text-white" : "hover:text-slate-600"}`}
              >
                Success
              </button>
              <button
                onClick={() => setPreviewMode("decline")}
                className={`px-2 py-1 rounded-lg transition-all ${previewMode === "decline" ? "bg-white text-[#0f172a] shadow-sm font-black dark:bg-[#0f172a] dark:text-white" : "hover:text-slate-600"}`}
              >
                Decline
              </button>
              <button
                onClick={() => setPreviewMode("waitlist")}
                className={`px-2 py-1 rounded-lg transition-all ${previewMode === "waitlist" ? "bg-white text-[#0f172a] shadow-sm font-black dark:bg-[#0f172a] dark:text-white" : "hover:text-slate-600"}`}
              >
                Waitlist
              </button>

              <button
                onClick={() => setPreviewMode("operator")}
                className={`px-2 py-1 rounded-lg transition-all ${previewMode === "operator" ? "bg-white text-[#0f172a] shadow-sm font-black dark:bg-[#0f172a] dark:text-white" : "hover:text-slate-600"}`}
              >
                Operator
              </button>
            </div>
          </div>

          {selectedTemplate ? (() => {
            const parseWeightStyle = (val?: string, defaultWeight = "400", defaultStyle = "normal") => {
              if (!val) return { weight: defaultWeight, style: defaultStyle };
              const lower = val.toLowerCase();
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

            const bodyStyle = parseWeightStyle(selectedTemplate.theme_config.body_weight, "400", "normal");
            const headingStyle = parseWeightStyle(selectedTemplate.theme_config.heading_weight, "700", "normal");
            const questionStyle = parseWeightStyle(selectedTemplate.theme_config.question_weight, "400", "italic");
            const successTitleStyle = parseWeightStyle(selectedTemplate.theme_config.success_title_weight, "700", "normal");
            const successDescStyle = parseWeightStyle(selectedTemplate.theme_config.success_desc_weight, "400", "normal");

            return (
              <div 
                style={{
                  fontFamily: selectedTemplate.theme_config.typography_font || "Calibri, sans-serif"
                }}
                className="rounded-[2.5rem] border border-slate-150 p-8 shadow-lg transition-all min-h-[480px] max-h-[750px] relative overflow-hidden flex flex-col justify-between preview-form-text-custom"
              >
                <style dangerouslySetInnerHTML={{ __html: `
                  ${selectedTemplate.theme_config.form_text_color ? `
                    .preview-form-text-custom h1:not([style*="color"]),
                    .preview-form-text-custom h2:not([style*="color"]),
                    .preview-form-text-custom h3:not([style*="color"]),
                    .preview-form-text-custom h4:not([style*="color"]),
                    .preview-form-text-custom p:not([style*="color"]),
                    .preview-form-text-custom span:not([style*="color"]),
                    .preview-form-text-custom label:not([style*="color"]),
                    .preview-form-text-custom li:not([style*="color"]),
                    .preview-form-text-custom legend:not([style*="color"]),
                    .preview-form-text-custom select:not([style*="color"]) {
                      color: ${selectedTemplate.theme_config.form_text_color} !important;
                    }
                  ` : ""}
                  .preview-form-text-custom, 
                  .preview-form-text-custom p,
                  .preview-form-text-custom span,
                  .preview-form-text-custom div,
                  .preview-form-text-custom input,
                  .preview-form-text-custom select {
                    font-weight: ${bodyStyle.weight} !important;
                    font-style: ${bodyStyle.style} !important;
                  }
                  .preview-form-text-custom h1,
                  .preview-form-text-custom h2,
                  .preview-form-text-custom h3,
                  .preview-form-text-custom h4,
                  .preview-form-text-custom h5,
                  .preview-form-text-custom h6 {
                    font-weight: ${headingStyle.weight} !important;
                    font-style: ${headingStyle.style} !important;
                  }
                  .preview-form-text-custom h1 strong,
                  .preview-form-text-custom h1 b,
                  .preview-form-text-custom h2 strong,
                  .preview-form-text-custom h2 b,
                  .preview-form-text-custom h3 strong,
                  .preview-form-text-custom h3 b,
                  .preview-form-text-custom h1 *[style*="font-weight"] {
                    font-weight: 900 !important;
                  }
                  .preview-form-text-custom label,
                  .preview-form-text-custom label *,
                  .preview-form-text-custom .client-question-label,
                  .preview-form-text-custom .client-question-label * {
                    font-size: ${selectedTemplate.theme_config.question_font_size ? `${selectedTemplate.theme_config.question_font_size}px` : '10px'} !important;
                    font-weight: ${questionStyle.weight} !important;
                    font-style: ${questionStyle.style} !important;
                  }
                  .preview-success-title {
                    font-weight: ${successTitleStyle.weight} !important;
                    font-style: ${successTitleStyle.style} !important;
                  }
                  .preview-success-desc {
                    font-weight: ${successDescStyle.weight} !important;
                    font-style: ${successDescStyle.style} !important;
                  }
                `}} />
              {/* Force theme config values onto the container styles */}
              <div 
                className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                style={{
                  background: selectedTemplate.theme_config.background_pattern === "cyber_dark" 
                    ? "radial-gradient(circle, #facc15 1px, transparent 1px) 0 0/16px 16px" 
                    : selectedTemplate.theme_config.background_pattern === "midnight_executive"
                      ? "linear-gradient(135deg, #1d4ed8 0%, #1e1b4b 100%)"
                      : selectedTemplate.theme_config.background_pattern === "brutalist_retro"
                        ? "repeating-linear-gradient(45deg, #facc15, #facc15 10px, #000 10px, #000 20px)"
                        : "none"
                }}
              />
              
              <div 
                className="absolute inset-0 z-0" 
                style={{ backgroundColor: selectedTemplate.theme_config.form_bg_color || "#ffffff" }}
              />

              <div className="relative z-10 w-full space-y-6 overflow-y-auto max-h-[640px] pr-2 scrollbar-thin">
                {previewMode === "form" ? (
                  <>
                    {/* Header */}
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                      <h3 
                        className="text-xl font-bold text-[#0f172a] dark:text-white"
                        style={{ color: selectedTemplate.theme_config.form_text_color || undefined }}
                      >
                        {selectedTemplate.theme_config.form_heading !== undefined && selectedTemplate.theme_config.form_heading !== null
                          ? formatHeading(selectedTemplate.theme_config.form_heading)
                          : formatHeading(selectedTemplate.name)}
                      </h3>
                      <div 
                        className={`text-slate-400 text-[10px] font-medium mt-1 ${
                          selectedTemplate.theme_config.form_subheading && /<[a-z][\s\S]*>/i.test(selectedTemplate.theme_config.form_subheading)
                            ? ""
                            : "uppercase tracking-wider"
                        }`}
                        style={{ color: selectedTemplate.theme_config.form_text_color || undefined }}
                        dangerouslySetInnerHTML={{
                          __html: selectedTemplate.theme_config.form_subheading !== undefined && selectedTemplate.theme_config.form_subheading !== null && selectedTemplate.theme_config.form_subheading !== ""
                            ? selectedTemplate.theme_config.form_subheading
                            : selectedTemplate.description || "Public Registration Form"
                        }}
                      />
                    </div>

                    {/* Standard Fields (Always Present in system) */}
                    <div className="space-y-4">
                      {/* Render fields designated to appear BEFORE attendance status */}
                      {selectedTemplate.layout_schema
                        .filter(field => {
                          if (!field || field.inactive || field.visible === false || field.type === "section_header") return false;
                          const isIdentity = ["first_name", "last_name", "email", "company"].includes(field.key || field.id || "");
                          return isIdentity ? true : !!(field as any).showBeforeAttendance;
                        })
                        .map((field) => (
                          <div key={field.id} className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-650 dark:text-slate-350 block flex items-center flex-wrap gap-1 client-question-label">
                              <span dangerouslySetInnerHTML={{ __html: field.label || "" }} />
                              {field.required && <span className="text-red-500 ml-0.5 font-bold">*</span>}
                            </label>
                            <input 
                              type="text" 
                              disabled 
                              placeholder={field.placeholder || "Enter answer..."} 
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-semibold dark:bg-slate-800 dark:border-slate-855" 
                            />
                          </div>
                        ))
                      }

                      {/* Attendance Status preview */}
                      <div className="space-y-2 pt-2">
                        <label className="text-[10px] font-bold text-slate-500 block">
                          {formatHeading(selectedTemplate.theme_config.attendance_label || "Attendance Status")} *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="py-2.5 rounded-xl border border-slate-200 bg-slate-50/20 text-center text-xs font-bold text-[#0f172a] dark:text-white">
                            {selectedTemplate.theme_config.attending_label || "I am attending"}
                          </div>
                          <div className="py-2.5 rounded-xl border border-slate-150 bg-slate-50/50 text-center text-xs font-bold text-slate-400">
                            {selectedTemplate.theme_config.not_attending_label || "Unable to attend"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Render fields designated to appear AFTER attendance status */}
                    <div className="space-y-4 mt-4">
                      {selectedTemplate.layout_schema
                        .filter(field => {
                          if (!field || field.inactive || field.visible === false) return false;
                          if (field.type === "section_header") return true;
                          const isIdentity = ["first_name", "last_name", "email", "company"].includes(field.key || field.id || "");
                          return isIdentity ? false : !(field as any).showBeforeAttendance;
                        })
                        .map((field) => {
                          if (field.type === "section_header") {
                            return (
                              <div key={field.id} className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                  {formatHeading(field.label)}
                                </h4>
                              </div>
                            );
                          }
                          
                          return (
                            <div key={field.id} className="space-y-1.5">
                              <label className="text-[10px] font-semibold text-slate-650 dark:text-slate-350 block flex items-center flex-wrap gap-1 client-question-label">
                                <span dangerouslySetInnerHTML={{ __html: field.label || "" }} />
                                {field.required && <span className="text-red-500 ml-0.5 font-bold">*</span>}
                              </label>

                              {(field.type === "text" || field.type === "email") && (
                                <input type="text" disabled placeholder={field.placeholder || "Enter answer..."} className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-semibold dark:bg-slate-800 dark:border-slate-855" />
                              )}

                              {field.type === "numeric" && (
                                <input type="text" disabled placeholder={field.placeholder || "Numeric answer..."} className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-semibold dark:bg-slate-800 dark:border-slate-855" />
                              )}

                              {field.type === "select" && (
                                <select disabled className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-semibold dark:bg-slate-800 dark:border-slate-855">
                                  <option value="">{field.placeholder || "Select option..."}</option>
                                  {field.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}

                              {field.type === "checkbox" && (
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-not-allowed">
                                  <input type="checkbox" disabled className="rounded text-[#0f172a]" />
                                  Confirm choice
                                </label>
                              )}

                              {field.type === "partner_card" && (
                                <div className="p-4 rounded-xl border border-slate-200 border-dashed bg-slate-50/30 text-center text-xs font-bold text-slate-400 dark:border-slate-800">
                                  Corporate Partner Details Block
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    
                    <button type="button" disabled className="w-full py-4 bg-[#0f172a] text-white rounded-2xl font-black uppercase text-xs tracking-widest opacity-80 cursor-not-allowed mt-4">
                      Submit Registration
                    </button>
                  </>
                ) : previewMode === "confirmation" ? (
                  // Success Screen View
                  (() => {
                    const config = {
                      theme: selectedTemplate.theme_config || {}
                    };
                    return (
                      <div 
                        className="p-6 rounded-2xl text-center space-y-6 shadow-sm border border-slate-100/50"
                        style={{ backgroundColor: selectedTemplate.theme_config.feedback_bg_color || "#f1f5f9" }}
                      >
                        {selectedTemplate.post_submit_config.success_icon_url ? (
                          <div className={`w-16 h-16 rounded-2xl overflow-hidden mx-auto shadow-md flex items-center justify-center ${selectedTemplate.post_submit_config.success_icon_style === "cover" ? "p-0" : "p-2"}`}>
                            <img 
                              src={selectedTemplate.post_submit_config.success_icon_url} 
                              alt="Logo" 
                              className={`w-full h-full ${
                                selectedTemplate.post_submit_config.success_icon_style === "cover" 
                                  ? "object-cover" 
                                  : selectedTemplate.post_submit_config.success_icon_style === "fill" 
                                    ? "object-fill" 
                                    : "object-contain"
                              }`} 
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mx-auto shadow-md">
                            <CheckCircle2 size={36} className="text-white animate-bounce" />
                          </div>
                        )}

                        <h1 
                          className="text-2xl font-bold text-[#0f172a] tracking-tight preview-success-title"
                          dangerouslySetInnerHTML={{ __html: selectedTemplate.post_submit_config.onscreen_title || "YOUR REGISTRATION HAS BEEN CONFIRMED." }}
                        />

                        <div 
                          className="text-slate-500 text-xs font-medium leading-relaxed whitespace-pre-line preview-success-desc" 
                          style={{ whiteSpace: 'pre-line' }}
                          dangerouslySetInnerHTML={{ __html: formatPostSubmit(selectedTemplate.post_submit_config.onscreen_description || "Your registration is confirmed.") }}
                        />

                        <div className="pt-4 border-t border-slate-200/50 space-y-1">
                          <p className="text-[8px] uppercase tracking-[0.25em] text-slate-400 font-bold">
                            {selectedTemplate.post_submit_config.clearance_label || "unique access pass number"}
                          </p>
                          <p className="text-2xl font-black text-slate-800 italic tracking-tighter">
                            EEL-987A
                          </p>
                        </div>
                      </div>
                    );
                  })()
                ) : previewMode === "decline" ? (
                  // Decline Screen View
                  (() => {
                    return (
                      <div 
                        className="p-6 rounded-2xl text-center space-y-6 shadow-sm border border-slate-100/50 w-full"
                        style={{ backgroundColor: selectedTemplate.theme_config.feedback_bg_color || "#f1f5f9" }}
                      >
                        {selectedTemplate.post_submit_config.decline_icon_url ? (
                          <div className={`w-16 h-16 rounded-2xl overflow-hidden mx-auto shadow-md flex items-center justify-center ${selectedTemplate.post_submit_config.decline_icon_style === "cover" ? "p-0" : "p-2"}`}>
                            <img 
                              src={selectedTemplate.post_submit_config.decline_icon_url} 
                              alt="Logo" 
                              className={`w-full h-full ${
                                selectedTemplate.post_submit_config.decline_icon_style === "cover" 
                                  ? "object-cover" 
                                  : selectedTemplate.post_submit_config.decline_icon_style === "fill" 
                                    ? "object-fill" 
                                    : "object-contain"
                              }`} 
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center mx-auto shadow-md">
                            <XCircle size={36} className="text-white animate-pulse" />
                          </div>
                        )}

                        <h1 
                          className="text-2xl font-bold text-[#0f172a] tracking-tight preview-success-title"
                          dangerouslySetInnerHTML={{ __html: selectedTemplate.post_submit_config.onscreen_decline_title || "RSVP RESPONSE RECORDED." }}
                        />

                        <div 
                          className="text-slate-500 text-xs font-medium leading-relaxed whitespace-pre-line preview-success-desc" 
                          style={{ whiteSpace: 'pre-line' }}
                          dangerouslySetInnerHTML={{ __html: formatPostSubmit(selectedTemplate.post_submit_config.onscreen_decline_description || "We have recorded your decline RSVP response.") }}
                        />
                      </div>
                    );
                  })()
                ) : previewMode === "waitlist" ? (
                  // Waitlist Screen View
                  (() => {
                    return (
                      <div 
                        className="p-6 rounded-2xl text-center space-y-6 shadow-sm border border-slate-100/50 w-full"
                        style={{ backgroundColor: selectedTemplate.theme_config.feedback_bg_color || "#f1f5f9" }}
                      >
                        {selectedTemplate.post_submit_config.capacity_icon_url ? (
                          <div className={`w-16 h-16 rounded-2xl overflow-hidden mx-auto shadow-md flex items-center justify-center ${selectedTemplate.post_submit_config.capacity_icon_style === "cover" ? "p-0" : "p-2"}`}>
                            <img 
                              src={selectedTemplate.post_submit_config.capacity_icon_url} 
                              alt="Logo" 
                              className={`w-full h-full ${
                                selectedTemplate.post_submit_config.capacity_icon_style === "cover" 
                                  ? "object-cover" 
                                  : selectedTemplate.post_submit_config.capacity_icon_style === "fill" 
                                    ? "object-fill" 
                                    : "object-contain"
                              }`} 
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-rose-500 flex items-center justify-center mx-auto shadow-md">
                            <AlertCircle size={36} className="text-white animate-pulse" />
                          </div>
                        )}

                        <h1 
                          className="text-2xl font-bold text-[#0f172a] tracking-tight preview-success-title"
                          dangerouslySetInnerHTML={{ __html: selectedTemplate.post_submit_config.onscreen_capacity_title || "Your response has been submitted" }}
                        />

                        <div 
                          className="text-slate-500 text-xs font-medium leading-relaxed whitespace-pre-line preview-success-desc" 
                          style={{ whiteSpace: 'pre-line' }}
                          dangerouslySetInnerHTML={{ __html: formatPostSubmit(selectedTemplate.post_submit_config.onscreen_capacity_description || "We are sorry, the event is currently at maximum capacity. We have recorded your email for waitlist priority.") }}
                        />
                      </div>
                    );
                  })()
                ) : (
                  // Operator view
                  <div className="space-y-4 text-left w-full h-full flex flex-col justify-between">
                    <div className="space-y-5">
                      <div className="text-center space-y-1">
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.2em]">Operator Scan Success Mockup</span>
                      </div>

                      <div 
                        style={{ backgroundColor: selectedTemplate.operator_config?.success_bg_color || "#0f172a" }}
                        className="rounded-3xl p-5 text-center text-white space-y-4 shadow-md relative overflow-hidden"
                      >
                        <div className="w-9 h-9 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="text-green-400" size={20} />
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[8.5px] font-black uppercase tracking-[0.3em] opacity-60">
                            VERIFIED ATTENDEE
                          </span>
                          <h2 className="text-xl font-black uppercase tracking-tight italic">
                            ACCESS GRANTED
                          </h2>
                        </div>

                        <div className="pt-3 border-t border-white/10 space-y-1">
                          <p className="text-xs font-black">John Doe</p>
                          <p className="text-[9px] opacity-60 font-semibold">john.doe@example.com</p>
                        </div>
                      </div>

                      {selectedTemplate.operator_config?.card_layout_text ? (
                        <div className="space-y-2">
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block ml-1">Card Display Layout</span>
                          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                            <pre className="text-[10px] font-bold text-slate-700 dark:text-slate-350 whitespace-pre-wrap font-sans leading-relaxed">
                              {compileOperatorPreviewText(selectedTemplate.operator_config.card_layout_text)}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block ml-1">Grid Display Fields</span>
                          <div className="grid grid-cols-2 gap-2.5">
                            {(selectedTemplate.operator_config?.display_fields || ["company", "ticket_type"]).map((fieldKey: string) => {
                              const fieldDef = selectedTemplate.layout_schema.find(f => f.key === fieldKey || f.id === fieldKey);
                              const label = fieldDef?.label || fieldKey;
                              const mockValue = fieldKey === "company" ? "Excellence Logistics" : fieldKey === "ticket_type" ? "VIP Pass" : "Sample Answer";
                              
                              return (
                                <div key={fieldKey} className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 space-y-0.5">
                                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block truncate">
                                    {label.replace(/<[^>]*>/g, "").trim()}
                                  </span>
                                  <p className="text-[10px] font-bold text-slate-700 dark:text-slate-350 truncate">
                                    {mockValue}
                                  </p>
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
          );
        })() : (
            <div className="bg-slate-50 rounded-[2.5rem] p-10 text-center border border-slate-100 dark:bg-slate-900/10 dark:border-slate-800 py-40 min-h-[480px] flex items-center justify-center">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Select a template to view preview</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW TEMPLATE MODAL */}
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0f172a] border border-slate-150 rounded-[2rem] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div>
                <h3 className="text-lg font-black font-bricolage italic uppercase text-[#0f172a] dark:text-white">
                  Create Registration Template
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Define a new reuseable registration layout structure.
                </p>
              </div>

              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Template Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. VIP Dinner Form"
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Description (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Standard layout for VIP guest profiling"
                    value={newTplDesc}
                    onChange={(e) => setNewTplDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-xs font-medium text-slate-650"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#0f172a] text-white hover:bg-black font-black text-xs uppercase tracking-wider"
                  >
                    Create Template
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
