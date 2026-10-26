"use client";
import { useCallback, useEffect, useState } from "react";
import type { FeatureRequest } from "./learning-hub";
import { gradebookCsv, type CourseListing, type CourseSummary, type CourseView, type ClassSummary, type ClassroomView, type ResourceChoice, type AssignmentDetail, type AssignmentView, type SubmissionView, type GradebookView } from "@/lib/education-contract";

const button = "min-h-11 rounded-full bg-amber-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "min-h-11 rounded-full border border-stone-500 px-4 py-2 text-sm disabled:opacity-50";
const field = "mt-1 block min-h-11 w-full rounded-lg border border-stone-400 bg-white px-3 py-2 text-stone-900";
const card = "space-y-3 rounded-xl border border-stone-200 bg-white/90 p-5";
const message = (reason: unknown) => reason instanceof Error ? reason.message : "The action failed. Refresh and retry.";
const emptyCourses: CourseListing = { items: [], next: null, canEdit: false, canReview: false, canPublish: false, canCreateClass: false };
type Classes = { items: ClassSummary[]; next: string | null; canCreateClass: boolean };
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

export function EducationHub({ request, languageId, userId, initialView = "courses", onOpenResource }: Props) {
  const [view, setView] = useState(initialView), [manage, setManage] = useState(false), [enrolled, setEnrolled] = useState(false);
  const [courses, setCourses] = useState<CourseListing>(emptyCourses), [classes, setClasses] = useState<Classes>({ items: [], next: null, canCreateClass: false });
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null), [classId, setClassId] = useState<string | null>(null);
  const [editor, setEditor] = useState<CourseView | "new" | null>(null), [creatingClass, setCreatingClass] = useState(false);
  const [joinCode, setJoinCode] = useState(""), [invitation, setInvitation] = useState<{ id: string; code: string } | null>(null);
  const action = useAction();
  const listUrl = `/api/v1/education?view=${view}&languageId=${languageId}&manage=${manage}&enrolled=${enrolled}`;
  const reload = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setLoadError("");
    try {
      if (view === "classes" && !userId) { setClasses({ items: [], next: null, canCreateClass: false }); return; }
      const data = await request(listUrl, { signal });
      if (!signal?.aborted) { if (view === "courses") setCourses(data); else setClasses(data); }
    } catch (reason) { if (!signal?.aborted) setLoadError(message(reason)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [request, listUrl, view, userId]);
  useEffect(() => { const controller = new AbortController(); void reload(controller.signal); return () => controller.abort(); }, [reload]);
  function switchView(next: "courses" | "classes") { setView(next); setCourseId(null); setClassId(null); setEditor(null); setCreatingClass(false); }
  const next = view === "courses" ? courses.next : classes.next;
  return <section className="mx-auto max-w-5xl space-y-5 p-5 text-stone-900 md:p-8">
    <div className="workspace-heading"><h1 className="font-serif text-2xl sm:text-3xl">Learning pathways &amp; classrooms</h1>
    <nav aria-label="Education sections" className="mt-3 flex flex-nowrap gap-2 overflow-x-auto pb-2">
      <button className={button} aria-pressed={view === "courses" && !enrolled} onClick={() => { setEnrolled(false); switchView("courses"); }}>Courses</button>
      <button className={button} disabled={!userId} aria-pressed={view === "courses" && enrolled} onClick={() => { setManage(false); setEnrolled(true); switchView("courses"); }}>My enrollments</button>
      <button className={button} aria-pressed={view === "classes"} onClick={() => switchView("classes")}>My classes</button>
    </nav></div>
    {!userId && <p>Browse published courses freely. Sign in using the account menu to enroll, join a class and keep your progress across devices.</p>}
    {(action.error || loadError) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{action.error || loadError}</p>}
    {classId ? <ClassroomDetail key={classId} id={classId} request={request} userId={userId!} onBack={() => { setClassId(null); void reload(); }} onOpenCourse={id => { setClassId(null); setView("courses"); setCourseId(id); }} onOpenResource={onOpenResource} invitation={invitation?.id === classId ? invitation.code : null} onInvitation={code => setInvitation({ id: classId, code })} />
      : courseId ? <CourseDetail key={courseId} id={courseId} request={request} userId={userId} onBack={() => { setCourseId(null); void reload(); }} onEdit={course => { setEditor(course); setCourseId(null); }} onChanged={() => void reload()} onOpenResource={onOpenResource} />
      : <>
        <div className="flex flex-wrap items-center gap-3">
          <button className={secondary} disabled={loading || action.busy} onClick={() => void reload()}>Refresh courses and classes</button>
          {view === "courses" && (courses.canEdit || courses.canReview || courses.canPublish || manage) && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={manage} onChange={event => { setManage(event.target.checked); setEnrolled(false); }} />Course staff workspace</label>}
          {view === "courses" && courses.canEdit && <button className={button} onClick={() => setEditor(editor ? null : "new")}>Create course</button>}
          {view === "classes" && classes.canCreateClass && <button className={button} onClick={() => setCreatingClass(value => !value)}>Create class</button>}
        </div>
        {editor && <CourseEditor key={editor === "new" ? "new" : editor.id} initial={editor === "new" ? null : editor} languageId={languageId} request={request} onCancel={() => setEditor(null)} onSaved={id => { setEditor(null); setCourseId(id); void reload(); }} />}
        {creatingClass && <ClassCreator request={request} languageId={languageId} onCreated={(id, code) => { setInvitation({ id, code }); setCreatingClass(false); setClassId(id); void reload(); }} onCancel={() => setCreatingClass(false)} />}
        {view === "classes" && userId && <form className={card} onSubmit={event => { event.preventDefault(); void action.run(async () => { const result = await post(request, "join-class", { code: joinCode.trim() }); setJoinCode(""); setClassId(result.id); await reload(); }); }}>
          <h2 className="font-serif text-xl">Join a class</h2><p>Ask your teacher for a current class code. Codes expire after seven days and can be replaced earlier.</p>
          <label className="block">Class code<input className={field} autoComplete="off" autoCapitalize="none" spellCheck={false} value={joinCode} maxLength={16} required onChange={event => setJoinCode(event.target.value)} /></label>
          <button className={button} disabled={action.busy}>Join class</button>
        </form>}
        {loading ? <p role="status">Loading courses and classes...</p> : view === "courses" ? <div className="space-y-4">
          {!courses.items.length && <p className={card}>{enrolled ? "No course enrollments found." : "No courses available yet. Courses appear after independent review and publication."}</p>}
          {courses.items.map(course => <article key={course.id} className={card}><h2 className="font-serif text-2xl">{course.title}</h2><p>{course.description}</p><p>{course.level} · {course.unitCount} lessons · {course.status}{course.enrolled ? " · Enrolled" : ""}</p>
            {course.status !== "unavailable" && <button className={button} onClick={() => setCourseId(course.id)}>Open course</button>}
            {course.enrolled && <button className={secondary} disabled={action.busy} onClick={() => void action.run(async () => { await post(request, "unenroll", { id: course.id }); await reload(); })}>Leave course</button>}
          </article>)}
        </div> : <div className="space-y-4">
          {!classes.items.length && <p className={card}>No classes loaded. Join with a teacher&apos;s code, or ask a language coordinator to assign teaching access.</p>}
          {classes.items.map(classroom => <article key={classroom.id} className={card}><h2 className="font-serif text-2xl">{classroom.title}</h2><p>{classroom.role}{classroom.archived ? " · Archived" : ""}</p><button className={button} onClick={() => setClassId(classroom.id)}>Open class</button></article>)}
        </div>}
        {next && <button className={secondary} disabled={action.busy} onClick={() => void action.run(async () => {
          const data = await request(`${listUrl}&after=${next}`);
          if (view === "courses") setCourses(previous => ({ ...data, items: [...previous.items, ...data.items] })); else setClasses(previous => ({ ...data, items: [...previous.items, ...data.items] }));
        })}>Load more {view}</button>}
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
    <button className={secondary} onClick={onBack}>Back to courses</button>
    {(loadError || action.error) && <p role="alert">{loadError || action.error}</p>}
    {!course ? <p role="status">Loading course...</p> : <>
      <h2 className="font-serif text-3xl">{course.title}</h2><p className="whitespace-pre-wrap">{course.description}</p><p>{course.level} · {course.status} · {course.sequential ? "Follow the lessons in order" : "Study lessons in any order"}</p>
      {course.enrolled && <div><p role="status">Course progress: {course.progress}% ({course.completedUnits}/{course.units.length} lessons)</p><progress className="w-full" max={100} value={course.progress} /></div>}
      {course.needsEnrollmentUpdate && <p>The curriculum changed. Review the lessons and enroll in the current version to resume course progress.</p>}
      {!course.canEnroll && course.status === "published" && <p role="status">A lesson was updated or withdrawn. An editor must refresh and review this course.</p>}
      {(!course.enrolled || course.needsEnrollmentUpdate) && course.status === "published" && <button className={button} disabled={!userId || !course.canEnroll || action.busy} onClick={() => void action.run(() => transition("enroll"))}>{course.enrolled ? "Enroll in updated course" : "Enroll in course"}</button>}
      {course.enrolled && <button className={secondary} disabled={action.busy} onClick={() => void action.run(async () => { await post(request, "unenroll", { id }); await load(); onChanged(); })}>Leave course</button>}
      <p className="text-sm">Progress uses synchronized lesson attempts at each lesson&apos;s required version and score. Class assignment grades are recorded separately.</p>
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

function ClassCreator({ request, languageId, onCreated, onCancel }: { request: FeatureRequest; languageId: number; onCreated: (id: string, code: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(""), [courseId, setCourseId] = useState("");
  const [courses, setCourses] = useState<CourseSummary[]>([]), [next, setNext] = useState<string | null>(null);
  const action = useAction();
  useEffect(() => { const controller = new AbortController(); void request(`/api/v1/education?view=courses&languageId=${languageId}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) { setCourses(data.items); setNext(data.next); } }).catch(() => {}); return () => controller.abort(); }, [request, languageId]);
  return <form className={card} onSubmit={event => { event.preventDefault(); void action.run(async () => { const result = await post(request, "create-class", { languageId, title, courseId: courseId || null }); onCreated(result.id, result.code); }); }}>
    <h2 className="font-serif text-2xl">Create teaching class</h2>{action.error && <p role="alert">{action.error}</p>}
    <label className="block">Class name<input className={field} required minLength={2} maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label>
    <label className="block">Optional published course<select className={field} value={courseId} onChange={event => setCourseId(event.target.value)}><option value="">Independent assignments</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
    {next && <button type="button" className={secondary} onClick={() => void action.run(async () => { const data = await request(`/api/v1/education?view=courses&languageId=${languageId}&after=${next}`); setCourses(previous => [...previous, ...data.items]); setNext(data.next); })}>Load more course options</button>}
    <p>You become the first assigned teacher. A language coordinator can add further teachers by their existing account email. Profile interests grant no teaching access.</p>
    <button className={button} disabled={action.busy}>Save teaching class</button>{" "}<button className={secondary} type="button" onClick={onCancel}>Cancel class creation</button>
  </form>;
}

function ClassroomDetail({ id, request, userId, onBack, onOpenCourse, onOpenResource, invitation, onInvitation }: { id: string; request: FeatureRequest; userId: string; onBack: () => void; onOpenCourse: (id: string) => void; onOpenResource: Props["onOpenResource"]; invitation: string | null; onInvitation: (code: string) => void }) {
  const [classroom, setClassroom] = useState<ClassroomView | null>(null), [loadError, setLoadError] = useState("");
  const [assignmentId, setAssignmentId] = useState<string | null>(null), [editing, setEditing] = useState<AssignmentView | "new" | null>(null);
  const [teacherEmail, setTeacherEmail] = useState(""), [gradebook, setGradebook] = useState<GradebookView | null>(null);
  const action = useAction();
  const load = useCallback(async (signal?: AbortSignal) => { try { const data = await request(`/api/v1/education?view=classroom&id=${id}`, { signal }); if (!signal?.aborted) { setClassroom(data); setLoadError(""); setGradebook(null); } } catch (reason) { if (!signal?.aborted) setLoadError(message(reason)); } }, [id, request]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  async function mutate(name: string, data: object = {}) { const result = await post(request, name, { classroomId: id, version: classroom!.version, ...data }); await load(); return result; }
  async function downloadGradebook() {
    const data: GradebookView = await request(`/api/v1/education?view=gradebook&id=${id}`); setGradebook(data);
    const rows = [["Learner", ...data.assignments.map(assignment => assignment.title)], ...data.learners.map(learner => [learner.name, ...learner.grades.map(grade => grade.score !== null ? `${grade.score}%${grade.manuallyGraded ? " (teacher)" : " (lesson)"}${grade.late ? " late" : ""}` : grade.needsRevision ? "Assignment changed, resubmit" : grade.submitted ? "Submitted, awaiting grade" : "Not submitted")])];
    const file = new File(["\uFEFF", gradebookCsv(rows)], "class-gradebook.csv", { type: "text/csv;charset=utf-8" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: data.title });
    else { const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 60000); }
  }
  return <article className={card}>
    <button className={secondary} onClick={onBack}>Back to my classes</button>
    {(loadError || action.error) && <p role="alert">{loadError || action.error}</p>}
    {!classroom ? <p role="status">Loading class...</p> : <>
      <h2 className="font-serif text-3xl">{classroom.title}</h2><p>Your role: {classroom.role}{classroom.archived ? " · Archived, read only" : ""}</p>
      <div className="flex flex-wrap gap-3"><button className={secondary} disabled={action.busy} onClick={() => { setAssignmentId(null); void load(); }}>Refresh class</button>
        {classroom.courseId && <button className={secondary} onClick={() => onOpenCourse(classroom.courseId!)}>Open class course</button>}
        {classroom.canTeach && <><button className={secondary} disabled={action.busy} onClick={() => void action.run(async () => setGradebook(await request(`/api/v1/education?view=gradebook&id=${id}`)))}>View gradebook</button><button className={secondary} disabled={action.busy} onClick={() => void action.run(downloadGradebook)}>Export gradebook CSV</button></>}
      </div>
      {classroom.canTeach && !classroom.archived && <section className="space-y-3 rounded-lg bg-amber-50 p-4"><h3 className="font-semibold">Class invitations</h3>
        {invitation && <label className="block">New class join code (share only with invited learners)<input className={field} aria-label="Class join code" readOnly value={invitation} onFocus={event => event.target.select()} /></label>}
        <p>{classroom.inviteExpiresAt ? `Current code expires ${new Date(classroom.inviteExpiresAt).toLocaleString()}. Existing codes are not shown again after leaving this screen.` : "No active join code."}</p>
        <button className={secondary} disabled={action.busy} onClick={() => void action.run(async () => { const result = await mutate("rotate-code"); onInvitation(result.code); })}>Replace class join code</button>{" "}
        <button className={secondary} disabled={action.busy} onClick={() => void action.run(async () => { await mutate("disable-code"); onInvitation(""); })}>Disable class join code</button>
      </section>}
      {classroom.canManageTeachers && !classroom.archived && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void action.run(async () => { await mutate("add-teacher", { email: teacherEmail }); setTeacherEmail(""); }); }}>
        <label className="block">Assign a teacher by existing account email<input className={field} type="email" required maxLength={254} value={teacherEmail} onChange={event => setTeacherEmail(event.target.value)} /></label><button className={button} disabled={action.busy}>Grant class teaching access</button>
      </form>}
      <details className="rounded-lg border border-stone-300 p-3"><summary className="min-h-11 cursor-pointer">{classroom.canTeach ? `Class roster (${classroom.members.length})` : "My membership and teachers"}</summary>
        <ul className="space-y-2">{classroom.members.map(member => <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2"><span>{member.name} · {member.role}</span>
          {!classroom.archived && member.userId !== userId && classroom.canTeach && (member.role !== "teacher" || classroom.canManageTeachers) && <button className={secondary} disabled={action.busy} onClick={() => { if (confirm(`Remove ${member.name} from this class and delete their submissions in this class?`)) void action.run(() => mutate("remove-member", { userId: member.userId }).then(() => {})); }}>Remove member and class work</button>}
        </li>)}</ul>
      </details>
      {classroom.canTeach && !classroom.archived && <button className={button} disabled={action.busy} onClick={() => { setEditing(editing ? null : "new"); setAssignmentId(null); }}>Create assignment</button>}
      {editing && <AssignmentEditor key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} request={request} classroom={classroom} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
      {gradebook && <section className="space-y-3"><h3 className="font-serif text-2xl">Class gradebook</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="text-left">{gradebook.title}; teacher scores take precedence over synchronized lesson scores.</caption><thead><tr><th className="p-2">Learner</th>{gradebook.assignments.map(item => <th className="p-2" key={item.id}>{item.title}</th>)}</tr></thead><tbody>{gradebook.learners.map(learner => <tr key={learner.userId}><th className="p-2">{learner.name}</th>{learner.grades.map(grade => <td className="p-2" key={grade.assignmentId}>{grade.score !== null ? `${grade.score}%` : grade.needsRevision ? "Resubmission needed" : grade.submitted ? "Awaiting grade" : "Not submitted"}{grade.late ? " (late)" : ""}</td>)}</tr>)}</tbody></table></div></section>}
      <h3 className="font-serif text-2xl">Assignments</h3>
      {!classroom.assignments.length && <p>No assignments yet.</p>}
      {classroom.assignments.map(assignment => <section key={assignment.id} className="space-y-2 rounded-lg border border-stone-300 p-4"><h4 className="font-semibold">{assignment.title}</h4><p>{assignment.closed ? "Closed" : "Open"}{assignment.dueAt ? ` · Due ${new Date(assignment.dueAt).toLocaleString()}` : " · No due date"}{assignment.myScore !== null ? ` · My result: ${assignment.myScore}%` : ""}</p>
        {!assignment.available && <p>Its lesson was changed or withdrawn. Existing submissions remain available; new work is paused. A teacher must create a new assignment for the current lesson.</p>}
        <div className="flex flex-wrap gap-2"><button className={secondary} onClick={() => { setAssignmentId(assignment.id); setEditing(null); }}>Open assignment</button>
          {classroom.canTeach && !classroom.archived && !assignment.closed && <><button className={secondary} onClick={() => { setEditing(assignment); setAssignmentId(null); }}>Edit assignment</button><button className={secondary} disabled={action.busy} onClick={() => void action.run(async () => { await mutate("close-assignment", { assignmentId: assignment.id, assignmentVersion: assignment.version }); setAssignmentId(null); })}>Close submissions</button></>}
        </div>
      </section>)}
      {assignmentId && <AssignmentDetailView key={assignmentId} id={assignmentId} classroom={classroom} request={request} userId={userId} onChanged={() => void load()} onOpenResource={onOpenResource} />}
      <div className="flex flex-wrap gap-3">
        {classroom.canTeach && !classroom.archived && <button className={secondary} disabled={action.busy} onClick={() => { if (confirm("Archive this class? Invitations, submissions and grading will close. Existing members can still read its history.")) void action.run(async () => { await mutate("archive-class"); onInvitation(""); }); }}>Archive class</button>}
        {classroom.canLeave && <button className={secondary} disabled={action.busy} onClick={() => { if (confirm("Leave this class and delete your submissions in this class? Other learners' work is preserved.")) void action.run(async () => { await mutate("leave-class"); onBack(); }); }}>Leave class and delete my class work</button>}
      </div>
    </>}
  </article>;
}

function AssignmentEditor({ initial, classroom, request, onSaved, onCancel }: { initial: AssignmentView | null; classroom: ClassroomView; request: FeatureRequest; onSaved: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title || ""), [instructions, setInstructions] = useState(initial?.instructions || ""), [dueAt, setDueAt] = useState(() => initial?.dueAt ? new Date(new Date(initial.dueAt).getTime() - new Date(initial.dueAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""), [resourceId, setResourceId] = useState(initial?.resourceId || "");
  const action = useAction();
  return <form className={card} onSubmit={event => { event.preventDefault(); void action.run(async () => {
    await post(request, initial ? "edit-assignment" : "create-assignment", { classroomId: classroom.id, version: classroom.version, title, instructions, dueAt: dueAt ? new Date(dueAt).toISOString() : null, ...(initial ? { assignmentId: initial.id, assignmentVersion: initial.version } : { resourceId }) }); onSaved();
  }); }}>
    <h3 className="font-serif text-2xl">{initial ? "Edit assignment details" : "New class assignment"}</h3>{action.error && <p role="alert">{action.error}</p>}
    <label className="block">Assignment title<input className={field} required minLength={2} maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label>
    <label className="block">Learner instructions<textarea className={field} maxLength={20000} rows={4} value={instructions} onChange={event => setInstructions(event.target.value)} /></label>
    <label className="block">Due date and time (your device time zone)<input className={field} type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} /></label>
    {!initial && <ResourcePicker request={request} languageId={classroom.languageId} selected={resourceId ? [resourceId] : []} onToggle={resource => setResourceId(resource.id === resourceId ? "" : resource.id)} />}
    <p>Submissions contain written work plus the server&apos;s synchronized lesson result when available. Late work is accepted and marked late. Changing instructions refreshes the assignment version.</p>
    <button className={button} disabled={action.busy || !resourceId}>Save class assignment</button>{" "}<button className={secondary} type="button" onClick={onCancel}>Cancel assignment editing</button>
  </form>;
}

function AssignmentDetailView({ id, classroom, request, userId, onChanged, onOpenResource }: { id: string; classroom: ClassroomView; request: FeatureRequest; userId: string; onChanged: () => void; onOpenResource: Props["onOpenResource"] }) {
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null), [loadError, setLoadError] = useState(""), [answer, setAnswer] = useState("");
  const action = useAction();
  const load = useCallback(async (signal?: AbortSignal) => { try { const data: AssignmentDetail = await request(`/api/v1/education?view=assignment&classroomId=${classroom.id}&id=${id}`, { signal }); if (!signal?.aborted) { setAssignment(data); setAnswer(data.submissions.find(item => item.userId === userId)?.answerText || ""); setLoadError(""); } } catch (reason) { if (!signal?.aborted) setLoadError(message(reason)); } }, [id, classroom.id, request, userId]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const own = assignment?.submissions.find(item => item.userId === userId);
  return <section className="space-y-4 rounded-xl border-2 border-amber-700 p-5">
    {(action.error || loadError) && <p role="alert">{action.error || loadError}</p>}
    {!assignment ? <p role="status">Loading assignment...</p> : <>
      <h3 className="font-serif text-2xl">{assignment.title}</h3><p className="whitespace-pre-wrap">{assignment.instructions}</p>
      <button className={secondary} disabled={!assignment.available} onClick={() => onOpenResource(assignment.resourceId, classroom.languageId)}>Study assignment lesson</button>
      <button className={secondary} disabled={action.busy} onClick={() => void load()}>Refresh assignment and feedback</button>
      {!assignment.canTeach && classroom.role === "learner" && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void action.run(async () => { await post(request, "submit-assignment", { classroomId: classroom.id, assignmentId: id, assignmentVersion: assignment.version, submissionVersion: own?.version ?? 0, answerText: answer }); await load(); onChanged(); }); }}>
        <label className="block">My written assignment<textarea className={field} rows={6} required maxLength={50000} value={answer} onChange={event => setAnswer(event.target.value)} /></label>
        <p>Revising your written work clears its previous teacher grade for fresh review. Save lesson progress online before submitting to include your lesson result.</p>
        <button className={button} disabled={action.busy || classroom.archived || assignment.closed || !assignment.available}>{own ? "Submit revised assignment" : "Submit class assignment"}</button>
      </form>}
      <p>{assignment.canTeach ? `${assignment.submissionCount} submissions` : own ? "Your submitted work and feedback" : "You have not submitted this assignment."}</p>
      {assignment.submissions.map(submission => <section key={submission.id} className={card}><h4 className="font-semibold">{submission.name}</h4><p>{new Date(submission.submittedAt).toLocaleString()}{submission.isLate ? " · Late" : ""}</p><p className="whitespace-pre-wrap">{submission.answerText}</p>
        <p>Lesson result: {submission.autoScore !== null ? `${submission.autoScore}%` : "No synchronized result"} · Teacher result: {submission.teacherScore !== null ? `${submission.teacherScore}%` : "Awaiting review"}</p>
        {!submission.current && <p role="status">Previous assignment edition: review the new instructions and submit again. This result is excluded from the current gradebook.</p>}
        {submission.feedback && <p className="whitespace-pre-wrap">Teacher feedback: {submission.feedback}</p>}
        {assignment.canTeach && !classroom.archived && submission.current && <GradingForm key={`${submission.id}:${submission.version}`} submission={submission} disabled={action.busy} onGrade={(score, feedback) => action.run(async () => { await post(request, "grade", { classroomId: classroom.id, submissionId: submission.id, version: submission.version, score, feedback }); await load(); onChanged(); })} />}
      </section>)}
      {assignment.next && <button className={secondary} disabled={action.busy} onClick={() => void action.run(async () => { const data: AssignmentDetail = await request(`/api/v1/education?view=assignment&classroomId=${classroom.id}&id=${id}&after=${assignment.next}`); setAssignment(previous => previous ? { ...data, submissions: [...previous.submissions, ...data.submissions] } : data); })}>Load more submissions</button>}
    </>}
  </section>;
}
function GradingForm({ submission, disabled, onGrade }: { submission: SubmissionView; disabled: boolean; onGrade: (score: number, feedback: string) => Promise<void> }) {
  const [score, setScore] = useState(String(submission.teacherScore ?? "")), [feedback, setFeedback] = useState(submission.feedback || "");
  return <form className="space-y-3" onSubmit={event => { event.preventDefault(); void onGrade(Number(score), feedback); }}>
    <label className="block">Teacher score for {submission.name}<input className={field} type="number" min={0} max={100} required value={score} onChange={event => setScore(event.target.value)} /></label>
    <label className="block">Feedback for {submission.name}<textarea className={field} maxLength={20000} rows={3} value={feedback} onChange={event => setFeedback(event.target.value)} /></label>
    <button className={button} disabled={disabled}>Save teacher grade and feedback</button>
  </form>;
}
