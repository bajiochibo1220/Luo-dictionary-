import "dotenv/config";
import fs from "fs/promises";
import crypto from "crypto";
import { prisma } from "../src/lib/db";
import { validateSnapshot, restorationOrder } from "../src/lib/backup-format";

async function main() {
  const args = process.argv.slice(2);
  const filename = args.find(value => !value.startsWith("--"));
  if (!filename) throw new Error("Usage: npm run db:restore -- snapshot.json [--apply --sha256=EXPECTED_CHECKSUM]");
  const bytes = await fs.readFile(filename);
  const checksum = crypto.createHash("sha256").update(bytes).digest("hex");
  const snapshot = validateSnapshot(JSON.parse(bytes.toString("utf8")));
  const tables = restorationOrder(snapshot);
  const expected = args.find(value => value.startsWith("--sha256="))?.slice(9);
  if (expected && expected !== checksum) throw new Error("Backup checksum mismatch.");
  if (!args.includes("--apply")) { console.log(`Valid snapshot: ${tables.length} tables. SHA-256: ${checksum}. No database changes made.`); return; }
  if (!expected) throw new Error("Restoration requires --sha256 with the original backup checksum.");
  await prisma.$transaction(async tx => {
    const targetTables = await tx.$queryRaw<Array<{ name: string }>>`SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'`;
    if (targetTables.length !== Object.keys(snapshot.tables).length || targetTables.some(row => !Object.hasOwn(snapshot.tables, row.name))) throw new Error("Apply matching Prisma migrations to the recovery database first.");
    const migrations = await tx.$queryRawUnsafe<Array<{ name: string; checksum: string }>>('SELECT migration_name AS name, checksum FROM public."_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
    const original = JSON.parse(snapshot.tables._prisma_migrations).filter((row: any) => row.finished_at && !row.rolled_back_at).map((row: any) => ({ name: row.migration_name, checksum: row.checksum })).sort((a: any, b: any) => a.name.localeCompare(b.name));
    if (JSON.stringify(migrations) !== JSON.stringify(original)) throw new Error("Recovery database migration history does not match the snapshot.");
    // Never clear an existing database: apply is only allowed to an empty migrated target.
    for (const name of tables) {
      const count = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT count(*) FROM public."${name}"`);
      if (count[0].count !== 0n) throw new Error(`Recovery database is not empty (${name}). Restore aborted.`);
    }
    for (const name of tables) {
      if (snapshot.tables[name] === "[]") continue;
      await tx.$executeRawUnsafe(`INSERT INTO public."${name}" SELECT * FROM jsonb_populate_recordset(NULL::public."${name}", $1::jsonb)`, snapshot.tables[name]);
    }
    const sequences = await tx.$queryRaw<Array<{ table: string; column: string; sequence: string }>>`SELECT table_name AS table, column_name AS column, pg_get_serial_sequence(quote_ident(table_schema) || '.' || quote_ident(table_name), column_name) AS sequence FROM information_schema.columns WHERE table_schema = 'public' AND column_default LIKE 'nextval(%'`;
    for (const row of sequences) {
      if (!row.sequence || !tables.includes(row.table) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(row.column)) continue;
      await tx.$queryRawUnsafe(`SELECT setval($1::regclass, COALESCE((SELECT MAX("${row.column}") FROM public."${row.table}"), 1), EXISTS(SELECT 1 FROM public."${row.table}"))`, row.sequence);
    }
  }, { timeout: 120_000, maxWait: 15_000 });
  console.log("Database restored. Recover Cloudinary file bytes separately and verify media before opening the site.");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
