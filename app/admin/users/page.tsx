"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Shield, Mail, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/py/users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/py/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, role: newRole }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewEmail("");
        fetchUsers();
      } else {
        alert("Failed to add user. They might already exist.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to remove this user's access?")) return;
    try {
      await fetch(`/api/py/users/${userId}`, { method: "DELETE" });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-outfit p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <Link href="/admin" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-[#1e293b] transition-colors mb-2 block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-black text-[#0f172a] tracking-tighter font-bricolage italic">TEAM <span className="text-slate-400">MANAGEMENT</span></h1>
            <p className="text-[#64748b] font-medium text-sm">Orchestrate permissions and access levels for Excellence Entertainment Logistics.</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 bg-[#0f172a] hover:bg-black text-white px-8 py-4 rounded-2xl font-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs"
          >
            <Plus size={18} />
            Invite Member
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-[#0f172a]" size={48} />
            </div>
          ) : users.length === 0 ? (
            <div className="p-20 text-center">
               <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Users className="text-slate-300" size={40} />
               </div>
               <h3 className="text-xl font-bold text-[#0f172a]">No team members yet</h3>
               <p className="text-slate-400 mt-2">Invite your first staff member to help manage events.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User Details</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Security Role</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#0f172a] rounded-xl flex items-center justify-center text-white font-bold text-xs uppercase">
                          {user.email.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-[#0f172a]">{user.email}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Internal Member</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">
                        <Shield size={12} />
                        {user.role}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-green-600 text-[10px] font-black uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        Active
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-12 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-[#0f172a]"></div>
              <h2 className="text-3xl font-black text-[#0f172a] mb-2 font-bricolage italic uppercase tracking-tight">Invite Member</h2>
              <p className="text-slate-500 font-medium mb-10">Assign security clearance for EEL-EventHub.</p>
              
              <form onSubmit={handleAddUser} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="teammate@excellence.com"
                      className="w-full pl-14 pr-6 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#0f172a] focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold text-[#0f172a]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Access Level</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-6 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#0f172a] outline-none transition-all font-bold text-[#0f172a] appearance-none"
                  >
                    <option value="admin">Administrator (Full Access)</option>
                    <option value="manager">Event Manager (Editor)</option>
                    <option value="staff">Staff (Viewer)</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-8 py-5 rounded-2xl font-black text-slate-400 hover:text-[#0f172a] transition-colors uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving}
                    type="submit"
                    className="flex-1 bg-[#0f172a] hover:bg-black text-white px-8 py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    {saving ? "Inviting..." : "Confirm"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
