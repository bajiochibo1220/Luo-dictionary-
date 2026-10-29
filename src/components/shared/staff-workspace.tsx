"use client";
import { statusLabel, useCollectionBrowser } from "./collection-browser";
import { ContentStatus } from "@/components/admin/content-status";
import { InterfaceOption, InterfaceText } from "@/components/shared/interface-language";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppAccount } from "@/lib/account-contract";
import type { FeatureRequest } from "./learning-hub";
import { canEditContent, canFinalizeContent, canValidateCulture, canUploadContent, hasAnyAdminRole } from "@/lib/permissions";
import { ProtectedMedia } from "./protected-media";
import { ContentFormCore } from "./content-form";
import { ValidationChecklist } from "@/components/admin/validation-checklist";
const button = "min-h-11 rounded-full bg-amber-900 px-5 py-2 text-white disabled:opacity-50";
export function StaffWorkspace({ request, transport, account, languageId, englishLanguageId, embedded = false }: { request: FeatureRequest; transport: typeof fetch; account: AppAccount | null; languageId: number; englishLanguageId?: number; embedded?: boolean }) {
  const [status, setStatus] = useState("submitted"); const [records, setRecords] = useState<any[]>([]);
  const [record, setRecord] = useState<any>(null); const [metadata, setMetadata] = useState<any>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false); const [comments, setComments] = useState(""); const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedPages, setLoadedPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const session = account ? { user: account, expires: "" } : null;
  const epoch = useRef(0);
  const roles = account?.languageRoles.filter(role => role.languageId === languageId).map(role => role.role) ?? [];
  const stages = account?.isSuperAdmin || account?.isMasterSuperAdmin || roles.includes("language_admin") || roles.includes("uploader") ? ["submitted", "needs_edit", "draft", "under_review", "curated", "published", "rejected", "rejection_review"] : [...new Set([...roles.includes("content_editor") ? ["submitted", "needs_edit", "rejection_review", "under_review"] : [], ...roles.includes("publisher") ? ["under_review", "published"] : []])];
  const stageSignature = stages.join("|");
  useEffect(() => { const allowed = stageSignature.split("|").filter(Boolean); if (allowed.length && !allowed.includes(status)) setStatus(allowed[0]); }, [stageSignature, status]);
  const staff = hasAnyAdminRole(session) && !!(account?.isSuperAdmin || account?.isMasterSuperAdmin || account?.languageRoles.some(role => role.languageId === languageId && ["content_editor", "publisher", "uploader", "language_admin"].includes(role.role)));
  const mayDelete = (item: any) => item.canDelete ?? (!item.hasPublicVersion && !["published", "published_source"].includes(item.status) && (canEditContent(session, item.languageId) || item.contributorId === account?.id && canUploadContent(session, item.languageId)));
  const collection = useCollectionBrowser(records.map(item => ({ id: item.id, title: item.title, status: item.status, module: item.module?.baseName || "Other content", language: item.language?.nativeName || "", item })), busy || loading);
  const visibleRecords = collection.visible.map(entry => entry.item);
  const visibleKey = visibleRecords.map(item => item.id).join(",");
  useEffect(() => { setSelected([]); }, [visibleKey]);
  const reload = useCallback(async () => {
    const current = ++epoch.current;
    setLoading(true); setError(""); setRecord(null); setEditing(false); setSelected([]);
    try { const [items, meta] = await Promise.all([request(`/api/content?languageId=${languageId}&status=${status}&limit=100`), request(`/api/v1/contributions?languageId=${languageId}`)]); if (current === epoch.current) { setRecords(items); setLoadedPages(1); setHasMore(items.length === 100); setMetadata(meta); } }
    catch (reason) { if (current === epoch.current) setError(reason instanceof Error ? reason.message : "Workspace unavailable."); }
    finally { if (current === epoch.current) setLoading(false); }
  }, [request, languageId, status]);
  useEffect(() => { const generation = epoch; setRecords([]); if (staff) void reload(); return () => { generation.current++; }; }, [reload, staff]);
  async function loadMore() {
    if (busy || !hasMore) return;
    const current = epoch.current;
    setBusy(true); setError("");
    try {
      const items = await request(`/api/content?languageId=${languageId}&status=${status}&limit=100&page=${loadedPages + 1}`);
      if (current === epoch.current) {
        setRecords(previous => [...previous, ...items.filter((item: any) => !previous.some(existing => existing.id === item.id))]);
        setLoadedPages(value => value + 1); setHasMore(items.length === 100);
      }
    } catch (reason) { if (current === epoch.current) setError(reason instanceof Error ? reason.message : "Could not load more uploads."); }
    finally { setBusy(false); }
  }
  async function action(endpoint: string) {
    setBusy(true); setError(""); setNotice("");
    try { await request(`/api/content/${record.id}/${endpoint}`, { method: "POST", body: JSON.stringify({ comments, checklist }) }); setNotice("Workflow updated."); await reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Workflow action failed."); } finally { setBusy(false); }
  }
  async function deleteSelection() {
    if (!selected.length || busy || !confirm(`Delete ${selected.length} selected uploads? Any public versions will be removed. Upload and review history will be retained.`)) return;
    setBusy(true); setError("");
    try { await request("/api/content/bulk-delete", { method: "POST", body: JSON.stringify({ ids: selected, deletePublicVersions: visibleRecords.some(item => selected.includes(item.id) && (item.hasPublicVersion || ["published", "published_source"].includes(item.status))) }) }); setNotice("Selected uploads deleted. Their history is retained."); await reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Deletion failed."); }
    finally { setBusy(false); }
  }
  if (!staff) return <p className="p-8"><InterfaceText source="Sign in with an assigned staff role to open this workspace." /></p>;
  const selectedModule = metadata?.modules.find((item: any) => item.id === record?.moduleId);
  const pairedEnglishId = metadata?.englishLanguageId ?? englishLanguageId;
  const translation = record?.translations?.find((item: any) => item.languageId === pairedEnglishId);
  const contentFields = record ? Object.entries(record.data || {}).filter(([key, value]) => typeof value === "string" && !["sourcePermission", "attributionPreference"].includes(key)) : [];
  return <section className="mx-auto min-w-0 max-w-5xl space-y-5 p-3 sm:p-5 text-stone-900">{!embedded && <h1 className="workspace-heading font-serif text-3xl"><InterfaceText source="Staff content workspace" /></h1>}<p><InterfaceText source="Actions use the same language roles, consent checks and editor review and publishing rules on every platform." /></p>
    <label className="grid min-w-0 gap-2 sm:max-w-sm"><InterfaceText source="Workflow stage" /><select value={status} onChange={event => setStatus(event.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border bg-white p-3">{stages.map(value => <InterfaceOption key={value} value={value}>{statusLabel(value)}</InterfaceOption>)}</select></label><button disabled={busy || loading} className={button} onClick={() => void reload()}><InterfaceText source="Refresh" /></button>
    {error && <p role="alert" className="rounded bg-red-50 p-3">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!record && visibleRecords.some(mayDelete) && <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" disabled={busy} checked={selected.length > 0 && visibleRecords.filter(mayDelete).slice(0, 100).every(item => selected.includes(item.id))} onChange={event => setSelected(event.target.checked ? visibleRecords.filter(mayDelete).slice(0, 100).map(item => item.id) : [])} /><InterfaceText source="Select deletable uploads" /></label><button className="min-h-11 rounded-lg bg-red-50 px-4 text-red-800 disabled:opacity-50" disabled={busy || !selected.length} onClick={() => void deleteSelection()}><InterfaceText source="Delete selected (" />{selected.length})</button><p className="text-xs text-stone-600"><InterfaceText source="Up to 100 per batch. Removing public versions requires language administrator permission; history is retained." /></p></div>}
    {record ? <article className="space-y-4 rounded-xl bg-white/85 p-5"><button className="min-h-11 underline" onClick={() => setRecord(null)}><InterfaceText source="Back to queue" /></button><h2 className="font-serif text-2xl">{record.title}</h2><p>{record.status.replaceAll("_", " ")}</p>
      <dl className="space-y-3">{Object.entries(record.data || {}).map(([key, value]) => <div key={key}><dt className="font-semibold">{key.replaceAll("_", " ")}</dt><dd className="whitespace-pre-wrap">{typeof value === "string" ? value : JSON.stringify(value)}</dd></div>)}</dl>
      {record.media?.length > 0 && <section className="space-y-3"><h3 className="font-semibold"><InterfaceText source="Attached files" /></h3>{record.media.map((asset: any) => <ProtectedMedia key={asset.id} asset={asset} transport={transport} />)}</section>}
      {translation && <details><summary className="min-h-11 cursor-pointer"><InterfaceText source="English version" /></summary><h3>{translation.title}</h3>{Object.entries(translation.data || {}).map(([key, value]) => <p key={key}>{key.replaceAll("_", " ")}: {typeof value === "string" ? value : JSON.stringify(value)}</p>)}</details>}
      {canEditContent(session, record.languageId) && ["submitted", "under_review"].includes(record.status) && !record.validatorId && <button className={button} disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await request(`/api/content/${record.id}/start-edit`, { method: "POST" }); setRecord(await request(`/api/content/${record.id}`)); setEditing(true); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start editing."); } finally { setBusy(false); } }}><InterfaceText source="Review & edit both versions" /></button>}
      {canEditContent(session, record.languageId) && ["draft", "needs_edit", "rejected", "curated"].includes(record.status) && <button className={button} onClick={() => setEditing(value => !value)}><InterfaceText source="Edit content and translation" /></button>}
      {editing && selectedModule && <><ContentFormCore transport={transport} moduleCode={selectedModule.code} languageId={record.languageId} languageName={metadata.language.nativeName} languageCode={metadata.language.code} fieldDefs={selectedModule.fields} recordId={record.id} initialData={{ ...record.data, ...Object.fromEntries(["consentScope", "restrictionLevel", "embargoUntil", "countyCode", "siteName", "sourceReference", "sessionId"].map(key => [key, record[key]])), __title: record.title }} existingMedia={record.media} isAdmin navigate={() => { void request(`/api/content/${record.id}`).then(value => { setRecord(value); setNotice("Community-language version saved. Review and save its English version below."); }).catch(reason => setError(reason instanceof Error ? reason.message : "Could not reload the edited item.")); }} />
        {pairedEnglishId && pairedEnglishId !== record.languageId && <form className="space-y-3 rounded border p-4" onSubmit={async event => {
          event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError("");
          try { await request(`/api/content/${record.id}`, { method: "PATCH", body: JSON.stringify({ languageId: pairedEnglishId, title: form.get("title"), data: Object.fromEntries(contentFields.map(([key]) => [key, form.get(key)])) }) }); setRecord(await request(`/api/content/${record.id}`)); setNotice("English translation saved. Check both versions, then send for publishing."); }
          catch (reason) { setError(reason instanceof Error ? reason.message : "Translation could not be saved."); } finally { setBusy(false); }
        }}><h3 className="font-serif text-xl"><InterfaceText source="English translation" /></h3><label className="block"><InterfaceText source="Title" /><input name="title" defaultValue={translation?.title || ""} required className="block w-full rounded border p-3" /></label>{contentFields.map(([key]) => <label className="block" key={key}>{key.replaceAll("_", " ")}<textarea name={key} defaultValue={translation?.data?.[key] || ""} className="block w-full rounded border p-3" /></label>)}<button className={button} disabled={busy}><InterfaceText source="Save English translation" /></button></form>}
      </>}
      <label className="block"><InterfaceText source="Review comments" /><textarea value={comments} onChange={event => setComments(event.target.value)} maxLength={4000} className="block w-full rounded border p-3" /></label>
      {canValidateCulture(session, record.languageId) && ["submitted", "under_review", "needs_edit"].includes(record.status) && (record.status === "needs_edit" || !record.validatorId) && <><ValidationChecklist key={record.id} onChange={setChecklist} /><button className={button} disabled={busy || ["spelling", "translation", "grammar", "pronunciation", "examples", "culture"].some(key => !checklist[key])} onClick={() => void action("validate")}><InterfaceText source="Approve review & send for publishing" /></button><button className={button} disabled={busy || !comments.trim()} onClick={() => void action("revision")}><InterfaceText source="Request corrections" /></button></>}
      {canFinalizeContent(session, record.languageId) && record.status === "under_review" && record.validatorId && <button className={button} disabled={busy} onClick={() => void action("approve")}><InterfaceText source="Complete publishing review" /></button>}

      {mayDelete(record) && <button className="min-h-11 rounded-lg bg-red-50 px-4 text-red-900" disabled={busy} onClick={async () => { if (!confirm("Delete this upload and any public version? Its history and your identity will be retained.")) return; setBusy(true); try { await request(`/api/content/${record.id}?deletePublicVersions=true`, { method: "DELETE" }); setNotice("Content deleted. Upload and review history retained."); await reload(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Deletion failed."); } finally { setBusy(false); } }}><InterfaceText source="Delete incorrect upload" /></button>}
      <details><summary className="min-h-11 cursor-pointer"><InterfaceText source="Review history" /></summary>{record.reviews?.map((review: any) => <p key={review.id}>{review.action} · {review.reviewer?.name || "Staff"} · {review.comments}</p>)}</details>
    </article> : <div className="space-y-3">{collection.controls}{loading && <p role="status"><InterfaceText source="Loading uploads..." /></p>}{!loading && !error && !visibleRecords.length && <p><InterfaceText source="No accessible items at this stage." /></p>}{visibleRecords.map(item => <article key={item.id} className="rounded-xl bg-white/80 p-4">{mayDelete(item) && <label className="mb-2 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={busy || selected.length >= 100 && !selected.includes(item.id)} checked={selected.includes(item.id)} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} /><InterfaceText source="Select" /></label>}<h2 className="font-serif text-xl">{item.title}</h2><p className="my-2 text-sm text-stone-600">{item.module?.baseName}</p><ContentStatus status={item.status} hasPublicVersion={item.hasPublicVersion} /><button className="min-h-11 underline" onClick={async () => { try { setRecord(await request(`/api/content/${item.id}`)); setChecklist({}); setComments(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Item unavailable."); } }}><InterfaceText source="Open review" /></button></article>)}{collection.pagination}{hasMore && <button type="button" disabled={busy} className={button} onClick={() => void loadMore()}><InterfaceText source="Load more uploads" /></button>}</div>}
  </section>;
}
