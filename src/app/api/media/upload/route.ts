import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToCloudinary, generateFolderPath } from "@/lib/cloudinary";
import { canContribute, canUploadContent, isSuperAdmin } from "@/lib/permissions";
import crypto from "crypto";
import { buildMediaAssetId, buildMediaUri, ensureRecordCollectionSessionId, getRepositoryDomain, linkRecordConsentToMedia, lockMediaAssetSequence } from "@/lib/governance";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const languageCode = formData.get("languageCode") as string;
    const moduleCode = formData.get("moduleCode") as string;
    const recordId = (formData.get("recordId") as string) || "";
    const assetType = (formData.get("assetType") as string) || "media";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!languageCode || !moduleCode) {
      return NextResponse.json(
        { success: false, error: "languageCode and moduleCode are required" },
        { status: 400 }
      );
    }
    if (!recordId) return NextResponse.json({ success: false, error: "Create or select a content record before uploading media" }, { status: 400 });

    const language = await prisma.language.findUnique({
      where: { code: languageCode },
    });

    if (!language) {
      return NextResponse.json(
        { success: false, error: "Invalid language" },
        { status: 400 }
      );
    }

    if (!isSuperAdmin(session) && !canContribute(session, language.id)) {
      return NextResponse.json({ success: false, error: "You cannot contribute to this language" }, { status: 403 });
    }

    const module = await prisma.module.findUnique({ where: { code: moduleCode } });
    if (!module) {
      return NextResponse.json({ success: false, error: "Invalid content area" }, { status: 400 });
    }

    let linkedRecord: { id: string; languageId: number; moduleId: number; contributorId: string | null; consentScope: string; restrictionLevel: string; embargoUntil: Date | null; countyCode: string | null; siteName: string | null; sourceReference: string | null; sessionId: string | null; createdAt: Date; language: { code: string } } | null = null;
    {
      linkedRecord = await prisma.culturalRecord.findUnique({
        where: { id: recordId },
        select: { id: true, languageId: true, moduleId: true, contributorId: true, consentScope: true, restrictionLevel: true, embargoUntil: true, countyCode: true, siteName: true, sourceReference: true, sessionId: true, createdAt: true, language: { select: { code: true } } },
      });
      const isSourceLanguage = linkedRecord?.languageId === language.id;
      const hasTranslation = linkedRecord && !isSourceLanguage
        ? await prisma.culturalRecordTranslation.findUnique({ where: { recordId_languageId: { recordId: linkedRecord.id, languageId: language.id } }, select: { id: true } })
        : null;
      const mayUpload = linkedRecord && (
        isSourceLanguage
          ? linkedRecord.contributorId === (session.user as any).id || canUploadContent(session, language.id)
          : !!hasTranslation && canUploadContent(session, language.id)
      );
      if (!linkedRecord || linkedRecord.moduleId !== module.id || !mayUpload) {
        return NextResponse.json({ success: false, error: "Invalid content record" }, { status: 403 });
      }
    }

    const storageLanguageCode = linkedRecord?.language.code ?? languageCode;
    const folder = generateFolderPath(
      storageLanguageCode,
      moduleCode,
      recordId,
      assetType
    );

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadToCloudinary(buffer, folder, {
      resourceType: "auto",
      deliveryType: "authenticated",
      tags: [languageCode, moduleCode, assetType],
    });

    const checksum = uploaded.checksum;
    const domain = getRepositoryDomain(moduleCode);
    const asset = await prisma.$transaction(async (tx) => {
      const sessionId = await ensureRecordCollectionSessionId(tx, linkedRecord!.id, {
        countyCode: linkedRecord!.countyCode,
        siteName: linkedRecord!.siteName,
        date: linkedRecord!.createdAt,
      });
      const sequence = await lockMediaAssetSequence(tx, sessionId, assetType);
      const assetId = buildMediaAssetId(sessionId, assetType, sequence);
      const assetRowId = crypto.randomUUID();
      const created = await tx.mediaAsset.create({
        data: {
          id: assetRowId,
          // A translation editor attaches media to the same source record. Keep
          // the asset in its record's source locale so every translation shares it.
          languageId: linkedRecord!.languageId,
          recordId: linkedRecord!.id,
          type: assetType,
          url: `/api/media/${assetRowId}/file`,
          publicId: uploaded.publicId,
          resourceType: uploaded.resourceType,
          deliveryType: "authenticated",
          checksum: uploaded.checksum,
          format: uploaded.format,
          sizeBytes: uploaded.sizeBytes,
          durationSecs: uploaded.durationSecs,
          width: uploaded.width,
          height: uploaded.height,
          thumbnailUrl: null,
          assetId,
          nrfUri: buildMediaUri(sessionId, assetId, { countyCode: linkedRecord!.countyCode, siteName: linkedRecord!.siteName, moduleCode, mediaType: assetType, extension: uploaded.format, recordedAt: linkedRecord!.createdAt }),
          consentScope: linkedRecord!.consentScope,
          restrictionLevel: linkedRecord!.restrictionLevel,
          embargoUntil: linkedRecord!.embargoUntil,
          countyCode: linkedRecord!.countyCode,
          siteName: linkedRecord!.siteName,
          sourceReference: linkedRecord!.sourceReference,
          sessionId,
          nrfMetadata: {
            domainCode: domain.code,
            domain: domain.name,
            genre: moduleCode,
            assetId,
            consentScope: linkedRecord!.consentScope,
            restrictionLevel: linkedRecord!.restrictionLevel,
            countyCode: linkedRecord!.countyCode,
            siteName: linkedRecord!.siteName,
            sourceReference: linkedRecord!.sourceReference,
            sessionId,
          },
        },
      });
      await linkRecordConsentToMedia(tx, linkedRecord!.id, created.id);
      return created;
    });

    return NextResponse.json({
      success: true,
      data: {
        ...asset,
        sizeBytes: Number(asset.sizeBytes),
      },
    });
  } catch (err: any) {
    console.error("[media/upload]", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
