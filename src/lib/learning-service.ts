import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AppAccount } from "@/lib/account-contract";
import { canEditContent, canFinalizeContent, canValidateCulture } from "@/lib/permissions";
import { publicRecordWhere } from "@/lib/governance";
import { ResourceInput, ProgressInput, gradeQuestions, type ResourceBody } from "@/lib/learning-contract";

export class LearningError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const publicLearningWhere = { status: "published", consentScope: "public_excerpt", restrictionLevel: "public" };
const sessionFor = (account: AppAccount) => ({ user: account, expires: "" });
const edit = (account: AppAccount, languageId: number) => canEditContent(sessionFor(account), languageId);
export function resourceView(resource: any, answers = false) {
  const body = resource.body as ResourceBody;
  return {
    id: resource.id, languageId: resource.languageId, kind: resource.kind, title: resource.title,
    description: resource.description, level: resource.level, audience: resource.audience,
    body: { text: body.text, teacherNotes: body.teacherNotes, activities: body.activities,
      questions: body.questions.map(q => ({ ...q, answer: answers ? q.answer : -1, explanation: answers ? q.explanation : "" })) },
    status: resource.status, version: resource.version, downloadAllowed: resource.downloadAllowed,
    ...(answers ? { sourceIds: resource.sourceIds || [], consentScope: resource.consentScope, restrictionLevel: resource.restrictionLevel } : {}),
    startsAt: resource.startsAt?.toISOString() ?? null, endsAt: resource.endsAt?.toISOString() ?? null,
    timeZone: resource.timeZone, location: resource.location,
  };
}

export async function listResources(query: URLSearchParams, account: AppAccount | null) {
  const languageId = Number(query.get("languageId"));
  if (!Number.isSafeInteger(languageId) || languageId < 1) throw new LearningError(400, "Choose a language.");
  if (query.has("downloads")) {
    const ids = z.array(z.string().uuid()).max(100).parse(query.get("downloads")!.split(",").filter(Boolean));
    return { downloads: await prisma.learningResource.findMany({ where: { id: { in: ids }, languageId, downloadAllowed: true, ...publicLearningWhere }, select: { id: true, version: true } }) };
  }
  const manage = query.get("manage") === "true";
  if (manage && (!account || !(edit(account, languageId) || canValidateCulture(sessionFor(account), languageId) || canFinalizeContent(sessionFor(account), languageId)))) throw new LearningError(403, "Content staff access required.");
  const after = query.get("after");
  const id = query.get("id") ? z.string().uuid().parse(query.get("id")) : null;
  if (after && !/^[0-9a-f-]{36}$/i.test(after)) throw new LearningError(400, "Invalid continuation.");
  const records = await prisma.learningResource.findMany({
    where: { languageId, ...(manage ? {} : publicLearningWhere), ...(id ? { id } : after ? { id: { gt: after } } : {}) },
    orderBy: { id: "asc" }, take: 51,
  });
  const page = records.slice(0, 50);
  if (id && !page.length) throw new LearningError(404, "This lesson is unavailable in the selected language.");
  const states = account ? await prisma.learningState.findMany({ where: { userId: account.id, resourceId: { in: page.map(r => r.id) } }, select: { resourceId: true, resourceVersion: true, completed: true, bestScore: true, attempts: true, position: true } }) : [];
  return { items: page.map(r => resourceView(r, manage)), states: states.filter(state => page.some(resource => resource.id === state.resourceId && resource.version === state.resourceVersion)), next: records.length > 50 ? page[page.length - 1].id : null,
    canEdit: !!account && edit(account, languageId), canReview: !!account && canValidateCulture(sessionFor(account), languageId), canPublish: !!account && canFinalizeContent(sessionFor(account), languageId) };
}

export async function saveResource(account: AppAccount, input: unknown, existing?: { id: string; version: number }) {
  const parsed = ResourceInput.parse(input);
  if (!edit(account, parsed.languageId)) throw new LearningError(403, "An editor for this language must author resources.");
  const language = await prisma.language.findFirst({ where: { id: parsed.languageId, isActive: true } });
  if (!language) throw new LearningError(400, "Language unavailable.");
  if (parsed.sourceIds.length) {
    const count = await prisma.culturalRecord.count({ where: { id: { in: parsed.sourceIds }, ...publicRecordWhere() } });
    if (count !== new Set(parsed.sourceIds).size) throw new LearningError(400, "Link only approved public source records.");
  }
  const values = { ...parsed, body: parsed.body as Prisma.InputJsonValue, startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null, endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null };
  const resource = existing ? await prisma.$transaction(async tx => {
    const previous = await tx.learningResource.findUnique({ where: { id: existing.id } });
    if (!previous || previous.languageId !== parsed.languageId || !["draft", "withdrawn"].includes(previous.status)) throw new LearningError(409, "Only drafts and withdrawn resources can be edited.");
    const changed = await tx.learningResource.updateMany({ where: { id: existing.id, version: existing.version, status: previous.status }, data: { ...values, status: "draft", reviewedBy: null, version: { increment: 1 } } });
    if (!changed.count) throw new LearningError(409, "Resource changed. Reload before editing.");
    await tx.auditLog.create({ data: { userId: account.id, action: "learning.edit", entityType: "learning_resource", entityId: existing.id, oldValue: { version: previous.version, body: previous.body, title: previous.title }, newValue: { version: previous.version + 1, body: values.body, title: values.title } } });
    return tx.learningResource.findUniqueOrThrow({ where: { id: existing.id } });
  }) : await prisma.learningResource.create({ data: { ...values, createdBy: account.id } });
  return resourceView(resource, true);
}

