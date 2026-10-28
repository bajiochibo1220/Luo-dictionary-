import { withApiErrors } from "@/lib/content-workflow";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canFinalizeContent } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { buildRecordUri, isPubliclyEligible, mayReviewRecord } from "@/lib/governance";
import { validatePhaseOneSubmission } from "@/lib/phase-one-content";
import { hasPublicReleasePermission } from "@/lib/public-release-readiness";
import { hasGemini } from "@/lib/ai/gemini";
import { embedRecord, embedTranscript } from "@/lib/ai/embeddings";
import { missingEnglishTranslation } from "@/lib/english-translation";
import { finishPublication } from "@/lib/content-publication";

async function handlePOST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const recordIds: unknown[] = Array.isArray(body.recordIds) ? body.recordIds : [];
  if (!recordIds.length || recordIds.length > 100 || recordIds.some((id) => typeof id !== "string") || new Set(recordIds).size !== recordIds.length) {
    return NextResponse.json({ success: false, error: "Select between one and one hundred different items." }, { status: 400 });
  }

  const englishLanguage = await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });
  const records = await prisma.culturalRecord.findMany({
    where: { id: { in: recordIds as string[] } },
    include: { language: { select: { code: true } }, translations: englishLanguage ? { where: { languageId: englishLanguage.id } } : false, module: { select: { code: true } }, transcripts: { select: { id: true, text: true } } },
  });
  if (records.length !== recordIds.length) return NextResponse.json({ success: false, error: "One or more items could not be found." }, { status: 404 });
  if (records.some((record) => record.status !== "under_review" || !record.validatorId)) {
    return NextResponse.json({ success: false, error: "Select only items that have passed cultural review and are waiting for final approval." }, { status: 400 });
  }

  for (const record of records) {
    if (!canFinalizeContent(session, record.languageId)) return NextResponse.json({ success: false, error: "You must have publishing permission for every selected language." }, { status: 403 });
    if (record.contributorId === session.user.id || !mayReviewRecord(session.user, record)) return NextResponse.json({ success: false, error: "You cannot publish your own contribution or material outside your access permissions." }, { status: 403 });
    if (record.language.code !== "eng") {
      const missing = missingEnglishTranslation(record.title, record.data, record.translations[0]);
      if (missing.length) return NextResponse.json({ success: false, error: `${record.title}: the English version must be completed and culturally reviewed before publishing. Missing: ${missing.join(", ")}.` }, { status: 400 });
    }
    const hasLinkedTranscript = record.transcripts.some((item) => item.text.trim().length > 0);
    const contentError = validatePhaseOneSubmission(record.module.code, record.title, record.data, hasLinkedTranscript);
    if (contentError) return NextResponse.json({ success: false, error: `${record.title}: ${contentError}` }, { status: 400 });
    if (!isPubliclyEligible(record)) return NextResponse.json({ success: false, error: `${record.title}: public consent, public restriction, or the embargo date needs attention.` }, { status: 400 });
    if (!hasPublicReleasePermission(record)) return NextResponse.json({ success: false, error: `${record.title}: confirmed source permission or a recorded staff release decision is required.` }, { status: 400 });
  }

  const reviewerId = (session.user as any).id as string;
  const publishedAt = new Date();
  const publicationIds = new Map<string, string>();
  await prisma.$transaction(async (tx) => {
    for (const record of [...records].sort((a, b) => a.id.localeCompare(b.id))) {
      const moved = await tx.culturalRecord.updateMany({
        where: { id: record.id, status: "under_review", updatedAt: record.updatedAt, validatorId: { not: null } },
        data: {
          status: "published",
          publishedAt,
          reviewerId,
          nrfUri: buildRecordUri(record.id, record.consentScope, record.restrictionLevel, "published"),
        },
      });
      if (moved.count !== 1) throw new Error(`"${record.title}" has already changed. Refresh and try again.`);

      // Attached files are part of the reviewed item. Apply the same approved
      // access settings to them; files remain in storage and are not uploaded again.
      await tx.mediaAsset.updateMany({
        where: { recordId: record.id },
        data: {
          consentScope: record.consentScope,
          restrictionLevel: record.restrictionLevel,
          embargoUntil: record.embargoUntil,
          countyCode: record.countyCode,
          siteName: record.siteName,
          sourceReference: record.sourceReference,
          sessionId: record.sessionId,
        },
      });

      const contentData = record.data && typeof record.data === "object" && !Array.isArray(record.data)
        ? record.data as Record<string, unknown>
        : {};
      const priorConsent = await tx.consentRecord.findFirst({
        where: { recordId: record.id, consentType: "source_permission" },
        orderBy: { createdAt: "desc" },
      });
      const consent = await tx.consentRecord.create({
        data: {
          languageId: record.languageId,
          recordId: record.id,
          contributorName: priorConsent?.contributorName ?? "Undisclosed contributor",
          contributorType: "reviewer",
          consentType: "source_permission",
          consentGiven: contentData.sourcePermission === "confirmed",
          consentDate: contentData.sourcePermission === "confirmed" ? priorConsent?.consentDate ?? null : null,
          sourcePermissionStatus: contentData.sourcePermission === "confirmed" ? "confirmed" : contentData.sourcePermission === "not_granted" ? "not_granted" : "needs_review",
          attributionPreference: typeof contentData.attributionPreference === "string" ? contentData.attributionPreference : priorConsent?.attributionPreference ?? null,
          consentScope: record.consentScope,
          restrictionLevel: record.restrictionLevel,
          embargoUntil: record.embargoUntil,
          reviewedById: reviewerId,
          reviewedAt: publishedAt,
          notes: "Recorded existing source permission evidence during bulk final approval; a staff public-release decision may authorize publication separately.",
        },
      });
      const attachedMedia = await tx.mediaAsset.findMany({ where: { recordId: record.id }, select: { id: true } });
      if (attachedMedia.length) {
        await tx.consentRecordAsset.createMany({
          data: attachedMedia.map(({ id }) => ({ consentRecordId: consent.id, mediaAssetId: id })),
          skipDuplicates: true,
        });
      }

      await tx.reviewHistory.create({
        data: {
          recordId: record.id,
          reviewerId,
          action: "approved_public",
          stage: "final_publish_review",
          comments: "Published by an authorized editor or administrator after cultural and editorial review.",
        },
      });
      publicationIds.set(record.id, await finishPublication(tx, record.id, reviewerId, true));
    }
  }, { timeout: 60_000 });

  await Promise.all(records.map((record) => logAction({
    userId: reviewerId,
    action: "content.published",
    entityType: "cultural_record",
    entityId: record.id,
    oldValue: { status: "under_review" },
    newValue: {
      status: "published",
      publishedAt: publishedAt.toISOString(),
      publishedById: reviewerId,
      title: record.title,
      languageId: record.languageId,
      moduleCode: record.module.code,
      consentScope: record.consentScope,
      restrictionLevel: record.restrictionLevel,
      publicRelease: true,
      reviewStage: "cultural_review_and_editorial_review",
      source: "bulk_publish",
    },
    ipAddress: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  })));

  if (await hasGemini()) {
    await Promise.all(records.map(async record => {
      const publicationId = publicationIds.get(record.id) ?? record.id;
      const transcripts = publicationId === record.id ? record.transcripts : await prisma.transcript.findMany({ where: { recordId: publicationId }, select: { id: true } });
      await Promise.all([
        embedRecord(publicationId, true).catch((error) => console.error(`[bulk publish] Record AI reindex failed for ${publicationId}:`, error)),
        ...transcripts.map(transcript => embedTranscript(transcript.id, true).catch((error) => console.error(`[bulk publish] Transcript AI reindex failed for ${transcript.id}:`, error))),
      ]);
    }));
  }

  return NextResponse.json({ success: true, count: records.length });
}

export const POST = withApiErrors(handlePOST);
