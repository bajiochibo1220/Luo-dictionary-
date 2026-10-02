import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { canReviewContent } from "@/lib/permissions";
import { buildMediaAssetId, buildMediaUri, canAccessGovernedItem, canReviewGovernedItem, ensureRecordCollectionSessionId, getRepositoryDomain, isPubliclyEligible, linkRecordConsentToMedia, lockMediaAssetSequence } from "@/lib/governance";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    include: { record: { select: { id: true } } },
  });
  if (!asset) return NextResponse.json({ error: "Media not found" }, { status: 404 });

  const record = await prisma.culturalRecord.findUnique({
    where: { id: recordId },
    include: { module: { select: { code: true } } },
  });
  if (!record || record.status !== "published") {
    return NextResponse.json({ error: "Choose a published content record" }, { status: 400 });
  }
  if (!canReviewContent(session, record.languageId)) {
    return NextResponse.json({ error: "You cannot manage this content" }, { status: 403 });
  }
  if (asset.languageId !== record.languageId) {
    return NextResponse.json({ error: "Media and content must use the same language" }, { status: 400 });
  }
  const metadata = asset.nrfMetadata as { genre?: unknown } | null;
  if (typeof metadata?.genre === "string" && metadata.genre !== record.module.code) {
    return NextResponse.json({ error: "Media and content must belong to the same content area" }, { status: 400 });
  }

  const domain = getRepositoryDomain(record.module.code);
  await prisma.$transaction(async (tx) => {
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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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
  const publicItem = isPubliclyEligible(asset) && (!parent || (parent.status === "published" && isPubliclyEligible(parent)));
  const accessUser = user ? {
    isSuperAdmin: !!(user.isSuperAdmin || user.isMasterSuperAdmin),
    languageRoles: user.languageRoles ?? [],
  } : null;
  const mayRead = publicItem || (
    (canAccessGovernedItem(accessUser, asset, asset.languageId) || canReviewGovernedItem(accessUser, asset, asset.languageId)) &&
    (!parent || parent.contributorId === user?.id || canAccessGovernedItem(accessUser, parent, parent.languageId) || canReviewGovernedItem(accessUser, parent, parent.languageId))
  );  if (!mayRead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: asset });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  // Delete from Cloudinary first
  try {
    await deleteFromCloudinary(
      asset.publicId,
      (asset.resourceType as "image" | "video" | "raw") || "image",
      asset.deliveryType === "authenticated" ? "authenticated" : "upload"
    );
  } catch (err) {
    console.error("[cloudinary delete]", err);
    // Continue even if Cloudinary fails — remove DB row anyway
  }

  await prisma.mediaAsset.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
