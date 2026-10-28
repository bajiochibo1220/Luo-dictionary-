import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { canPublishBeforeReview } from "@/lib/permissions";
import { mayReviewRecord } from "@/lib/governance";
import { publicReleaseIssues } from "@/lib/public-release-readiness";
import { EARLY_PUBLICATION_STATUSES, writePublication } from "@/lib/content-publication";

export async function publishBeforeReview(tx: Prisma.TransactionClient, id: string, session: Session) {
  const actorId = session.user.id;
  await tx.$queryRaw`SELECT id FROM cultural_records WHERE id = ${id} FOR UPDATE`;
  const record = await tx.culturalRecord.findUnique({ where: { id }, include: { module: { select: { code: true } } } });
  if (!record) throw Object.assign(new Error("Content not found."), { status: 404 });
  if (!canPublishBeforeReview(session, record.languageId) || !mayReviewRecord(session.user, record) || record.contributorId === actorId) {
    throw Object.assign(new Error("An independent reviewer, editor, publisher or administrator assigned to this language must publish this upload."), { status: 403 });
  }
  if (record.publicationOfId || !EARLY_PUBLICATION_STATUSES.includes(record.status)) throw Object.assign(new Error("This item cannot be published before review at its current stage."), { status: 409 });
  if (await tx.culturalRecord.findUnique({ where: { publicationOfId: id } })) throw Object.assign(new Error("This upload already has a public version. Complete review and publish the reviewed version to replace it."), { status: 409 });
  const issues = publicReleaseIssues(record);
  if (issues.length) {
    throw Object.assign(new Error(`"${record.title || "Untitled upload"}": ${issues.join(" ")} Save the source and access settings, then try publishing before review again.`), { status: 400 });
  }
  const published = await writePublication(tx, id, actorId, true);
  if (record.status === "draft") await tx.culturalRecord.update({ where: { id }, data: { status: "submitted", validatorId: null } });
  await tx.reviewHistory.create({ data: { recordId: id, reviewerId: actorId, action: "published_before_review", stage: "early_publication", comments: "Public snapshot released; cultural and editorial review remains pending." } });
  await tx.auditLog.create({ data: { userId: actorId, action: "content.published_before_review", entityType: "cultural_record", entityId: id, newValue: { publicationId: published.id, isProvisional: true } } });
  return published;
}
