"use client";
import { useEffect, useState } from "react";
import { ModuleContentView, type ModuleContentProps, type AppLink } from "./module-content-view";
import type { FeatureRequest } from "./learning-hub";
export function PaginatedLibrary({ initial, request, Link }: { initial: ModuleContentProps; request: FeatureRequest; Link: AppLink }) {
  const [appliedQuery, setAppliedQuery] = useState("");
  const [content, setContent] = useState(initial); const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { setContent(initial); setQuery(""); setAppliedQuery(""); setError(""); }, [initial]);
  async function load(more: boolean) {
    setBusy(true); setError("");
    try {
      const params = new URLSearchParams({ language: initial.languageCode, module: initial.moduleCode === "all" ? "audio_visual" : initial.moduleCode, q: more ? appliedQuery : query });
      if (more) { params.set("records", content.continuation?.records || "end"); params.set("dictionary", content.continuation?.dictionary || "end"); }
      const next = await request(`/api/v1/library?${params}`);
      if (!more) setAppliedQuery(query);
      setContent(previous => ({ ...next, items: more ? [...previous.items, ...next.items.filter((item: { id: string }) => !previous.items.some(existing => existing.id === item.id))] : next.items }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Library unavailable. Retry."); }
    finally { setBusy(false); }
  }
  return <><form className="flex flex-wrap gap-3 px-6 pt-5" onSubmit={event => { event.preventDefault(); void load(false); }}><label className="grow text-sm">Search this collection<input className="block w-full rounded-lg border border-stone-600 bg-white p-3" value={query} onChange={event => setQuery(event.target.value)} maxLength={200} /></label><button disabled={busy} className="min-h-11 self-end rounded-full bg-amber-900 px-5 py-3 text-white disabled:opacity-50">Search</button></form>
    {error && <p role="alert" className="px-6 py-3 text-red-900">{error}</p>}
    {notice && <p role="status" className="px-6 py-3">{notice}</p>}
    <ModuleContentView {...content} Link={Link} onSave={item => { void request("/api/v1/saved", { method: "POST", body: JSON.stringify({ action: "save", kind: item.kind || "cultural", resourceId: item.id }) }).then(() => setNotice("Item saved across your devices.")).catch(reason => setError(reason instanceof Error ? reason.message : "Could not save item.")); }} />
    {(content.continuation?.records || content.continuation?.dictionary) && <button type="button" disabled={busy} onClick={() => void load(true)} className="mx-6 mb-6 min-h-11 rounded-full bg-amber-900 px-6 py-3 text-white disabled:opacity-50">{busy ? "Loading…" : "Load more"}</button>}
  </>;
}
