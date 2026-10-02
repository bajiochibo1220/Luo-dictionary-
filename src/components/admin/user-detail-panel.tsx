"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type UserRole = {
  id: number;
  role: string;
  languageId: number;
  languageName: string;
};

type UserInfo = {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  isMasterSuperAdmin: boolean;
  status: string;
  profileTypes: string[];
  languageRoles: UserRole[];
};

type Language = { id: number; code: string; nativeName: string };

const ROLES = [
  "uploader",
  "content_editor",
  "cultural_expert",
  "publisher",
  "language_admin",
];

export function UserDetailPanel({
  user,
  languages,
  isMasterSuperAdmin,
}: {
  user: UserInfo;
  languages: Language[];
  isMasterSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [status, setStatus] = useState(user.status);
  const [newRole, setNewRole] = useState("contributor");
  const [newLang, setNewLang] = useState(languages[0]?.id ?? 0);
  const [busy, setBusy] = useState(false);

  async function saveProfile() {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isMasterSuperAdmin ? { name, status } : { name }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      toast.success("Profile updated");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function addRole() {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageId: newLang, role: newRole }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Role added");
      router.refresh();
    } catch {
      toast.error("Failed to add role");
    } finally {
      setBusy(false);
    }
  }

  async function removeRole(roleId: number) {
    if (!confirm("Remove this role?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}/roles?roleId=${roleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Role removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove role");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    if (!confirm("Delete this user permanently?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      toast.success("User deleted");
      router.push("/admin/users");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
        <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
          Profile
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>
          {isMasterSuperAdmin && <div>
            <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>}
        </div>

        {!user.isMasterSuperAdmin && <button
          onClick={saveProfile}
          disabled={busy}
          className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save Profile"}
        </button>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
        <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2">Public profile</h2>
        <p className="text-sm text-stone-700">{user.profileTypes.length ? user.profileTypes.map((type) => type.replaceAll("_", " ")).join(", ") : "No interests selected"}</p>
      </div>

      {(user.isSuperAdmin || user.isMasterSuperAdmin || user.languageRoles.length > 0) && <div className="bg-white rounded-xl border border-stone-100 p-6 shadow-sm">
        <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
          Admin Roles ({user.languageRoles.length})
        </h2>

        {user.languageRoles.length === 0 ? (
          <p className="text-sm text-stone-400 py-2">No roles assigned</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {user.languageRoles.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0 text-sm"
              >
                <span className="text-stone-700">
                  <span className="text-xs uppercase tracking-wider text-stone-400 mr-2">
                    {r.languageName}
                  </span>
                  {r.role.replace("_", " ")}
                </span>
                {isMasterSuperAdmin && <button
                  onClick={() => removeRole(r.id)}
                  disabled={busy}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>}
              </li>
            ))}
          </ul>
        )}

        {(isMasterSuperAdmin || !user.isSuperAdmin) && <div className="pt-4 border-t border-stone-100">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">
            Add Role
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              value={newLang}
              onChange={(e) => setNewLang(Number(e.target.value))}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {languages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nativeName}
                </option>
              ))}
            </select>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")}
                </option>
              ))}
            </select>
            <button
              onClick={addRole}
              disabled={busy}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>}
      </div>}

      {/* Danger zone */}
      {isMasterSuperAdmin && !user.isMasterSuperAdmin && <div className="bg-red-50 rounded-xl border border-red-100 p-6">
        <h2 className="text-xs uppercase tracking-wider text-red-700 mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-stone-600 mb-4">
          Permanently delete this user and all associated roles.
        </p>
        <button
          onClick={deleteUser}
          disabled={busy}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          Delete User
        </button>
      </div>}
    </div>
  );
}
