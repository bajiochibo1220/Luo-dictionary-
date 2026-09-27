import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("\nStarting database backup...\n");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup-${timestamp}.json`;
  const backupDir = path.join(process.cwd(), "data", "exports", "backups");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const [
    languages,
    modules,
    moduleTranslations,
    fieldDefinitions,
    fieldTranslations,
    culturalRecords,
    dictionaryEntries,
    mediaAssets,
    transcripts,
    users,
    roles,
    userLanguageRoles,
    languageSettings,
    consentRecords,
    provenance,
    trainingDatasets,
  ] = await Promise.all([
    prisma.language.findMany(),
    prisma.module.findMany(),
    prisma.moduleTranslation.findMany(),
    prisma.fieldDefinition.findMany(),
    prisma.fieldTranslation.findMany(),
    prisma.culturalRecord.findMany(),
    prisma.dictionaryEntry.findMany(),
    prisma.mediaAsset.findMany(),
    prisma.transcript.findMany(),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        status: true,
        emailVerified: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.role.findMany(),
    prisma.userLanguageRole.findMany(),
    prisma.languageSetting.findMany(),
    prisma.consentRecord.findMany(),
    prisma.provenance.findMany(),
    prisma.trainingDataset.findMany(),
  ]);

  const payload = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    tables: {
      languages,
      modules,
      moduleTranslations,
      fieldDefinitions,
      fieldTranslations,
      culturalRecords,
      dictionaryEntries,
      mediaAssets: mediaAssets.map((m) => ({
        ...m,
        sizeBytes: Number(m.sizeBytes),
      })),
      transcripts,
      users,
      roles,
      userLanguageRoles,
      languageSettings,
      consentRecords,
      provenance,
      trainingDatasets,
    },
  };

  const json = JSON.stringify(payload, null, 2);
  const checksum = crypto.createHash("sha256").update(json).digest("hex");
  const filepath = path.join(backupDir, filename);

  fs.writeFileSync(filepath, json);

  const stats = fs.statSync(filepath);
  const sizeBytes = stats.size;

  // Record in DB
  await prisma.backup.create({
    data: {
      filename,
      sizeBytes: BigInt(sizeBytes),
      type: "manual",
      fileUrl: filepath,
      checksum,
    },
  });

  console.log(`Backup created: ${filename}`);
  console.log(`Size: ${(sizeBytes / 1024).toFixed(1)} KB`);
  console.log(`Checksum: ${checksum.slice(0, 16)}...\n`);
}

main()
  .catch((e) => {
    console.error("Backup failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());