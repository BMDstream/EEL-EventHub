"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Type, List, CheckSquare, Save, Loader2, Sparkles, ArrowUp, ArrowDown, Users, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

interface FormField {
  id: string;
  label: string;
  type: "text" | "select" | "checkbox" | "partner_card" | "numeric";
  required: boolean;
  options?: string[]; // For select type
  dependsOn?: {
    fieldId: string;
    value: string;
  };
  description?: string;
  image_url?: string;
  inactive?: boolean;
}

export default function FormBuilder({ eventId, initialSchema, onSave }: { eventId: string, initialSchema: FormField[], onSave: (schema: FormField[]) => void }) {
  const { data: session } = useSession();
  const [fields, setFields] = useState<FormField[]>(initialSchema || []);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragAllowed, setDragAllowed] = useState(false);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const reorderedFields = [...fields];
    const [draggedItem] = reorderedFields.splice(draggedIndex, 1);
    reorderedFields.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setFields(reorderedFields);
  };

  const handleDragEnd = () => {
    // Validate dependencies: if a parent is now placed after a child, remove the child's dependency
    const validatedFields = fields.map((field, idx) => {
      if (field.dependsOn) {
        const precedingIds = fields.slice(0, idx).map(f => f.id);
        if (!precedingIds.includes(field.dependsOn.fieldId)) {
          const { dependsOn, ...rest } = field;
          return rest;
        }
      }
      return field;
    });
    setFields(validatedFields);
    setDraggedIndex(null);
    setDragAllowed(false);
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    const reorderedFields = [...fields];
    const [item] = reorderedFields.splice(index, 1);
    reorderedFields.splice(newIndex, 0, item);
    
    // Validate dependencies
    const validatedFields = reorderedFields.map((field, idx) => {
      if (field.dependsOn) {
        const precedingIds = reorderedFields.slice(0, idx).map(f => f.id);
        if (!precedingIds.includes(field.dependsOn.fieldId)) {
          const { dependsOn, ...rest } = field;
          return rest;
        }
      }
      return field;
    });
    
    setFields(validatedFields);
  };

  const addField = (type: "text" | "select" | "checkbox" | "partner_card" | "numeric") => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: type === "partner_card" ? "Partner Details" : "New Question",
      type,
      required: type === "partner_card" ? true : false,
      options: type === "select" ? ["Option 1", "Option 2"] : undefined
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    // Filter out the field and clean up any field dependencies pointing to it
    setFields(fields.filter(f => f.id !== id).map(f => {
      if (f.dependsOn?.fieldId === id) {
        const { dependsOn, ...rest } = f;
        return rest;
      }
      return f;
    }));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/py/events/${eventId}/form-schema`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({ custom_fields_schema: fields })
      });
      if (res.ok) {
        onSave(fields);
        alert("Form schema saved successfully!");
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to save form schema: ${errorData.detail || "Server error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div>
           <h2 className="text-3xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">Form <span className="text-slate-300">Studio</span></h2>
           <p className="text-slate-500 font-medium">Design the data capture experience for this event.</p>
        </div>
        <div className="flex gap-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Toolbox */}
        <div className="lg:col-span-1 space-y-4">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-4">Add Components</p>
           {[
             { type: "text" as const, label: "Short Answer", icon: Type },
             { type: "numeric" as const, label: "Phone / Numeric Input", icon: Hash },
             { type: "select" as const, label: "Dropdown Menu", icon: List },
             { type: "checkbox" as const, label: "Toggle / Check", icon: CheckSquare },
             { type: "partner_card" as const, label: "Partner Card", icon: Users },
           ].map((tool) => (
             <motion.button 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               key={tool.type}
               onClick={() => addField(tool.type)}
               className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 hover:border-yellow-400 hover:shadow-xl transition-all group"
             >
                <div className="p-3 bg-slate-50 text-[#0f172a] rounded-xl group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                   <tool.icon size={18} />
                </div>
                <span className="font-bold text-slate-600 text-sm">{tool.label}</span>
             </motion.button>
           ))}
        </div>

        {/* Builder Canvas */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] p-10 min-h-[500px]">
              <AnimatePresence mode="popLayout">
                {fields.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key="empty"
                    className="h-full flex flex-col items-center justify-center text-center py-20"
                  >
                     <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-sm border border-slate-100 mb-6">
                        <Sparkles className="text-slate-200" size={32} />
                     </div>
                     <h3 className="text-xl font-bold text-[#0f172a]">Your canvas is empty</h3>
                     <p className="text-slate-400 max-w-xs mx-auto mt-2">Select a component from the left to start building your custom registration form.</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    layout
                    className="space-y-6"
                  >
                      {fields.map((field, index) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={field.id} 
                          draggable={dragAllowed}
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex gap-6 transition-all duration-200 ${
                            draggedIndex === index ? "opacity-40 border-yellow-400 border-2" : ""
                          }`}
                        >
                           <div 
                             onMouseEnter={() => setDragAllowed(true)}
                             onMouseLeave={() => setDragAllowed(false)}
                             className="flex flex-col items-center gap-1 text-slate-200 select-none"
                           >
                              <div className="cursor-grab active:cursor-grabbing p-1 hover:text-[#0f172a] transition-colors">
                                 <GripVertical size={20} />
                              </div>
                              <button 
                                type="button" 
                                disabled={index === 0}
                                onClick={() => moveField(index, "up")}
                                className="text-slate-300 hover:text-[#0f172a] disabled:text-slate-100 disabled:hover:text-slate-100 transition-colors p-1"
                                title="Move Up"
                              >
                                 <ArrowUp size={14} />
                              </button>
                              <button 
                                type="button" 
                                disabled={index === fields.length - 1}
                                onClick={() => moveField(index, "down")}
                                className="text-slate-300 hover:text-[#0f172a] disabled:text-slate-100 disabled:hover:text-slate-100 transition-colors p-1"
                                title="Move Down"
                              >
                                 <ArrowDown size={14} />
                              </button>
                           </div>
                          <div className="flex-1 space-y-6">
                             <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 space-y-2">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Field Label / Question</label>
                                   <input 
                                     type="text" 
                                     value={field.label}
                                     onChange={(e) => updateField(field.id, { label: e.target.value })}
                                     className="w-full px-6 py-4 bg-slate-50 rounded-xl border-none outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400"
                                   />
                                </div>
                                <div className="w-full md:w-48 space-y-2">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                   <div className="px-6 py-4 bg-slate-50 rounded-xl font-bold text-slate-400 text-xs uppercase tracking-widest flex items-center gap-2">
                                      {field.type === "text" && <Type size={14} />}
                                      {field.type === "numeric" && <Hash size={14} />}
                                      {field.type === "select" && <List size={14} />}
                                      {field.type === "checkbox" && <CheckSquare size={14} />}
                                      {field.type === "partner_card" && <Users size={14} />}
                                      {field.type === "partner_card" ? "Partner Card" : field.type === "numeric" ? "Phone / Numeric" : field.type}
                                   </div>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Field Description / Help Text (Optional)</label>
                                  <input 
                                    type="text" 
                                    value={field.description || ""}
                                    onChange={(e) => updateField(field.id, { description: e.target.value })}
                                    placeholder="e.g. Only include requirements based on medical, religious, or ethical needs."
                                    className="w-full px-6 py-4 bg-slate-50 rounded-xl border-none outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400"
                                  />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Attach Reference Image (Optional)</label>
                                  <input 
                                    type="text" 
                                    value={field.image_url || ""}
                                    onChange={(e) => updateField(field.id, { image_url: e.target.value })}
                                    placeholder="e.g. https://.../image.png"
                                    className="w-full px-6 py-4 bg-slate-50 rounded-xl border-none outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400"
                                  />
                               </div>
                             </div>

                             {field.type === "partner_card" && (
                                <div className="space-y-4 pt-4 border-t border-slate-50 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Partner Card Fields Preview</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input disabled type="text" placeholder="Partner First Name" className="w-full px-6 py-4 bg-white rounded-xl border border-slate-200 text-slate-400 font-bold opacity-60" />
                                    <input disabled type="text" placeholder="Partner Last Name" className="w-full px-6 py-4 bg-white rounded-xl border border-slate-200 text-slate-400 font-bold opacity-60" />
                                  </div>
                                  <input disabled type="text" placeholder="Partner Email Address" className="w-full px-6 py-4 bg-white rounded-xl border border-slate-200 text-slate-400 font-bold opacity-60" />
                                  <p className="text-[10px] italic text-slate-400">Note: Frontend validation will enforce that the partner's email domain matches the registrant's email domain.</p>
                                </div>
                              )}

                             {field.type === "select" && (
                               <div className="space-y-4 pt-4 border-t border-slate-50">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dropdown Options (Comma separated)</label>
                                  <input 
                                    type="text" 
                                    value={field.options?.join(", ")}
                                    onChange={(e) => updateField(field.id, { options: e.target.value.split(",").map(s => s.trim()) })}
                                    placeholder="Option 1, Option 2, Option 3"
                                    className="w-full px-6 py-4 bg-slate-50 rounded-xl border-none outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400"
                                  />
                               </div>
                             )}

                             {(() => {
                                const precedingFields = fields.slice(0, index).filter(
                                  f => f.type === "select" || f.type === "checkbox"
                                );
                                if (precedingFields.length === 0) return null;

                                return (
                                  <div className="space-y-4 pt-4 border-t border-slate-50">
                                     <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                           <input 
                                             type="checkbox" 
                                             checked={!!field.dependsOn}
                                             onChange={(e) => {
                                               if (e.target.checked) {
                                                 const parent = precedingFields[0];
                                                 const defaultValue = parent.type === "checkbox" ? "true" : (parent.options?.[0] || "");
                                                 updateField(field.id, { 
                                                   dependsOn: { fieldId: parent.id, value: defaultValue } 
                                                 });
                                               } else {
                                                 updateField(field.id, { dependsOn: undefined });
                                               }
                                             }}
                                             className="w-5 h-5 rounded-lg border-2 border-slate-200 checked:bg-yellow-400 checked:border-yellow-400 transition-all outline-none" 
                                           />
                                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-[#0f172a] transition-colors">Show conditionally based on another answer</span>
                                        </label>
                                     </div>

                                     {field.dependsOn && (
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                                          <div className="space-y-2">
                                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Question</label>
                                             <select 
                                               value={field.dependsOn.fieldId}
                                               onChange={(e) => {
                                                 const parent = precedingFields.find(p => p.id === e.target.value);
                                                 if (parent) {
                                                   const defaultValue = parent.type === "checkbox" ? "true" : (parent.options?.[0] || "");
                                                   updateField(field.id, {
                                                     dependsOn: { fieldId: parent.id, value: defaultValue }
                                                   });
                                                 }
                                               }}
                                               className="w-full px-6 py-4 bg-white rounded-xl border border-slate-100 outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400"
                                             >
                                               {precedingFields.map(p => (
                                                 <option key={p.id} value={p.id}>{p.label}</option>
                                               ))}
                                             </select>
                                          </div>

                                          <div className="space-y-2">
                                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trigger Value</label>
                                             {(() => {
                                               const parent = precedingFields.find(p => p.id === field.dependsOn?.fieldId);
                                               if (!parent || !field.dependsOn) return null;
                                               
                                               if (parent.type === "checkbox") {
                                                 return (
                                                   <select 
                                                     value={field.dependsOn.value}
                                                     onChange={(e) => updateField(field.id, {
                                                       dependsOn: { ...field.dependsOn!, value: e.target.value }
                                                     })}
                                                     className="w-full px-6 py-4 bg-white rounded-xl border border-slate-100 outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400"
                                                   >
                                                     <option value="true">Checked (Yes)</option>
                                                     <option value="false">Unchecked (No)</option>
                                                   </select>
                                                 );
                                               } else {
                                                 return (
                                                   <select 
                                                     value={field.dependsOn.value}
                                                     onChange={(e) => updateField(field.id, {
                                                       dependsOn: { ...field.dependsOn!, value: e.target.value }
                                                     })}
                                                     className="w-full px-6 py-4 bg-white rounded-xl border border-slate-100 outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-yellow-400"
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

                             <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-8">
                                   <label className="flex items-center gap-3 cursor-pointer group">
                                      <input 
                                        type="checkbox" 
                                        checked={field.required}
                                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                        className="w-5 h-5 rounded-lg border-2 border-slate-200 checked:bg-yellow-400 checked:border-yellow-400 transition-all outline-none" 
                                      />
                                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-[#0f172a] transition-colors">Required Field</span>
                                   </label>
                                   <label className="flex items-center gap-3 cursor-pointer group">
                                      <input 
                                        type="checkbox" 
                                        checked={!!field.inactive}
                                        onChange={(e) => updateField(field.id, { inactive: e.target.checked })}
                                        className="w-5 h-5 rounded-lg border-2 border-slate-200 checked:bg-yellow-400 checked:border-yellow-400 transition-all outline-none" 
                                      />
                                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-[#0f172a] transition-colors">Hide from Form (Keep Answers)</span>
                                   </label>
                                </div>
                                <button 
                                  onClick={() => removeField(field.id)}
                                  className="text-slate-300 hover:text-red-500 transition-all p-2"
                                >
                                   <Trash2 size={20} />
                                </button>
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
