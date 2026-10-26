import { z } from "zod";

export const CourseInput = z.object({
  languageId: z.number().int().positive(), title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(10000), level: z.enum(["beginner", "intermediate", "advanced"]),
  sequential: z.boolean(),
  units: z.array(z.object({ resourceId: z.string().uuid(), minimumScore: z.number().int().min(0).max(100).default(70) }).strict()).min(1).max(100),
}).strict().refine(value => new Set(value.units.map(unit => unit.resourceId)).size === value.units.length, "A lesson can appear only once in a course.");
const target = { id: z.string().uuid(), version: z.number().int().positive() };
const classTarget = { classroomId: z.string().uuid(), version: z.number().int().positive() };
const assignmentFields = {
  title: z.string().trim().min(2).max(200), instructions: z.string().trim().max(20000), dueAt: z.string().datetime().nullable(),
};
export const EducationAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create-course"), data: CourseInput }).strict(),
  z.object({ action: z.literal("edit-course"), data: z.object({ ...target, course: CourseInput }).strict() }).strict(),
  z.object({ action: z.literal("submit-course"), data: z.object(target).strict() }).strict(),
  z.object({ action: z.literal("approve-course"), data: z.object(target).strict() }).strict(),
  z.object({ action: z.literal("publish-course"), data: z.object(target).strict() }).strict(),
  z.object({ action: z.literal("withdraw-course"), data: z.object(target).strict() }).strict(),
  z.object({ action: z.literal("enroll"), data: z.object(target).strict() }).strict(),
  z.object({ action: z.literal("unenroll"), data: z.object({ id: z.string().uuid() }).strict() }).strict(),
  z.object({ action: z.literal("create-class"), data: z.object({ languageId: z.number().int().positive(), title: z.string().trim().min(2).max(200), courseId: z.string().uuid().nullable() }).strict() }).strict(),
  z.object({ action: z.literal("join-class"), data: z.object({ code: z.string().trim().regex(/^[a-zA-Z0-9_-]{16}$/, "Enter the complete class code.") }).strict() }).strict(),
  z.object({ action: z.literal("rotate-code"), data: z.object(classTarget).strict() }).strict(),
  z.object({ action: z.literal("disable-code"), data: z.object(classTarget).strict() }).strict(),
  z.object({ action: z.literal("archive-class"), data: z.object(classTarget).strict() }).strict(),
  z.object({ action: z.literal("leave-class"), data: z.object(classTarget).strict() }).strict(),
  z.object({ action: z.literal("add-teacher"), data: z.object({ ...classTarget, email: z.string().trim().email().max(254) }).strict() }).strict(),
  z.object({ action: z.literal("remove-member"), data: z.object({ ...classTarget, userId: z.string().uuid() }).strict() }).strict(),
  z.object({ action: z.literal("create-assignment"), data: z.object({ ...classTarget, ...assignmentFields, resourceId: z.string().uuid() }).strict() }).strict(),
  z.object({ action: z.literal("edit-assignment"), data: z.object({ ...classTarget, assignmentId: z.string().uuid(), assignmentVersion: z.number().int().positive(), ...assignmentFields }).strict() }).strict(),
  z.object({ action: z.literal("close-assignment"), data: z.object({ ...classTarget, assignmentId: z.string().uuid(), assignmentVersion: z.number().int().positive() }).strict() }).strict(),
  z.object({ action: z.literal("submit-assignment"), data: z.object({ classroomId: z.string().uuid(), assignmentId: z.string().uuid(), assignmentVersion: z.number().int().positive(), submissionVersion: z.number().int().nonnegative(), answerText: z.string().trim().min(1).max(50000) }).strict() }).strict(),
  z.object({ action: z.literal("grade"), data: z.object({ classroomId: z.string().uuid(), submissionId: z.string().uuid(), version: z.number().int().positive(), score: z.number().int().min(0).max(100), feedback: z.string().trim().max(20000) }).strict() }).strict(),
]);

export type ResourceChoice = { id: string; title: string; kind: string; level: string; version: number };
export type CourseSummary = { id: string; title: string; description: string; languageId: number; level: string; sequential: boolean; status: string; version: number; unitCount: number; enrolled: boolean };
export type CourseView = CourseSummary & {
  isAuthor: boolean;
  canEdit: boolean; canReview: boolean; canPublish: boolean; needsEnrollmentUpdate: boolean;
  progress: number; completedUnits: number; canEnroll: boolean;
  units: { id: string; resourceId: string; resourceVersion: number; position: number; minimumScore: number; title: string; available: boolean; complete: boolean; unlocked: boolean; score: number | null }[];
};
export type CourseListing = { items: CourseSummary[]; next: string | null; canEdit: boolean; canReview: boolean; canPublish: boolean; canCreateClass: boolean };
export type ClassSummary = { id: string; title: string; languageId: number; courseId: string | null; version: number; archived: boolean; role: string };
export type SubmissionView = { id: string; assignmentId: string; userId: string; name: string; answerText: string; autoScore: number | null; teacherScore: number | null; feedback: string | null; submittedAt: string; gradedAt: string | null; isLate: boolean; version: number; assignmentVersion: number; current: boolean };
export type AssignmentView = { id: string; resourceId: string; resourceVersion: number; title: string; instructions: string; dueAt: string | null; closed: boolean; available: boolean; version: number; submissionCount: number; myScore: number | null; mySubmissionVersion: number | null };
export type AssignmentDetail = AssignmentView & { classroomId: string; canTeach: boolean; submissions: SubmissionView[]; next: string | null };
export type ClassroomView = ClassSummary & {
  canTeach: boolean; canManageTeachers: boolean; canLeave: boolean; inviteExpiresAt: string | null;
  members: { userId: string; name: string; role: string }[]; assignments: AssignmentView[];
};
export type GradebookView = { title: string; assignments: { id: string; title: string }[]; learners: { userId: string; name: string; grades: { assignmentId: string; score: number | null; submitted: boolean; late: boolean; manuallyGraded: boolean; needsRevision: boolean }[] }[] };

export function courseProgress(units: { available: boolean; score: number | null; minimumScore: number }[], sequential: boolean) {
  let previousComplete = true;
  const progress = units.map(unit => {
    const unlocked = !sequential || previousComplete;
    const complete = unit.available && unit.score !== null && unit.score >= unit.minimumScore && unlocked;
    previousComplete = previousComplete && complete;
    return { ...unit, complete, unlocked };
  });
  const completed = progress.filter(unit => unit.complete).length;
  return { units: progress, completed, percent: units.length ? Math.round(completed * 100 / units.length) : 0 };
}

export function gradebookCsv(rows: string[][]) {
  // Spreadsheet formulas must not be activated by a learner's name or text.
  return rows.map(row => row.map(value => `"${(/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
}
