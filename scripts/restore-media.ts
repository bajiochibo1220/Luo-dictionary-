import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { createReadStream } from "fs";
import { prisma } from "../src/lib/db";
import { cloudinary, configureCloudinary, calculateCloudinarySha256 } from "../src/lib/cloudinary";

async function checksum(filename: string) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

async function main() {
  const args = process.argv.slice(2);
  const input = args.find(value => !value.startsWith("--"));
  if (!input) throw new Error("Usage: npm run media:restore -- backup-folder [--apply]");
  const directory = path.resolve(input);
  const manifest = JSON.parse(await fs.readFile(path.join(directory, "manifest.json"), "utf8"));
  if (manifest.version !== "1.0" || !Array.isArray(manifest.files)) throw new Error("Invalid media manifest.");
  const seen = new Set<string>();
  for (const asset of manifest.files) {
    if (typeof asset.id !== "string" || seen.has(asset.id) || !/^[A-Za-z0-9_-]+$/.test(asset.id) || typeof asset.filename !== "string" || path.basename(asset.filename) !== asset.filename || !asset.filename.startsWith(`${asset.id}.`) || !["image", "video", "raw"].includes(asset.resourceType) || typeof asset.publicId !== "string" || !/^[a-f0-9]{64}$/.test(asset.checksum)) throw new Error("Invalid media manifest entry.");
    seen.add(asset.id);
    if (await checksum(path.join(directory, asset.filename)) !== asset.checksum) throw new Error("Media checksum mismatch; restoration aborted.");
  }
  if (!args.includes("--apply")) { console.log(`Verified ${manifest.files.length} files. No database or storage changes made.`); return; }
  const targets = await prisma.mediaAsset.findMany({ where: { id: { in: manifest.files.map((asset: any) => asset.id) } } });
  if (manifest.files.some((asset: any) => !targets.some(target => target.id === asset.id && target.publicId === asset.publicId))) throw new Error("Restore the matching database snapshot before restoring media.");
  await configureCloudinary();
  for (const asset of manifest.files) {
    const target = await prisma.mediaAsset.findUnique({ where: { id: asset.id } });
    if (!target || target.publicId !== asset.publicId) throw new Error("Restore the matching database snapshot before restoring media.");
    // Existing provider objects are preserved. Recover into an empty storage
    // account, or inspect an existing object's checksum before reusing it.
    const result = await cloudinary.uploader.upload(path.join(directory, asset.filename), { public_id: asset.publicId, resource_type: asset.resourceType, type: "authenticated", overwrite: false });
    const remoteChecksum = await calculateCloudinarySha256(result.public_id, result.format || asset.format, result.resource_type as "image" | "video" | "raw");
    if (remoteChecksum !== asset.checksum) throw new Error("Storage content did not match the recovery file; the database entry was not changed.");
    await prisma.mediaAsset.update({ where: { id: asset.id }, data: { url: `/api/media/${asset.id}/file`, publicId: result.public_id, resourceType: result.resource_type, deliveryType: "authenticated", thumbnailUrl: null, checksum: asset.checksum } });
  }
  console.log(`Restored ${manifest.files.length} media files. Verify public and private access before opening the recovered site.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
