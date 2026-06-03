"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Shield, Mail, Trash2, Loader2, CheckCircle2, Lock, Building2, X, Key, Upload, Download } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  clients?: Array<{ id: number; name: string; slug: string }>;
}

export default function UserManagementPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "staff";
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [saving, setSaving] = useState(false);

  // Client Assignment States
  const [allClients, setAllClients] = useState<any[]>([]);
  const [selectedUserForClientModal, setSelectedUserForClientModal] = useState<User | null>(null);
  const [modalClientIds, setModalClientIds] = useState<number[]>([]);
  const [modalClientRoles, setModalClientRoles] = useState<Record<number, string>>({});
  const [syncingClients, setSyncingClients] = useState(false);

  // Bulk Upload States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<any[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Password Update States
  const [selectedUserForPasswordModal, setSelectedUserForPasswordModal] = useState<User | null>(null);
  const [changePasswordVal, setChangePasswordVal] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (userRole === "admin") {
      fetchUsers();
      fetchClients();
    }
  }, [userRole]);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/py/clients", {
        headers: {
          "x-user-email": session?.user?.email || ""
        }
      });
      const data = res.ok ? await res.json() : [];
      setAllClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch clients", err);
    }
  };

  if (userRole !== "admin") {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
            <Lock className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-[#0f172a] mb-4 uppercase italic font-bricolage tracking-tight">Access <span className="text-red-500">Restricted</span></h1>
          <p className="text-slate-500 font-medium max-w-md">You do not have the clearance level required to manage team members. Please contact a system administrator.</p>
        </div>
      </AdminLayout>
    );
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/py/users", {
        headers: {
          "x-user-email": session?.user?.email || ""
        }
      });
      const data = res.ok ? await res.json() : [];
      setUsers(Array.isArray(data) ? data : []);
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
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({ 
          email: newEmail, 
          password: newPassword,
          role: newRole 
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewEmail("");
        setNewPassword("");
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
      await fetch(`/api/py/users/${userId}`, { 
        method: "DELETE",
        headers: { "x-user-email": session?.user?.email || "" }
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    
    if (userToUpdate.email.toLowerCase() === session?.user?.email?.toLowerCase()) {
      alert("You cannot change your own role to prevent administrative lockout.");
      return;
    }

    // Optimistically update local state
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    
    try {
      const res = await fetch(`/api/py/users/${userId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({ 
          email: userToUpdate.email,
          role: newRole,
          is_active: userToUpdate.is_active
        }),
      });
      if (!res.ok) {
        // Revert on error
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: userToUpdate.role } : u));
        alert("Failed to update user role.");
      }
    } catch (err) {
      console.error(err);
      // Revert on error
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: userToUpdate.role } : u));
      alert("Failed to update user role.");
    }
  };

  const downloadExcelTemplate = () => {
    import("xlsx").then((XLSX) => {
      const data = [
        { email: "admin.user@bmdcomputing.com", password: "securePass123", role: "admin" },
        { email: "manager.user@eelogistics.co.za", password: "managerPass456", role: "manager" },
        { email: "staff.user@eelogistics.co.za", password: "staffPass789", role: "staff" }
      ];
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Teammates Import Template");
      worksheet["!cols"] = [
        { wch: 35 },
        { wch: 15 },
        { wch: 10 }
      ];
      XLSX.writeFile(workbook, "bmd_users_import_template.xlsx");
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

          const parsed = jsonData.map((row: any) => {
            const email = row.email || row.Email || row.EMAIL || "";
            const password = row.password || row.Password || row.PASSWORD || "";
            const role = row.role || row.Role || row.ROLE || "staff";
            
            return {
              email: email.toString().trim(),
              password: password.toString().trim(),
              role: role.toString().trim().toLowerCase()
            };
          }).filter(u => u.email !== "");

          if (parsed.length === 0) {
            alert("No valid rows found. Make sure headers are email, password, role.");
            return;
          }

          setParsedUsers(parsed);
        });
      } catch (err) {
        console.error(err);
        alert("Failed to parse file. Make sure it is a valid CSV or Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkImportConfirm = async () => {
    if (!parsedUsers.length) return;
    setBulkSaving(true);
    try {
      const res = await fetch("/api/py/users/bulk", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify(parsedUsers)
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Successfully imported ${result.created.length} users.${result.errors.length ? `\nErrors:\n${result.errors.join('\n')}` : ""}`);
        setShowBulkModal(false);
        setParsedUsers([]);
        fetchUsers();
      } else {
        alert("Failed to import users. Check file permissions or backend response.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading users.");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleOpenClientModal = (user: User) => {
    setSelectedUserForClientModal(user);
    const initialRoles: Record<number, string> = {};
    const initialClientIds: number[] = [];
    user.clients?.forEach(c => {
      initialClientIds.push(c.id);
      initialRoles[c.id] = (c as any).role || "staff";
    });
    setModalClientIds(initialClientIds);
    setModalClientRoles(initialRoles);
  };

  const handleToggleClientCheckbox = (clientId: number) => {
    setModalClientIds(prev => {
      const isChecked = prev.includes(clientId);
      if (isChecked) {
        const nextRoles = { ...modalClientRoles };
        delete nextRoles[clientId];
        setModalClientRoles(nextRoles);
        return prev.filter(id => id !== clientId);
      } else {
        setModalClientRoles(prevRoles => ({ ...prevRoles, [clientId]: "staff" }));
        return [...prev, clientId];
      }
    });
  };

  const handleRoleChange = (clientId: number, role: string) => {
    setModalClientRoles(prev => ({
      ...prev,
      [clientId]: role
    }));
  };

  const handleSaveUserClients = async () => {
    if (!selectedUserForClientModal) return;
    setSyncingClients(true);
    try {
      const clientRolesPayload = modalClientIds.map(id => ({
        client_id: id,
        role: modalClientRoles[id] || "staff"
      }));

      const res = await fetch(`/api/py/users/${selectedUserForClientModal.id}/clients`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({ 
          client_ids: modalClientIds,
          client_roles: clientRolesPayload
        })
      });
      if (res.ok) {
        setSelectedUserForClientModal(null);
        fetchUsers();
      } else {
        alert("Failed to update company access mapping.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingClients(false);
    }
  };

  const handleOpenPasswordModal = (user: User) => {
    setSelectedUserForPasswordModal(user);
    setChangePasswordVal("");
  };

  const handleSavePassword = async () => {
    if (!selectedUserForPasswordModal) return;
    setUpdatingPassword(true);
    try {
      const res = await fetch(`/api/py/users/${selectedUserForPasswordModal.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({ 
          email: selectedUserForPasswordModal.email,
          password: changePasswordVal,
          role: selectedUserForPasswordModal.role,
          is_active: selectedUserForPasswordModal.is_active
        })
      });
      if (res.ok) {
        setSelectedUserForPasswordModal(null);
        alert("Password updated successfully.");
      } else {
        alert("Failed to update password.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto font-outfit">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black text-[#0f172a] tracking-tighter font-bricolage italic uppercase">TEAM <span className="text-slate-300">MANAGEMENT</span></h1>
            <p className="text-slate-500 font-medium text-lg">Manage permissions and access levels for Excellence Entertainment Logistics.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-6 py-4 rounded-2xl font-black transition-all uppercase tracking-widest text-xs shadow-sm"
            >
              <Upload size={18} />
              Bulk Import
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-3 bg-[#0f172a] hover:bg-black text-white px-8 py-4 rounded-2xl font-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs"
            >
              <Plus size={18} />
              Invite Member
            </button>
          </div>
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
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assigned Companies</th>
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
                      {user.email.toLowerCase() === session?.user?.email?.toLowerCase() ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 cursor-not-allowed select-none">
                          <Shield size={12} />
                          {user.role} (You)
                        </div>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer focus:ring-2 focus:ring-slate-100"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                        </select>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      {user.role === "admin" ? (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">All Clients (Admin)</span>
                      ) : user.clients && user.clients.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {user.clients.map(c => (
                            <span key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-md text-[9px] font-bold border border-slate-100 uppercase tracking-wide dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                              {c.name}
                              <span className={`text-[7px] px-1 rounded-sm uppercase tracking-tighter ${c.role === 'manager' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                {c.role === 'manager' ? 'Mgr' : 'Staff'}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest italic">No access assigned</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-green-600 text-[10px] font-black uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        Active
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleOpenPasswordModal(user)}
                        className="p-2 text-slate-300 hover:text-blue-500 transition-colors mr-3"
                        title="Change Password"
                      >
                        <Key size={18} />
                      </button>
                      {user.role !== "admin" && (
                        <button 
                          onClick={() => handleOpenClientModal(user)}
                          className="p-2 text-slate-300 hover:text-yellow-500 transition-colors mr-3"
                          title="Manage Company Access"
                        >
                          <Building2 size={18} />
                        </button>
                      )}
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
              <h2 className="text-3xl font-black text-[#0f172a] mb-2 font-bricolage italic uppercase tracking-tight">Add Member</h2>
              <p className="text-slate-500 font-medium mb-10">Create a new account for BMD-EventHub.</p>
              
              <form onSubmit={handleAddUser} className="space-y-6">
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
                      className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#0f172a] focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold text-[#0f172a]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Password</label>
                  <div className="relative">
                    <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#0f172a] focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold text-[#0f172a]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Access Level</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#0f172a] outline-none transition-all font-bold text-[#0f172a] appearance-none"
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

        {/* Bulk Upload Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full p-12 relative overflow-hidden dark:bg-[#0f172a] dark:border dark:border-slate-800">
              <div className="absolute top-0 left-0 w-full h-2 bg-[#0f172a]"></div>
              <button 
                onClick={() => {
                  setShowBulkModal(false);
                  setParsedUsers([]);
                }}
                className="absolute right-8 top-8 p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>

              <h2 className="text-3xl font-black text-[#0f172a] mb-2 font-bricolage italic uppercase tracking-tight dark:text-white flex items-center gap-3">
                <Upload className="text-[#0f172a] dark:text-white" size={28} />
                Bulk User Import
              </h2>
              <p className="text-slate-500 font-medium mb-6 dark:text-slate-400">
                Upload a CSV or Excel (.xlsx/.xls) file containing teammate login accounts.
              </p>

              <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Required Columns & Format</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  The file must contain headers: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold">email</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold">password</code>, and <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold">role</code> (allowed values: <code className="text-blue-500 font-bold">admin</code>, <code className="text-blue-500 font-bold">manager</code>, <code className="text-blue-500 font-bold">staff</code>).
                </p>
                <button
                  onClick={downloadExcelTemplate}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700"
                >
                  <Download size={14} />
                  Download Excel Template
                </button>
              </div>

              {!parsedUsers.length ? (
                <div className="border-2 border-dashed border-slate-200 hover:border-[#0f172a] rounded-3xl p-12 text-center transition-all cursor-pointer relative bg-slate-50/30 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:border-slate-700 dark:bg-transparent">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-sm font-bold text-[#0f172a] dark:text-white">Choose a file or drag it here</p>
                  <p className="text-xs text-slate-400 mt-1">Supports CSV, XLSX, and XLS formats</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Parsed Accounts ({parsedUsers.length})</span>
                    <button 
                      onClick={() => setParsedUsers([])}
                      className="text-xs font-bold text-red-500 hover:underline uppercase"
                    >
                      Clear File
                    </button>
                  </div>
                  
                  <div className="max-h-[220px] overflow-y-auto pr-2 border border-slate-100 rounded-2xl divide-y divide-slate-100 dark:border-slate-800 dark:divide-slate-800">
                    {parsedUsers.map((u, index) => (
                      <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <div>
                          <p className="font-bold text-sm text-[#0f172a] dark:text-white">{u.email}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pass: {u.password ? "••••••••" : "[Empty]"}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-100' : u.role === 'manager' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkModal(false);
                        setParsedUsers([]);
                      }}
                      className="flex-1 px-8 py-5 rounded-2xl font-black text-slate-400 hover:text-[#0f172a] transition-colors uppercase tracking-widest text-xs dark:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={bulkSaving}
                      onClick={handleBulkImportConfirm}
                      className="flex-1 bg-[#0f172a] hover:bg-black text-white px-8 py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs dark:bg-yellow-400 dark:text-black dark:shadow-none"
                    >
                      {bulkSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                      {bulkSaving ? "Importing..." : "Confirm & Import"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manage Company Access Modal */}
        {selectedUserForClientModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-12 relative overflow-hidden dark:bg-[#0f172a] dark:border dark:border-slate-800">
              <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
              <button 
                onClick={() => setSelectedUserForClientModal(null)}
                className="absolute right-8 top-8 p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>

              <h2 className="text-3xl font-black text-[#0f172a] mb-2 font-bricolage italic uppercase tracking-tight dark:text-white flex items-center gap-3">
                <Building2 className="text-yellow-400" size={28} />
                Access Control
              </h2>
              <p className="text-slate-500 font-medium mb-8 dark:text-slate-400">
                Configure authorized companies for <span className="font-bold text-[#0f172a] dark:text-white">{selectedUserForClientModal.email}</span>.
              </p>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-8">
                {allClients.map((client) => {
                  const isChecked = modalClientIds.includes(client.id);
                  const currentRole = modalClientRoles[client.id] || "staff";
                  return (
                    <div 
                      key={client.id}
                      onClick={() => handleToggleClientCheckbox(client.id)}
                      className={`flex flex-col gap-3 p-5 rounded-2xl border-2 transition-all cursor-pointer ${isChecked ? 'border-yellow-400 bg-yellow-500/5' : 'border-slate-100 hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700 bg-transparent'}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                            {client.logo_url ? (
                              <img src={client.logo_url} alt={client.name} className="w-full h-full object-cover" />
                            ) : (
                              <Building2 size={18} className="text-slate-300 dark:text-slate-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-[#0f172a] text-sm dark:text-white">{client.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">slug: {client.slug}</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="w-5 h-5 rounded-lg border-slate-300 text-yellow-400 focus:ring-yellow-400"
                        />
                      </div>
                      
                      {isChecked && (
                        <div 
                          className="flex items-center justify-between pl-14 pr-2 py-2 mt-1 border-t border-dashed border-slate-200 dark:border-slate-800" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assigned Role:</span>
                          <select
                            value={currentRole}
                            onChange={(e) => handleRoleChange(client.id, e.target.value)}
                            className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-white rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                          >
                            <option value="staff">Staff (Scanner)</option>
                            <option value="manager">Manager (Tenant Admin)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedUserForClientModal(null)}
                  className="flex-1 px-8 py-5 rounded-2xl font-black text-slate-400 hover:text-[#0f172a] transition-colors uppercase tracking-widest text-xs dark:text-white dark:hover:text-yellow-400"
                >
                  Cancel
                </button>
                <button
                  disabled={syncingClients}
                  onClick={handleSaveUserClients}
                  className="flex-1 bg-[#0f172a] hover:bg-black text-white px-8 py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs dark:bg-yellow-400 dark:text-black dark:shadow-none"
                >
                  {syncingClients ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  {syncingClients ? "Saving..." : "Save Access"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {selectedUserForPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-12 relative overflow-hidden dark:bg-[#0f172a] dark:border dark:border-slate-800">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
              <button 
                onClick={() => setSelectedUserForPasswordModal(null)}
                className="absolute right-8 top-8 p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>

              <h2 className="text-3xl font-black text-[#0f172a] mb-2 font-bricolage italic uppercase tracking-tight dark:text-white flex items-center gap-3">
                <Key className="text-blue-500" size={28} />
                Set Password
              </h2>
              <p className="text-slate-500 font-medium mb-8 dark:text-slate-400">
                Update password for <span className="font-bold text-[#0f172a] dark:text-white">{selectedUserForPasswordModal.email}</span>.
              </p>

              <div className="space-y-6 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">New Password</label>
                  <input
                    type="password"
                    value={changePasswordVal}
                    onChange={(e) => setChangePasswordVal(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-[#0f172a] focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPasswordModal(null)}
                  className="flex-1 px-8 py-5 rounded-2xl font-black text-slate-400 hover:text-[#0f172a] transition-colors uppercase tracking-widest text-xs dark:text-white dark:hover:text-blue-500"
                >
                  Cancel
                </button>
                <button
                  disabled={updatingPassword || !changePasswordVal}
                  onClick={handleSavePassword}
                  className="flex-1 bg-[#0f172a] hover:bg-black text-white px-8 py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-200 uppercase tracking-widest text-xs dark:bg-blue-500 dark:text-white dark:shadow-none"
                >
                  {updatingPassword ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  {updatingPassword ? "Updating..." : "Save Password"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
