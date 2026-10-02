"use client";

export type MediaUploadDetails = {
  languageCode: string;
  moduleCode: string;
  recordId: string;
  assetType: string;
};

export type SignedMediaUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  tags: string;
  resourceType: "image" | "video" | "raw";
  deliveryType: "authenticated";
};

export async function getMediaUploadSignature(file: File, details: MediaUploadDetails, publicId?: string): Promise<SignedMediaUpload> {
  const response = await fetch("/api/media/upload/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...details, fileName: file.name, contentType: file.type, ...(publicId ? { publicId } : {}) }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || `Could not prepare ${file.name}`);
  return result.data;
}

export async function uploadMediaInChunks(
  file: File,
  initialSignature: SignedMediaUpload,
  refreshSignature?: () => Promise<SignedMediaUpload>,
) {
  const chunkSize = 6 * 1024 * 1024;
  const uploadId = crypto.randomUUID();
  let signed = initialSignature;
  let signatureIssuedAt = Date.now();
  let result: any;
  for (let start = 0; start < file.size; start += chunkSize) {
    if (refreshSignature && Date.now() - signatureIssuedAt > 45 * 60 * 1000) {
      signed = await refreshSignature();
      signatureIssuedAt = Date.now();
    }
    const endpoint = `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`;
    const end = Math.min(start + chunkSize, file.size);
    const form = new FormData();
    form.set("file", file.slice(start, end), file.name);
    form.set("api_key", signed.apiKey);
    form.set("timestamp", String(signed.timestamp));
    form.set("signature", signed.signature);
    form.set("folder", signed.folder);
    form.set("public_id", signed.publicId);
    form.set("tags", signed.tags);
    form.set("type", signed.deliveryType);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "X-Unique-Upload-Id": uploadId, "Content-Range": `bytes ${start}-${end - 1}/${file.size}` },
      body: form,
    });
    result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error?.message || `Cloudinary rejected ${file.name} (HTTP ${response.status})`);
  }
  if (!result?.public_id || result.done === false) throw new Error(result?.error?.message || `Cloudinary did not finish uploading ${file.name}`);
  return result;
}

export async function checksumSha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function finalizeMediaUpload(details: MediaUploadDetails, upload: any, checksum: string) {
  const response = await fetch("/api/media/upload/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...details, upload, checksum }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || "Could not save uploaded file");
  return result.data;
}

export async function uploadMediaFile(file: File, details: MediaUploadDetails) {
  const checksum = await checksumSha256(file);
  const signed = await getMediaUploadSignature(file, details);
  const upload = await uploadMediaInChunks(file, signed, () => getMediaUploadSignature(file, details, signed.publicId));
  return finalizeMediaUpload(details, upload, checksum);
}
