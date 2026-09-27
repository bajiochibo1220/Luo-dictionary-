"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Backup = {
  id: string;
  filename: string;
  sizeBytes: number;
  type: string;
  checksum: string | null;
  createdAt: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function BackupTable({ backups }: { backups: Backup[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function deleteBackup(id: string, filename: string) {
    if (!confirm(`Delete backup ${filename}?`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/super-admin/backup/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Backup deleted");
      router.refresh();
    } catch {
      toast.error("Delete failed");
    } finally {
      setBusy(null);
    }
  }

  if (backups.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center text-stone-400">
        <p className="text-lg mb-2">No backups yet</p>
        <p className="text-sm">
          Click "Backup Now" to create your first backup
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Filename
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Size
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Type
            </th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Created
            </th>
            <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-stone-500 font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {backups.map((b) => (
            <tr
              key={b.id}
              className="border-b border-stone-100 hover:bg-stone-50"
            >
              <td className="px-4 py-3">
                <p className="font-mono text-xs text-stone-700">
                  {b.filename}
                </p>
                {b.checksum && (
                  <p className="text-xs text-stone-400 font-mono">
                    {b.checksum.slice(0, 12)}...
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-stone-600 tabular-nums">
                {formatBytes(b.sizeBytes)}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                  {b.type}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-stone-500">
                {new Date(b.createdAt).toLocaleString("en-KE", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </td>
              <td className="px-4 py-3 text-right space-x-3">
                <a
                  href={`/api/super-admin/backup/${b.id}`}
                  className="text-xs text-amber-600 hover:underline"
                >
                  Download
                </a>
                <button
                  onClick={() => deleteBackup(b.id, b.filename)}
                  disabled={busy === b.id}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  {busy === b.id ? "..." : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}