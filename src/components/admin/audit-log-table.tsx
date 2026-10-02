"use client";

import { useState } from "react";

type AuditLog = {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: any;
  newValue: any;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null } | null;
};

const ACTION_COLORS: Record<string, string> = {
  approve: "bg-green-100 text-green-700",
  approved: "bg-green-100 text-green-700",
  published: "bg-green-100 text-green-700",
  reject: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  revision: "bg-amber-100 text-amber-700",
  revision_requested: "bg-amber-100 text-amber-700",
  validate: "bg-purple-100 text-purple-700",
  validated: "bg-purple-100 text-purple-700",
  create: "bg-blue-100 text-blue-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login: "bg-stone-100 text-stone-700",
  logout: "bg-stone-100 text-stone-700",
};

function actionStyle(action: string): string {
  const lower = action.toLowerCase();
  for (const [k, v] of Object.entries(ACTION_COLORS)) {
    if (lower.includes(k)) return v;
  }
  return "bg-stone-100 text-stone-600";
}

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center text-stone-400">
        No audit logs in this period
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Time
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              User
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Action
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Entity
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              IP
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <>
              <tr
                key={l.id}
                onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                className="border-b border-stone-100 hover:bg-stone-50 transition cursor-pointer"
              >
                <td className="px-4 py-3 text-xs text-stone-500 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString("en-KE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 py-3 text-stone-700 truncate max-w-xs">
                  {l.user?.name || l.user?.email || "system"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full ${actionStyle(l.action)}`}
                  >
                    {l.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-stone-500">
                  {l.entityType}
                  {l.entityId && (
                    <span className="text-stone-400">
                      {" "}
                      · {l.entityId.slice(0, 8)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-stone-400">
                  {l.ipAddress || "—"}
                </td>
              </tr>
              {expanded === l.id && (l.oldValue || l.newValue) && (
                <tr key={`${l.id}-detail`} className="bg-stone-50">
                  <td colSpan={5} className="px-4 py-4">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {l.oldValue && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                            Before
                          </p>
                          <pre className="bg-white p-3 rounded border border-stone-200 overflow-auto max-h-40 text-stone-700">
                            {JSON.stringify(l.oldValue, null, 2)}
                          </pre>
                        </div>
                      )}
                      {l.newValue && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                            After
                          </p>
                          <pre className="bg-white p-3 rounded border border-stone-200 overflow-auto max-h-40 text-stone-700">
                            {JSON.stringify(l.newValue, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
