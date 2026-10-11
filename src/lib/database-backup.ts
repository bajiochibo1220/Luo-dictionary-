import { prisma } from "./db";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export function backupDirectory() {
  return path.resolve(process.env.BACKUP_DIRECTORY || path.join(process.cwd(), "data", "exports", "backups"));
}

export function checkedBackupPath(filename: string) {
  const root = backupDirectory();
  const resolved = path.resolve(filename);
  if (path.dirname(resolved) !== root || !resolved.endsWith(".json")) throw new Error("Invalid backup path.");
  return resolved;
}

export async function createDatabaseBackup() {
  const payload = await prisma.$transaction(async (tx) => {
    const tables = await tx.$queryRaw<Array<{ name: string }>>`SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    const foreignKeys = await tx.$queryRaw<Array<{ table: string; parent: string }>>`SELECT child.relname AS table, parent.relname AS parent FROM pg_constraint c JOIN pg_class child ON child.oid = c.conrelid JOIN pg_class parent ON parent.oid = c.confrelid JOIN pg_namespace n ON n.oid = child.relnamespace WHERE c.contype = 'f' AND n.nspname = 'public'`;
    const snapshot: Record<string, string> = {};
    for (const { name } of tables) {
      const quoted = '"' + name.replace(/"/g, '""') + '"';
      // Keep PostgreSQL JSON as text so 64-bit integers never round through JS numbers.
      const result = await tx.$queryRawUnsafe<Array<{ rows: string }>>(`SELECT COALESCE(jsonb_agg(to_jsonb(row)), '[]'::jsonb)::text AS rows FROM public.${quoted} AS row`);
      snapshot[name] = result[0].rows;
    }
    return { version: "2.0", createdAt: new Date().toISOString(), scope: "Complete database snapshot; Cloudinary file bytes are stored separately and are not included.", foreignKeys, tables: snapshot };
  }, { isolationLevel: "RepeatableRead", maxWait: 15_000, timeout: 120_000 });
  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}.json`;
  const json = JSON.stringify(payload);
  const checksum = crypto.createHash("sha256").update(json).digest("hex");
  const directory = backupDirectory();
  await fs.mkdir(directory, { recursive: true });
  const fileUrl = path.join(directory, filename);
  await fs.writeFile(fileUrl, json, { flag: "wx", mode: 0o600 });
  try {
    return await prisma.backup.create({ data: { filename, sizeBytes: BigInt(Buffer.byteLength(json)), type: "manual", fileUrl, checksum } });
  } catch (error) {
    await fs.unlink(fileUrl);
    throw error;
  }
}
