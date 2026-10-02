import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/**
 * Generate a folder path that mirrors the NRF convention.
 * Example: luolinguaai/luo/proverbs/{recordId}/audio
 */
export function generateFolderPath(
  languageCode: string,
  moduleCode: string,
  recordId: string,
  assetType: string
): string {
  return `luolinguaai/${languageCode}/${moduleCode}/${recordId}/${assetType}`;
}

/**
 * Upload a buffer to Cloudinary with automatic resource type detection.
 * Returns everything the MediaAsset row needs.
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  options?: {
    resourceType?: "image" | "video" | "raw" | "auto";
    deliveryType?: "upload" | "authenticated";
    publicId?: string;
    tags?: string[];
  }
) {
  const resourceType = options?.resourceType ?? "auto";
  const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  const result: any = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: resourceType,
          type: options?.deliveryType ?? "authenticated",
          public_id: options?.publicId,
          tags: options?.tags,
          overwrite: false,
          unique_filename: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(fileBuffer);
  });

  let thumbnailUrl: string | null = null;
  if (result.resource_type === "image") {
    thumbnailUrl = cloudinary.url(result.public_id, {
      width: 400,
      height: 300,
      crop: "fill",
      quality: "auto",
      fetch_format: "auto",
    });
  } else if (result.resource_type === "video") {
    thumbnailUrl = cloudinary.url(result.public_id, {
      resource_type: "video",
      format: "jpg",
      width: 400,
      height: 300,
      crop: "fill",
    });
  }

  return {
    url: result.secure_url as string,
    publicId: result.public_id as string,
    resourceType: result.resource_type as string,
    format: result.format as string,
    sizeBytes: BigInt(result.bytes),
    width: (result.width ?? null) as number | null,
    height: (result.height ?? null) as number | null,
    durationSecs: result.duration ? Math.round(result.duration) : null,
    checksum,
    thumbnailUrl,
  };
}

/**
 * Delete a file from Cloudinary by public_id.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image",
  deliveryType: "upload" | "authenticated" = "authenticated"
) {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    invalidate: true,
  });
}

export async function calculateCloudinarySha256(
  publicId: string,
  format: string,
  resourceType: "image" | "video" | "raw"
): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + 120;
  const downloadUrl = cloudinary.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    type: "authenticated",
    expires_at: expiresAt,
  });
  const response = await fetch(downloadUrl, { cache: "no-store" });
  if (!response.ok || !response.body) throw new Error("Could not read uploaded file for integrity verification");

  const hash = crypto.createHash("sha256");
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    hash.update(value);
  }
  return hash.digest("hex");
}
