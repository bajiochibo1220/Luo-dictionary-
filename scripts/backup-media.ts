import "dotenv/config";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import crypto from "crypto";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { prisma } from "../src/lib/db";
import { cloudinary, configureCloudinary } from "../src/lib/cloudinary";
import { backupDirectory, createDatabaseBackup } from "../src/lib/database-backup";

async function main() {
  await configureCloudinary();
  const databaseBackup = await createDatabaseBackup();
  const databaseSnapshot = JSON.parse(await fs.readFile(databaseBackup.fileUrl!, "utf8"));
  const assets = JSON.parse(databaseSnapshot.tables.media_assets) as Array<{ id: string; format: string; deliveryType: string; publicId: string; resourceType: string; url: string; checksum: string }>;
  const directory = path.join(backupDirectory(), `media-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`);
  await fs.mkdir(directory, { recursive: true });
  const files = [];
  for (const asset of assets) {
    if (!/^[A-Za-z0-9_-]+$/.test(asset.id)) throw new Error("Invalid asset identifier.");
    const extension = /^[A-Za-z0-9]+$/.test(asset.format) ? asset.format : "bin";
    const filename = `${asset.id}.${extension}`;
    const url = asset.deliveryType === "authenticated"
      ? cloudinary.utils.private_download_url(asset.publicId, asset.format, { resource_type: asset.resourceType, type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 180 })
      : asset.url;
    const source = new URL(url);
    if (source.protocol !== "https:" || !(source.hostname === "cloudinary.com" || source.hostname.endsWith(".cloudinary.com"))) throw new Error("Asset has no supported Cloudinary source; back up its original provider separately.");
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok || !response.body) throw new Error("A media file could not be downloaded. The backup is incomplete.");
    const hash = crypto.createHash("sha256");
    const meter = new Transform({ transform(chunk, _encoding, callback) { hash.update(chunk); callback(null, chunk); } });
    await pipeline(Readable.fromWeb(response.body as any), meter, createWriteStream(path.join(directory, filename), { flags: "wx", mode: 0o600 }));
    const checksum = hash.digest("hex");
    if (/^[a-f0-9]{64}$/i.test(asset.checksum) && checksum !== asset.checksum.toLowerCase()) throw new Error("A media integrity check failed. The backup is incomplete.");
    files.push({ id: asset.id, filename, publicId: asset.publicId, resourceType: asset.resourceType, format: asset.format, checksum, sizeBytes: (await fs.stat(path.join(directory, filename))).size });
  }
  await fs.writeFile(path.join(directory, "manifest.json"), JSON.stringify({ version: "1.0", createdAt: new Date().toISOString(), databaseSnapshot: databaseBackup.filename, databaseChecksum: databaseBackup.checksum, files }, null, 2), { flag: "wx", mode: 0o600 });
  console.log(`Complete media backup: ${files.length} files. Keep this folder together with its matching database snapshot in private durable storage.`);
  console.log(`Location: ${directory}`);
}
main().catch(() => { console.error("Media backup failed; do not treat a folder without a manifest as a complete backup."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
