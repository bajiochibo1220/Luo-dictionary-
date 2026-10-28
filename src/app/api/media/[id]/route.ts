import { assertServiceAvailable } from "@/lib/maintenance";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { canReviewContent } from "@/lib/permissions";
import { lockEditableRecord, withApiErrors } from "@/lib/content-workflow";
import { buildMediaAssetId, buildMediaUri, canReadMedia, mayReviewRecord, ensureRecordCollectionSessionId, getRepositoryDomain, linkRecordConsentToMedia, lockMediaAssetSequence } from "@/lib/governance";

async function handlePATCH(
  req: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const recordId = typeof body.recordId === "string" ? body.recordId : "";
  if (!recordId) {
    return NextResponse.json({ error: "A published content record is required" }, { status: 400 });
  }

  const asset = await prisma.mediaAsset.findUnique({
    where: { id: params.id },
    include: { record: true, dictionary: true },
  });
  if (!asset) return NextResponse.json({ error: "Media not found" }, { status: 404 });

  const record = await prisma.culturalRecord.findUnique({
    where: { id: recordId },
    include: { module: { select: { code: true } } },
  });
  if (!record || !["draft", "needs_edit", "rejected", "curated"].includes(record.status)) {
    return NextResponse.json({ error: "Choose a draft or returned content record. Reviewed packages cannot accept new media." }, { status: 409 });
  }
  if (!canReviewContent(session, record.languageId) || !mayReviewRecord(session.user, record) || !canReadMedia(session.user, asset, asset.record ?? asset.dictionary)) {
    return NextResponse.json({ error: "You cannot manage this content" }, { status: 403 });
  }
  if (asset.languageId !== record.languageId) {
    return NextResponse.json({ error: "Media and content must use the same language" }, { status: 400 });
  }
  const metadata = asset.nrfMetadata as { genre?: unknown } | null;
  if (typeof metadata?.genre === "string" && metadata.genre !== record.module.code) {
    return NextResponse.json({ error: "Media and content must belong to the same content area" }, { status: 400 });
  }

  if (asset.record && !["draft", "needs_edit", "rejected", "curated"].includes(asset.record.status) || asset.dictionary && !["draft", "needs_edit", "rejected", "curated"].includes(asset.dictionary.status)) return NextResponse.json({ error: "Reviewed media cannot be moved. Return its source item for changes first." }, { status: 409 });
  const domain = getRepositoryDomain(record.module.code);
  await prisma.$transaction(async (tx) => {
    const current = await lockEditableRecord(tx, record.id);
    if (!mayReviewRecord(session.user, current)) throw Object.assign(new Error("Content access changed."), { status: 403 });
    if (asset.record && asset.record.id !== record.id) await lockEditableRecord(tx, asset.record.id);
    Object.assign(record, current);
    const sessionId = await ensureRecordCollectionSessionId(tx, record.id, { countyCode: record.countyCode, siteName: record.siteName, date: record.createdAt });
    const sequence = await lockMediaAssetSequence(tx, sessionId, asset.type);
    const assetId = buildMediaAssetId(sessionId, asset.type, sequence);
    await tx.mediaAsset.update({
      where: { id: asset.id },
      data: {
        recordId: record.id,
        dictionaryId: null,
        assetId,
        nrfUri: buildMediaUri(sessionId, assetId, { countyCode: record.countyCode, siteName: record.siteName, moduleCode: record.module.code, mediaType: asset.type, extension: asset.format, recordedAt: record.createdAt }),
        consentScope: record.consentScope,
        restrictionLevel: record.restrictionLevel,
        embargoUntil: record.embargoUntil,
        countyCode: record.countyCode,
        siteName: record.siteName,
        sourceReference: record.sourceReference,
        sessionId,
        nrfMetadata: {
          domainCode: domain.code, domain: domain.name, genre: record.module.code,
          assetId,
          consentScope: record.consentScope,
          restrictionLevel: record.restrictionLevel,
          countyCode: record.countyCode,
          siteName: record.siteName,
          sourceReference: record.sourceReference,
          sessionId,
        },
      },
    });
    await linkRecordConsentToMedia(tx, record.id, asset.id);
  });

  return NextResponse.json({
    success: true,
    data: { recordId: record.id, title: record.title, moduleCode: record.module.code },
  });
}

async function handleGET(
  _req: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  await assertServiceAvailable();
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: params.id },
    include: {
      language: { select: { id: true, code: true, nativeName: true } },
      record: { select: { id: true, title: true, moduleId: true, status: true, consentScope: true, restrictionLevel: true, embargoUntil: true, languageId: true, contributorId: true } },
      dictionary: { select: { id: true, status: true, consentScope: true, restrictionLevel: true, embargoUntil: true, languageId: true, contributorId: true } },
    },
  });
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await auth();
  const user = session?.user as any;
  const parent = asset.record ?? asset.dictionary;
  const accessUser = user ? {
    id: user.id,
    isSuperAdmin: !!(user.isSuperAdmin || user.isMasterSuperAdmin),
    languageRoles: user.languageRoles ?? [],
  } : null;
  if (!canReadMedia(accessUser, asset, parent)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: { ...asset, sizeBytes: Number(asset.sizeBytes) } });
}

export async function DELETE(
  _req: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const asset = await prisma.mediaAsset.findUnique({
    where: { id: params.id },
  });
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async tx => {
      if (asset.recordId) await lockEditableRecord(tx, asset.recordId);
      else if (asset.dictionaryId) {
        await tx.$queryRawUnsafe('SELECT id FROM dictionary_entries WHERE id = $1 FOR UPDATE', asset.dictionaryId);
        const parent = await tx.dictionaryEntry.findUnique({ where: { id: asset.dictionaryId } });
        if (parent && !["draft", "needs_edit", "rejected", "curated"].includes(parent.status)) throw Object.assign(new Error("Reviewed media cannot be deleted."), { status: 409 });
      }
      const shared = await tx.mediaAsset.count({ where: { publicId: asset.publicId, id: { not: asset.id } } });
      if (!shared) await deleteFromCloudinary(asset.publicId, (asset.resourceType as "image" | "video" | "raw") || "image", asset.deliveryType === "authenticated" ? "authenticated" : "upload");
      await tx.mediaAsset.delete({ where: { id: params.id } });
    }, { timeout: 30_000 });
  } catch (error: any) {
    return NextResponse.json({ error: error.status === 409 ? error.message : "Media deletion failed. Please retry." }, { status: error.status || 502 });
  }
  return NextResponse.json({ success: true });
}

export const PATCH = withApiErrors(handlePATCH);

export const GET = withApiErrors(handleGET);
