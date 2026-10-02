import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateCloudinarySha256, cloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import { authorizeMediaUpload } from "@/lib/media-upload-auth";
import { buildMediaAssetId, buildMediaUri, ensureRecordCollectionSessionId, getRepositoryDomain, linkRecordConsentToMedia, lockMediaAssetSequence } from "@/lib/governance";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { languageCode, moduleCode, recordId, assetType, upload, checksum } = body;
    const context = await authorizeMediaUpload(session, { languageCode, moduleCode, recordId, assetType });
    if (!upload || typeof upload.public_id !== "string" || typeof upload.resource_type !== "string" || !/^[a-f0-9]{64}$/i.test(checksum || "")) {
      return NextResponse.json({ success: false, error: "Cloudinary returned an invalid upload result" }, { status: 400 });
    }

    const expectedResourceType = assetType === "image" ? "image" : assetType === "document" ? "raw" : "video";
    const expectedFolder = `${context.folder}/`;
    if (upload.resource_type !== expectedResourceType || !upload.public_id.startsWith(expectedFolder)) {
      return NextResponse.json({ success: false, error: "Uploaded file does not match the requested content record" }, { status: 400 });
    }

    const verified: any = await cloudinary.api.resource(upload.public_id, { resource_type: expectedResourceType, type: "authenticated" });
    if (!verified.secure_url || verified.public_id !== upload.public_id) {
      return NextResponse.json({ success: false, error: "Could not verify uploaded file with Cloudinary" }, { status: 400 });
    }
    const checksumHex = String(checksum).toLowerCase();
    const verifiedChecksum = await calculateCloudinarySha256(upload.public_id, verified.format ?? "bin", expectedResourceType);
    if (verifiedChecksum !== checksumHex) {
      await deleteFromCloudinary(upload.public_id, expectedResourceType as "image" | "video" | "raw").catch(() => undefined);
      return NextResponse.json({ success: false, error: "Uploaded file checksum did not match the original file" }, { status: 400 });
    }
    const existing = await prisma.mediaAsset.findFirst({
      where: { recordId: context.record.id, type: assetType, checksum: checksumHex },
    });
    if (existing) {
      // A retry may be finalizing the same Cloudinary object after its database
      // transaction committed but the response was lost. Never delete the
      // object already referenced by the saved asset.
      if (existing.publicId !== upload.public_id) {
        await deleteFromCloudinary(upload.public_id, expectedResourceType as "image" | "video" | "raw").catch(() => undefined);
      }
      return NextResponse.json({ success: true, data: { ...existing, sizeBytes: Number(existing.sizeBytes) } });
    }
    const domain = getRepositoryDomain(moduleCode);
    const asset = await prisma.$transaction(async (tx) => {
      const sessionId = await ensureRecordCollectionSessionId(tx, context.record.id, {
        countyCode: context.record.countyCode,
        siteName: context.record.siteName,
        date: context.record.createdAt,
      });
      const sequence = await lockMediaAssetSequence(tx, sessionId, assetType);
      const assetId = buildMediaAssetId(sessionId, assetType, sequence);
      const rowId = crypto.randomUUID();
      const created = await tx.mediaAsset.create({
        data: {
          id: rowId,
          languageId: context.record.languageId,
          recordId: context.record.id,
          type: assetType,
          url: `/api/media/${rowId}/file`,
          publicId: verified.public_id,
          resourceType: verified.resource_type,
          deliveryType: "authenticated",
          checksum: checksumHex,
          assetId,
          nrfUri: buildMediaUri(sessionId, assetId, {
            countyCode: context.record.countyCode,
            siteName: context.record.siteName,
            moduleCode,
            mediaType: assetType,
            extension: verified.format ?? "bin",
            recordedAt: context.record.createdAt,
          }),
          format: verified.format ?? "bin",
          sizeBytes: BigInt(verified.bytes ?? 0),
          durationSecs: verified.duration ? Math.round(verified.duration) : null,
          width: verified.width ?? null,
          height: verified.height ?? null,
          thumbnailUrl: null,
          consentScope: context.record.consentScope,
          restrictionLevel: context.record.restrictionLevel,
          embargoUntil: context.record.embargoUntil,
          countyCode: context.record.countyCode,
          siteName: context.record.siteName,
          sourceReference: context.record.sourceReference,
          sessionId,
          nrfMetadata: {
            domainCode: domain.code, domain: domain.name, genre: moduleCode, assetId,
            consentScope: context.record.consentScope,
            restrictionLevel: context.record.restrictionLevel,
            countyCode: context.record.countyCode,
            siteName: context.record.siteName,
            sourceReference: context.record.sourceReference,
            sessionId,
          },
        },
      });
      await linkRecordConsentToMedia(tx, context.record.id, created.id);
      return created;
    }, { maxWait: 15_000, timeout: 30_000 });
    return NextResponse.json({ success: true, data: { ...asset, sizeBytes: Number(asset.sizeBytes) } });
  } catch (error: any) {
    console.error("[media/upload/finalize]", error);
    return NextResponse.json({ success: false, error: error.message || "Could not save uploaded file" }, { status: error.status || 500 });
  }
}
