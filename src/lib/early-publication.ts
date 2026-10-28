import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { canPublishBeforeReview } from "@/lib/permissions";
import { mayReviewRecord, buildRecordUri } from "@/lib/governance";
import { publicReleaseIssues } from "@/lib/public-release-readiness";
import { EARLY_PUBLICATION_STATUSES, writePublication } from "@/lib/content-publication";

export async function publishBeforeReview(tx: Prisma.TransactionClient, id: string, session: Session, confirmPublicSharing = false, overrideAccessRestrictions = false) {
  const actorId = session.user.id;
  await tx.$queryRaw`SELECT id FROM cultural_records WHERE id = ${id} FOR UPDATE`;
  const record = await tx.culturalRecord.findUnique({ where: { id }, include: { module: { select: { code: true } } } });
  if (!record) throw Object.assign(new Error("Content not found."), { status: 404 });
  if (!canPublishBeforeReview(session, record.languageId) || (!overrideAccessRestrictions && (!mayReviewRecord(session.user, record) || record.contributorId === actorId))) {
    throw Object.assign(new Error("An independent reviewer, editor, publisher or administrator assigned to this language must publish this upload."), { status: 403 });
  }
  if (record.publicationOfId || !EARLY_PUBLICATION_STATUSES.includes(record.status)) throw Object.assign(new Error("This item cannot be published before review at its current stage."), { status: 409 });
  if (await tx.culturalRecord.findUnique({ where: { publicationOfId: id } })) throw Object.assign(new Error("This upload already has a public version. Complete review and publish the reviewed version to replace it."), { status: 409 });
  if (overrideAccessRestrictions) {
    if (!record.title.trim()) throw Object.assign(new Error("Add a title before publishing."), { status: 400 });
    // A staff release decision is distinct from evidence of rights-holder permission.
    // Preserve sourcePermission and record the previous access settings in the audit.
    const oldValue = { consentScope: record.consentScope, restrictionLevel: record.restrictionLevel,
      embargoUntil: record.embargoUntil?.toISOString() ?? null, data: record.data };
    const access = { consentScope: "public_excerpt", restrictionLevel: "public", embargoUntil: null };
    const sourceData = record.data && typeof record.data === "object" && !Array.isArray(record.data) ? record.data as Record<string, Prisma.JsonValue> : {};
    const metadata = record.nrfMetadata && typeof record.nrfMetadata === "object" && !Array.isArray(record.nrfMetadata) ? record.nrfMetadata as Record<string, Prisma.JsonValue> : {};
    const nrfMetadata = { ...metadata, staffPublicRelease: { approvedById: actorId, approvedAt: new Date().toISOString(), sourcePermission: sourceData.sourcePermission ?? null } };
    await tx.culturalRecord.update({ where: { id }, data: { ...access, nrfMetadata, nrfUri: buildRecordUri(id, "public_excerpt", "public", record.status) } });
    Object.assign(record, access, { nrfMetadata });
    const assets = await tx.mediaAsset.findMany({ where: { recordId: id }, select: { id: true, consentScope: true, restrictionLevel: true, embargoUntil: true } });
    const transcripts = await tx.transcript.findMany({ where: { recordId: id }, select: { id: true, consentScope: true, restrictionLevel: true, embargoUntil: true } });
    await tx.mediaAsset.updateMany({ where: { recordId: id }, data: access });
    await tx.transcript.updateMany({ where: { recordId: id }, data: access });
    await tx.auditLog.create({ data: { userId: actorId, action: "content.public_access_overridden", entityType: "cultural_record", entityId: id,
      oldValue: { ...oldValue, assets: assets.map(item => ({ ...item, embargoUntil: item.embargoUntil?.toISOString() ?? null })),
        transcripts: transcripts.map(item => ({ ...item, embargoUntil: item.embargoUntil?.toISOString() ?? null })) } as Prisma.InputJsonValue,
      newValue: { ...access, decision: "Staff published before review; source permission evidence is unchanged." } } });
  } else if (confirmPublicSharing) {
    const data = record.data && typeof record.data === "object" && !Array.isArray(record.data) ? record.data as Record<string, Prisma.JsonValue> : {};
    const now = new Date();
    if (!["pending", "public_excerpt"].includes(record.consentScope) || !["internal", "public"].includes(record.restrictionLevel) ||
      (record.embargoUntil && record.embargoUntil > now) ||
      (data.sourcePermission != null && !["needs_review", "confirmed"].includes(String(data.sourcePermission)))) {
      throw Object.assign(new Error(`"${record.title}": existing sharing restrictions, an active embargo or denied source permission must be resolved separately before public release.`), { status: 400 });
    }
    if (!record.title.trim()) throw Object.assign(new Error("Add a title before publishing."), { status: 400 });
    const oldValue = { consentScope: record.consentScope, restrictionLevel: record.restrictionLevel, sourcePermission: data.sourcePermission ?? null };
    const approved = { consentScope: "public_excerpt", restrictionLevel: "public", data: { ...data, sourcePermission: "confirmed" } };
    await tx.culturalRecord.update({ where: { id }, data: { ...approved, nrfUri: buildRecordUri(id, "public_excerpt", "public", record.status) } });
    Object.assign(record, approved);
    // Approval covers ordinary pending attachments. Explicitly restricted files
    // retain their own protections and are omitted from the public snapshot.
    const mediaWhere = { recordId: id, consentScope: { in: ["pending", "public_excerpt"] }, restrictionLevel: { in: ["internal", "public"] }, OR: [{ embargoUntil: null }, { embargoUntil: { lte: now } }] };
    await tx.mediaAsset.updateMany({ where: mediaWhere, data: { consentScope: "public_excerpt", restrictionLevel: "public" } });
    const consent = await tx.consentRecord.create({ data: { recordId: id, languageId: record.languageId,
      contributorName: "Undisclosed contributor", contributorType: "reviewer", consentType: "source_permission",
      consentGiven: true, sourcePermissionStatus: "confirmed", consentScope: "public_excerpt", restrictionLevel: "public",
      reviewedById: actorId, reviewedAt: now,
      notes: "Authorized publisher explicitly confirmed source permission and public sharing for the selected upload and its eligible attachments before content review.",
    } });
    const assets = await tx.mediaAsset.findMany({ where: { ...mediaWhere, consentScope: "public_excerpt", restrictionLevel: "public" }, select: { id: true } });
    if (assets.length) await tx.consentRecordAsset.createMany({ data: assets.map(asset => ({ consentRecordId: consent.id, mediaAssetId: asset.id })), skipDuplicates: true });
    await tx.auditLog.create({ data: { userId: actorId, action: "content.public_sharing_confirmed", entityType: "cultural_record", entityId: id,
      oldValue, newValue: { consentScope: "public_excerpt", restrictionLevel: "public", sourcePermission: "confirmed" } } });
  }
  const issues = overrideAccessRestrictions ? [] : publicReleaseIssues(record);
  if (issues.length) {
    throw Object.assign(new Error(`"${record.title || "Untitled upload"}": ${issues.join(" ")} Save the source and access settings, then try publishing before review again.`), { status: 400 });
  }
  const published = await writePublication(tx, id, actorId, true);
  if (record.status === "draft") await tx.culturalRecord.update({ where: { id }, data: { status: "submitted", validatorId: null } });
  await tx.reviewHistory.create({ data: { recordId: id, reviewerId: actorId, action: "published_before_review", stage: "early_publication", comments: "Public snapshot released; cultural and editorial review remains pending." } });
  await tx.auditLog.create({ data: { userId: actorId, action: "content.published_before_review", entityType: "cultural_record", entityId: id, newValue: { publicationId: published.id, isProvisional: true } } });
  return published;
}
