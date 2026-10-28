import type { Prisma } from "@prisma/client";
import { buildRecordUri, isPubliclyEligible } from "@/lib/governance";

export const EARLY_PUBLICATION_STATUSES = ["draft", "submitted", "under_review", "needs_edit"];

/** A separate public package keeps unfinished edits, translations and files private.
 * Its ID remains unchanged when the reviewed package replaces it. The source
 * retains all review history and becomes published_source after final release. */
export async function writePublication(
  tx: Prisma.TransactionClient, sourceId: string, actorId: string, provisional: boolean
) {
  const source = await tx.culturalRecord.findUniqueOrThrow({
    where: { id: sourceId }, include: { translations: true, media: true, transcripts: true },
  });
  const previous = await tx.culturalRecord.findUnique({ where: { publicationOfId: sourceId } });
  const id = previous?.id ?? crypto.randomUUID();
  const data = {
    languageId: source.languageId, moduleId: source.moduleId,
    title: source.title, data: source.data as Prisma.InputJsonValue,
    summary: source.summary, tags: source.tags, status: "published",
    consentScope: source.consentScope, restrictionLevel: source.restrictionLevel,
    embargoUntil: source.embargoUntil, countyCode: source.countyCode,
    siteName: source.siteName, sourceReference: source.sourceReference, sessionId: source.sessionId,
    contributorId: source.contributorId, contributorAge: source.contributorAge,
    primaryMediaType: source.primaryMediaType, reviewerId: actorId,
    validatorId: provisional ? null : source.validatorId,
    publishedAt: new Date(), isProvisional: provisional,
    nrfUri: buildRecordUri(id, source.consentScope, source.restrictionLevel, "published"),
  };
  const publication = await tx.culturalRecord.upsert({
    where: { publicationOfId: sourceId },
    create: { ...data, id, publicationOfId: sourceId }, update: data,
  });
  // Replace children inside the publication transaction. Files in storage are
  // shared, while their metadata and transcripts are independent snapshots.
  await tx.culturalRecordTranslation.deleteMany({ where: { recordId: id } });
  await tx.mediaAsset.deleteMany({ where: { recordId: id } });
  await tx.transcript.deleteMany({ where: { recordId: id } });
  if (source.translations.length) await tx.culturalRecordTranslation.createMany({
    data: source.translations.map(item => ({ recordId: id, languageId: item.languageId,
      title: item.title, summary: item.summary, data: item.data ?? undefined })),
  });
  for (const item of source.media.filter(item => !provisional || isPubliclyEligible(item))) {
    const { id: _id, recordId: _recordId, dictionaryId: _dictionaryId,
      assetId: _assetId, nrfUri: _nrfUri, createdAt: _createdAt, updatedAt: _updatedAt,
      nrfMetadata: _metadata, ...asset } = item;
    await tx.mediaAsset.create({ data: { ...asset, recordId: id,
      consentScope: source.consentScope, restrictionLevel: source.restrictionLevel,
      embargoUntil: source.embargoUntil } });
  }
  for (const item of source.transcripts.filter(item => isPubliclyEligible(item))) {
    const { id: _id, recordId: _recordId, sourceId: _sourceId, sourceUri: _sourceUri,
      timestamps, aiSummary: _aiSummary, aiEntities: _aiEntities, ...transcript } = item;
    await tx.transcript.create({ data: { ...transcript, recordId: id,
      timestamps: timestamps ?? undefined, consentScope: source.consentScope,
      restrictionLevel: source.restrictionLevel, embargoUntil: source.embargoUntil } });
  }
  await tx.reviewHistory.create({ data: { recordId: id, reviewerId: actorId,
    action: provisional ? "published_before_review" : "reviewed_version_replaced",
    stage: provisional ? "early_publication" : "final_publish_review",
    comments: provisional ? "Published while review continues on the source upload." : "Replaced the public package with the reviewed and edited version.",
  } });
  return publication;
}

export async function finishPublication(tx: Prisma.TransactionClient, sourceId: string, actorId: string, publicRelease: boolean) {
  const existing = await tx.culturalRecord.findUnique({ where: { publicationOfId: sourceId } });
  if (!existing) return sourceId;
  if (!publicRelease) {
    await withdrawPublication(tx, sourceId);
    return sourceId;
  }
  const publication = await writePublication(tx, sourceId, actorId, false);
  await tx.culturalRecord.update({ where: { id: sourceId }, data: { status: "published_source" } });
  return publication.id;
}

export async function withdrawPublication(tx: Prisma.TransactionClient, sourceId: string) {
  const publication = await tx.culturalRecord.findUnique({ where: { publicationOfId: sourceId }, select: { id: true } });
  if (!publication) return;
  await tx.culturalRecord.update({ where: { id: publication.id }, data: { status: "curated", publishedAt: null } });
  await tx.embedding.deleteMany({ where: { OR: [{ recordId: publication.id }, { transcript: { recordId: publication.id } }] } });
}
