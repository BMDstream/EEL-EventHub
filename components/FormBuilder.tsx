"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Trash2, Type, List, CheckSquare, Save, Loader2, 
  Sparkles, ArrowUp, ArrowDown, Users, Hash, FileText, ChevronDown, ListTodo
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import RichTextEditor from "./RichTextEditor";

interface FormField {
  id: string;
  label: string;
  type: "text" | "select" | "checkbox" | "partner_card" | "numeric" | "multiselect";
  required: boolean;
  options?: string[]; // For select type
  dependsOn?: {
    fieldId: string;
    value: string;
  };
  description?: string;
  image_url?: string;
  inactive?: boolean;
  showBeforeAttendance?: boolean;
}

interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

export default function FormBuilder({ 
  eventId, 
  templateId,
  initialSchema, 
  onSave 
}: { 
  eventId: string; 
  templateId?: number;
  initialSchema: any[]; 
  onSave: (schema: any[]) => void; 
}) {
  const { data: session } = useSession();
  const [sections, setSections] = useState<FormSection[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);

  // Initialize and migrate legacy schema
  useEffect(() => {
    if (initialSchema) {
      // Check if standard fields exist in the schema
      const flatFields: any[] = [];
      const isSectioned = initialSchema.length > 0 && "fields" in initialSchema[0];
      if (isSectioned) {
        initialSchema.forEach((sec: any) => flatFields.push(...(sec.fields || [])));
      } else {
        flatFields.push(...initialSchema);
      }

      const hasFirstName = flatFields.some(f => f.key === "first_name" || f.id === "field_first_name");
      const hasLastName = flatFields.some(f => f.key === "last_name" || f.id === "field_last_name");
      const hasEmail = flatFields.some(f => f.key === "email" || f.id === "field_email");
      const hasCompany = flatFields.some(f => f.key === "company" || f.id === "field_company");

      let updatedSchema = [...initialSchema];
      
      const missingStandardFields: any[] = [];
      if (!hasFirstName) {
        missingStandardFields.push({ id: "field_first_name", key: "first_name", label: "First Name", placeholder: "e.g. Alan", type: "text", required: true, visible: true, showBeforeAttendance: true });
      }
      if (!hasLastName) {
        missingStandardFields.push({ id: "field_last_name", key: "last_name", label: "Last Name", placeholder: "e.g. Turing", type: "text", required: true, visible: true, showBeforeAttendance: true });
      }
      if (!hasEmail) {
        missingStandardFields.push({ id: "field_email", key: "email", label: "Secure Email Address", placeholder: "e.g. turing@bletchleypark.org.uk", type: "email", required: true, visible: true, showBeforeAttendance: true });
      }
      if (!hasCompany) {
        missingStandardFields.push({ id: "field_company", key: "company", label: "Organization / Company", placeholder: "e.g. GC&CS", type: "text", required: false, visible: true, showBeforeAttendance: true });
      }

      if (missingStandardFields.length > 0) {
        if (isSectioned && updatedSchema.length > 0) {
          updatedSchema[0] = {
            ...updatedSchema[0],
            fields: [...missingStandardFields, ...(updatedSchema[0].fields || [])]
          };
        } else if (!isSectioned) {
          updatedSchema = [...missingStandardFields, ...updatedSchema];
        }
      }

      if (isSectioned) {
        setSections(updatedSchema as FormSection[]);
      } else {
        // Parse flat array containing section_header items into FormSections
        const parsedSections: FormSection[] = [];
        let currentSection: FormSection | null = null;
        
        updatedSchema.forEach((item: any) => {
          if (item.type === "section_header") {
            if (currentSection) {
              parsedSections.push(currentSection);
            }
            currentSection = {
              id: item.id || `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: item.label || "New Section",
              fields: []
            };
          } else {
            if (!currentSection) {
              currentSection = {
                id: "default_section",
                title: "Registration Details",
                fields: []
              };
            }
            currentSection.fields.push(item);
          }
        });
        
        if (currentSection) {
          parsedSections.push(currentSection);
        }
        
        setSections(parsedSections.length > 0 ? parsedSections : [
          {
            id: "default_section",
            title: "Registration Details",
            fields: []
          }
        ]);
      }
    }
  }, [initialSchema]);

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

  // Image Upload Handling
  const handleImageUpload = async (secId: string, fieldId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    try {
      const url = await uploadImageFile(file);
      updateField(secId, fieldId, { image_url: url });
    } catch (e) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField(secId, fieldId, { image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Section Management
  const addSection = () => {
    const newSection: FormSection = {
      id: `section_${Date.now()}`,
      title: "New Section",
      fields: []
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (secId: string) => {
    if (confirm("Are you sure you want to delete this section? All questions inside will be lost.")) {
      setSections(sections.filter((s) => s.id !== secId));
    }
  };

  const updateSectionTitle = (secId: string, title: string) => {
    setSections(sections.map((s) => (s.id === secId ? { ...s, title } : s)));
  };

  const moveSectionOrder = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const reordered = [...sections];
    const [item] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, item);
    setSections(reordered);
  };

  // Field Management
  const addField = (secId: string, type: "text" | "select" | "checkbox" | "partner_card" | "numeric" | "multiselect") => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: type === "partner_card" ? "Partner Details" : "New Question",
      type,
      required: type === "partner_card",
      options: (type === "select" || type === "multiselect") ? ["Option 1", "Option 2"] : undefined
    };
    setSections(
      sections.map((s) => (s.id === secId ? { ...s, fields: [...s.fields, newField] } : s))
    );
  };

  const addFieldToLastSection = (type: "text" | "select" | "checkbox" | "partner_card" | "numeric" | "multiselect") => {
    if (sections.length === 0) {
      const newSecId = `section_${Date.now()}`;
      const newField: FormField = {
        id: `field_${Date.now() + 1}`,
        label: type === "partner_card" ? "Partner Details" : "New Question",
        type,
        required: type === "partner_card",
        options: (type === "select" || type === "multiselect") ? ["Option 1", "Option 2"] : undefined
      };
      setSections([
        {
          id: newSecId,
          title: "Registration Details",
          fields: [newField]
        }
      ]);
    } else {
      const lastSection = sections[sections.length - 1];
      addField(lastSection.id, type);
    }
  };

  const removeField = (secId: string, fieldId: string) => {
    setSections(
      sections.map((s) => {
        if (s.id !== secId) return s;
        // Also remove dependencies pointing to the deleted field
        const updatedFields = s.fields
          .filter((f) => f.id !== fieldId)
          .map((f) => {
            if (f.dependsOn?.fieldId === fieldId) {
              const { dependsOn, ...rest } = f;
              return rest;
            }
            return f;
          });
        return { ...s, fields: updatedFields };
      })
    );
  };

  const updateField = (secId: string, fieldId: string, updates: Partial<FormField>) => {
    setSections(
      sections.map((s) => {
        if (s.id !== secId) return s;
        return {
          ...s,
          fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
        };
      })
    );
  };

  const moveFieldOrder = (secId: string, index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    setSections(
      sections.map((s) => {
        if (s.id !== secId) return s;
        if (newIndex < 0 || newIndex >= s.fields.length) return s;
        const reordered = [...s.fields];
        const [item] = reordered.splice(index, 1);
        reordered.splice(newIndex, 0, item);
        return { ...s, fields: reordered };
      })
    );
  };

  // Get list of select/checkbox fields preceding a given field (for conditions)
  const getPrecedingFields = (currentFieldId: string) => {
    const allFields: FormField[] = [];
    for (const sec of sections) {
      for (const f of sec.fields) {
        if (f.id === currentFieldId) {
          return allFields.filter((pf) => pf.type === "select" || pf.type === "checkbox" || pf.type === "multiselect");
        }
        allFields.push(f);
      }
    }
    return [];
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save to event-specific custom_fields_schema
      const res = await fetch(`/api/py/events/${eventId}/form-schema`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({ custom_fields_schema: sections })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to save event form schema");
      }

      // 2. Save back to the global template (so both sides stay in sync!)
      if (templateId) {
        // Fetch current template config first
        const tplRes = await fetch(`/api/py/settings/registration-templates/${templateId}`);
        if (tplRes.ok) {
          const currentTpl = await tplRes.json();
           // Flatten sections into a flat list of fields for the template's layout_schema
           const flatLayoutSchema: any[] = [];
           sections.forEach((sec) => {
             if (sec.id !== "default_section" || sec.title !== "Registration Details") {
               flatLayoutSchema.push({
                 id: sec.id,
                 key: sec.id,
                 label: sec.title,
                 type: "section_header",
                 visible: true
               });
             }
             flatLayoutSchema.push(...sec.fields);
           });

           // Update the template layout schema
           const updateRes = await fetch(`/api/py/settings/registration-templates/${templateId}`, {
             method: "PUT",
             headers: { 
               "Content-Type": "application/json",
               "x-user-email": session?.user?.email || ""
             },
             body: JSON.stringify({
               name: currentTpl.name,
               description: currentTpl.description,
               theme_config: currentTpl.theme_config,
               layout_schema: flatLayoutSchema, // update with flat schema!
               post_submit_config: currentTpl.post_submit_config,
               email_config: currentTpl.email_config,
               operator_config: currentTpl.operator_config
             })
           });
          if (!updateRes.ok) {
            console.warn("Failed to sync layout schema back to global template.");
          }
        }
      }

      onSave(sections);
      alert("Form schema saved and synced successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Action header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div>
           <h2 className="text-3xl font-black text-[#0f172a] dark:text-white font-bricolage italic uppercase tracking-tight">Form <span className="text-slate-300">Studio</span></h2>
           <p className="text-slate-500 font-medium dark:text-slate-400">Design the data capture experience for this event.</p>
        </div>
        <div className="flex gap-3">
           <button
             onClick={addSection}
             className="flex items-center gap-2 bg-[#0f172a] hover:bg-black text-white px-6 py-4 rounded-2xl font-black transition-all shadow-md uppercase tracking-widest text-xs dark:bg-slate-800 dark:hover:bg-slate-700"
           >
             <Plus size={16} />
             Add Section
           </button>
           <button 
             onClick={handleSave}
             disabled={saving}
             className="flex items-center gap-3 bg-yellow-400 hover:bg-yellow-500 text-black px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-yellow-400/20 uppercase tracking-widest text-xs"
           >
             {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
             {saving ? "Saving..." : "Save Design"}
           </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 items-start">
        {/* Left column: quick component box */}
        <div className="lg:col-span-1 space-y-4">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-4">Add to Last Section</p>
           {[
             { type: "text" as const, label: "Short Answer", icon: Type },
             { type: "numeric" as const, label: "Phone / Numeric Input", icon: Hash },
             { type: "select" as const, label: "Dropdown Menu", icon: List },
             { type: "multiselect" as const, label: "Multiple Selection", icon: ListTodo },
             { type: "checkbox" as const, label: "Toggle / Check", icon: CheckSquare },
             { type: "partner_card" as const, label: "Partner Card", icon: Users },
           ].map((tool) => (
             <motion.button 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               key={tool.type}
               onClick={() => addFieldToLastSection(tool.type)}
               className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 hover:border-yellow-400 hover:shadow-xl transition-all group dark:bg-[#0f172a] dark:border-slate-800"
             >
                <div className="p-3 bg-slate-50 text-[#0f172a] rounded-xl group-hover:bg-yellow-400 group-hover:text-black transition-colors dark:bg-slate-800 dark:text-white">
                   <tool.icon size={18} />
                </div>
                <span className="font-bold text-slate-600 text-sm dark:text-slate-350">{tool.label}</span>
             </motion.button>
           ))}
        </div>

        {/* Right column: sections scroll container */}
        <div className="lg:col-span-3">
          <div className="bg-slate-50/50 border border-slate-150 rounded-[3rem] p-8 min-h-[550px] max-h-[750px] overflow-y-auto pr-4 space-y-8 dark:bg-slate-900/10 dark:border-slate-800">
             <AnimatePresence mode="popLayout">
               {sections.length === 0 ? (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.9 }}
                   key="empty"
                   className="h-full flex flex-col items-center justify-center text-center py-24"
                 >
                    <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-sm border border-slate-100 mb-6 dark:bg-[#0f172a] dark:border-slate-800">
                       <Sparkles className="text-slate-200" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-[#0f172a] dark:text-white">Canvas is Empty</h3>
                    <p className="text-slate-400 max-w-xs mx-auto mt-2">Create a section or select a component to start designing your custom registration form.</p>
                 </motion.div>
               ) : (
                 <motion.div layout className="space-y-8">
                   {sections.map((section, secIdx) => (
                     <motion.div
                       layout
                       initial={{ opacity: 0, y: 15 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.98 }}
                       key={section.id}
                       className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6 dark:bg-[#0f172a] dark:border-slate-800"
                     >
                       {/* Section header bar */}
                       <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                         <div className="flex items-center gap-3 flex-1">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Section {secIdx + 1}:</span>
                           <input 
                             type="text"
                             value={section.title}
                             onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                             className="px-4 py-2 rounded-xl bg-slate-50 border-none outline-none font-bold text-sm text-[#0f172a] focus:ring-2 focus:ring-yellow-400 dark:bg-slate-800 dark:text-white"
                           />
                         </div>
                         <div className="flex items-center gap-1.5">
                           <button 
                             onClick={() => moveSectionOrder(secIdx, "up")}
                             disabled={secIdx === 0}
                             className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 disabled:opacity-30 dark:hover:bg-slate-800"
                             title="Move section up"
                           >
                             <ArrowUp size={14} />
                           </button>
                           <button 
                             onClick={() => moveSectionOrder(secIdx, "down")}
                             disabled={secIdx === sections.length - 1}
                             className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 disabled:opacity-30 dark:hover:bg-slate-800"
                             title="Move section down"
                           >
                             <ArrowDown size={14} />
                           </button>
                           <button 
                             onClick={() => removeSection(section.id)}
                             className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                             title="Delete section"
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                       </div>

                       {/* Fields within section */}
                       <div className="space-y-5">
                         {section.fields.map((field, fieldIdx) => (
                           <div key={field.id} className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4 dark:bg-slate-800/20 dark:border-slate-800/50">
                             <div className="flex items-start justify-between gap-4">
                               <div className="flex-1 space-y-4">
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   <div className="md:col-span-2 space-y-1.5">
                                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Field Label / Question Text</label>
                                     <RichTextEditor 
                                       value={field.label || ""}
                                       onChange={(val) => updateField(section.id, field.id, { label: val })}
                                       placeholder="Question text..."
                                       minHeight="55px"
                                       toolbarMode="on-focus"
                                       variant="simple"
                                     />
                                   </div>
                                    <div className="space-y-1.5 relative">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                      <div className="relative">
                                        <select
                                          value={field.type}
                                          disabled={["field_first_name", "field_last_name", "field_email", "field_company"].includes(field.id) || ["first_name", "last_name", "email", "company"].includes((field as any).key)}
                                          onChange={(e) => {
                                            const newType = e.target.value as any;
                                            updateField(section.id, field.id, { 
                                              type: newType,
                                              options: (newType === "select" || newType === "multiselect") ? (field.options || ["Option 1", "Option 2"]) : undefined
                                            });
                                          }}
                                          className="w-full px-4 py-3 bg-white rounded-xl border border-slate-150 font-bold text-[#0f172a] text-[10px] uppercase tracking-widest outline-none appearance-none cursor-pointer pr-10 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/5 dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                        >
                                          <option value="text">Text Field</option>
                                          <option value="numeric">Number Field</option>
                                          <option value="email">Email Field</option>
                                          <option value="select">Select Dropdown</option>
                                          <option value="multiselect">Multiple Selection</option>
                                          <option value="checkbox">Checkbox</option>
                                          <option value="partner_card">Partner Card</option>
                                          <option value="section_header">Section Header</option>
                                        </select>
                                        {!["field_first_name", "field_last_name", "field_email", "field_company"].includes(field.id) && (
                                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronDown size={14} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <div className="space-y-1.5">
                                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Field Description / Help Text (Optional)</label>
                                     <input 
                                       type="text" 
                                       value={field.description || ""}
                                       onChange={(e) => updateField(section.id, field.id, { description: e.target.value })}
                                       placeholder="e.g. Only include requirements based on medical needs."
                                       className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-150 outline-none font-bold text-xs text-[#0f172a] focus:ring-2 focus:ring-yellow-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                     />
                                   </div>
                                   <div className="space-y-1.5">
                                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Attach Reference Image (Optional)</label>
                                     <div 
                                       onDragOver={(e) => { e.preventDefault(); setDragOverFieldId(field.id); }}
                                       onDragLeave={() => setDragOverFieldId(null)}
                                       onDrop={(e) => { e.preventDefault(); setDragOverFieldId(null); if (e.dataTransfer.files?.[0]) handleImageUpload(section.id, field.id, e.dataTransfer.files[0]); }}
                                       className={`relative group h-12 rounded-xl border border-dashed flex items-center justify-between px-4 bg-white cursor-pointer dark:bg-slate-800 dark:border-slate-700 ${
                                         dragOverFieldId === field.id ? "border-yellow-400 bg-yellow-50/10" : "border-slate-200 hover:border-yellow-400"
                                       }`}
                                     >
                                       <input 
                                         type="file" 
                                         accept="image/*" 
                                         onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(section.id, field.id, e.target.files[0]); }}
                                         className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                       />
                                       {field.image_url ? (
                                         <div className="flex items-center justify-between w-full z-20">
                                           <img src={field.image_url} alt="Preview" className="h-8 w-12 object-contain rounded border border-slate-200" />
                                           <button 
                                             type="button" 
                                             onClick={(e) => { e.stopPropagation(); updateField(section.id, field.id, { image_url: "" }); }}
                                             className="text-red-500 hover:underline text-[8px] uppercase font-black tracking-widest"
                                           >
                                             Remove
                                           </button>
                                         </div>
                                       ) : (
                                         <span className="text-[8px] font-black text-slate-400 uppercase">Drag &amp; drop or click to upload</span>
                                       )}
                                     </div>
                                   </div>
                                 </div>

                                 {/* Option lists for Dropdowns */}
                                 {(field.type === "select" || field.type === "multiselect") && (
                                   <div className="space-y-1.5 pt-2">
                                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Options (Comma separated)</label>
                                     <input 
                                       type="text" 
                                       value={field.options?.join(", ")}
                                       onChange={(e) => updateField(section.id, field.id, { options: e.target.value.split(",").map(s => s.trim()) })}
                                       placeholder="Option 1, Option 2, Option 3"
                                       className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-150 outline-none font-bold text-xs text-[#0f172a] focus:ring-2 focus:ring-yellow-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                     />
                                   </div>
                                 )}

                                 {/* Conditional logic configuration */}
                                 {(() => {
                                   const preceding = getPrecedingFields(field.id);
                                   if (preceding.length === 0) return null;

                                   return (
                                     <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                       <label className="flex items-center gap-3 cursor-pointer group">
                                         <input 
                                           type="checkbox" 
                                           checked={!!field.dependsOn}
                                           onChange={(e) => {
                                             if (e.target.checked) {
                                               const parent = preceding[0];
                                               const defaultValue = parent.type === "checkbox" ? "true" : (parent.options?.[0] || "");
                                               updateField(section.id, field.id, { 
                                                 dependsOn: { fieldId: parent.id, value: defaultValue } 
                                               });
                                             } else {
                                               updateField(section.id, field.id, { dependsOn: undefined });
                                             }
                                           }}
                                           className="w-4 h-4 rounded border-slate-350 text-yellow-400 focus:ring-yellow-400" 
                                         />
                                         <span className="text-[8px] font-black text-slate-450 uppercase tracking-wider">Show conditionally based on another answer</span>
                                       </label>

                                       {field.dependsOn && (
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-150 dark:bg-slate-800">
                                           <div className="space-y-1">
                                             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Question</label>
                                             <select 
                                               value={field.dependsOn.fieldId}
                                               onChange={(e) => {
                                                 const parent = preceding.find(p => p.id === e.target.value);
                                                 if (parent) {
                                                   const defaultValue = parent.type === "checkbox" ? "true" : (parent.options?.[0] || "");
                                                   updateField(section.id, field.id, {
                                                     dependsOn: { fieldId: parent.id, value: defaultValue }
                                                   });
                                                 }
                                               }}
                                               className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-150 outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-700 dark:text-white"
                                             >
                                               {preceding.map(p => (
                                                 <option key={p.id} value={p.id}>{p.label}</option>
                                               ))}
                                             </select>
                                           </div>
                                           <div className="space-y-1">
                                             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Trigger Value</label>
                                             {(() => {
                                               const parent = preceding.find(p => p.id === field.dependsOn?.fieldId);
                                               if (!parent || !field.dependsOn) return null;
                                               
                                               if (parent.type === "checkbox") {
                                                 return (
                                                   <select 
                                                     value={field.dependsOn.value}
                                                     onChange={(e) => updateField(section.id, field.id, {
                                                       dependsOn: { ...field.dependsOn!, value: e.target.value }
                                                     })}
                                                     className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-150 outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-700 dark:text-white"
                                                   >
                                                     <option value="true">Checked (Yes)</option>
                                                     <option value="false">Unchecked (No)</option>
                                                   </select>
                                                 );
                                               } else {
                                                 return (
                                                   <select 
                                                     value={field.dependsOn.value}
                                                     onChange={(e) => updateField(section.id, field.id, {
                                                       dependsOn: { ...field.dependsOn!, value: e.target.value }
                                                     })}
                                                     className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-150 outline-none font-bold text-xs text-[#0f172a] dark:bg-slate-700 dark:text-white"
                                                   >
                                                     {parent.options?.map(opt => (
                                                       <option key={opt} value={opt}>{opt}</option>
                                                     ))}
                                                   </select>
                                                 );
                                               }
                                             })()}
                                           </div>
                                         </div>
                                       )}
                                     </div>
                                   );
                                 })()}

                                 {/* Field behaviors flags */}
                                 <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800">
                                   <label className="flex items-center gap-2 cursor-pointer">
                                     <input 
                                       type="checkbox" 
                                       checked={field.required}
                                       onChange={(e) => updateField(section.id, field.id, { required: e.target.checked })}
                                       className="w-4 h-4 rounded text-yellow-400 focus:ring-yellow-400" 
                                     />
                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Required</span>
                                   </label>
                                   <label className="flex items-center gap-2 cursor-pointer">
                                     <input 
                                       type="checkbox" 
                                       checked={!!field.inactive}
                                       onChange={(e) => updateField(section.id, field.id, { inactive: e.target.checked })}
                                       className="w-4 h-4 rounded text-yellow-400 focus:ring-yellow-400" 
                                     />
                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hide from Form</span>
                                   </label>
                                   <label className="flex items-center gap-2 cursor-pointer">
                                     <input 
                                       type="checkbox" 
                                       checked={!!field.showBeforeAttendance}
                                       onChange={(e) => updateField(section.id, field.id, { showBeforeAttendance: e.target.checked })}
                                       className="w-4 h-4 rounded text-yellow-400 focus:ring-yellow-400" 
                                     />
                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Show before status</span>
                                   </label>
                                 </div>
                               </div>

                               {/* Field actions */}
                               <div className="flex flex-col items-center gap-1 text-slate-350">
                                 <button 
                                   onClick={() => moveFieldOrder(section.id, fieldIdx, "up")}
                                   disabled={fieldIdx === 0}
                                   className="p-1.5 hover:bg-white rounded-lg disabled:opacity-20 dark:hover:bg-slate-800"
                                 >
                                   <ArrowUp size={13} />
                                 </button>
                                 <button 
                                   onClick={() => moveFieldOrder(section.id, fieldIdx, "down")}
                                   disabled={fieldIdx === section.fields.length - 1}
                                   className="p-1.5 hover:bg-white rounded-lg disabled:opacity-20 dark:hover:bg-slate-800"
                                 >
                                   <ArrowDown size={13} />
                                 </button>
                                 <button 
                                   onClick={() => removeField(section.id, field.id)}
                                   className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg dark:hover:bg-red-950/20 mt-1"
                                 >
                                   <Trash2 size={13} />
                                 </button>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>

                       {/* Inline field addition block */}
                       <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-2xl dark:bg-slate-850">
                         <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest ml-1">
                           + Add Question to this Section
                         </span>
                         <div className="flex flex-wrap gap-1.5">
                           {[
                             { type: "text" as const, label: "Text" },
                             { type: "numeric" as const, label: "Numeric" },
                             { type: "select" as const, label: "Dropdown" },
                             { type: "multiselect" as const, label: "Multi-Select" },
                             { type: "checkbox" as const, label: "Toggle" },
                             { type: "partner_card" as const, label: "Partner" },
                           ].map((item) => (
                             <button
                               key={item.type}
                               onClick={() => addField(section.id, item.type)}
                               className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-yellow-400 text-[9px] font-black uppercase tracking-wider transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:border-yellow-400 dark:text-white"
                             >
                               {item.label}
                             </button>
                           ))}
                         </div>
                       </div>
                     </motion.div>
                   ))}
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
