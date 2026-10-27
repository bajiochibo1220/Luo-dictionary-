import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudinary, configureCloudinary } from "@/lib/cloudinary";
import { authorizeMediaUpload } from "@/lib/media-upload-auth";
import { rawFileExtension } from "@/lib/raw-media-format";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { languageCode, moduleCode, recordId, assetType, fileName, contentType, publicId: requestedPublicId } = body;
    if (typeof fileName !== "string" || fileName.length > 255 || typeof contentType !== "string") {
      return NextResponse.json({ success: false, error: "Invalid file details" }, { status: 400 });
    }
    const context = await authorizeMediaUpload(session, { languageCode, moduleCode, recordId, assetType });
    const { cloudName, apiKey, apiSecret } = await configureCloudinary();

    const resourceType = assetType === "image" ? "image" : assetType === "document" ? "raw" : "video";
    const timestamp = Math.floor(Date.now() / 1000);
    const baseName = fileName.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "media";
    if (requestedPublicId !== undefined && (typeof requestedPublicId !== "string" || !/^[\w-]{1,90}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\.[a-z0-9]{1,8})?$/i.test(requestedPublicId))) {
      return NextResponse.json({ success: false, error: "Invalid upload identifier" }, { status: 400 });
    }
    const publicId = requestedPublicId || `${baseName}-${crypto.randomUUID()}${resourceType === "raw" ? "." + rawFileExtension(fileName) : ""}`;
    const tags = [languageCode, moduleCode, assetType].join(",");
    const deliveryType = "authenticated" as const;
    const paramsToSign = { folder: context.folder, public_id: publicId, tags, type: deliveryType, overwrite: false, timestamp };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return NextResponse.json({
      success: true,
      data: { cloudName, apiKey, timestamp, signature, folder: context.folder, publicId, tags, resourceType, deliveryType, overwrite: false },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Could not prepare upload" }, { status: error.status || 500 });
  }
}
