"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Admin = {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  isMasterSuperAdmin: boolean;
  status: string;
  languageRoles: {
    id: number;
    role: string;
    language: { code: string; nativeName: string };
  }[];
};

export function AdminTable({ admins, isMasterSuperAdmin }: { admins: Admin[]; isMasterSuperAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function revoke(id: string, email: string) {
    if (
      !confirm(
        `Revoke all admin roles from ${email}? The account stays, but they lose admin access.`
      )
    )
      return;

    setBusy(id);
    try {
      const res = await fetch(`/api/super-admin/admins/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success("Admin roles revoked");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(admin: Admin) {
    const nextStatus = admin.status === "suspended" ? "active" : "suspended";
    setBusy(admin.id);
    try {
      const res = await fetch(`/api/super-admin/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(nextStatus === "active" ? "Account activated" : "Account deactivated");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (admins.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center text-stone-400">
        No administrators yet
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              User
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Roles
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Status
            </th>
            <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {admins.map((a) => (
            <tr key={a.id} className="border-b border-stone-100 hover:bg-stone-50">
              <td className="px-4 py-3">
                <p className="font-medium text-stone-800">{a.name || "—"}</p>
                <p className="text-xs text-stone-400">{a.email}</p>
              </td>
              <td className="px-4 py-3">
                {a.isSuperAdmin && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 mr-1 mb-1">
                    Super Admin
                  </span>
                )}
                {a.isMasterSuperAdmin && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 mr-1 mb-1">Master</span>}
                {a.languageRoles.map((r) => (
                  <span
                    key={r.id}
                    className="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 mr-1 mb-1"
                  >
                    {r.language.nativeName}:{r.role}
                  </span>
                ))}
                {!a.isSuperAdmin && a.languageRoles.length === 0 && (
                  <span className="text-xs text-stone-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    a.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {a.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {isMasterSuperAdmin && !a.isMasterSuperAdmin && <div className="flex justify-end gap-3">
                <button onClick={() => setStatus(a)} disabled={busy === a.id} className="text-xs text-amber-700 hover:underline disabled:opacity-50">
                  {a.status === "suspended" ? "Activate" : "Deactivate"}
                </button>
                <button
                  onClick={() => revoke(a.id, a.email)}
                  disabled={busy === a.id}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  {busy === a.id ? "..." : "Revoke"}
                </button></div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
