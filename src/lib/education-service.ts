import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { AppAccount } from "./account-contract";
import { canEditContent, canFinalizeContent, canValidateCulture, isLanguageAdmin } from "./permissions";
import { assertAccountRateLimit } from "./account-security";
import { CourseInput, EducationAction, courseProgress, type CourseSummary, type CourseView, type ClassroomView, type AssignmentView, type AssignmentDetail } from "./education-contract";

export class EducationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const session = (account: AppAccount) => ({ user: account, expires: "" });
const rights = (account: AppAccount | null, languageId: number) => ({
  canEdit: !!account && canEditContent(session(account), languageId),
  canReview: !!account && canValidateCulture(session(account), languageId),
  canPublish: !!account && canFinalizeContent(session(account), languageId),
  canCreateClass: !!account && canEditContent(session(account), languageId),
});
const publicLesson = { status: "published", consentScope: "public_excerpt", restrictionLevel: "public", kind: { in: ["lesson", "game"] } };
const resourceSelect = { id: true, title: true, kind: true, version: true, languageId: true, status: true, consentScope: true, restrictionLevel: true } as const;
const courseInclude = { units: { orderBy: { position: "asc" as const }, include: { resource: { select: resourceSelect } } } };
type CourseRow = Prisma.LearningCourseGetPayload<{ include: typeof courseInclude }>;
type ResourceRow = CourseRow["units"][number]["resource"];
type ClassRow = Prisma.LearningClassroomGetPayload<{ include: { members: true } }>;
const PAGE_SIZE = 30;
export function availableCourseResource(resource: ResourceRow, languageId: number, version: number) {
  return resource.languageId === languageId && resource.status === "published" && resource.consentScope === "public_excerpt"
    && resource.restrictionLevel === "public" && ["lesson", "game"].includes(resource.kind) && resource.version === version;
}
function requireAccount(account: AppAccount | null): asserts account is AppAccount {
  if (!account) throw new EducationError(401, "Sign in to continue.");
}
async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 }); }
    catch (error: any) {
      if (!["P2034", "P2002"].includes(error.code)) throw error;
      if (attempt === 2) throw new EducationError(409, "Another change was saved at the same time. Refresh and retry.");
    }
  }
}
async function audit(tx: Prisma.TransactionClient, account: AppAccount, action: string, entityType: string, entityId: string, version?: number) {
  await tx.auditLog.create({ data: { userId: account.id, action: `education.${action}`, entityType, entityId, ...(version ? { newValue: { version } } : {}) } });
}
async function activeLanguage(tx: Pick<Prisma.TransactionClient, "language">, id: number) {
  if (!await tx.language.findFirst({ where: { id, isActive: true }, select: { id: true } })) throw new EducationError(404, "Language unavailable.");
}
async function lockActiveUser(tx: Prisma.TransactionClient, userId: string) {
  const users = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM users WHERE id = ${userId} AND status = 'active' FOR UPDATE`;
  if (!users.length) throw new EducationError(401, "This account is no longer active. Sign in again.");
}
function pageCursor(query: URLSearchParams) { return query.get("after") ? z.string().uuid().parse(query.get("after")) : null; }
function courseSummary(course: any, enrolled: boolean, readable = true): CourseSummary {
  return { id: course.id, languageId: course.languageId, title: readable ? course.title : "Course unavailable", description: readable ? course.description : "", level: readable ? course.level : "beginner", sequential: readable ? course.sequential : false,
    status: readable ? course.status : "unavailable", version: course.version, unitCount: readable ? course._count?.units ?? course.units?.length ?? 0 : 0, enrolled };
}
async function courseReady(course: CourseRow) {
  if (!course.units.length || course.units.some(unit => !availableCourseResource(unit.resource, course.languageId, unit.resourceVersion))) throw new EducationError(409, "A lesson was withdrawn or updated. An editor must refresh the course and obtain review before enrollment.");
}
export async function listCourses(query: URLSearchParams, account: AppAccount | null) {
  const languageId = z.coerce.number().int().positive().parse(query.get("languageId"));
  await activeLanguage(prisma, languageId);
  const access = rights(account, languageId), manage = query.get("manage") === "true", enrolledOnly = query.get("enrolled") === "true";
  if (manage && !access.canEdit && !access.canReview && !access.canPublish) throw new EducationError(403, "Course staff access required.");
  if (enrolledOnly) requireAccount(account);
  const after = pageCursor(query);
  const records = await prisma.learningCourse.findMany({ where: { languageId, ...(manage || enrolledOnly ? {} : { status: "published" }), ...(enrolledOnly ? { enrollments: { some: { userId: account!.id } } } : {}), ...(after ? { id: { gt: after } } : {}) },
    include: { _count: { select: { units: true } }, enrollments: { where: { userId: account?.id ?? "" }, select: { userId: true } } }, orderBy: { id: "asc" }, take: PAGE_SIZE + 1 });
  const page = records.slice(0, PAGE_SIZE);
  return { items: page.map(course => courseSummary(course, !!course.enrollments.length, course.status === "published" || manage)), next: records.length > PAGE_SIZE ? page[page.length - 1].id : null, ...access };
}
export async function getCourse(id: string, account: AppAccount | null): Promise<CourseView> {
  const course = await prisma.learningCourse.findUnique({ where: { id }, include: courseInclude });
  if (!course) throw new EducationError(404, "Course not found.");
  const access = rights(account, course.languageId), staff = access.canEdit || access.canReview || access.canPublish;
  if (course.status !== "published" && !staff) throw new EducationError(404, "Course unavailable.");
  await activeLanguage(prisma, course.languageId);
  const enrollment = account ? await prisma.courseEnrollment.findUnique({ where: { courseId_userId: { courseId: id, userId: account.id } } }) : null;
  const states = account && enrollment ? await prisma.learningState.findMany({ where: { userId: account.id, resourceId: { in: course.units.map(unit => unit.resourceId) } } }) : [];
  const currentEnrollment = enrollment?.courseVersion === course.version;
  const units = course.units.map(unit => {
    const available = availableCourseResource(unit.resource, course.languageId, unit.resourceVersion);
    const state = states.find(state => state.resourceId === unit.resourceId && state.resourceVersion === unit.resourceVersion && state.attempts > 0);
    return { id: unit.id, resourceId: unit.resourceId, resourceVersion: unit.resourceVersion, position: unit.position, minimumScore: unit.minimumScore,
      title: available || staff ? unit.resource.title : "Lesson unavailable", available, score: currentEnrollment && state ? state.bestScore : null };
  });
  const progress = courseProgress(units, course.sequential);
  return { ...courseSummary(course, !!enrollment), ...access, isAuthor: course.createdBy === account?.id, needsEnrollmentUpdate: !!enrollment && !currentEnrollment,
    canEnroll: course.status === "published" && units.length > 0 && units.every(unit => unit.available),
    progress: progress.percent, completedUnits: progress.completed, units: units.map((unit, index) => ({ ...unit, complete: progress.units[index].complete, unlocked: progress.units[index].unlocked })) };
}
async function saveCourse(account: AppAccount, input: unknown, target?: { id: string; version: number }) {
  const course = CourseInput.parse(input);
  if (!rights(account, course.languageId).canEdit) throw new EducationError(403, "A language editor must author courses.");
  return serializable(async tx => {
    await activeLanguage(tx, course.languageId);
    const resources = await tx.learningResource.findMany({ where: { id: { in: course.units.map(unit => unit.resourceId) }, languageId: course.languageId, ...publicLesson }, select: { id: true, version: true } });
    if (resources.length !== course.units.length) throw new EducationError(409, "Use only current published lessons or games in this language.");
    const units = course.units.map((unit, position) => ({ resourceId: unit.resourceId, resourceVersion: resources.find(resource => resource.id === unit.resourceId)!.version, position, minimumScore: unit.minimumScore }));
    const { units: _units, ...fields } = course;
    let id: string, version: number;
    if (target) {
      const previous = await tx.learningCourse.findUnique({ where: { id: target.id } });
      if (!previous || previous.languageId !== course.languageId || !["draft", "withdrawn"].includes(previous.status)) throw new EducationError(409, "Withdraw a published course before changing its curriculum.");
      const changed = await tx.learningCourse.updateMany({ where: { id: target.id, version: target.version, status: previous.status }, data: { ...fields, reviewedBy: null, status: "draft", version: { increment: 1 } } });
      if (!changed.count) throw new EducationError(409, "Course changed. Refresh before editing.");
      await tx.courseUnit.deleteMany({ where: { courseId: target.id } });
      id = target.id; version = target.version + 1;
    } else {
      const created = await tx.learningCourse.create({ data: { ...fields, createdBy: account.id } }); id = created.id; version = created.version;
    }
    await tx.courseUnit.createMany({ data: units.map(unit => ({ ...unit, courseId: id })) });
    await audit(tx, account, target ? "edit-course" : "create-course", "learning_course", id, version);
    return { id, version };
  });
}
async function transitionCourse(account: AppAccount, action: string, id: string, version: number) {
  return serializable(async tx => {
    const course = await tx.learningCourse.findUnique({ where: { id }, include: courseInclude });
    if (!course) throw new EducationError(404, "Course not found.");
    const access = rights(account, course.languageId);
    let status: string;
    if (action === "submit-course" && access.canEdit && ["draft", "withdrawn"].includes(course.status)) status = "submitted";
    else if (action === "approve-course" && access.canReview && course.status === "submitted" && account.id !== course.createdBy) status = "validated";
    else if (action === "publish-course" && access.canPublish && course.status === "validated" && account.id !== course.createdBy) status = "published";
    else if (action === "withdraw-course" && access.canPublish && course.status !== "withdrawn") status = "withdrawn";
    else throw new EducationError(403, "Your role or the review stage does not permit this action. Authors cannot review their own course.");
    if (status !== "withdrawn") await courseReady(course);
    const result = await tx.learningCourse.updateMany({ where: { id, version, status: course.status }, data: { status, version: { increment: 1 }, ...(status === "validated" ? { reviewedBy: account.id } : {}) } });
    if (!result.count) throw new EducationError(409, "Course changed. Refresh and retry.");
    await audit(tx, account, action, "learning_course", id, version + 1);
    return { id, version: version + 1 };
  });
}
const classAdmin = (account: AppAccount, classroom: { languageId: number }) => isLanguageAdmin(session(account), classroom.languageId);
function teaching(account: AppAccount, classroom: ClassRow) { return classAdmin(account, classroom) || classroom.members.some(member => member.userId === account.id && member.role === "teacher"); }
async function loadClass(tx: Prisma.TransactionClient | typeof prisma, id: string, account: AppAccount) {
  const classroom = await tx.learningClassroom.findUnique({ where: { id }, include: { members: true } });
  if (!classroom || !classAdmin(account, classroom) && !classroom.members.some(member => member.userId === account.id)) throw new EducationError(404, "Class unavailable for this account.");
  return classroom;
}
async function bumpClass(tx: Prisma.TransactionClient, classroom: ClassRow, expected = classroom.version) {
  const result = await tx.learningClassroom.updateMany({ where: { id: classroom.id, version: expected }, data: { version: { increment: 1 } } });
  if (!result.count) throw new EducationError(409, "Class changed. Refresh before continuing.");
}
function classSummary(classroom: ClassRow, account: AppAccount) {
  return { id: classroom.id, title: classroom.title, languageId: classroom.languageId, courseId: classroom.courseId, version: classroom.version,
    archived: !!classroom.archivedAt, role: classroom.members.find(member => member.userId === account.id)?.role ?? "coordinator" };
}
export async function listClasses(query: URLSearchParams, account: AppAccount | null) {
  requireAccount(account);
  const languageId = z.coerce.number().int().positive().parse(query.get("languageId"));
  const after = pageCursor(query), admin = isLanguageAdmin(session(account), languageId);
  const records = await prisma.learningClassroom.findMany({ where: { languageId, ...(admin ? {} : { members: { some: { userId: account.id } } }), ...(after ? { id: { gt: after } } : {}) }, include: { members: { where: { userId: account.id } } }, orderBy: { id: "asc" }, take: PAGE_SIZE + 1 });
  return { items: records.slice(0, PAGE_SIZE).map(classroom => classSummary(classroom, account)), next: records.length > PAGE_SIZE ? records[PAGE_SIZE - 1].id : null, canCreateClass: rights(account, languageId).canCreateClass };
}
const assignmentSelect = { resource: { select: resourceSelect }, _count: { select: { submissions: true } } };
type AssignmentRow = Prisma.ClassAssignmentGetPayload<{ include: typeof assignmentSelect }>;
function assignmentView(assignment: AssignmentRow, languageId: number, own?: { version: number; assignmentVersion: number; autoScore: number | null; teacherScore: number | null }): AssignmentView {
  return { id: assignment.id, resourceId: assignment.resourceId, resourceVersion: assignment.resourceVersion, title: assignment.title, instructions: assignment.instructions,
    dueAt: assignment.dueAt?.toISOString() ?? null, closed: !!assignment.closedAt, available: availableCourseResource(assignment.resource, languageId, assignment.resourceVersion), version: assignment.version,
    submissionCount: assignment._count.submissions, myScore: own && own.assignmentVersion === assignment.contentVersion ? own.teacherScore ?? own.autoScore : null, mySubmissionVersion: own?.version ?? null };
}
export async function getClassroom(id: string, account: AppAccount | null): Promise<ClassroomView> {
  requireAccount(account);
  const classroom = await loadClass(prisma, id, account), canTeach = teaching(account, classroom);
  const members = await prisma.classMembership.findMany({ where: { classroomId: id, ...(canTeach ? {} : { OR: [{ userId: account.id }, { role: "teacher" }] }) }, include: { user: { select: { name: true } } }, orderBy: { joinedAt: "asc" } });
  const assignments = await prisma.classAssignment.findMany({ where: { classroomId: id }, include: { ...assignmentSelect, submissions: { where: { userId: account.id }, select: { version: true, assignmentVersion: true, autoScore: true, teacherScore: true } } }, orderBy: { createdAt: "asc" }, take: 100 });
  const own = classroom.members.find(member => member.userId === account.id);
  return { ...classSummary(classroom, account), canTeach, canManageTeachers: classAdmin(account, classroom), canLeave: !!own && (own.role !== "teacher" || !!classroom.archivedAt || classroom.members.filter(member => member.role === "teacher").length > 1),
    inviteExpiresAt: canTeach ? classroom.inviteExpiresAt?.toISOString() ?? null : null,
    members: members.map(member => ({ userId: member.userId, role: member.role, name: member.user.name || "Class member" })),
    assignments: assignments.map(assignment => ({ ...assignmentView(assignment, classroom.languageId, assignment.submissions[0]), submissionCount: canTeach ? assignment._count.submissions : assignment.submissions.length })) };
}
export async function getAssignment(query: URLSearchParams, account: AppAccount | null): Promise<AssignmentDetail> {
  requireAccount(account);
  const classroomId = z.string().uuid().parse(query.get("classroomId")), id = z.string().uuid().parse(query.get("id")), after = pageCursor(query);
  const classroom = await loadClass(prisma, classroomId, account), canTeach = teaching(account, classroom);
  const assignment = await prisma.classAssignment.findFirst({ where: { id, classroomId }, include: assignmentSelect });
  if (!assignment) throw new EducationError(404, "Assignment unavailable.");
  const submissions = await prisma.assignmentSubmission.findMany({ where: { assignmentId: id, ...(canTeach ? {} : { userId: account.id }), ...(after ? { id: { gt: after } } : {}) }, include: { user: { select: { name: true } } }, orderBy: { id: "asc" }, take: 21 });
  return { ...assignmentView(assignment, classroom.languageId, submissions.find(item => item.userId === account.id)), submissionCount: canTeach ? assignment._count.submissions : submissions.length,
    classroomId, canTeach, next: submissions.length > 20 ? submissions[19].id : null,
    submissions: submissions.slice(0, 20).map(item => ({ id: item.id, assignmentId: id, userId: item.userId, name: item.user.name || "Learner", answerText: item.answerText, autoScore: item.autoScore, teacherScore: item.teacherScore, feedback: item.feedback, submittedAt: item.submittedAt.toISOString(), gradedAt: item.gradedAt?.toISOString() ?? null, isLate: item.isLate, version: item.version, assignmentVersion: item.assignmentVersion, current: item.assignmentVersion === assignment.contentVersion })) };
}
export async function getGradebook(classroomId: string, account: AppAccount | null) {
  requireAccount(account);
  const classroom = await loadClass(prisma, classroomId, account);
  if (!teaching(account, classroom)) throw new EducationError(403, "Only assigned teachers and language coordinators can read the gradebook.");
  const [members, assignments, submissions] = await Promise.all([
    prisma.classMembership.findMany({ where: { classroomId, role: "learner" }, include: { user: { select: { name: true } } }, orderBy: { joinedAt: "asc" } }),
    prisma.classAssignment.findMany({ where: { classroomId }, select: { id: true, title: true, contentVersion: true }, orderBy: { createdAt: "asc" }, take: 100 }),
    prisma.assignmentSubmission.findMany({ where: { assignment: { classroomId } }, select: { userId: true, assignmentId: true, assignmentVersion: true, autoScore: true, teacherScore: true, isLate: true, gradedAt: true }, take: 30000 }),
  ]);
  const index = new Map(submissions.map(item => [`${item.userId}:${item.assignmentId}`, item]));
  return { title: classroom.title, assignments, learners: members.map(member => ({ userId: member.userId, name: member.user.name || "Learner", grades: assignments.map(assignment => {
    const submission = index.get(`${member.userId}:${assignment.id}`);
    const current = submission?.assignmentVersion === assignment.contentVersion;
    return { assignmentId: assignment.id, score: submission && current ? submission.teacherScore ?? submission.autoScore : null, submitted: !!submission, late: submission?.isLate ?? false, manuallyGraded: !!submission?.gradedAt && current, needsRevision: !!submission && !current };
  }) })) };
}
function invite() {
  const code = randomBytes(12).toString("base64url");
  return { code, inviteCodeHash: createHash("sha256").update(code).digest("hex"), inviteExpiresAt: new Date(Date.now() + 7 * 86400000) };
}
export async function educationAction(account: AppAccount, raw: unknown) {
  const input = EducationAction.parse(raw);
  if (input.action === "create-course") return saveCourse(account, input.data);
  if (input.action === "edit-course") return saveCourse(account, input.data.course, input.data);
  if (["submit-course", "approve-course", "publish-course", "withdraw-course"].includes(input.action)) {
    const data = z.object({ id: z.string().uuid(), version: z.number().int().positive() }).parse(input.data);
    return transitionCourse(account, input.action, data.id, data.version);
  }
  if (input.action === "unenroll") return prisma.courseEnrollment.deleteMany({ where: { courseId: input.data.id, userId: account.id } });
  if (input.action === "enroll") return serializable(async tx => {
    await lockActiveUser(tx, account.id);
    const course = await tx.learningCourse.findUnique({ where: { id: input.data.id }, include: courseInclude });
    if (!course || course.status !== "published") throw new EducationError(404, "Course unavailable.");
    if (course.version !== input.data.version) throw new EducationError(409, "Course changed. Review the current curriculum before enrolling.");
    await activeLanguage(tx, course.languageId); await courseReady(course);
    return tx.courseEnrollment.upsert({ where: { courseId_userId: { courseId: course.id, userId: account.id } }, create: { courseId: course.id, userId: account.id, courseVersion: course.version }, update: { courseVersion: course.version }, select: { id: true, courseVersion: true } });
  });
  if (input.action === "create-class") {
    if (!rights(account, input.data.languageId).canCreateClass) throw new EducationError(403, "A language editor or coordinator must create classes and assign teaching access.");
    const invitation = invite();
    return serializable(async tx => {
      await lockActiveUser(tx, account.id);
      await activeLanguage(tx, input.data.languageId);
      if (input.data.courseId) {
        const course = await tx.learningCourse.findFirst({ where: { id: input.data.courseId, languageId: input.data.languageId, status: "published" }, include: courseInclude });
        if (!course) throw new EducationError(409, "Choose a published course in the class language.");
        await courseReady(course);
      }
      const classroom = await tx.learningClassroom.create({ data: { ...input.data, createdBy: account.id, inviteCodeHash: invitation.inviteCodeHash, inviteExpiresAt: invitation.inviteExpiresAt, members: { create: { userId: account.id, role: "teacher" } } } });
      await audit(tx, account, input.action, "learning_classroom", classroom.id, classroom.version);
      return { id: classroom.id, version: classroom.version, code: invitation.code };
    });
  }
  if (input.action === "join-class") {
    await assertAccountRateLimit(account.id, "join-class", 10);
    return serializable(async tx => {
      await lockActiveUser(tx, account.id);
      const classroom = await tx.learningClassroom.findUnique({ where: { inviteCodeHash: createHash("sha256").update(input.data.code).digest("hex") }, include: { members: true } });
      if (!classroom || classroom.archivedAt || !classroom.inviteExpiresAt || classroom.inviteExpiresAt <= new Date()) throw new EducationError(404, "This class code is invalid, expired or disabled.");
      await activeLanguage(tx, classroom.languageId);
      if (classroom.members.some(member => member.userId === account.id)) return { id: classroom.id };
      if (classroom.members.length >= 300) throw new EducationError(409, "This class has reached its 300-member limit.");
      await bumpClass(tx, classroom);
      await tx.classMembership.create({ data: { classroomId: classroom.id, userId: account.id, role: "learner" } });
      await audit(tx, account, input.action, "learning_classroom", classroom.id);
      return { id: classroom.id };
    });
  }
  // All class mutations recheck membership inside a serializable transaction.
  // Updating the class version serializes membership removal, invite rotation,
  // archival and submission/grade writes against each other.
  const classId = z.string().uuid().parse((input.data as { classroomId?: string }).classroomId);
  return serializable(async tx => {
    await lockActiveUser(tx, account.id);
    const classroom = await loadClass(tx, classId, account), teacher = teaching(account, classroom);
    if (!["leave-class", "archive-class"].includes(input.action)) await activeLanguage(tx, classroom.languageId);
    const data = input.data;
    if (classroom.archivedAt && input.action !== "leave-class") throw new EducationError(409, "Archived classes are read-only. You may still leave and remove your own class work.");
    const learnerAction = input.action === "submit-assignment" || input.action === "leave-class";
    if (!learnerAction && !teacher) throw new EducationError(403, "Assigned teaching access is required.");
    const expected = "version" in data && input.action !== "grade" ? data.version : classroom.version;
    await bumpClass(tx, classroom, expected);
    let result: { id: string; version?: number; code?: string } = { id: classroom.id, version: classroom.version + 1 };
    if (input.action === "rotate-code" || input.action === "disable-code") {
      const invitation = input.action === "rotate-code" ? invite() : null;
      await tx.learningClassroom.update({ where: { id: classId }, data: { inviteCodeHash: invitation?.inviteCodeHash ?? null, inviteExpiresAt: invitation?.inviteExpiresAt ?? null } });
      if (invitation) result.code = invitation.code;
    } else if (input.action === "archive-class") {
      await tx.learningClassroom.update({ where: { id: classId }, data: { archivedAt: new Date(), inviteCodeHash: null, inviteExpiresAt: null } });
    } else if (input.action === "add-teacher") {
      if (!classAdmin(account, classroom)) throw new EducationError(403, "Only a language coordinator can grant teaching access.");
      const user = await tx.user.findFirst({ where: { email: { equals: input.data.email, mode: "insensitive" }, status: "active" }, select: { id: true } });
      if (!user) throw new EducationError(404, "No active account matches that email.");
      await lockActiveUser(tx, user.id);
      if (classroom.members.length >= 300 && !classroom.members.some(member => member.userId === user.id)) throw new EducationError(409, "This class has reached its member limit.");
      await tx.classMembership.upsert({ where: { classroomId_userId: { classroomId: classId, userId: user.id } }, create: { classroomId: classId, userId: user.id, role: "teacher" }, update: { role: "teacher" } });
    } else if (input.action === "remove-member" || input.action === "leave-class") {
      const userId = input.action === "leave-class" ? account.id : input.data.userId;
      const member = classroom.members.find(member => member.userId === userId);
      if (!member) throw new EducationError(404, "Membership not found.");
      if (member.role === "teacher") {
        if (input.action !== "leave-class" && !classAdmin(account, classroom)) throw new EducationError(403, "Only a language coordinator can remove another teacher.");
        if (!classroom.archivedAt && classroom.members.filter(member => member.role === "teacher").length <= 1) throw new EducationError(409, "Assign another teacher or archive the class before removing its last teacher.");
      }
      await tx.assignmentSubmission.deleteMany({ where: { userId, assignment: { classroomId: classId } } });
      await tx.classMembership.deleteMany({ where: { classroomId: classId, userId } });
    } else if (input.action === "create-assignment") {
      if (await tx.classAssignment.count({ where: { classroomId: classId } }) >= 100) throw new EducationError(409, "A class supports up to 100 assignments. Create another class for further teaching.");
      const resource = await tx.learningResource.findFirst({ where: { id: input.data.resourceId, languageId: classroom.languageId, ...publicLesson }, select: resourceSelect });
      if (!resource) throw new EducationError(409, "Choose a current published lesson or game in this language.");
      const assignment = await tx.classAssignment.create({ data: { classroomId: classId, createdBy: account.id, resourceId: resource.id, resourceVersion: resource.version, title: input.data.title, instructions: input.data.instructions, dueAt: input.data.dueAt ? new Date(input.data.dueAt) : null } });
      result = { id: assignment.id, version: assignment.version };
    } else if (input.action === "edit-assignment" || input.action === "close-assignment") {
      const assignment = await tx.classAssignment.updateMany({ where: { id: input.data.assignmentId, classroomId: classId, version: input.data.assignmentVersion, closedAt: null }, data: input.action === "close-assignment" ? { closedAt: new Date(), version: { increment: 1 } } : { title: input.data.title, instructions: input.data.instructions, dueAt: input.data.dueAt ? new Date(input.data.dueAt) : null, version: { increment: 1 }, contentVersion: { increment: 1 } } });
      if (!assignment.count) throw new EducationError(409, "Assignment changed or closed. Refresh before continuing.");
      result = { id: input.data.assignmentId, version: input.data.assignmentVersion + 1 };
    } else if (input.action === "submit-assignment") {
      if (!classroom.members.some(member => member.userId === account.id && member.role === "learner")) throw new EducationError(403, "Join this class as a learner to submit an assignment.");
      const assignment = await tx.classAssignment.findFirst({ where: { id: input.data.assignmentId, classroomId: classId }, include: { resource: { select: resourceSelect } } });
      if (!assignment || assignment.closedAt || assignment.version !== input.data.assignmentVersion || !availableCourseResource(assignment.resource, classroom.languageId, assignment.resourceVersion)) throw new EducationError(409, "Assignment closed, changed or its lesson became unavailable. Refresh before submitting.");
      const previous = await tx.assignmentSubmission.findUnique({ where: { assignmentId_userId: { assignmentId: assignment.id, userId: account.id } } });
      if (previous && previous.assignmentVersion === assignment.contentVersion && previous.answerText === input.data.answerText && [previous.version, previous.version - 1].includes(input.data.submissionVersion)) return { id: previous.id, version: previous.version };
      if ((previous?.version ?? 0) !== input.data.submissionVersion) throw new EducationError(409, "This submission changed on another device. Refresh before replacing it.");
      const state = await tx.learningState.findUnique({ where: { userId_resourceId: { userId: account.id, resourceId: assignment.resourceId } } });
      const values = { answerText: input.data.answerText, assignmentVersion: assignment.contentVersion, autoScore: state?.resourceVersion === assignment.resourceVersion && state.attempts > 0 ? state.bestScore : null, teacherScore: null, feedback: null, gradedBy: null, gradedAt: null, submittedAt: new Date(), isLate: !!assignment.dueAt && assignment.dueAt < new Date() };
      const submission = previous ? await tx.assignmentSubmission.update({ where: { id: previous.id }, data: { ...values, version: { increment: 1 } } }) : await tx.assignmentSubmission.create({ data: { ...values, assignmentId: assignment.id, userId: account.id } });
      result = { id: submission.id, version: submission.version };
    } else if (input.action === "grade") {
      const current = await tx.assignmentSubmission.findFirst({ where: { id: input.data.submissionId, assignment: { classroomId: classId } }, include: { assignment: { select: { contentVersion: true } } } });
      if (!current || current.assignmentVersion !== current.assignment.contentVersion) throw new EducationError(409, "The assignment instructions changed. Ask the learner to submit the current assignment before grading it.");
      const submission = await tx.assignmentSubmission.updateMany({ where: { id: input.data.submissionId, assignment: { classroomId: classId }, version: input.data.version }, data: { teacherScore: input.data.score, feedback: input.data.feedback, gradedAt: new Date(), gradedBy: account.id, version: { increment: 1 } } });
      if (!submission.count) throw new EducationError(409, "The learner revised this work or another teacher graded it. Refresh before grading.");
      result = { id: input.data.submissionId, version: input.data.version + 1 };
    } else throw new EducationError(400, "Unknown class action.");
    await audit(tx, account, input.action, input.action === "grade" || input.action === "submit-assignment" ? "assignment_submission" : "learning_classroom", result.id, result.version);
    return result;
  });
}

export async function educationRead(query: URLSearchParams, account: AppAccount | null) {
  const view = query.get("view") || "courses";
  if (view === "courses") return listCourses(query, account);
  if (view === "classes") return listClasses(query, account);
  if (view === "assignment") return getAssignment(query, account);
  if (view === "course") return getCourse(z.string().uuid().parse(query.get("id")), account);
  if (view === "classroom") return getClassroom(z.string().uuid().parse(query.get("id")), account);
  if (view === "gradebook") return getGradebook(z.string().uuid().parse(query.get("id")), account);
  if (view === "resources") {
    const languageId = z.coerce.number().int().positive().parse(query.get("languageId")), after = pageCursor(query);
    await activeLanguage(prisma, languageId);
    const items = await prisma.learningResource.findMany({ where: { languageId, ...publicLesson, ...(after ? { id: { gt: after } } : {}) }, select: { id: true, title: true, kind: true, level: true, version: true }, orderBy: { id: "asc" }, take: 51 });
    return { items: items.slice(0, 50), next: items.length > 50 ? items[49].id : null };
  }
  throw new EducationError(400, "Unknown education view.");
}
