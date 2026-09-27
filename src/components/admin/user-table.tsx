"use client";

import Link from "next/link";

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
  status: string;
  createdAt: string;
  languageRoles: LanguageRole[];
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
};

export function UserTable({ users }: { users: UserRow[] }) {
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center text-stone-400">
        No users found
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