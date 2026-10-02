import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { canFinalizeContent } from "@/lib/permissions";
import { embedRecord, embedTranscript } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";
import { buildRecordUri, isPubliclyEligible } from "@/lib/governance";
import { hasPublicReleaseSourcePermission, validatePhaseOneSubmission } from "@/lib/phase-one-content";
import { missingEnglishTranslation } from "@/lib/english-translation";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const comments = body.comments || "";

  const englishLanguage = await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });
  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
    include: { language: { select: { code: true } }, translations: englishLanguage ? { where: { languageId: englishLanguage.id } } : false, transcripts: { select: { id: true, text: true } } },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canFinalizeContent(session, record.languageId)) {
    return NextResponse.json({ error: "Only a publisher assigned to this language can publish this item." }, { status: 403 });
  }
  if (record.contributorId && record.contributorId === (session.user as any).id) {
    return NextResponse.json({ error: "You cannot publish your own contribution. Ask another assigned publisher." }, { status: 403 });
  }
  if (record.status !== "under_review" || !record.validatorId) {
    return NextResponse.json({ error: "This item must pass cultural review and any requested editing before publishing." }, { status: 409 });
  }
  if (record.language.code !== "eng") {
    const missing = missingEnglishTranslation(record.title, record.data, record.translations[0]);
    if (missing.length) return NextResponse.json({ error: `The English version must be completed and culturally reviewed before publishing. Missing: ${missing.join(", ")}.` }, { status: 400 });
  }

  const module = await prisma.module.findUnique({ where: { id: record.moduleId }, select: { code: true } });
  const hasLinkedTranscript = record.transcripts.some((item) => item.text.trim().length > 0);
  const validationError = validatePhaseOneSubmission(module?.code ?? "", record.title, record.data, hasLinkedTranscript);
  if (validationError) return NextResponse.json({ success: false, error: validationError }, { status: 400 });

  const oldStatus = record.status;
  const sourcePermissionConfirmed = hasPublicReleaseSourcePermission(module?.code ?? "", record.data);
  const publicRelease = isPubliclyEligible(record) && sourcePermissionConfirmed;
  const nextStatus = publicRelease ? "published" : "curated";
  const decisionAt = new Date();

  await prisma.$transaction(async (tx) => {
    const moved = await tx.culturalRecord.updateMany({
      where: { id: params.id, status: "under_review", validatorId: { not: null } },
      data: {
        status: nextStatus,
        publishedAt: publicRelease ? decisionAt : null,
        reviewerId: (session.user as any).id,
        nrfUri: buildRecordUri(record.id, record.consentScope, record.restrictionLevel, nextStatus),
      },
    });
    if (moved.count !== 1) throw new Error("This item has already moved to another review stage.");

    // Media stays attached to its record. Once the record's final reviewer has
    // checked the entire package and approved public release, bring its files
    // under the same approved access settings. No re-upload is needed.
    if (publicRelease) {
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
    }

    await tx.reviewHistory.create({
      data: {
        recordId: params.id,
        reviewerId: (session.user as any).id,
        action: publicRelease ? "approved_public" : "curated_internal",
        stage: "final_publish_review",
        comments: comments || (publicRelease
          ? "Published after cultural review and any requested editing."
          : "Approved for internal curation after cultural review and any requested editing."),
      },
    });
  });

  const contentData = record.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? record.data as Record<string, unknown>
    : {};
  if (module?.code === "oral_histories" || Object.prototype.hasOwnProperty.call(contentData, "sourcePermission")) {
    const previousConsent = await prisma.consentRecord.findFirst({
      where: { recordId: record.id, consentType: "source_permission" },
      orderBy: { createdAt: "desc" },
    });
    const sourcePermissionStatus = contentData.sourcePermission === "confirmed"
      ? "confirmed"
      : contentData.sourcePermission === "not_granted" ? "not_granted" : "needs_review";
    await prisma.$transaction(async (tx) => {
      const reviewSnapshot = await tx.consentRecord.create({
        data: {
          languageId: record.languageId,
          recordId: record.id,
          contributorName: previousConsent?.contributorName ?? "Undisclosed contributor",
          contributorType: "reviewer",
          consentType: "source_permission",
          consentGiven: sourcePermissionStatus === "confirmed",
          consentDate: sourcePermissionStatus === "confirmed" ? previousConsent?.consentDate ?? null : null,
          sourcePermissionStatus,
          attributionPreference: typeof contentData.attributionPreference === "string" ? contentData.attributionPreference : previousConsent?.attributionPreference ?? null,
          consentScope: record.consentScope,
          restrictionLevel: record.restrictionLevel,
          embargoUntil: record.embargoUntil,
          reviewedById: (session.user as any).id,
          reviewedAt: new Date(),
          notes: "Reviewer decision recorded during content approval.",
        },
      });
      const assets = await tx.mediaAsset.findMany({ where: { recordId: record.id }, select: { id: true } });
      if (assets.length) {
        await tx.consentRecordAsset.createMany({
          data: assets.map((asset) => ({ consentRecordId: reviewSnapshot.id, mediaAssetId: asset.id })),
          skipDuplicates: true,
        });
      }
    });
  }

  await logAction({
    userId: (session.user as any).id,
    action: publicRelease ? "content.published" : "content.curated",
    entityType: "cultural_record",
    entityId: params.id,
    oldValue: { status: oldStatus },
    newValue: {
      status: nextStatus,
      publishedAt: publicRelease ? decisionAt.toISOString() : null,
      publishedById: (session.user as any).id,
      title: record.title,
      languageId: record.languageId,
      moduleCode: module?.code ?? null,
      consentScope: record.consentScope,
      restrictionLevel: record.restrictionLevel,
      publicRelease,
      sourcePermissionConfirmed,
      reviewStage: "cultural_review_and_editorial_review",
    },
    ipAddress: req.headers.get("x-forwarded-for") || null,
    userAgent: req.headers.get("user-agent") || null,
  });

  if (publicRelease && await hasGemini()) {
    await Promise.all([
      embedRecord(record.id, true).catch((error) => console.error("[content approve] record AI reindex failed:", error)),
      ...record.transcripts.map((transcript) => embedTranscript(transcript.id, true).catch((error) => console.error(`[content approve] transcript AI reindex failed for ${transcript.id}:`, error))),
    ]);
  }
  return NextResponse.json({ success: true, status: nextStatus, publicRelease });
}
