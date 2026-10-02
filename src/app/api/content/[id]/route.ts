import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContent, canReviewContent, canUploadContent, isLanguageAdmin } from "@/lib/permissions";
import { embedRecord } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";
import { buildRecordUri, canAccessGovernedItem, canReviewGovernedItem, parseGovernanceMetadata } from "@/lib/governance";
import { addContentVersion } from "@/lib/content-revisions";
import { validatePhaseOneSubmission } from "@/lib/phase-one-content";
import { logAction } from "@/lib/audit";
import { parseContentProvenance } from "@/lib/content-provenance";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
    include: {
      language: true,
      module: true,
      media: true,
      reviews: {
        include: { reviewer: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
      provenance: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const user = session.user as any;
  const accessUser = { isSuperAdmin: user.isSuperAdmin, languageRoles: user.languageRoles };
  const mayRead = record.contributorId === user.id || canReviewGovernedItem(accessUser, record, record.languageId);
  if (!mayRead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const visibleMedia = record.media.filter((asset) =>
    record.contributorId === user.id || canReviewGovernedItem(accessUser, asset, asset.languageId)
  );
  if (!canAccessGovernedItem(accessUser, record, record.languageId)) {
    await logAction({
      userId: user.id,
      action: "content.restricted_accessed",
      entityType: "cultural_record",
      entityId: record.id,
    });
  }
  return NextResponse.json({ success: true, data: { ...record, media: visibleMedia } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await prisma.culturalRecord.findUnique({ where: { id: params.id }, include: { transcripts: { select: { text: true } } } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const { title, data, tags } = body;
  const provenance = parseContentProvenance(body.provenance);
  if (!provenance.success) return NextResponse.json({ error: provenance.error.issues[0]?.message || "Invalid provenance metadata" }, { status: 400 });
  const targetLanguageId = Number(body.languageId) || record.languageId;

  if (targetLanguageId !== record.languageId) {
    if (!["draft", "needs_edit", "rejected", "curated"].includes(record.status)) {
      return NextResponse.json({ error: "Translations are locked while content is being reviewed or after publication. Ask a cultural reviewer to return the item for changes." }, { status: 409 });
    }
    if (!canEditContent(session, record.languageId) && !canUploadContent(session, record.languageId) && !canEditContent(session, targetLanguageId)) {
      return NextResponse.json({ error: "Only a content editor for this language can edit translations." }, { status: 403 });
    }
    const languageTranslation = await prisma.culturalRecordTranslation.findUnique({
      where: { recordId_languageId: { recordId: record.id, languageId: targetLanguageId } },
    });
    if (!languageTranslation) return NextResponse.json({ error: "Translation not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const translated = await tx.culturalRecordTranslation.update({
        where: { id: languageTranslation.id },
        data: {
          title: typeof title === "string" ? title : languageTranslation.title,
          data: data ?? languageTranslation.data,
          summary: typeof data?.description === "string" ? data.description : languageTranslation.summary,
        },
      });
      await addContentVersion(tx, {
        recordId: record.id,
        changedBy: (session.user as any).id,
        changeReason: `Translation updated for language ${targetLanguageId}`,
        snapshot: { translationId: translated.id, languageId: targetLanguageId, title: translated.title, data: translated.data as any, summary: translated.summary } as any,
      });
      return translated;
    });
    if (record.status === "published" && await hasGemini()) {
      try { await embedRecord(record.id, true); } catch (error) { console.error("[content translation] AI reindex failed:", error); }
    }
    return NextResponse.json({ success: true, data: updated });
  }

  const userId = (session.user as any).id;
  const isOwner = record.contributorId === userId;
  const editorCanEdit = canEditContent(session, record.languageId) && ["needs_edit", "draft", "rejected", "curated"].includes(record.status);
  const contributorCanRevise = isOwner && ["draft", "rejected", "curated"].includes(record.status);
  if (record.status === "submitted" || (record.status === "under_review" && !!record.validatorId)) {
    return NextResponse.json({ error: "This item is being reviewed. Wait for a reviewer to request changes before editing it." }, { status: 409 });
  }
  if (!editorCanEdit && !contributorCanRevise) {
    return NextResponse.json({ error: "Only the assigned content editor or the contributor revising a returned draft can edit this item." }, { status: 403 });
  }
  if (!isOwner && !canReviewGovernedItem(
    { isSuperAdmin: (session.user as any).isSuperAdmin, languageRoles: (session.user as any).languageRoles },
    record,
    record.languageId
  )) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: any = {};
  if (title !== undefined) update.title = title;
  if (data !== undefined) update.data = data;
  if (tags !== undefined) update.tags = tags;
  const governanceKeys = ["consentScope", "restrictionLevel", "embargoUntil", "countyCode", "siteName", "sourceReference", "sessionId"];
  const changingGovernance = governanceKeys.some((key) => Object.prototype.hasOwnProperty.call(body, key));
  if (changingGovernance) {
    if (!canEditContent(session, record.languageId) && !contributorCanRevise) {
      return NextResponse.json({ error: "Only the assigned editor or the contributor revising a returned draft can change source and access details." }, { status: 403 });
    }
    const governance = parseGovernanceMetadata({
      consentScope: body.consentScope ?? record.consentScope,
      restrictionLevel: body.restrictionLevel ?? record.restrictionLevel,
      embargoUntil: body.embargoUntil === undefined ? record.embargoUntil : body.embargoUntil,
      countyCode: body.countyCode === undefined ? record.countyCode : body.countyCode,
      siteName: body.siteName === undefined ? record.siteName : body.siteName,
      sourceReference: body.sourceReference === undefined ? record.sourceReference : body.sourceReference,
      sessionId: body.sessionId === undefined ? record.sessionId : body.sessionId,
    });
    if (!governance.success) return NextResponse.json({ error: governance.error.issues[0]?.message || "Invalid governance metadata" }, { status: 400 });
    Object.assign(update, governance.data);
    update.nrfMetadata = {
      domain: "culture",
      genre: (await prisma.module.findUnique({ where: { id: record.moduleId }, select: { code: true } }))?.code ?? "culture",
      consentScope: governance.data.consentScope,
      restrictionLevel: governance.data.restrictionLevel,
      embargoUntil: governance.data.embargoUntil?.toISOString() ?? null,
      countyCode: governance.data.countyCode,
      siteName: governance.data.siteName,
      sourceReference: governance.data.sourceReference,
      sessionId: governance.data.sessionId,
    };
    update.nrfUri = buildRecordUri(record.id, governance.data.consentScope, governance.data.restrictionLevel, record.status);
  }
  if (record.status === "published" && (title !== undefined || data !== undefined || tags !== undefined || changingGovernance)) {
    update.status = "curated";
    update.publishedAt = null;
    update.nrfUri = buildRecordUri(record.id, record.consentScope, record.restrictionLevel, "curated");
    // Any edit to a released record must pass reviewer approval again.
  }
  // Only the review workflow can change status.

  if (data !== undefined && ["submitted", "under_review", "published"].includes(record.status)) {
    const module = await prisma.module.findUnique({ where: { id: record.moduleId }, select: { code: true } });
    const hasLinkedTranscript = record.transcripts.some((item) => item.text.trim().length > 0);
    const validationError = validatePhaseOneSubmission(module?.code ?? "", title ?? record.title, data, hasLinkedTranscript);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const moved = await tx.culturalRecord.updateMany({
      where: { id: params.id, status: record.status },
      data: update,
    });
    if (moved.count !== 1) throw new Error("This item moved to another review stage. Refresh before editing it again.");
    const saved = await tx.culturalRecord.findUnique({ where: { id: params.id } });
    if (!saved) throw new Error("This item could not be found after saving.");
    if (provenance.data) {
      const existingProvenance = await tx.provenance.findFirst({
        where: {
          recordId: record.id,
          sourceType: provenance.data.sourceType,
          sourceName: provenance.data.sourceName,
          sourceDate: provenance.data.sourceDate,
        },
        select: { id: true },
      });
      if (!existingProvenance) {
        await tx.provenance.create({
          data: {
            recordId: record.id,
            ...provenance.data,
            sourceLocation: provenance.data.sourceLocation ?? record.siteName,
            collector: provenance.data.collector ?? (session.user as any).name ?? null,
          },
        });
      }
    }
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const nextData = data as Record<string, unknown>;
      const priorData = record.data && typeof record.data === "object" && !Array.isArray(record.data)
        ? record.data as Record<string, unknown>
        : {};
      if (typeof nextData.sourcePermission === "string" && nextData.sourcePermission !== priorData.sourcePermission) {
        const confirmed = nextData.sourcePermission === "confirmed";
        const consentSnapshot = await tx.consentRecord.create({
          data: {
            languageId: record.languageId,
            recordId: record.id,
            contributorName: (session.user as any).name || "Undisclosed contributor",
            contributorType: canReviewContent(session, record.languageId) ? "reviewer" : "contributor",
            consentType: "source_permission",
            consentGiven: confirmed,
            consentDate: confirmed ? new Date() : null,
            sourcePermissionStatus: confirmed ? "confirmed" : nextData.sourcePermission === "not_granted" ? "not_granted" : "needs_review",
            attributionPreference: typeof nextData.attributionPreference === "string" ? nextData.attributionPreference : null,
            consentScope: (update.consentScope as string | undefined) ?? record.consentScope,
            restrictionLevel: (update.restrictionLevel as string | undefined) ?? record.restrictionLevel,
            embargoUntil: Object.prototype.hasOwnProperty.call(update, "embargoUntil")
              ? update.embargoUntil
              : record.embargoUntil,
            notes: "Source-permission declaration snapshot captured during content revision.",
          },
        });
        const linkedAssets = await tx.mediaAsset.findMany({ where: { recordId: record.id }, select: { id: true } });
        if (linkedAssets.length) {
          await tx.consentRecordAsset.createMany({
            data: linkedAssets.map((asset) => ({ consentRecordId: consentSnapshot.id, mediaAssetId: asset.id })),
            skipDuplicates: true,
          });
        }
      }
    }
    await addContentVersion(tx, {
      recordId: record.id,
      changedBy: userId,
      changeReason: typeof body.changeReason === "string" ? body.changeReason : "Content updated",
      snapshot: {
        title: saved.title,
        data: saved.data as any,
        summary: saved.summary,
        tags: saved.tags,
        status: saved.status,
        consentScope: saved.consentScope,
        restrictionLevel: saved.restrictionLevel,
        embargoUntil: saved.embargoUntil?.toISOString() ?? null,
        countyCode: saved.countyCode,
        siteName: saved.siteName,
        sourceReference: saved.sourceReference,
        sessionId: saved.sessionId,
        provenance: provenance.data,
      } as any,
    });
    return saved;
  });

  try {
    if (updated.status !== "published") {
      await embedRecord(record.id);
    } else if (await hasGemini()) {
      await embedRecord(record.id, true);
    }
  } catch (error) {
    console.error("[content update] AI reindex failed:", error);
  }

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await prisma.culturalRecord.findUnique({ where: { id: params.id }, select: { languageId: true } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isLanguageAdmin(session, record.languageId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.culturalRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
