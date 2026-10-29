"use client";
import { InterfaceText } from "@/components/shared/interface-language";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useCollectionBrowser } from "@/components/shared/collection-browser";
import { ContentStatus } from "./content-status";

type Item = { id: string; title: string; status: string; language: string; module: string; canDelete: boolean; hasPublicVersion?: boolean; href?: string; actionLabel?: string };

export function ReviewQueueList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const collection = useCollectionBrowser(items, busy);
  const visibleKey = collection.visible.map(item => item.id).join(",");
  useEffect(() => { setSelected([]); }, [visibleKey]);
  const eligible = collection.visible.filter(item => item.canDelete);
  async function remove(ids = selected) {
    if (!ids.length || busy) return;
    if (!confirm(`Delete ${ids.length} selected uploads? Any public versions will also be removed. Their content, uploader and deletion history will be preserved in the audit log.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/content/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, deletePublicVersions: items.some(item => ids.includes(item.id) && item.hasPublicVersion) }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not delete the selected uploads.");
      setSelected([]); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Deletion failed."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">{collection.controls}
    {!!eligible.length && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={selected.length > 0 && eligible.slice(0, 100).every(item => selected.includes(item.id))} onChange={event => setSelected(event.target.checked ? eligible.slice(0, 100).map(item => item.id) : [])} /><InterfaceText source="Select up to 100 uploads" /></label>
      <span className="text-sm" role="status">{selected.length}<InterfaceText source=" selected" /></span>
      <button type="button" disabled={busy || !selected.length} onClick={() => void remove()} className="min-h-11 rounded-lg bg-red-50 px-4 text-sm text-red-800 disabled:opacity-50"><InterfaceText source={busy ? "Deleting…" : "Delete selected"} /></button>
      <p className="w-full text-xs text-stone-600"><InterfaceText source="Deletion preserves the upload and review history. Removing public versions requires language administrator permission." /></p>
    </div>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    {collection.visible.length === 0 && <p className="rounded-xl bg-white p-6 text-stone-600"><InterfaceText source="No content awaiting review or editing." /></p>}
    {collection.visible.map((item, index) => <article key={item.id} className="rounded-xl border border-stone-200 bg-white">
      {(index === 0 || collection.visible[index - 1].module !== item.module) && <h2 className="rounded-t-xl border-b bg-stone-50 px-4 py-3 font-semibold"><InterfaceText source={item.module} /></h2>}<div className="review-item-layout">
      <div>{item.canDelete && <input type="checkbox" aria-label={`Select ${item.title}`} disabled={busy || selected.length >= 100 && !selected.includes(item.id)} checked={selected.includes(item.id)} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />}</div>
      <div className="review-item-title"><h3 className="break-words font-semibold">{item.title}</h3><p className="mt-1 text-sm text-stone-600">{item.language} / {item.module}</p></div>
      <div className="review-item-status"><ContentStatus status={item.status} hasPublicVersion={item.hasPublicVersion} /></div>
      <div className="review-item-actions">
      <Link href={item.href || `/admin/validation-queue/${item.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-stone-800 px-4 text-sm text-white"><InterfaceText source={item.actionLabel || (item.status === "needs_edit" ? "Continue review & edit" : "Review & edit")} /></Link>
      {item.canDelete && <button type="button" disabled={busy} onClick={() => void remove([item.id])} className="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-800 disabled:opacity-50"><InterfaceText source="Delete" /></button>}
      </div></div>
    </article>)}{collection.pagination}
  </div>;
}
