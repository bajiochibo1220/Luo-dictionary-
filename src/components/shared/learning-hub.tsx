"use client";
import { InterfaceOption, InterfaceText } from "@/components/shared/interface-language";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LearningResourceView, LearningStateView } from "@/lib/learning-contract";
import { downloadLesson, downloadedLessons, offlineList, offlinePut, offlineDelete, learningQueuePrefix, type PendingLearningAction } from "@/lib/offline-learning";
export type FeatureRequest = (path: string, init?: RequestInit) => Promise<any>;
const button = "min-h-11 rounded-full bg-amber-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50";
const field = "w-full rounded-lg border border-stone-500 bg-white px-3 py-2 text-stone-900";
type HubData = { items: LearningResourceView[]; states: LearningStateView[]; next: string | null; canEdit: boolean; canReview: boolean; canPublish: boolean };
export function LearningHub({ request, languageId, userId, origin, initialResourceId, initialKind = "lesson" }: { request: FeatureRequest; languageId: number; userId?: string; origin: string; initialResourceId?: string; initialKind?: string }) {
  const [tab, setTab] = useState(["lesson", "game", "event"].includes(initialKind) ? initialKind : "lesson");
  const [data, setData] = useState<HubData>({ items: [], states: [], next: null, canEdit: false, canReview: false, canPublish: false });
  const [selected, setSelected] = useState<LearningResourceView | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<LearningResourceView | null>(null);
  const [manage, setManage] = useState(false); const [author, setAuthor] = useState(false);
  const [pending, setPending] = useState(0); const [offline, setOffline] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({}); const [grade, setGrade] = useState<any>(null);
  const identity = useRef(userId); const generation = useRef(0);
  if (identity.current !== userId) { identity.current = userId; generation.current++; }
  const prefix = userId ? learningQueuePrefix(origin, userId) : "";
  const reload = useCallback(async () => {
    const expected = generation.current;
    setLoading(true); setError("");
    try {
      if (!navigator.onLine) throw new Error("You are offline. Showing available downloaded text.");
      const result = await request(`/api/v1/learning?languageId=${languageId}&manage=${manage}${initialResourceId && !manage ? `&id=${encodeURIComponent(initialResourceId)}` : ""}`);
      if (expected !== generation.current) return;
      setData(result); setOffline(false);
      const packs = (await downloadedLessons(origin).catch(() => [])).filter(item => item.languageId === languageId);
      for (let offset = 0; offset < packs.length; offset += 100) {
        const slice = packs.slice(offset, offset + 100);
        const manifest = await request(`/api/v1/learning?languageId=${languageId}&downloads=${slice.map(item => item.id).join(",")}`);
        for (const pack of slice) if (!manifest.downloads.some((item: { id: string; version: number }) => item.id === pack.id && item.version === pack.version)) await offlineDelete(`pack:${origin}:${pack.id}`);
      }
    }
    catch (reason) {
      const packs = await downloadedLessons(origin).catch(() => []);
      if (expected !== generation.current) return;
      if (packs.length && !manage) { setData({ items: packs.filter(r => r.languageId === languageId), states: [], next: null, canEdit: false, canReview: false, canPublish: false }); setOffline(true); }
      setError(reason instanceof Error ? reason.message : "Could not load content.");
    } finally { if (expected === generation.current) setLoading(false); }
  }, [request, languageId, manage, origin, initialResourceId]);
  const sync = useCallback(async () => {
    if (!prefix) return;
    const expected = generation.current;
    const queue = await offlineList<PendingLearningAction>(prefix); setPending(queue.length);
    for (const operation of queue) {
      if (expected !== generation.current) return;
      try {
        await request("/api/v1/learning", { method: "POST", body: JSON.stringify({ action: "progress", data: operation.value.data }) });
        await offlineDelete(operation.key); setPending(value => Math.max(0, value - 1));
      } catch (reason) { throw new Error(`Saved work is waiting to sync: ${reason instanceof Error ? reason.message : "Reconnect and retry."}`); }
    }
  }, [prefix, request]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (!initialResourceId || manage) return;
    const resource = data.items.find(item => item.id === initialResourceId);
    if (resource) { setSelected(resource); setTab(resource.kind); }
  }, [initialResourceId, manage, data.items]);
  useEffect(() => {
    setSelected(null); setAnswers({}); setGrade(null);
    if (!prefix) { setPending(0); return; }
    const reconnect = () => { void sync().then(reload).catch(() => setError("Saved work is waiting. Reconnect or retry synchronization; changed lessons may need a fresh attempt.")); };
    reconnect(); window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [prefix, sync, reload]);
  async function act(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Action failed. Please retry."); }
    finally { setBusy(false); }
  }
  async function finish(resource: LearningResourceView) {
    if (!userId || !prefix) throw new Error("Sign in to save progress across devices.");
    if (resource.body.questions.some(q => answers[q.id] === undefined)) throw new Error("Answer every question first.");
    const existing = (await offlineList<PendingLearningAction>(prefix)).find(item => {
      const value = item.value.data as { resourceId: string; version: number; answers: unknown };
      return value.resourceId === resource.id && value.version === resource.version && JSON.stringify(value.answers) === JSON.stringify(answers);
    });
    const operationId = existing ? existing.key.slice(prefix.length) : crypto.randomUUID(); const key = prefix + operationId;
    const progress = { ownerId: userId, operationId, resourceId: resource.id, version: resource.version, answers, complete: true, position: resource.body.text.length };
    await offlinePut(key, { data: progress, resourceId: resource.id, title: resource.title, createdAt: Date.now() }); if (!existing) setPending(value => value + 1);
    setNotice("Attempt saved on this device. It will synchronize after reconnecting.");
    const result = await request("/api/v1/learning", { method: "POST", body: JSON.stringify({ action: "progress", data: progress }) });
    await offlineDelete(key); setPending(value => Math.max(0, value - 1)); setGrade(result.grade);
    setNotice("Progress saved across your devices."); await reload();
  }
  return <section className="mx-auto max-w-5xl space-y-5 p-5 text-stone-900 md:p-8">
    <div className="workspace-heading"><h1 className="font-serif text-2xl sm:text-3xl"><InterfaceText source="Learn, play & connect" /></h1>
    <nav aria-label="Learning sections" className="mt-3 flex flex-nowrap gap-2 overflow-x-auto">{[["lesson", "Lessons"], ["game", "Games"], ["event", "Cultural calendar"]].map(([value, label]) => <button key={value} className={button} aria-pressed={tab === value} onClick={() => { setTab(value); setSelected(null); }}>{label}</button>)}</nav></div>
    {offline && <p role="status" className="rounded-lg bg-amber-100 p-3"><InterfaceText source="Showing downloaded text. Downloads expire after seven days; reconnect for permission and content updates." /></p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{error}</p>}{notice && <p role="status" className="rounded-lg bg-green-50 p-3">{notice}</p>}
    <div className="flex flex-wrap items-center gap-3"><button className={button} disabled={busy || loading} onClick={() => void act(async () => { await sync(); await reload(); })}><InterfaceText source="Refresh & sync" />{pending ? ` (${pending} waiting)` : ""}</button>
      {(data.canEdit || data.canReview || data.canPublish || manage) && <label className="flex items-center gap-2"><input type="checkbox" checked={manage} onChange={e => setManage(e.target.checked)} /><InterfaceText source="Content workspace" /></label>}
      {pending > 0 && <button className={button} disabled={busy} onClick={() => { if (window.confirm(`Discard ${pending} queued attempts from this device? This cannot be undone.`)) void act(async () => { for (const item of await offlineList(prefix)) await offlineDelete(item.key); setPending(0); setNotice("Queued attempts discarded."); }); }}><InterfaceText source="Discard queued attempts" /></button>}
      {data.canEdit && <button className={button} onClick={() => { setEditing(null); setAuthor(value => !value); }}><InterfaceText source="Create content" /></button>}
    </div>
    {author && <ResourceEditor key={editing?.id || tab} initial={editing} languageId={languageId} kind={tab} disabled={busy} onSave={input => act(async () => { await request("/api/v1/learning", { method: "POST", body: JSON.stringify(editing ? { action: "edit", data: { id: editing.id, version: editing.version, resource: input } } : { action: "create", data: input }) }); setAuthor(false); setEditing(null); setManage(true); setNotice("Private draft created. Submit for independent review."); await reload(); })} />}
    {loading ? <p role="status"><InterfaceText source="Loading…" /></p> : selected ? <article className="space-y-5 rounded-xl bg-white/80 p-5">
      <button className="min-h-11 underline" onClick={() => setSelected(null)}><InterfaceText source="Back to list" /></button><h2 className="font-serif text-2xl">{selected.title}</h2><p>{selected.description}</p><p className="whitespace-pre-wrap">{selected.body.text}</p>
      {selected.body.activities?.map((activity, index) => <div key={index} className="rounded-lg bg-amber-50 p-3"><strong>{activity.type}</strong><p>{activity.instruction}</p></div>)}
      {selected.body.teacherNotes && <details><summary className="min-h-11 cursor-pointer"><InterfaceText source="Teacher notes" /></summary><p className="whitespace-pre-wrap">{selected.body.teacherNotes}</p></details>}
      {selected.startsAt && <p>{new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short", timeZone: selected.timeZone }).format(new Date(selected.startsAt))} ({selected.timeZone}){selected.location ? ` · ${selected.location}` : ""}</p>}
      {selected.body.questions.map((q, index) => <fieldset key={q.id} className="space-y-2 rounded-lg border border-stone-300 p-4"><legend>{index + 1}. {q.prompt}</legend>{q.choices.map((choice, value) => <label key={value} className="flex min-h-11 items-center gap-3"><input type="radio" name={q.id} checked={answers[q.id] === value} onChange={() => { setAnswers(previous => ({ ...previous, [q.id]: value })); setGrade(null); }} />{choice}</label>)}</fieldset>)}
      {selected.kind !== "event" && <button className={button} disabled={busy || !userId || selected.status !== "published"} onClick={() => void act(() => finish(selected))}><InterfaceText source={userId ? "Finish & save progress" : "Sign in to save progress"} /></button>}
      {grade && <div role="status"><h3 className="font-semibold"><InterfaceText source="Score: " />{grade.score}%</h3>{grade.results.map((result: any) => <p key={result.id}><InterfaceText source={result.correct ? "Correct" : "Try again"} />: {result.explanation}</p>)}</div>}
      {selected.downloadAllowed && selected.status === "published" && <button className={button} disabled={busy} onClick={() => void act(async () => { const permissions = await request(`/api/v1/learning?languageId=${languageId}&downloads=${selected.id}`); if (!permissions.downloads.some((item: {id: string; version: number}) => item.id === selected.id && item.version === selected.version)) throw new Error("This download permission or version changed. Refresh the collection."); await downloadLesson(origin, selected); setNotice("Text downloaded for seven days. Audio/video are not included."); })}><InterfaceText source="Download text for offline use" /></button>}
    </article> : <div className="space-y-4">{!data.items.some(r => r.kind === tab) && <p className="rounded-xl bg-white/70 p-6"><InterfaceText source="No " />{tab === "event" ? "events" : `${tab}s`}<InterfaceText source=" available yet. Reviewed content will appear after publication." /></p>}
      {data.items.filter(r => r.kind === tab).sort((a, b) => tab === "event" ? (a.startsAt ?? "").localeCompare(b.startsAt ?? "") : a.title.localeCompare(b.title)).map(resource => {
        const state = data.states.find(s => s.resourceId === resource.id);
        return <article key={resource.id} className="space-y-3 rounded-xl bg-white/80 p-5"><h2 className="font-serif text-2xl">{resource.title}</h2><p>{resource.description}</p><p className="text-sm">{resource.level} · {resource.audience}{manage ? ` · ${resource.status}` : ""}{state ? ` · Best: ${state.bestScore}% · ${state.completed ? "Completed" : "In progress"}` : ""}</p>
          <button className={button} onClick={() => { setSelected(resource); setAnswers({}); setGrade(null); }}><InterfaceText source="Open " />{resource.kind}</button>
          {resource.status === "published" && <button className={button} disabled={busy || !userId} onClick={() => void act(async () => { await request("/api/v1/saved", { method: "POST", body: JSON.stringify({ action: "save", kind: "learning", resourceId: resource.id }) }); setNotice("Lesson saved across your devices."); })}><InterfaceText source="Save item" /></button>}
          {manage && data.canEdit && ["draft", "withdrawn"].includes(resource.status) && <button className={button} onClick={() => { setEditing(resource); setAuthor(true); }}><InterfaceText source="Edit draft" /></button>}
          {manage && ([...(data.canEdit && ["draft", "withdrawn"].includes(resource.status) ? ["submit"] : []), ...(data.canReview && resource.status === "submitted" ? ["approve"] : []), ...(data.canPublish && resource.status === "validated" ? ["publish"] : []), ...(data.canPublish && resource.status === "published" ? ["withdraw"] : [])]).map(action => <button key={action} className={button} disabled={busy} onClick={() => void act(async () => { await request("/api/v1/learning", { method: "POST", body: JSON.stringify({ action, data: { id: resource.id, version: resource.version } }) }); await reload(); })}>{action}</button>)}
        </article>;
      })}
      {data.next && <button className={button} disabled={busy} onClick={() => void act(async () => { const next = await request(`/api/v1/learning?languageId=${languageId}&manage=${manage}&after=${data.next}`); setData(value => ({ ...next, items: [...value.items, ...next.items], states: [...value.states, ...next.states] })); })}><InterfaceText source="Load more" /></button>}
    </div>}
  </section>;
}
function ResourceEditor({ languageId, kind, onSave, disabled, initial }: { languageId: number; kind: string; onSave: (input: unknown) => Promise<void>; disabled: boolean; initial?: LearningResourceView | null }) {
  const [activities, setActivities] = useState(initial?.body.activities || []);
  const [questions, setQuestions] = useState<{ id: string; prompt: string; choices: string[]; answer: number; explanation: string }[]>(initial?.body.questions || []);
  return <form className="space-y-4 rounded-xl bg-white/90 p-5" onSubmit={event => {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    void onSave({ languageId, kind, title: fields.get("title"), description: fields.get("description"), level: fields.get("level"), audience: fields.get("audience"), sourceIds: initial?.sourceIds || [], timeZone: String(fields.get("timeZone") || initial?.timeZone || "Africa/Nairobi"), body: { text: fields.get("text"), teacherNotes: fields.get("teacherNotes"), activities, questions }, consentScope: fields.get("publicPermission") ? "public_excerpt" : "pending", restrictionLevel: fields.get("publicPermission") ? "public" : "internal", downloadAllowed: !!fields.get("downloadAllowed"), startsAt: fields.get("startsAt") ? new Date(String(fields.get("startsAt"))).toISOString() : null, endsAt: fields.get("endsAt") ? new Date(String(fields.get("endsAt"))).toISOString() : null, location: String(fields.get("location") || "") || null });
  }}>
    <h2 className="font-serif text-2xl"><InterfaceText source={initial ? "Edit" : "New"} /> {kind}</h2>
    {[['title', 'Title'], ['description', 'Description'], ['text', 'Content'], ['teacherNotes', 'Teacher notes']].map(([name, label]) => <label className="block" key={name}>{label}<textarea name={name} defaultValue={name === "title" ? initial?.title : name === "description" ? initial?.description : name === "text" ? initial?.body.text : initial?.body.teacherNotes} className={field} required={name === "title"} maxLength={name === "title" ? 200 : 100000} /></label>)}
    <label className="block"><InterfaceText source="Level" /><select name="level" defaultValue={initial?.level} className={field}><InterfaceOption>beginner</InterfaceOption><InterfaceOption>intermediate</InterfaceOption><InterfaceOption>advanced</InterfaceOption></select></label>
    <label className="block"><InterfaceText source="Audience" /><select name="audience" defaultValue={initial?.audience} className={field}>{["all", "children", "youth", "adults", "teachers"].map(value => <InterfaceOption key={value}>{value}</InterfaceOption>)}</select></label>
    {kind === "event" && <><label className="block"><InterfaceText source="Start date and time (device time zone)" /><input name="startsAt" type="datetime-local" defaultValue={initial?.startsAt ? new Date(Date.parse(initial.startsAt) - new Date(initial.startsAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} className={field} required /></label><label className="block"><InterfaceText source="End date and time (device time zone)" /><input name="endsAt" type="datetime-local" defaultValue={initial?.endsAt ? new Date(Date.parse(initial.endsAt) - new Date(initial.endsAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} className={field} /></label><label className="block"><InterfaceText source="Display time zone" /><input name="timeZone" defaultValue={initial?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone} className={field} required /></label><label className="block"><InterfaceText source="Location" /><input name="location" defaultValue={initial?.location || ""} className={field} maxLength={500} /></label></>}
    {kind === "lesson" && <fieldset className="space-y-3 rounded-lg border p-3"><legend><InterfaceText source="Practice activities" /></legend><p><InterfaceText source="Give learners clear instructions for reading, writing, speaking or listening." /></p>{activities.map((activity, index) => <div key={index} className="space-y-2"><label className="block"><InterfaceText source="Skill" /><select className={field} value={activity.type} onChange={event => setActivities(values => values.map((value, i) => i === index ? { ...value, type: event.target.value as typeof activity.type } : value))}>{["reading", "writing", "speaking", "listening"].map(type => <InterfaceOption key={type}>{type}</InterfaceOption>)}</select></label><label className="block"><InterfaceText source="Instructions" /><textarea className={field} required maxLength={4000} value={activity.instruction} onChange={event => setActivities(values => values.map((value, i) => i === index ? { ...value, instruction: event.target.value } : value))} /></label><button type="button" className="min-h-11 underline" onClick={() => setActivities(values => values.filter((_, i) => i !== index))}><InterfaceText source="Remove activity " />{index+1}</button></div>)}<button type="button" className={button} disabled={activities.length >= 40} onClick={() => setActivities(values => [...values, {type: "reading", instruction: ""}])}><InterfaceText source="Add practice activity" /></button></fieldset>}
    {questions.map((question, index) => <fieldset key={question.id} className="space-y-2 rounded-lg border p-3"><legend><InterfaceText source="Question " />{index + 1}</legend><label className="block"><InterfaceText source="Question" /><input className={field} required value={question.prompt} onChange={e => setQuestions(values => values.map((q, i) => i === index ? { ...q, prompt: e.target.value } : q))} /></label>{question.choices.map((choice, c) => <label className="block" key={c}><InterfaceText source="Choice " />{c + 1}<input className={field} required value={choice} onChange={e => setQuestions(values => values.map((q, i) => i === index ? { ...q, choices: q.choices.map((value, j) => c === j ? e.target.value : value) } : q))} /></label>)}<label className="block"><InterfaceText source="Correct choice" /><select className={field} value={question.answer} onChange={e => setQuestions(values => values.map((q, i) => i === index ? { ...q, answer: Number(e.target.value) } : q))}>{question.choices.map((_, i) => <InterfaceOption key={i} value={i}>{i + 1}</InterfaceOption>)}</select></label><label className="block"><InterfaceText source="Explanation" /><input className={field} value={question.explanation} onChange={e => setQuestions(values => values.map((q, i) => i === index ? { ...q, explanation: e.target.value } : q))} /></label><button type="button" className="min-h-11 underline" onClick={() => setQuestions(values => values.filter((_, i) => i !== index))}><InterfaceText source="Remove question" /></button></fieldset>)}
    {kind !== "event" && <button type="button" className={button} disabled={questions.length >= 100} onClick={() => setQuestions(values => [...values, { id: crypto.randomUUID(), prompt: "", choices: ["", "", "", ""], answer: 0, explanation: "" }])}><InterfaceText source="Add question" /></button>}
    <label className="flex items-start gap-3"><input type="checkbox" name="publicPermission" defaultChecked={initial?.consentScope === "public_excerpt" && initial?.restrictionLevel === "public"} /><InterfaceText source="I have confirmed permission to publish this content publicly." /></label><label className="flex items-start gap-3"><input type="checkbox" name="downloadAllowed" defaultChecked={initial?.downloadAllowed} /><InterfaceText source="The rights holder permits offline distribution of this text." /></label>
    <button className={button} disabled={disabled} type="submit"><InterfaceText source="Save private draft" /></button>
  </form>;
}
