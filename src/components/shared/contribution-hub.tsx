"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContentFormCore } from "./content-form";
import type { FeatureRequest } from "./learning-hub";
import { contributionDraftScope, listDeviceDrafts, removeDeviceDraft, type DeviceContributionDraft } from "@/lib/contribution-drafts";
import { offlineList, offlinePut } from "@/lib/offline-learning";

export function ContributionHub({ request, transport, languageId, initialModule = "", userId, origin }: {
  request: FeatureRequest; transport: typeof fetch; languageId: number; initialModule?: string; userId?: string; origin: string;
}) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [deviceError, setDeviceError] = useState("");
  const [module, setModule] = useState(initialModule);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(!!initialModule);
  const [formVersion, setFormVersion] = useState(0);
  const [deviceDrafts, setDeviceDrafts] = useState<DeviceContributionDraft[]>([]);
  const [resuming, setResuming] = useState<DeviceContributionDraft | undefined>();
  const scope = useMemo(() => userId ? contributionDraftScope(origin, userId) : null, [origin, userId]);
  const refreshDeviceDrafts = useCallback(async () => {
    if (!scope) return;
    try { setDeviceDrafts(await listDeviceDrafts(scope, languageId)); setDeviceError(""); }
    catch { setDeviceError("Device storage is unavailable. Keep this app open until your work is saved online."); }
  }, [scope, languageId]);
  const reload = useCallback(async () => {
    if (!scope) return;
    setError("");
    const catalogKey = `forms:${scope}${languageId}`;
    // Cache form definitions only; never private server submissions/media URLs.
    try {
      const cached = (await offlineList<any>(catalogKey)).find(entry => entry.key === catalogKey);
      if (cached) setData((previous: any) => previous || { ...cached.value, submissions: [] });
    } catch { /* Online contribution does not require device storage. */ }
    try {
      const result = await request(`/api/v1/contributions?languageId=${languageId}`);
      setData(result);
      try { await offlinePut(catalogKey, { modules: result.modules, language: result.language }); }
      catch { setDeviceError("Collection forms could not be kept on this device for offline use."); }
    } catch (reason) {
      setError(`${reason instanceof Error ? reason.message : "Could not load contributions."} Previously loaded forms and device drafts remain available; online submissions need a connection.`);
    }
  }, [request, languageId, scope]);
  useEffect(() => {
    setData(null); setEditing(null); setResuming(undefined); setForm(!!initialModule); setModule(initialModule);
    if (userId) { void reload(); void refreshDeviceDrafts(); }
  }, [reload, refreshDeviceDrafts, userId, initialModule]);
  const selected = data?.modules.find((item: any) => item.code === module);
  function openForm(code: string, record: any = null, device?: DeviceContributionDraft) {
    setModule(code); setEditing(record); setResuming(device); setFormVersion(version => version + 1); setForm(true);
  }
  async function deleteDeviceCopy(draft: DeviceContributionDraft) {
    if (!scope) return;
    try {
      await removeDeviceDraft(scope, draft.id);
      if (resuming?.id === draft.id) { setResuming(undefined); setForm(false); }
      await refreshDeviceDrafts();
    } catch { setDeviceError("Could not remove the device copy. Try again."); }
  }
  return <section className="mx-auto max-w-4xl space-y-4 p-5 text-stone-900">
    <h1 className="workspace-heading font-serif text-3xl">Contributions &amp; submissions</h1>
    {!userId && <p>Sign in to create private drafts and submit cultural knowledge for review.</p>}
    {error && <p role="alert">{error}</p>}
    {deviceError && <p role="alert">{deviceError}</p>}
    {userId && <button className="min-h-11 underline" onClick={() => { void reload(); void refreshDeviceDrafts(); }}>Refresh</button>}
    {userId && deviceDrafts.length > 0 && <section className="space-y-3 rounded-xl border border-stone-300 p-4">
      <h2 className="font-serif text-2xl">Drafts on this device</h2>
      <p className="text-sm">Only this account and backend use these copies in the app. They are not submitted automatically.</p>
      {deviceDrafts.map(draft => <article key={draft.id} className="rounded-lg bg-white p-3">
        <h3 className="font-semibold">{draft.title || "Untitled device draft"}</h3>
        <p className="text-sm">{Object.values(draft.files).filter(Boolean).length} selected files · {new Date(draft.updatedAt).toLocaleString()}</p>
        <button disabled={!data?.modules.some((item: any) => item.code === draft.moduleCode)} className="min-h-11 px-3 underline disabled:opacity-50" onClick={() => openForm(draft.moduleCode, data?.submissions.find((item: any) => item.id === draft.recordId), draft)}>Resume device draft</button>
        <button className="min-h-11 px-3 underline" onClick={() => void deleteDeviceCopy(draft)}>Delete device copy</button>
      </article>)}
    </section>}
    {data && <>
      <label className="block">Choose collection<select className="block w-full rounded-lg border bg-white p-3" value={module} onChange={event => { setModule(event.target.value); setEditing(null); setResuming(undefined); setForm(false); }}><option value="">Select a collection</option>{data.modules.map((item: any) => <option key={item.code} value={item.code}>{item.title}</option>)}</select></label>
      <button disabled={!selected} className="min-h-11 rounded-full bg-amber-900 px-5 py-3 text-white disabled:opacity-50" onClick={() => openForm(selected.code)}>New private draft</button>
      {form && selected && <ContentFormCore
        key={`${selected.code}:${editing?.id || "new"}:${userId}:${formVersion}`}
        transport={transport} moduleCode={selected.code} languageId={languageId}
        languageName={data.language.nativeName} languageCode={data.language.code} fieldDefs={selected.fields}
        recordId={editing?.id}
        initialData={editing ? { ...editing.data, ...Object.fromEntries(["consentScope", "restrictionLevel", "embargoUntil", "countyCode", "siteName", "sourceReference", "sessionId"].map(key => [key, editing[key]])), __title: editing.title } : undefined}
        existingMedia={editing?.media || []}
        deviceDraft={scope ? { scope, initial: resuming, onChange: () => { void refreshDeviceDrafts(); } } : undefined}
        navigate={() => { setForm(false); setEditing(null); setResuming(undefined); void reload(); }}
      />}
      <h2 className="font-serif text-2xl">My online submissions</h2>
      {!data.submissions.length && <p>No submissions loaded.</p>}
      {data.submissions.filter((item: any) => !selected || item.moduleId === selected.id).map((item: any) => <article key={item.id} className="space-y-2 rounded-xl bg-white/80 p-4">
        <h3 className="font-semibold">{item.title}</h3><p>{item.status.replaceAll("_", " ")}</p>
        {["draft", "needs_edit", "rejected", "curated"].includes(item.status) && <button className="min-h-11 underline" onClick={() => openForm(data.modules.find((m: any) => m.id === item.moduleId)?.code || "", item)}>Edit draft or requested revision</button>}
      </article>)}
    </>}
  </section>;
}
