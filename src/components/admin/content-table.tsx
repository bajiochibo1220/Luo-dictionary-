"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type ContentRecord = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  editLanguageId: number;
  canModerate: boolean;
  canDelete: boolean;
  language: { code: string; nativeName: string };
  module: { code: string; baseName: string };
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-600",
  submitted: "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  validated: "bg-purple-100 text-purple-700",
  published: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export function ContentTable({
  records,
  canDelete,
}: {
  records: ContentRecord[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function action(id: string, endpoint: string, label: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/content/${id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Record ${label}`);
      router.refresh();
    } catch {
      toast.error(`${label} failed`);
    } finally {
      setBusy(null);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm("Delete this record permanently?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Deleted");
      router.refresh();
    } catch {
      toast.error("Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteSelected() {
    if (!selected.length || !confirm(`Delete ${selected.length} selected records permanently?`)) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/content/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${selected.length} records deleted`);
      setSelected([]);
      router.refresh();
    } catch {
      toast.error("Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  }

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center text-stone-400">
        No content found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
      {canDelete && <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-100">
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={records.filter((r) => r.canDelete).length > 0 && selected.length === records.filter((r) => r.canDelete).length} onChange={(e) => setSelected(e.target.checked ? records.filter((r) => r.canDelete).map((r) => r.id) : [])} aria-label="Select all deletable records" />
          {selected.length ? `${selected.length} selected` : "Select records"}
        </label>
        {selected.length > 0 && <button onClick={deleteSelected} disabled={bulkBusy} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">{bulkBusy ? "Deleting…" : `Delete selected (${selected.length})`}</button>}
      </div>}
      <div className="w-full overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            {canDelete && <th className="w-10 px-3 py-3" aria-label="Select" />}
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Title
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Module
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Language
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
          {records.map((r) => (
            <tr
              key={r.id}
              className="border-b border-stone-100 hover:bg-stone-50 transition"
            >
              {canDelete && <td className="px-3 py-3">{r.canDelete && <input type="checkbox" checked={selected.includes(r.id)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, r.id] : current.filter((id) => id !== r.id))} aria-label={`Select ${r.title}`} />}</td>}
              <td className="px-4 py-3">
                <Link
                  href={`/admin/content/${r.id}/edit?languageId=${r.editLanguageId}`}
                  className="text-stone-800 hover:text-amber-600 font-medium"
                >
                  {r.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-stone-600">
                {r.module.baseName}
              </td>
              <td className="px-4 py-3 text-stone-600">
                {r.language.nativeName}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block text-xs px-2 py-1 rounded-full ${
                    STATUS_STYLES[r.status] || STATUS_STYLES.draft
                  }`}
                >
                  {r.status.replace("_", " ")}
                </span>
              </td>
              <td className="px-4 py-3 text-right space-x-2">
                {r.canModerate && r.status === "submitted" && (
                  <>
                    <button
                      onClick={() => action(r.id, "approve", "approved")}
                      disabled={busy === r.id}
                      className="text-xs text-green-600 hover:underline disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => action(r.id, "reject", "rejected")}
                      disabled={busy === r.id}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                {r.canModerate && r.status === "draft" && (
                  <button
                    onClick={() => action(r.id, "submit", "submitted")}
                    disabled={busy === r.id}
                    className="text-xs text-amber-600 hover:underline disabled:opacity-50"
                  >
                    Submit
                  </button>
                )}
                {r.canDelete && (
                  <button
                    onClick={() => deleteRecord(r.id)}
                    disabled={busy === r.id}
                    className="text-xs text-stone-400 hover:text-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
