"use client";
import { InterfaceText } from "@/components/shared/interface-language";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; title: string; status: string; language: string; module: string; canDelete: boolean };

export function ReviewQueueList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const eligible = items.filter(item => item.canDelete);
  async function remove() {
    if (!selected.length || busy) return;
    if (!confirm(`Delete ${selected.length} selected uploads? Their content, uploader and deletion history will be preserved in the audit log.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/content/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete the selected uploads.");
      setSelected([]); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Deletion failed."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {!!eligible.length && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={selected.length > 0 && eligible.slice(0, 100).every(item => selected.includes(item.id))} onChange={event => setSelected(event.target.checked ? eligible.slice(0, 100).map(item => item.id) : [])} /><InterfaceText source="Select up to 100 uploads" /></label>
      <span className="text-sm" role="status">{selected.length}<InterfaceText source=" selected" /></span>
      <button type="button" disabled={busy || !selected.length} onClick={() => void remove()} className="min-h-11 rounded-lg bg-red-50 px-4 text-sm text-red-800 disabled:opacity-50"><InterfaceText source={busy ? "Deleting…" : "Delete selected"} /></button>
      <p className="w-full text-xs text-stone-600"><InterfaceText source="Deletion preserves the upload and review history. Published items cannot be deleted." /></p>
    </div>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    {items.length === 0 && <p className="rounded-xl bg-white p-6 text-stone-600"><InterfaceText source="No content awaiting review or editing." /></p>}
    {items.map(item => <article key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
      {item.canDelete && <input type="checkbox" aria-label={`Select ${item.title}`} disabled={busy || selected.length >= 100 && !selected.includes(item.id)} checked={selected.includes(item.id)} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />}
      <div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{item.title}</h2><p className="text-xs text-stone-600">{item.language} · {item.module} · {item.status.replaceAll("_", " ")}</p></div>
      <Link href={`/admin/validation-queue/${item.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-stone-800 px-4 text-sm text-white"><InterfaceText source={item.status === "needs_edit" ? "Continue review & edit" : "Review & edit"} /></Link>
    </article>)}
  </div>;
}
