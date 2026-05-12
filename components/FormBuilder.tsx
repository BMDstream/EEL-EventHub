"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Type, List, CheckSquare, Save, Loader2, Sparkles } from "lucide-react";

interface FormField {
  id: string;
  label: string;
  type: "text" | "select" | "checkbox";
  required: boolean;
  options?: string[]; // For select type
}

export default function FormBuilder({ eventId, initialSchema, onSave }: { eventId: string, initialSchema: FormField[], onSave: (schema: FormField[]) => void }) {
  const [fields, setFields] = useState<FormField[]>(initialSchema || []);
  const [saving, setSaving] = useState(false);

  const addField = (type: "text" | "select" | "checkbox") => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: "New Question",
      type,
      required: false,
      options: type === "select" ? ["Option 1", "Option 2"] : undefined
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/py/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_fields_schema: fields })
      });
      if (res.ok) {
        onSave(fields);
        alert("Form schema saved successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Toolbox */}
        <div className="lg:col-span-1 space-y-4">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-4">Add Components</p>
           <button 
             onClick={() => addField("text")}
             className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 hover:border-yellow-400 hover:shadow-xl transition-all group"
           >
              <div className="p-3 bg-slate-50 text-[#0f172a] rounded-xl group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                 <Type size={18} />
              </div>
              <span className="font-bold text-slate-600 text-sm">Short Answer</span>
           </button>
           <button 
             onClick={() => addField("select")}
             className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 hover:border-yellow-400 hover:shadow-xl transition-all group"
           >
              <div className="p-3 bg-slate-50 text-[#0f172a] rounded-xl group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                 <List size={18} />
              </div>
              <span className="font-bold text-slate-600 text-sm">Dropdown Menu</span>
           </button>
           <button 
             onClick={() => addField("checkbox")}
             className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 hover:border-yellow-400 hover:shadow-xl transition-all group"
           >
              <div className="p-3 bg-slate-50 text-[#0f172a] rounded-xl group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                 <CheckSquare size={18} />
              </div>
              <span className="font-bold text-slate-600 text-sm">Toggle / Check</span>
           </button>
        </div>

        {/* Builder Canvas */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] p-10 min-h-[500px]">
              {fields.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                   <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-sm border border-slate-100 mb-6">
                      <Sparkles className="text-slate-200" size={32} />
                   </div>
                   <h3 className="text-xl font-bold text-[#0f172a]">Your canvas is empty</h3>
                   <p className="text-slate-400 max-w-xs mx-auto mt-2">Select a component from the left to start building your custom registration form.</p>
                </div>
              ) : (
                <div className="space-y-6">
                   {fields.map((field, index) => (
                     <div key={field.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex gap-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="pt-2 text-slate-200 cursor-grab">
                           <GripVertical size={20} />
                        </div>
                        <div className="flex-1 space-y-6">
                           <div className="flex flex-col md:flex-row gap-6">
                              <div className="flex-1 space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Field Label</label>
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
                                    {field.type === "select" && <List size={14} />}
                                    {field.type === "checkbox" && <CheckSquare size={14} />}
                                    {field.type}
                                 </div>
                              </div>
                           </div>

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

                           <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                              <label className="flex items-center gap-3 cursor-pointer group">
                                 <input 
                                   type="checkbox" 
                                   checked={field.required}
                                   onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                   className="w-5 h-5 rounded-lg border-2 border-slate-200 checked:bg-yellow-400 checked:border-yellow-400 transition-all outline-none" 
                                 />
                                 <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-[#0f172a] transition-colors">Required Field</span>
                              </label>
                              <button 
                                onClick={() => removeField(field.id)}
                                className="text-slate-300 hover:text-red-500 transition-all p-2"
                              >
                                 <Trash2 size={20} />
                              </button>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
