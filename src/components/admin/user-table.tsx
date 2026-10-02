"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type LanguageRole = {
  id: number;
  role: string;
  language: { code: string; nativeName: string };
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  isMasterSuperAdmin?: boolean;
  status: string;
  createdAt: string;
  languageRoles: LanguageRole[];
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
};

export function UserTable({ users, canBulkManage = false }: { users: UserRow[]; canBulkManage?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function bulkStatus(status: "active" | "suspended") {
    if (!selected.length || !confirm(`${status === "suspended" ? "Suspend" : "Activate"} ${selected.length} accounts?`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/users/bulk-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: selected, status }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not update accounts.");
      toast.success(`${result.count} accounts ${status === "suspended" ? "suspended" : "activated"}`);
      setSelected([]);
      router.refresh();
    } catch (error: any) { toast.error(error.message || "Could not update accounts."); }
    finally { setBusy(false); }
  }
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center text-stone-400">
        No users found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
      {canBulkManage && <div className="flex items-center justify-between gap-3 border-b border-stone-100 p-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={selected.length === users.filter((u) => !u.isSuperAdmin && !u.isMasterSuperAdmin).length && selected.length > 0} onChange={(e) => setSelected(e.target.checked ? users.filter((u) => !u.isSuperAdmin && !u.isMasterSuperAdmin).map((u) => u.id) : [])} />Select accounts</label>
        {selected.length > 0 && <div className="flex gap-2"><button disabled={busy} onClick={() => void bulkStatus("suspended")} className="rounded bg-red-50 px-3 py-1.5 text-xs text-red-700">Suspend selected ({selected.length})</button><button disabled={busy} onClick={() => void bulkStatus("active")} className="rounded bg-green-50 px-3 py-1.5 text-xs text-green-700">Activate selected</button></div>}
      </div>}
      <table className="w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            {canBulkManage && <th className="w-10" />}
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              User
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Roles
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Joined
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-b border-stone-100 hover:bg-stone-50 transition"
            >
              {canBulkManage && <td className="px-3 py-3"><input type="checkbox" disabled={u.isSuperAdmin || u.isMasterSuperAdmin} checked={selected.includes(u.id)} onChange={(e) => setSelected((items) => e.target.checked ? [...items, u.id] : items.filter((id) => id !== u.id))} aria-label={`Select ${u.name || u.email}`} /></td>}
              <td className="px-4 py-3">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="text-stone-800 hover:text-amber-600 font-medium block"
                >
                  {u.name || "—"}
                </Link>
                <p className="text-xs text-stone-400">{u.email}</p>
              </td>
              <td className="px-4 py-3">
                {u.isSuperAdmin ? (
                  <span className="inline-block text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                    Super Admin
                  </span>
                ) : u.languageRoles.length === 0 ? (
                  <span className="text-xs text-stone-400">No roles</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {u.languageRoles.slice(0, 2).map((r) => (
                      <span
                        key={r.id}
                        className="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
                      >
                        {r.language.nativeName}:{r.role}
                      </span>
                    ))}
                    {u.languageRoles.length > 2 && (
                      <span className="text-xs text-stone-400">
                        +{u.languageRoles.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block text-xs px-2 py-1 rounded-full ${
                    STATUS_STYLES[u.status] || STATUS_STYLES.pending
                  }`}
                >
                  {u.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-stone-500">
                {new Date(u.createdAt).toLocaleDateString("en-KE", {
                  dateStyle: "medium",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
