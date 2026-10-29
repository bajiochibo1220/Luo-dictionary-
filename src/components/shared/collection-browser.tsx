"use client";

import { useMemo, useState, type ReactNode } from "react";
import { InterfaceText } from "./interface-language";

export type CollectionEntry = { id: string; title: string; module: string; language: string; status: string };
export const statusLabel = (status: string) => ({
  submitted: "Submitted", needs_edit: "Needs editing", under_review: "Awaiting publication",
  published_source: "Published", published: "Published", draft: "Draft", curated: "Curated",
  rejected: "Rejected", rejection_review: "Rejection review",
}[status] || status.replaceAll("_", " "));

export function useCollectionBrowser<T extends CollectionEntry>(items: T[], disabled = false, areaNavigation?: ReactNode) {
  const [module, setModule] = useState("");
  const [language, setLanguage] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => items.filter(item => (!module || item.module === module)
    && (!language || item.language === language) && (!status || item.status === status)
    && `${item.title} ${item.module} ${item.language}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => a.module.localeCompare(b.module) || a.title.localeCompare(b.title, undefined, { numeric: true })), [items, module, language, status, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 25, currentPage * 25);
  const modules = [...new Set(items.map(item => item.module))].sort();
  const field = "min-h-11 min-w-0 max-w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-800";
  const controls = <section aria-label="Organize content" className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
    {areaNavigation || <nav aria-label="Content areas" className="flex flex-wrap gap-2">
      {["", ...modules].map(value => <button key={value} type="button" disabled={disabled} aria-pressed={module === value} onClick={() => { setModule(value); setPage(1); }} className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 ${module === value ? "border-teal-900 bg-teal-900 text-white" : "border-stone-200 text-stone-700 hover:bg-stone-50"}`}><InterfaceText source={value || "All content areas"} /> <span className="ml-1 opacity-75">({items.filter(item => !value || item.module === value).length})</span></button>)}
    </nav>}
    <div className="flex flex-wrap items-end gap-3">
      <label className="collection-search-field text-xs font-semibold text-stone-600"><InterfaceText source="Search titles" /><input type="search" value={query} disabled={disabled} maxLength={200} onChange={event => { setQuery(event.target.value); setPage(1); }} className={`${field} mt-1 w-full`} /></label>
      <label className="min-w-0 max-w-full text-xs font-semibold text-stone-600"><InterfaceText source="Language" /><select value={language} disabled={disabled} onChange={event => { setLanguage(event.target.value); setPage(1); }} className={`${field} mt-1 block`}><option value="">All languages</option>{[...new Set(items.map(item => item.language))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="min-w-0 max-w-full text-xs font-semibold text-stone-600"><InterfaceText source="Status" /><select value={status} disabled={disabled} onChange={event => { setStatus(event.target.value); setPage(1); }} className={`${field} mt-1 block`}><option value="">All statuses</option>{[...new Set(items.map(item => item.status))].sort().map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>
      {(module || language || status || query) && <button type="button" disabled={disabled} onClick={() => { setModule(""); setLanguage(""); setStatus(""); setQuery(""); setPage(1); }} className={field}><InterfaceText source="Clear filters" /></button>}
    </div>
    <p role="status" className="text-sm text-stone-600">{filtered.length ? `${(currentPage - 1) * 25 + 1}–${Math.min(currentPage * 25, filtered.length)}` : "0"} / {filtered.length} <InterfaceText source="matching items" /></p>
  </section>;
  const pagination = pages > 1 && <nav aria-label="Content pages" className="flex items-center justify-center gap-4 py-4"><button type="button" disabled={disabled || currentPage === 1} onClick={() => setPage(currentPage - 1)} className={`${field} disabled:opacity-40`}><InterfaceText source="Previous" /></button><span className="text-sm">{currentPage} / {pages}</span><button type="button" disabled={disabled || currentPage === pages} onClick={() => setPage(currentPage + 1)} className={`${field} disabled:opacity-40`}><InterfaceText source="Next" /></button></nav>;
  return { controls, pagination, visible };
}

export function CollectionBrowser({ entries, emptyMessage = "No content found in this selection." }: { entries: (CollectionEntry & { content: ReactNode })[]; emptyMessage?: string }) {
  const { controls, pagination, visible } = useCollectionBrowser(entries);
  const groups = [...new Set(visible.map(item => item.module))];
  return <div className="space-y-4">{controls}{!visible.length && <p className="rounded-xl border bg-white p-8 text-center text-stone-600"><InterfaceText source={emptyMessage} /></p>}{groups.map(module => <section key={module} className="space-y-3"><h2 className="rounded-lg bg-stone-100 px-4 py-3 font-semibold text-stone-800"><InterfaceText source={module} /></h2>{visible.filter(item => item.module === module).map(item => <div key={item.id}>{item.content}</div>)}</section>)}{pagination}</div>;
}
