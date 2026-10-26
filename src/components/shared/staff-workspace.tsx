"use client";
import { useCallback, useEffect, useState } from "react";
import type { AppAccount } from "@/lib/account-contract";
import type { FeatureRequest } from "./learning-hub";
import { canEditContent, canFinalizeContent, canValidateCulture, canSendToFinalReview, hasAnyAdminRole } from "@/lib/permissions";
import { ProtectedMedia } from "./protected-media";
import { ContentFormCore } from "./content-form";
import { ValidationChecklist } from "@/components/admin/validation-checklist";
const button = "min-h-11 rounded-full bg-amber-900 px-5 py-2 text-white disabled:opacity-50";
export function StaffWorkspace({ request, transport, account, languageId, englishLanguageId, embedded = false }: { request: FeatureRequest; transport: typeof fetch; account: AppAccount | null; languageId: number; englishLanguageId?: number; embedded?: boolean }) {
  const [status, setStatus] = useState("submitted"); const [records, setRecords] = useState<any[]>([]);
  const [record, setRecord] = useState<any>(null); const [metadata, setMetadata] = useState<any>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false); const [comments, setComments] = useState(""); const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const session = account ? { user: account, expires: "" } : null;
  const staff = hasAnyAdminRole(session);
  const reload = useCallback(async () => {
    setError(""); setRecord(null); setEditing(false);
    try { const [items, meta] = await Promise.all([request(`/api/content?languageId=${languageId}&status=${status}&limit=100`), request(`/api/v1/contributions?languageId=${languageId}`)]); setRecords(items); setMetadata(meta); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Workspace unavailable."); }
  }, [request, languageId, status]);
  useEffect(() => { setRecords([]); if (staff) void reload(); }, [reload, staff]);
  async function action(endpoint: string) {
    setBusy(true); setError(""); setNotice("");
    try { await request(`/api/content/${record.id}/${endpoint}`, { method: "POST", body: JSON.stringify({ comments, checklist }) }); setNotice("Workflow updated."); await reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Workflow action failed."); } finally { setBusy(false); }
  }
  if (!staff) return <p className="p-8">Sign in with an assigned staff role to open this workspace.</p>;
  const selectedModule = metadata?.modules.find((item: any) => item.id === record?.moduleId);
  const translation = record?.translations?.find((item: any) => item.languageId === englishLanguageId);
  const contentFields = record ? Object.entries(record.data || {}).filter(([key, value]) => typeof value === "string" && !["sourcePermission", "attributionPreference"].includes(key)) : [];
  return <section className="mx-auto max-w-5xl space-y-5 p-5 text-stone-900">{!embedded && <h1 className="workspace-heading font-serif text-3xl">Staff content workspace</h1>}<p>Actions use the same language roles, consent checks and independent review rules on every platform.</p>
    <label className="block">Workflow stage<select value={status} onChange={event => setStatus(event.target.value)} className="ml-3 rounded-lg border bg-white p-3">{["submitted", "under_review", "needs_edit", "draft", "curated", "published", "rejected"].map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><button className={button} onClick={() => void reload()}>Refresh</button>
    {error && <p role="alert" className="rounded bg-red-50 p-3">{error}</p>}{notice && <p role="status">{notice}</p>}
    {record ? <article className="space-y-4 rounded-xl bg-white/85 p-5"><button className="min-h-11 underline" onClick={() => setRecord(null)}>Back to queue</button><h2 className="font-serif text-2xl">{record.title}</h2><p>{record.status.replaceAll("_", " ")}</p>
      <dl className="space-y-3">{Object.entries(record.data || {}).map(([key, value]) => <div key={key}><dt className="font-semibold">{key.replaceAll("_", " ")}</dt><dd className="whitespace-pre-wrap">{typeof value === "string" ? value : JSON.stringify(value)}</dd></div>)}</dl>
      {record.media?.length > 0 && <section className="space-y-3"><h3 className="font-semibold">Attached files</h3>{record.media.map((asset: any) => <ProtectedMedia key={asset.id} asset={asset} transport={transport} />)}</section>}
      {translation && <details><summary className="min-h-11 cursor-pointer">English version</summary><h3>{translation.title}</h3>{Object.entries(translation.data || {}).map(([key, value]) => <p key={key}>{key.replaceAll("_", " ")}: {typeof value === "string" ? value : JSON.stringify(value)}</p>)}</details>}
      {canEditContent(session, record.languageId) && ["draft", "needs_edit", "rejected", "curated"].includes(record.status) && <button className={button} onClick={() => setEditing(value => !value)}>Edit content and translation</button>}
      {editing && selectedModule && <><ContentFormCore transport={transport} moduleCode={selectedModule.code} languageId={record.languageId} languageName={metadata.language.nativeName} languageCode={metadata.language.code} fieldDefs={selectedModule.fields} recordId={record.id} initialData={{ ...record.data, ...Object.fromEntries(["consentScope", "restrictionLevel", "embargoUntil", "countyCode", "siteName", "sourceReference", "sessionId"].map(key => [key, record[key]])), __title: record.title }} existingMedia={record.media} isAdmin navigate={() => { void reload(); }} />
        {englishLanguageId && englishLanguageId !== record.languageId && <form className="space-y-3 rounded border p-4" onSubmit={async event => {
          event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError("");
          try { await request(`/api/content/${record.id}`, { method: "PATCH", body: JSON.stringify({ translationLanguageId: englishLanguageId, title: form.get("title"), data: Object.fromEntries(contentFields.map(([key]) => [key, form.get(key)])) }) }); setNotice("English translation saved. Return the item for cultural review."); }
          catch (reason) { setError(reason instanceof Error ? reason.message : "Translation could not be saved."); } finally { setBusy(false); }
        }}><h3 className="font-serif text-xl">English translation</h3><label className="block">Title<input name="title" defaultValue={translation?.title || ""} required className="block w-full rounded border p-3" /></label>{contentFields.map(([key]) => <label className="block" key={key}>{key.replaceAll("_", " ")}<textarea name={key} defaultValue={translation?.data?.[key] || ""} className="block w-full rounded border p-3" /></label>)}<button className={button} disabled={busy}>Save English translation</button></form>}
      </>}
      <label className="block">Review comments<textarea value={comments} onChange={event => setComments(event.target.value)} maxLength={4000} className="block w-full rounded border p-3" /></label>
      {canValidateCulture(session, record.languageId) && ["submitted", "under_review"].includes(record.status) && !record.validatorId && <><ValidationChecklist key={record.id} onChange={setChecklist} /><button className={button} disabled={busy || ["spelling", "translation", "grammar", "pronunciation", "examples", "culture"].some(key => !checklist[key])} onClick={() => void action("validate")}>Approve cultural review</button><button className={button} disabled={busy || !comments.trim()} onClick={() => void action("revision")}>Request corrections</button></>}
      {canFinalizeContent(session, record.languageId) && record.status === "under_review" && record.validatorId && <button className={button} disabled={busy} onClick={() => void action("approve")}>Complete publishing review</button>}
      {canSendToFinalReview(session, record.languageId) && record.status === "needs_edit" && <button className={button} disabled={busy} onClick={() => void action("send-to-final-review")}>Return to cultural review</button>}
      <details><summary className="min-h-11 cursor-pointer">Review history</summary>{record.reviews?.map((review: any) => <p key={review.id}>{review.action} · {review.reviewer?.name || "Staff"} · {review.comments}</p>)}</details>
    </article> : <div className="space-y-3">{!records.length && <p>No accessible items at this stage.</p>}{records.map(item => <article key={item.id} className="rounded-xl bg-white/80 p-4"><h2 className="font-serif text-xl">{item.title}</h2><p>{item.module?.baseName} · {item.status.replaceAll("_", " ")}</p><button className="min-h-11 underline" onClick={async () => { try { setRecord(await request(`/api/content/${item.id}`)); setChecklist({}); setComments(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Item unavailable."); } }}>Open review</button></article>)}</div>}
  </section>;
}
