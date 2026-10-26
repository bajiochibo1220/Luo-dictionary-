"use client";
import { useEffect, useMemo, useState } from "react";
import type { InterfaceCatalog } from "@/lib/interface-copy";
import { useInterfaceLanguage } from "@/components/shared/interface-language";

type Language = { code: string; nativeName: string };
export function InterfaceCopyEditor({ languages, transport = fetch }: { languages: Language[]; transport?: typeof fetch }) {
  const [community, setCommunity] = useState(languages[0]?.code || "luo");
  const [catalog, setCatalog] = useState<InterfaceCatalog>({});
  const [dirty, setDirty] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const { select } = useInterfaceLanguage();
  useEffect(() => {
    let active = true; setLoading(true); setMessage(""); setCatalog({}); setDirty([]); setPage(0);
    transport(`/api/interface-copy?community=${encodeURIComponent(community)}`).then(async response => {
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not load interface text.");
      if (active) setCatalog(result.data.catalog);
    }).catch(reason => { if (active) setMessage(reason.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [community, transport]);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => { if (dirty.length) event.preventDefault(); };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);
  const sources = useMemo(() => Object.keys(catalog).filter(source => (!missingOnly || !catalog[source].local.trim()) && `${source} ${catalog[source].local} ${catalog[source].english}`.toLowerCase().includes(search.toLowerCase())), [catalog, missingOnly, search]);
  const missing = Object.values(catalog).filter(entry => !entry.local.trim()).length;
  const languageName = languages.find(language => language.code === community)?.nativeName || community;
  function update(source: string, field: "local" | "english", value: string) {
    setCatalog(current => ({ ...current, [source]: { ...current[source], [field]: value } }));
    setDirty(current => current.includes(source) ? current : [...current, source]);
  }
  async function save() {
    if (!dirty.length || busy) return;
    setBusy(true); setMessage("");
    try {
      // Saving is capped at 100 entries, matching the server transaction limit.
      const batch = dirty.slice(0, 100);
      const response = await transport("/api/interface-copy", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ community, entries: batch.map(source => ({ source, ...catalog[source] })) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not save interface text.");
      setDirty(current => current.filter(source => !batch.includes(source))); setMessage(`Saved ${batch.length} entries. Changes are recorded in the audit history.`);
      window.dispatchEvent(new Event("interface-copy-updated"));
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not save."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4" translate="no">
    <header className="workspace-heading"><h1 className="font-serif text-3xl">Edit system text</h1><p className="mt-2 text-sm">Edit buttons, menus, headings, registration and help text. Each community keeps its own language and English pair. Cultural records are edited in Review &amp; edit.</p></header>
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4">
      <label>Community<select value={community} disabled={busy} onChange={event => { if (!dirty.length || confirm("Discard the unsaved text changes?")) setCommunity(event.target.value); }} className="ml-2 min-h-11 rounded-lg border p-2">{languages.map(language => <option key={language.code} value={language.code}>{language.nativeName}</option>)}</select></label>
      <label className="min-w-0 flex-1"><span className="sr-only">Find system text</span><input placeholder="Find a button, heading or message" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} className="min-h-11 w-full rounded-lg border p-2" /></label>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={missingOnly} onChange={event => { setMissingOnly(event.target.checked); setPage(0); }} />Missing translations ({missing})</label>
      <button disabled={busy || loading || !dirty.length} onClick={() => void save()} className="min-h-11 rounded-lg bg-amber-900 px-4 text-white disabled:opacity-50">{busy ? "Saving…" : `Save changes (${dirty.length})`}</button>
    </div>
    <div className="flex flex-wrap gap-3 text-sm"><span>{Object.keys(catalog).length - missing}/{Object.keys(catalog).length} community-language entries filled</span><button className="underline" onClick={() => select(community, true)}>Preview {languageName}</button><button className="underline" onClick={() => select(community, false)}>Preview English</button></div>
    <p className="text-sm text-stone-700">Empty translations use the English source until an editor supplies the approved wording. Seed Dholuo wording also needs fluent-speaker review.</p>
    {message && <p role="status" className="rounded-lg border bg-white p-3">{message}</p>}
    {loading ? <p role="status">Loading interface text…</p> : sources.slice(page * 25, (page + 1) * 25).map(source => <article key={source} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <p className="break-words text-xs text-stone-500">Source: {source}</p>
      <div className="grid gap-3 md:grid-cols-2"><label className="min-w-0 text-sm">{languageName}<textarea value={catalog[source].local} onChange={event => update(source, "local", event.target.value)} rows={source.length > 100 ? 4 : 2} maxLength={8000} className="mt-1 block w-full rounded-lg border p-3" /></label><label className="min-w-0 text-sm">English<textarea value={catalog[source].english} onChange={event => update(source, "english", event.target.value)} rows={source.length > 100 ? 4 : 2} maxLength={8000} className="mt-1 block w-full rounded-lg border p-3" /></label></div>
    </article>)}
    <nav aria-label="Interface text pages" className="flex items-center gap-3"><button disabled={page === 0} onClick={() => setPage(value => value - 1)} className="min-h-11 rounded-lg border bg-white px-4 disabled:opacity-50">Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(sources.length / 25))}</span><button disabled={(page + 1) * 25 >= sources.length} onClick={() => setPage(value => value + 1)} className="min-h-11 rounded-lg border bg-white px-4 disabled:opacity-50">Next</button></nav>
  </section>;
}
