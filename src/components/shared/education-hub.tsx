"use client";
import { useCallback, useEffect, useState } from "react";
import type { FeatureRequest } from "./learning-hub";
import { type CourseListing, type CourseView, type ResourceChoice } from "@/lib/education-contract";

const button = "min-h-11 rounded-full bg-amber-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "min-h-11 rounded-full border border-stone-500 px-4 py-2 text-sm disabled:opacity-50";
const field = "mt-1 block min-h-11 w-full rounded-lg border border-stone-400 bg-white px-3 py-2 text-stone-900";
const card = "space-y-3 rounded-xl border border-stone-200 bg-white/90 p-5";
const message = (reason: unknown) => reason instanceof Error ? reason.message : "The action failed. Refresh and retry.";
const emptyCourses: CourseListing = { items: [], next: null, canEdit: false, canReview: false, canPublish: false, canCreateClass: false };
type Props = { request: FeatureRequest; languageId: number; userId?: string; initialView?: "courses" | "classes"; onOpenResource: (id: string, languageId: number) => void };

function useAction() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  };
  return { busy, error, run };
}
const post = (request: FeatureRequest, action: string, data: unknown) => request("/api/v1/education", { method: "POST", body: JSON.stringify({ action, data }) });

export function EducationHub({ request, languageId, userId, onOpenResource }: Props) {
  const [courses, setCourses] = useState<CourseListing>(emptyCourses);
  const [manage, setManage] = useState(false), [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [editor, setEditor] = useState<CourseView | "new" | null>(null);
  const action = useAction();
  const listUrl = `/api/v1/education?view=courses&languageId=${languageId}&manage=${manage}&enrolled=${enrolled}`;
  const reload = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setLoadError("");
    try { const result = await request(listUrl, { signal }); if (!signal?.aborted) setCourses(result); }
    catch (reason) { if (!signal?.aborted) setLoadError(message(reason)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [request, listUrl]);
  useEffect(() => { const controller = new AbortController(); void reload(controller.signal); return () => controller.abort(); }, [reload]);
  return <section className="mx-auto max-w-5xl space-y-5 p-4 text-stone-900 md:p-8">
    <header className="workspace-heading"><h1 className="font-serif text-2xl">Explore at your own pace</h1><p className="mt-2 text-sm">Discover community language and culture through short, organised learning pathways. Everyone is welcome.</p></header>
    {!userId && <p>Browse freely. Sign in to save your place across devices.</p>}
    {(action.error || loadError) && <p role="alert">{action.error || loadError}</p>}
    {courseId ? <CourseDetail id={courseId} request={request} userId={userId} onBack={() => setCourseId(null)} onEdit={value => { setEditor(value); setCourseId(null); }} onChanged={() => void reload()} onOpenResource={onOpenResource} /> : <>
      <div className="flex flex-wrap gap-3"><button className={secondary} disabled={loading} onClick={() => void reload()}>Refresh</button>{userId && <button className={secondary} aria-pressed={enrolled} onClick={() => { setManage(false); setEnrolled(value => !value); }}>{enrolled ? "Browse all pathways" : "My saved pathways"}</button>}{(courses.canEdit || courses.canReview || courses.canPublish || manage) && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={manage} onChange={event => { setManage(event.target.checked); setEnrolled(false); }} />Manage pathways</label>}{courses.canEdit && <button className={button} onClick={() => setEditor(value => value ? null : "new")}>Create pathway</button>}</div>
      {editor && <CourseEditor key={editor === "new" ? "new" : editor.id} initial={editor === "new" ? null : editor} languageId={languageId} request={request} onCancel={() => setEditor(null)} onSaved={id => { setEditor(null); setCourseId(id); void reload(); }} />}
      {loading ? <p role="status">Loading pathways...</p> : <div className="space-y-4">{!courses.items.length && <p className={card}>{enrolled ? "You have no saved pathways yet." : "Reviewed pathways will appear here when published."}</p>}{courses.items.map(course => <article key={course.id} className={card}><h2 className="font-serif text-xl">{course.title}</h2><p>{course.description}</p><p className="text-sm">{course.level} ? {course.unitCount} lessons</p>{course.status !== "unavailable" && <button className={button} onClick={() => setCourseId(course.id)}>Explore pathway</button>}</article>)}</div>}
      {courses.next && <button className={secondary} disabled={action.busy} onClick={() => void action.run(async () => { const result = await request(`${listUrl}&after=${courses.next}`); setCourses(previous => ({ ...result, items: [...previous.items, ...result.items] })); })}>Load more pathways</button>}
    </>}
  </section>;
}

function CourseDetail({ id, request, userId, onBack, onEdit, onChanged, onOpenResource }: { id: string; request: FeatureRequest; userId?: string; onBack: () => void; onEdit: (course: CourseView) => void; onChanged: () => void; onOpenResource: Props["onOpenResource"] }) {
  const [course, setCourse] = useState<CourseView | null>(null), [loadError, setLoadError] = useState("");
  const action = useAction();
  const load = useCallback(async (signal?: AbortSignal) => { try { const data = await request(`/api/v1/education?view=course&id=${id}`, { signal }); if (!signal?.aborted) { setCourse(data); setLoadError(""); } } catch (reason) { if (!signal?.aborted) setLoadError(message(reason)); } }, [id, request]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  async function transition(name: string) { await post(request, name, { id, version: course!.version }); await load(); onChanged(); }
  return <article className={card}>
    <button className={secondary} onClick={onBack}>Back to pathways</button>
    {(loadError || action.error) && <p role="alert">{loadError || action.error}</p>}
    {!course ? <p role="status">Loading course...</p> : <>
      <h2 className="font-serif text-3xl">{course.title}</h2><p className="whitespace-pre-wrap">{course.description}</p><p>{course.level} · {course.status} · {course.sequential ? "Follow the lessons in order" : "Study lessons in any order"}</p>
      {course.enrolled && <div><p role="status">Course progress: {course.progress}% ({course.completedUnits}/{course.units.length} lessons)</p><progress className="w-full" max={100} value={course.progress} /></div>}
      {course.needsEnrollmentUpdate && <p>The curriculum changed. Review the lessons and enroll in the current version to resume course progress.</p>}
      {!course.canEnroll && course.status === "published" && <p role="status">A lesson was updated or withdrawn. An editor must refresh and review this course.</p>}
      {(!course.enrolled || course.needsEnrollmentUpdate) && course.status === "published" && <button className={button} disabled={!userId || !course.canEnroll || action.busy} onClick={() => void action.run(() => transition("enroll"))}>{course.enrolled ? "Enroll in updated course" : "Save pathway"}</button>}
      {course.enrolled && <button className={secondary} disabled={action.busy} onClick={() => void action.run(async () => { await post(request, "unenroll", { id }); await load(); onChanged(); })}>Remove saved pathway</button>}
      <p className="text-sm">Your progress is saved from the lessons you explore and the activities you complete.</p>
      <ol className="space-y-3">{course.units.map(unit => <li key={unit.id} className="rounded-xl border border-stone-300 p-4">
        <h3 className="font-semibold">{unit.position + 1}. {unit.title}</h3><p>Required score: {unit.minimumScore}%{unit.score !== null ? ` · Your score: ${unit.score}%` : ""}{unit.complete ? " · Complete" : ""}</p>
        <button className={secondary} disabled={!unit.available || !unit.unlocked} onClick={() => onOpenResource(unit.resourceId, course.languageId)}>Open course lesson</button>
        {!unit.available ? <p>Lesson unavailable or changed.</p> : !unit.unlocked && <p>Finish the preceding lesson before continuing this pathway.</p>}
      </li>)}</ol>
      <div className="flex flex-wrap gap-3">
        {course.canEdit && ["draft", "withdrawn"].includes(course.status) && <button className={button} disabled={action.busy} onClick={() => onEdit(course)}>Edit course</button>}
        {course.canEdit && ["draft", "withdrawn"].includes(course.status) && <button className={button} disabled={action.busy} onClick={() => void action.run(() => transition("submit-course"))}>Submit course for review</button>}
        {course.canReview && !course.isAuthor && course.status === "submitted" && <button className={button} disabled={action.busy} onClick={() => void action.run(() => transition("approve-course"))}>Approve course review</button>}
        {course.canPublish && !course.isAuthor && course.status === "validated" && <button className={button} disabled={action.busy} onClick={() => void action.run(() => transition("publish-course"))}>Publish course</button>}
        {course.canPublish && !["draft", "withdrawn"].includes(course.status) && <button className={secondary} disabled={action.busy} onClick={() => { if (confirm("Withdraw this course from public access and new enrollments?")) void action.run(() => transition("withdraw-course")); }}>Withdraw course</button>}
        <button className={secondary} disabled={action.busy} onClick={() => void load()}>Refresh course progress</button>
      </div>
    </>}
  </article>;
}

function ResourcePicker({ request, languageId, selected, onToggle }: { request: FeatureRequest; languageId: number; selected: string[]; onToggle: (resource: ResourceChoice) => void }) {
  const [items, setItems] = useState<ResourceChoice[]>([]), [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState("");
  const action = useAction();
  const load = useCallback(async (signal?: AbortSignal) => { setLoading(true); setLoadError(""); try { const data = await request(`/api/v1/education?view=resources&languageId=${languageId}`, { signal }); if (!signal?.aborted) { setItems(data.items); setNext(data.next); } } catch (reason) { if (!signal?.aborted) setLoadError(message(reason)); } finally { if (!signal?.aborted) setLoading(false); } }, [request, languageId]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  return <fieldset className="space-y-2 rounded-lg border border-stone-300 p-3"><legend>Published lessons and games</legend>
    {(action.error || loadError) && <p role="alert">{action.error || loadError} <button type="button" className={secondary} disabled={loading} onClick={() => void load()}>Retry lesson catalog</button></p>}{(action.busy || loading) && <p role="status">Loading lessons...</p>}{!loading && !items.length && !loadError && <p>No published lessons available. An editor must author and independently review lessons first.</p>}
    <div className="max-h-72 overflow-y-auto">{items.map(item => <label key={item.id} className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item)} /><span>{item.title} ({item.kind}, {item.level})</span></label>)}</div>
    {next && <button className={secondary} type="button" disabled={action.busy} onClick={() => void action.run(async () => { const data = await request(`/api/v1/education?view=resources&languageId=${languageId}&after=${next}`); setItems(previous => [...previous, ...data.items]); setNext(data.next); })}>Load more lessons</button>}
  </fieldset>;
}

function CourseEditor({ initial, languageId, request, onCancel, onSaved }: { initial: CourseView | null; languageId: number; request: FeatureRequest; onCancel: () => void; onSaved: (id: string) => void }) {
  const [title, setTitle] = useState(initial?.title || ""), [description, setDescription] = useState(initial?.description || ""), [level, setLevel] = useState(initial?.level || "beginner"), [sequential, setSequential] = useState(initial?.sequential ?? true);
  const [units, setUnits] = useState((initial?.units || []).map(unit => ({ resourceId: unit.resourceId, minimumScore: unit.minimumScore, title: unit.title })));
  const action = useAction();
  return <form className={card} onSubmit={event => { event.preventDefault(); void action.run(async () => {
    const course = { languageId: initial?.languageId || languageId, title, description, level, sequential, units: units.map(({ resourceId, minimumScore }) => ({ resourceId, minimumScore })) };
    const result = await post(request, initial ? "edit-course" : "create-course", initial ? { id: initial.id, version: initial.version, course } : course); onSaved(result.id);
  }); }}>
    <h2 className="font-serif text-2xl">{initial ? "Edit course draft" : "Create course draft"}</h2><p>Use reviewed public lessons from one language. Course changes require independent review before publication.</p>
    {action.error && <p role="alert">{action.error}</p>}
    <label className="block">Course title<input className={field} required minLength={2} maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label>
    <label className="block">Course description<textarea className={field} rows={4} maxLength={10000} value={description} onChange={event => setDescription(event.target.value)} /></label>
    <label className="block">Course level<select className={field} value={level} onChange={event => setLevel(event.target.value)}>{["beginner", "intermediate", "advanced"].map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sequential} onChange={event => setSequential(event.target.checked)} />Follow lessons in order</label>
    <ResourcePicker request={request} languageId={initial?.languageId || languageId} selected={units.map(unit => unit.resourceId)} onToggle={resource => setUnits(previous => previous.some(unit => unit.resourceId === resource.id) ? previous.filter(unit => unit.resourceId !== resource.id) : [...previous, { resourceId: resource.id, title: resource.title, minimumScore: 70 }])} />
    <ol className="space-y-3">{units.map((unit, index) => <li key={unit.resourceId} className="rounded-lg border border-stone-300 p-3"><p>{index + 1}. {unit.title}</p>
      <label>Minimum passing score<input className={field} type="number" min={0} max={100} required value={unit.minimumScore} onChange={event => setUnits(previous => previous.map(item => item.resourceId === unit.resourceId ? { ...item, minimumScore: Number(event.target.value) } : item))} /></label>
      <button type="button" className={secondary} disabled={!index} onClick={() => setUnits(previous => { const moved = [...previous]; [moved[index - 1], moved[index]] = [moved[index], moved[index - 1]]; return moved; })}>Move lesson up</button>{" "}
      <button type="button" className={secondary} onClick={() => setUnits(previous => previous.filter(item => item.resourceId !== unit.resourceId))}>Remove lesson from course</button>
    </li>)}</ol>
    <button className={button} disabled={action.busy || !units.length}>Save course draft</button>{" "}<button className={secondary} type="button" onClick={onCancel}>Cancel course editing</button>
  </form>;
}
