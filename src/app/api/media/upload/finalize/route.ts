import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudinary } from "@/lib/cloudinary";
import { authorizeMediaUpload } from "@/lib/media-upload-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { languageCode, moduleCode, recordId, assetType, upload } = body;
    const context = await authorizeMediaUpload(session, { languageCode, moduleCode, recordId, assetType });
    if (!upload || typeof upload.public_id !== "string" || typeof upload.resource_type !== "string") {
      return NextResponse.json({ success: false, error: "Cloudinary returned an invalid upload result" }, { status: 400 });
    }

    const expectedResourceType = assetType === "image" ? "image" : assetType === "document" ? "raw" : "video";
    const expectedFolder = `${context.folder}/`;
    if (upload.resource_type !== expectedResourceType || !upload.public_id.startsWith(expectedFolder)) {
      return NextResponse.json({ success: false, error: "Uploaded file does not match the requested content record" }, { status: 400 });
    }

    const verified: any = await cloudinary.api.resource(upload.public_id, { resource_type: expectedResourceType });
    if (!verified.secure_url || verified.public_id !== upload.public_id) {
      return NextResponse.json({ success: false, error: "Could not verify uploaded file with Cloudinary" }, { status: 400 });
    }
    const asset = await prisma.mediaAsset.create({
      data: {
        languageId: context.record.languageId,
        recordId: context.record.id,
        type: assetType,
        url: verified.secure_url,
        publicId: verified.public_id,
        resourceType: verified.resource_type,
        checksum: verified.etag ?? verified.asset_id,
        format: verified.format ?? "bin",
        sizeBytes: BigInt(verified.bytes ?? 0),
        durationSecs: verified.duration ? Math.round(verified.duration) : null,
        width: verified.width ?? null,
        height: verified.height ?? null,
        thumbnailUrl: assetType === "image"
          ? cloudinary.url(verified.public_id, { width: 400, height: 300, crop: "fill", quality: "auto", fetch_format: "auto" })
          : assetType === "video"
            ? cloudinary.url(verified.public_id, { resource_type: "video", format: "jpg", width: 400, height: 300, crop: "fill" })
            : null,
        nrfMetadata: { domain: "culture", genre: moduleCode, consent: "granted", restriction: "none" },
      },
    });
    return NextResponse.json({ success: true, data: { ...asset, sizeBytes: Number(asset.sizeBytes) } });
  } catch (error: any) {
    console.error("[media/upload/finalize]", error);
    return NextResponse.json({ success: false, error: error.message || "Could not save uploaded file" }, { status: error.status || 500 });
  }
}