export async function transitionResource(account: AppAccount, id: string, version: number, action: "submit" | "approve" | "publish" | "withdraw") {
  const record = await prisma.learningResource.findUnique({ where: { id } });
  if (!record) throw new LearningError(404, "Resource not found.");
  const session = sessionFor(account);
  let status: string;
  if (action === "submit" && edit(account, record.languageId) && ["draft", "withdrawn"].includes(record.status)) status = "submitted";
  else if (action === "approve" && canValidateCulture(session, record.languageId) && record.status === "submitted" && record.createdBy !== account.id) status = "validated";
  else if (action === "publish" && canFinalizeContent(session, record.languageId) && record.status === "validated" && record.createdBy !== account.id) {
    if (record.consentScope !== "public_excerpt" || record.restrictionLevel !== "public") throw new LearningError(409, "Explicit public permission and public restriction are required.");
    status = "published";
  } else if (action === "withdraw" && canFinalizeContent(session, record.languageId)) status = "withdrawn";
  else throw new LearningError(403, "This action is unavailable for your role or this workflow stage.");
  const changed = await prisma.$transaction(async tx => {
    const update = await tx.learningResource.updateMany({ where: { id, version, status: record.status }, data: { status, version: { increment: 1 }, ...(action === "approve" ? { reviewedBy: account.id } : {}) } });
    if (!update.count) throw new LearningError(409, "Resource changed. Reload before continuing.");
    await tx.auditLog.create({ data: { userId: account.id, action: `learning.${action}`, entityType: "learning_resource", entityId: id, oldValue: { status: record.status, version }, newValue: { status, version: version + 1 } } });
    return tx.learningResource.findUniqueOrThrow({ where: { id } });
  });
  return resourceView(changed, true);
}

export async function recordProgress(account: AppAccount, input: unknown) {
  const data = ProgressInput.parse(input);
  if (data.ownerId !== account.id) throw new LearningError(403, "Saved progress belongs to another signed-in account.");
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...data, answers: Object.fromEntries(Object.entries(data.answers).sort()) })).digest("hex");
  // Serializable + unique receipt prevents duplicate attempts after offline retries.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const receipt = await tx.activityReceipt.findUnique({ where: { userId_operationId: { userId: account.id, operationId: data.operationId } } });
        if (receipt) {
          if (receipt.fingerprint !== fingerprint) throw new LearningError(409, "Operation identifier already used for different work.");
          return receipt.result;
        }
        const resource = await tx.learningResource.findFirst({ where: { id: data.resourceId, ...publicLearningWhere } });
        if (!resource) throw new LearningError(404, "This resource is no longer available.");
        if (resource.kind === "event") throw new LearningError(400, "Events do not have lesson scores.");
        if (resource.version !== data.version) throw new LearningError(409, "This lesson changed. Download its latest version before submitting.");
        const body = resource.body as unknown as ResourceBody;
        if (Object.keys(data.answers).some(id => !body.questions.some(q => q.id === id))) throw new LearningError(400, "Unknown question.");
        const grade = gradeQuestions(body, data.answers);
        const submitted = data.complete && body.questions.every(q => Object.hasOwn(data.answers, q.id));
        if (data.complete && !submitted) throw new LearningError(400, "Answer every question before finishing.");
        const previous = await tx.learningState.findUnique({ where: { userId_resourceId: { userId: account.id, resourceId: resource.id } } });
        const existing = previous?.resourceVersion === resource.version ? previous : null;
        const state = await tx.learningState.upsert({ where: { userId_resourceId: { userId: account.id, resourceId: resource.id } },
          create: { userId: account.id, resourceId: resource.id, resourceVersion: resource.version, position: data.position, attempts: submitted ? 1 : 0, bestScore: submitted ? grade.score : 0, completed: submitted && grade.score >= 70 },
          update: { resourceVersion: resource.version, position: Math.max(existing?.position ?? 0, data.position), attempts: (existing?.attempts ?? 0) + (submitted ? 1 : 0), bestScore: Math.max(existing?.bestScore ?? 0, submitted ? grade.score : 0), completed: existing?.completed || submitted && grade.score >= 70 } });
        const result = { resourceId: resource.id, completed: state.completed, bestScore: state.bestScore, attempts: state.attempts, position: state.position, ...(submitted ? { grade } : {}) };
        await tx.activityReceipt.create({ data: { userId: account.id, operationId: data.operationId, fingerprint, result } });
        return result;
      }, { isolationLevel: "Serializable" });
    } catch (error: any) {
      if (!["P2034", "P2002"].includes(error.code) || attempt === 2) throw error;
    }
  }
}
