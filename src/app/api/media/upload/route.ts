import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import { authorizeMediaUpload } from "@/lib/media-upload-auth";
import { lockEditableRecord } from "@/lib/content-workflow";
import { canReadRecord } from "@/lib/governance";
import crypto from "crypto";
import { buildMediaAssetId, buildMediaUri, ensureRecordCollectionSessionId, getRepositoryDomain, linkRecordConsentToMedia, lockMediaAssetSequence } from "@/lib/governance";

export async function POST(req: NextRequest) {
  let uploadedObject: Awaited<ReturnType<typeof uploadToCloudinary>> | null = null;
  let persisted = false;
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

    const context = await authorizeMediaUpload(session, { languageCode, moduleCode, recordId, assetType });
    const linkedRecord = context.record;
    const folder = context.folder;
    if (file.size === 0 || file.size > 100 * 1024 * 1024) return NextResponse.json({ success: false, error: "Files must be between 1 byte and 100 MB." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadToCloudinary(buffer, folder, {
      resourceType: "auto",
      deliveryType: "authenticated",
      tags: [languageCode, moduleCode, assetType],
    });

    uploadedObject = uploaded;
    const checksum = uploaded.checksum;
    const domain = getRepositoryDomain(moduleCode);
    const asset = await prisma.$transaction(async (tx) => {
      const current = await lockEditableRecord(tx, linkedRecord.id);
      if (!canReadRecord(session.user, current)) throw Object.assign(new Error("Content access changed during upload."), { status: 403 });
      Object.assign(linkedRecord, current);
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

    persisted = true;
    return NextResponse.json({
      success: true,
      data: {
        ...asset,
        sizeBytes: Number(asset.sizeBytes),
      },
    });
  } catch (err: any) {
    if (uploadedObject && !persisted) await deleteFromCloudinary(uploadedObject.publicId, uploadedObject.resourceType as "image" | "video" | "raw").catch(() => console.error("[media/upload] unused upload cleanup failed"));
    console.error("[media/upload] failed", { name: err.name });
    return NextResponse.json(
      { success: false, error: err.message ?? "Upload failed" },
      { status: err.status || 500 }
    );
  }
}
