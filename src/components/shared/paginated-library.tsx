"use client";
import { InterfaceInput, InterfaceText } from "@/components/shared/interface-language";
import { emitActivity } from "@/lib/activity-events";
import { AutoLoadMore } from "./auto-load-more";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ModuleContentView, type ModuleContentProps, type AppLink } from "./module-content-view";
import type { FeatureRequest } from "./learning-hub";
export function PaginatedLibrary({ initial, request, Link, downloadOrigin }: { downloadOrigin?: string; initial: ModuleContentProps; request: FeatureRequest; Link: AppLink }) {
  const [appliedQuery, setAppliedQuery] = useState("");
  const [content, setContent] = useState(initial); const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const epoch = useRef(0);
  useEffect(() => { const generation = epoch; generation.current++; setBusy(false); setContent(initial); setCategory("all"); setQuery(""); setAppliedQuery(""); setError(""); return () => { generation.current++; }; }, [initial]);
  async function load(more: boolean, nextCategory = category) {
    const current = ++epoch.current;
    setBusy(true); setError("");
    try {
      const params = new URLSearchParams({ language: initial.languageCode, module: initial.moduleCode === "all" ? "audio_visual" : initial.moduleCode, q: more ? appliedQuery : query });
      if (initial.subject) params.set("subject", initial.subject);
      if (initial.moduleCode === "all") params.set("category", nextCategory);
      if (more) { params.set("records", content.continuation?.records || "end"); params.set("dictionary", content.continuation?.dictionary || "end"); }
      const next = await request(`/api/v1/library?${params}`);
      if (current !== epoch.current) return;
      setCategory(nextCategory);
      if (!more) { setAppliedQuery(query); if(query.trim())emitActivity({eventType:"search",query:query.trim().slice(0,100)}); }
      setContent(previous => ({ ...next, items: more ? [...previous.items, ...next.items.filter((item: { id: string }) => !previous.items.some(existing => existing.id === item.id))] : next.items }));
    } catch (reason) { if (current === epoch.current) setError(reason instanceof Error ? reason.message : "Library unavailable. Retry."); }
    finally { if (current === epoch.current) setBusy(false); }
  }
  return <>
    {error && <p role="alert" className="library-action-notice px-6 py-3 text-red-900">{error}</p>}
    {notice && <p role="status" className="library-action-notice px-6 py-3">{notice}</p>}
    <ModuleContentView downloadOrigin={downloadOrigin} selectedCategory={category} onCategoryChange={value => void load(false, value)} categoryBusy={busy} searchControls={<form className="flex min-w-0 items-center gap-1" role="search" onSubmit={event => { event.preventDefault(); void load(false); }}><label className="min-w-0 flex-1"><span className="sr-only"><InterfaceText source="Search this collection" /></span><InterfaceInput type="search" placeholder="Search collection" className="h-11 w-full rounded-lg border border-stone-400 bg-white px-3 text-base" value={query} onChange={event => setQuery(event.target.value)} maxLength={200} /></label><button disabled={busy} className="min-h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg bg-amber-900 text-sm text-white disabled:opacity-50"><Search size={18} aria-hidden="true" /><span className="sr-only"><InterfaceText source="Search" /></span></button></form>} {...content} Link={Link} onSave={item => { void request("/api/v1/saved", { method: "POST", body: JSON.stringify({ action: "save", kind: item.kind || "cultural", resourceId: item.id }) }).then(() => setNotice("Item saved across your devices.")).catch(reason => setError(reason instanceof Error ? reason.message : "Could not save item.")); }} />
    {(content.continuation?.records || content.continuation?.dictionary) && <AutoLoadMore onLoad={() => load(true)} busy={busy} error={!!error} />}
  </>;
}
