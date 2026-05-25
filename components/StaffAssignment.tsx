"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Save, Users, CheckCircle2, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface StaffMember {
  id: number;
  email: string;
  role: string;
  assigned: boolean;
}

export default function StaffAssignment({ eventId, clientId }: { eventId: string; clientId?: number }) {
  const { data: session } = useSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!session?.user?.email) return;

    fetch(`/api/py/events/${eventId}/staff`, {
      headers: { "x-user-email": session.user.email }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch staff members");
        return res.json();
      })
      .then((data) => {
        setStaff(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMessage({ type: "error", text: "Could not load staff list." });
        setLoading(false);
      });
  }, [eventId, session]);

  const handleToggle = (id: number) => {
    setStaff((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, assigned: !member.assigned } : member
      )
    );
  };

  const handleSave = async () => {
    if (!session?.user?.email) return;
    setSaving(true);
    setMessage(null);

    const assignedIds = staff.filter((m) => m.assigned).map((m) => m.id);

    try {
      const res = await fetch(`/api/py/events/${eventId}/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": session.user.email
        },
        body: JSON.stringify({ user_ids: assignedIds })
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Staff assignments saved successfully!" });
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: errData.detail || "Failed to save assignments." });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-yellow-400" size={40} />
        <p className="text-slate-400 font-medium mt-4">Retrieving client staff list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div>
          <h2 className="text-3xl font-black text-[#0f172a] font-bricolage italic uppercase tracking-tight">
            Staff <span className="text-slate-300">Assignment</span>
          </h2>
          <p className="text-slate-500 font-medium">Assign specific staff members to orchestrate and scan this event.</p>
        </div>
        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-3 bg-yellow-400 hover:bg-yellow-500 text-black px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-yellow-400/20 uppercase tracking-widest text-xs"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? "Saving..." : "Save Assignments"}
          </button>
        </div>
      </motion.div>

      {message && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-5 rounded-2xl border font-bold text-sm ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </motion.div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        {staff.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Users className="text-slate-300" size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#0f172a]">No staff members available</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">
              Add users under Team Management and link them to this client space to assign them to events.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {staff.map((member) => (
              <div
                key={member.id}
                onClick={() => handleToggle(member.id)}
                className="flex items-center justify-between p-6 hover:bg-slate-50/50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                    {member.email.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[#0f172a] text-base">{member.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield size={12} className="text-slate-400" />
                      <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400">
                        {member.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      member.assigned
                        ? "bg-yellow-400 border-yellow-400 text-black"
                        : "border-slate-200 group-hover:border-slate-300"
                    }`}
                  >
                    {member.assigned && <CheckCircle2 size={16} className="text-black font-bold" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
