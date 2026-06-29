"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Trash2, Copy, Save, Loader2, Edit3, Type, CheckSquare, 
  List, Palette, FileText, CheckCircle2, AlertCircle, ChevronRight,
  ArrowUp, ArrowDown, Layout, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

interface FormField {
  id: string;
  label: string;
  type: "text" | "select" | "checkbox" | "partner_card";
  required: boolean;
  options?: string[]; // For select type
  dependsOn?: {
    fieldId: string;
    value: string;
  };
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
  };
  layout_schema: FormSection[];
  post_submit_config: {
    onscreen_title?: string;
    onscreen_description?: string;
    clearance_label?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export default function RegistrationTemplateManager() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [templates, setTemplates] = useState<RegistrationFormTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RegistrationFormTemplate | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Tabs within editor: theme, layout, postSubmit
  const [editorTab, setEditorTab] = useState<"theme" | "layout" | "postSubmit">("theme");
  
  // Real-time Preview Mode: "form" or "confirmation"
  const [previewMode, setPreviewMode] = useState<"form" | "confirmation">("form");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplDesc, setNewTplDesc] = useState("");

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
        setSelectedTemplate(JSON.parse(JSON.stringify(tpl))); // deep copy
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
      setSelectedTemplate(JSON.parse(JSON.stringify(tpl)));
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
            force_text_visibility: true
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
            clearance_label: "UNIQUE CLEARANCE ID"
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
          layout_schema: selectedTemplate.layout_schema,
          post_submit_config: selectedTemplate.post_submit_config
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

  const updateLayoutSchema = (newSchema: FormSection[]) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      layout_schema: newSchema
    });
    setHasUnsavedChanges(true);
  };

  // Layout editor helpers
  const addSection = () => {
    if (!selectedTemplate) return;
    const newId = `section_${Date.now()}`;
    const newSection: FormSection = {
      id: newId,
      title: "New Section",
      fields: []
    };
    updateLayoutSchema([...selectedTemplate.layout_schema, newSection]);
  };

  const removeSection = (secId: string) => {
    if (!selectedTemplate) return;
    updateLayoutSchema(selectedTemplate.layout_schema.filter(s => s.id !== secId));
  };

  const updateSectionTitle = (secId: string, title: string) => {
    if (!selectedTemplate) return;
    const newSchema = selectedTemplate.layout_schema.map(s => 
      s.id === secId ? { ...s, title } : s
    );
    updateLayoutSchema(newSchema);
  };

  const addFieldToSection = (secId: string) => {
    if (!selectedTemplate) return;
    const newId = `field_${Date.now()}`;
    const newField: FormField = {
      id: newId,
      label: "New Question",
      type: "text",
      required: false
    };
    const newSchema = selectedTemplate.layout_schema.map(s => 
      s.id === secId ? { ...s, fields: [...s.fields, newField] } : s
    );
    updateLayoutSchema(newSchema);
  };

  const removeFieldFromSection = (secId: string, fieldId: string) => {
    if (!selectedTemplate) return;
    const newSchema = selectedTemplate.layout_schema.map(s => {
      if (s.id !== secId) return s;
      return { ...s, fields: s.fields.filter(f => f.id !== fieldId) };
    });
    updateLayoutSchema(newSchema);
  };

  const updateFieldProperty = (secId: string, fieldId: string, property: keyof FormField, value: any) => {
    if (!selectedTemplate) return;
    const newSchema = selectedTemplate.layout_schema.map(s => {
      if (s.id !== secId) return s;
      return {
        ...s,
        fields: s.fields.map(f => f.id === fieldId ? { ...f, [property]: value } : f)
      };
    });
    updateLayoutSchema(newSchema);
  };

  // Move section or field
  const moveSectionOrder = (index: number, direction: "up" | "down") => {
    if (!selectedTemplate) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedTemplate.layout_schema.length) return;
    
    const reordered = [...selectedTemplate.layout_schema];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, item);
    updateLayoutSchema(reordered);
  };

  const moveFieldOrder = (secId: string, index: number, direction: "up" | "down") => {
    if (!selectedTemplate) return;
    const targetSec = selectedTemplate.layout_schema.find(s => s.id === secId);
    if (!targetSec) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= targetSec.fields.length) return;

    const newSchema = selectedTemplate.layout_schema.map(s => {
      if (s.id !== secId) return s;
      const reorderedFields = [...s.fields];
      const [item] = reorderedFields.splice(index, 1);
      reorderedFields.splice(targetIndex, 0, item);
      return { ...s, fields: reorderedFields };
    });
    updateLayoutSchema(newSchema);
  };

  // Get list of all preceding fields to set conditional dependencies on
  const getAllPrecedingFields = (fieldId: string) => {
    if (!selectedTemplate) return [];
    const fieldsList: { id: string; label: string }[] = [];
    for (const section of selectedTemplate.layout_schema) {
      for (const field of section.fields) {
        if (field.id === fieldId) {
          return fieldsList;
        }
        if (field.type === "select") {
          fieldsList.push({ id: field.id, label: field.label });
        }
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Selector list & configs */}
        <div className="xl:col-span-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Sidebar list of templates */}
            <div className="md:col-span-1 space-y-4">
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
              <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 space-y-2 max-h-[600px] overflow-y-auto">
                {templates.map((t) => {
                  const isSelected = t.id === selectedId;
                  return (
                    <div key={t.id} className="relative group/row font-bold">
                      <button
                        onClick={() => handleSelectTemplate(t.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all ${
                          isSelected 
                            ? "bg-[#0f172a]/5 text-[#0f172a] font-black dark:bg-yellow-400/10 dark:text-yellow-400"
                            : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-12">
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

            {/* Config details editor */}
            <div className="md:col-span-2 space-y-6">
              {selectedTemplate ? (
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 space-y-8">
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
                  <div className="flex border-b border-slate-100 dark:border-slate-800">
                    {[
                      { id: "theme", label: "Theme & Typography", icon: Palette },
                      { id: "layout", label: "Layout & Branching", icon: Layout },
                      { id: "postSubmit", label: "Post-Submit Confirmation", icon: FileText }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const active = editorTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setEditorTab(tab.id as any)}
                          className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
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
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Global Typography Stack</label>
                          <select 
                            value={selectedTemplate.theme_config.typography_font || "Calibri, sans-serif"}
                            onChange={(e) => updateThemeConfig("typography_font", e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-xs text-slate-700 bg-slate-50 cursor-pointer dark:bg-slate-800 dark:text-white"
                          >
                            <option value="Calibri, sans-serif">(Recommended) Calibri Stack</option>
                            <option value="Outfit, sans-serif">Outfit (Premium Rounded)</option>
                            <option value="Inter, sans-serif">Inter (Standard Modern)</option>
                            <option value="system-ui, sans-serif">System Sans-serif</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
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
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
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
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Attendance Selector Config</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Question Label</label>
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.attendance_label || ""} 
                              onChange={(e) => updateThemeConfig("attendance_label", e.target.value)}
                              placeholder="e.g. Attendance Status"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-[#0f172a] dark:text-white" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">"Attending" Option</label>
                            <input 
                              type="text" 
                              value={selectedTemplate.theme_config.attending_label || ""} 
                              onChange={(e) => updateThemeConfig("attending_label", e.target.value)}
                              placeholder="e.g. I am attending"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-[#0f172a] dark:text-white" 
                            />
                          </div>
                          <div className="space-y-1">
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

                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Typography & Accessibility Rules</h4>
                        
                        <div className="space-y-3">
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
                    </div>
                  )}

                  {/* ================================================= */}
                  {/* TAB 2: LAYOUT & BRANCHING BUILDER */}
                  {/* ================================================= */}
                  {editorTab === "layout" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h4 className="text-xs font-black uppercase text-slate-400">Sections & Field Branching Schema</h4>
                        <button
                          onClick={addSection}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-black text-white text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          <Plus size={11} />
                          Add Section
                        </button>
                      </div>

                      <div className="space-y-6">
                        {selectedTemplate.layout_schema.map((section, secIdx) => (
                          <div key={section.id} className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 dark:bg-slate-900/20 dark:border-slate-800 space-y-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Section {secIdx + 1}:</span>
                                <input 
                                  type="text" 
                                  value={section.title}
                                  onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                                  className="font-bold text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#1e293b] outline-none text-[#0f172a] dark:text-white px-1 py-0.5 w-full max-w-[240px]"
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => moveSectionOrder(secIdx, "up")}
                                  disabled={secIdx === 0}
                                  className="p-1 text-slate-400 hover:text-[#0f172a] disabled:opacity-30"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  onClick={() => moveSectionOrder(secIdx, "down")}
                                  disabled={secIdx === selectedTemplate.layout_schema.length - 1}
                                  className="p-1 text-slate-400 hover:text-[#0f172a] disabled:opacity-30"
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  onClick={() => removeSection(section.id)}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Section Fields list */}
                            <div className="space-y-3">
                              {section.fields.map((field, fieldIdx) => {
                                const precedingFields = getAllPrecedingFields(field.id);
                                return (
                                  <div key={field.id} className="bg-white rounded-xl p-4 border border-slate-100/60 dark:bg-[#0f172a] dark:border-slate-800 space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-2 flex-1">
                                        {field.type === "text" && <Type size={13} className="text-slate-400" />}
                                        {field.type === "select" && <List size={13} className="text-slate-400" />}
                                        {field.type === "checkbox" && <CheckSquare size={13} className="text-slate-400" />}
                                        
                                        <input 
                                          type="text" 
                                          value={field.label}
                                          onChange={(e) => updateFieldProperty(section.id, field.id, "label", e.target.value)}
                                          className="font-bold text-xs bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#1e293b] outline-none text-[#0f172a] dark:text-white w-full max-w-[200px]"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] font-bold">
                                        <button
                                          onClick={() => moveFieldOrder(section.id, fieldIdx, "up")}
                                          disabled={fieldIdx === 0}
                                          className="p-1 text-slate-400 hover:text-[#0f172a] disabled:opacity-30"
                                        >
                                          <ArrowUp size={12} />
                                        </button>
                                        <button
                                          onClick={() => moveFieldOrder(section.id, fieldIdx, "down")}
                                          disabled={fieldIdx === section.fields.length - 1}
                                          className="p-1 text-slate-400 hover:text-[#0f172a] disabled:opacity-30"
                                        >
                                          <ArrowDown size={12} />
                                        </button>
                                        
                                        <label className="flex items-center gap-1 cursor-pointer select-none">
                                          <input 
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => updateFieldProperty(section.id, field.id, "required", e.target.checked)}
                                            className="w-3 h-3 text-[#0f172a] rounded"
                                          />
                                          Required
                                        </label>

                                        <button
                                          onClick={() => removeFieldFromSection(section.id, field.id)}
                                          className="p-1 text-slate-400 hover:text-red-500"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Edit details */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-50 dark:border-slate-800">
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">Input Type</label>
                                        <select 
                                          value={field.type}
                                          onChange={(e) => updateFieldProperty(section.id, field.id, "type", e.target.value)}
                                          className="w-full text-[10px] font-bold text-slate-650 bg-slate-50 dark:bg-slate-800 rounded-lg p-1.5 border border-slate-100"
                                        >
                                          <option value="text">Text Input</option>
                                          <option value="select">Dropdown Select</option>
                                          <option value="checkbox">Single Checkbox</option>
                                          <option value="partner_card">Corporate Partner Validation Card</option>
                                        </select>
                                      </div>

                                      {/* Dropdown Options list */}
                                      {field.type === "select" && (
                                        <div>
                                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">Options (comma separated)</label>
                                          <input 
                                            type="text" 
                                            placeholder="e.g. Yes, No, Maybe"
                                            value={field.options?.join(", ") || ""}
                                            onChange={(e) => updateFieldProperty(
                                              section.id, 
                                              field.id, 
                                              "options", 
                                              e.target.value.split(",").map(o => o.trim()).filter(Boolean)
                                            )}
                                            className="w-full text-[10px] font-bold text-slate-650 bg-slate-50 dark:bg-slate-800 rounded-lg p-1.5 border border-slate-100"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Conditional branch trigger */}
                                    <div className="pt-2">
                                      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                        Conditional Visibility Rule
                                        <span title="Only show this question if a previous dropdown has a specific value"><HelpCircle size={10} /></span>
                                      </label>
                                      {field.dependsOn ? (
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                          <select 
                                            value={field.dependsOn.fieldId}
                                            onChange={(e) => updateFieldProperty(section.id, field.id, "dependsOn", {
                                              ...field.dependsOn,
                                              fieldId: e.target.value
                                            })}
                                            className="text-[10px] font-bold text-slate-600 bg-slate-50 dark:bg-slate-800 rounded p-1 border border-slate-100"
                                          >
                                            {precedingFields.map(pf => (
                                              <option key={pf.id} value={pf.id}>{pf.label}</option>
                                            ))}
                                          </select>
                                          <span className="text-[10px] text-slate-400 font-bold uppercase">equals</span>
                                          <input 
                                            type="text" 
                                            value={field.dependsOn.value}
                                            onChange={(e) => updateFieldProperty(section.id, field.id, "dependsOn", {
                                              ...field.dependsOn,
                                              value: e.target.value
                                            })}
                                            className="text-[10px] font-bold text-slate-600 bg-slate-50 dark:bg-slate-800 rounded p-1 border border-slate-100 w-24"
                                            placeholder="Value..."
                                          />
                                          <button
                                            onClick={() => updateFieldProperty(section.id, field.id, "dependsOn", undefined)}
                                            className="text-[9px] font-black text-red-500 hover:underline uppercase shrink-0"
                                          >
                                            Remove Rule
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            if (precedingFields.length === 0) {
                                              alert("No preceding dropdown fields found to create rules on. Add a select field above this one first.");
                                              return;
                                            }
                                            updateFieldProperty(section.id, field.id, "dependsOn", {
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
                                  </div>
                                );
                              })}
                            </div>

                            <button
                              onClick={() => addFieldToSection(section.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-200 hover:border-slate-350 hover:bg-white text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-wider transition-all w-full justify-center"
                            >
                              <Plus size={11} />
                              Add Field to Section
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ================================================= */}
                  {/* TAB 3: POST SUBMIT EXPERIENCE */}
                  {/* ================================================= */}
                  {editorTab === "postSubmit" && (
                    <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                        Custom Onscreen Success Screen variables
                      </h4>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Onscreen Confirmation Header</label>
                          <input 
                            type="text" 
                            value={selectedTemplate.post_submit_config.onscreen_title || "YOUR REGISTRATION HAS BEEN CONFIRMED."}
                            onChange={(e) => updatePostSubmitConfig("onscreen_title", e.target.value)}
                            placeholder="e.g. YOUR REGISTRATION HAS BEEN CONFIRMED."
                            className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Onscreen Description template</label>
                          <textarea 
                            rows={4}
                            value={selectedTemplate.post_submit_config.onscreen_description || ""}
                            onChange={(e) => updatePostSubmitConfig("onscreen_description", e.target.value)}
                            placeholder="e.g. Your registration for [Event Name] is confirmed. Verification has been dispatched to [Email Address]."
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#1e293b] outline-none font-medium text-slate-750 dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
                          />
                          <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold ml-1">
                            Available Tokens: <span className="text-blue-500 font-mono">[Name]</span>, <span className="text-blue-500 font-mono">[Event Name]</span>, <span className="text-blue-500 font-mono">[Email Address]</span>, <span className="text-blue-500 font-mono">[Clearance ID]</span>. Replaced at runtime.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Clearance Code Box Label</label>
                          <input 
                            type="text" 
                            value={selectedTemplate.post_submit_config.clearance_label || "UNIQUE CLEARANCE ID"}
                            onChange={(e) => updatePostSubmitConfig("clearance_label", e.target.value)}
                            placeholder="e.g. UNIQUE CLEARANCE ID"
                            className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#1e293b] outline-none font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
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
          </div>
        </div>

        {/* Right Column: Real-time Form / Success Screen preview panel */}
        <div className="xl:col-span-4 sticky top-6 space-y-4">
          <div className="flex items-center justify-between ml-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Live Preview
            </h3>
            
            <div className="bg-slate-100 rounded-xl p-1 flex gap-1 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:bg-slate-800 shrink-0">
              <button
                onClick={() => setPreviewMode("form")}
                className={`px-3 py-1.5 rounded-lg transition-all ${previewMode === "form" ? "bg-white text-[#0f172a] shadow-sm font-black dark:bg-[#0f172a] dark:text-white" : "hover:text-slate-600"}`}
              >
                Form View
              </button>
              <button
                onClick={() => setPreviewMode("confirmation")}
                className={`px-3 py-1.5 rounded-lg transition-all ${previewMode === "confirmation" ? "bg-white text-[#0f172a] shadow-sm font-black dark:bg-[#0f172a] dark:text-white" : "hover:text-slate-600"}`}
              >
                Success Screen
              </button>
            </div>
          </div>

          {selectedTemplate ? (
            <div 
              style={{
                fontFamily: selectedTemplate.theme_config.typography_font || "Calibri, sans-serif"
              }}
              className={`rounded-[2.5rem] border border-slate-150 p-8 shadow-lg transition-all min-h-[480px] relative overflow-hidden flex flex-col justify-between`}
            >
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

              <div className="relative z-10 w-full space-y-6">
                {previewMode === "form" ? (
                  <>
                    {/* Header */}
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                      <h3 className="text-xl font-bold text-[#0f172a] dark:text-white">
                        {formatHeading(selectedTemplate.name)}
                      </h3>
                      <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider mt-1">
                        {selectedTemplate.description || "Public Registration Form"}
                      </p>
                    </div>

                    {/* Standard Fields (Always Present in system) */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">First Name *</label>
                          <input type="text" disabled placeholder="e.g. John" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-semibold" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">Last Name *</label>
                          <input type="text" disabled placeholder="e.g. Doe" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-semibold" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Email Address *</label>
                        <input type="email" disabled placeholder="john.doe@company.com" className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-semibold" />
                      </div>

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

                    {/* Custom Schema Sections & Fields */}
                    {selectedTemplate.layout_schema.map((section) => (
                      <div key={section.id} className="space-y-3 pt-3 border-t border-slate-50 dark:border-slate-800">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                          {formatHeading(section.title)}
                        </h4>
                        
                        <div className="space-y-4">
                          {section.fields.map((field) => (
                            <div key={field.id} className="space-y-1.5">
                              <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 block">
                                {field.label} {field.required ? "*" : ""}
                              </label>

                              {field.type === "text" && (
                                <input type="text" disabled placeholder="Enter answer..." className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-semibold" />
                              )}

                              {field.type === "select" && (
                                <select disabled className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-semibold cursor-not-allowed">
                                  <option value="">Select option...</option>
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
                                <div className="p-4 rounded-xl border border-slate-200 border-dashed bg-slate-50/30 text-center text-xs font-bold text-slate-400">
                                  Corporate Partner Details Block
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <button type="button" disabled className="w-full py-4 bg-[#0f172a] text-white rounded-2xl font-black uppercase text-xs tracking-widest opacity-80 cursor-not-allowed mt-4">
                      Submit Registration
                    </button>
                  </>
                ) : (
                  // Success Screen View
                  <div 
                    className="p-6 rounded-2xl text-center space-y-6 shadow-sm border border-slate-100/50"
                    style={{ backgroundColor: selectedTemplate.theme_config.feedback_bg_color || "#f1f5f9" }}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mx-auto shadow-md">
                      <CheckCircle2 size={36} className="text-white animate-bounce" />
                    </div>

                    <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">
                      {selectedTemplate.post_submit_config.onscreen_title || "YOUR REGISTRATION HAS BEEN CONFIRMED."}
                    </h1>

                    <p className="text-slate-500 text-xs font-medium leading-relaxed">
                      {formatPostSubmit(selectedTemplate.post_submit_config.onscreen_description || "Your registration is confirmed.")}
                    </p>

                    <div className="pt-4 border-t border-slate-200/50 space-y-1">
                      <p className="text-[8px] uppercase tracking-[0.25em] text-slate-400 font-bold">
                        {selectedTemplate.post_submit_config.clearance_label || "UNIQUE CLEARANCE ID"}
                      </p>
                      <p className="text-2xl font-black text-slate-800 italic tracking-tighter">
                        EEL-987A
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
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
