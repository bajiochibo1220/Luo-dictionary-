// ============================================================
// embed-all-records.ts
// Batch-generate embeddings for every published record.
//
// NOTE: This is a placeholder. The actual embedRecord function
// will be implemented in Prompt 36 (Embeddings Pipeline).
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\nBatch embedding all published records...\n");

  const records = await prisma.culturalRecord.findMany({
    where: { status: "published" },
    select: { id: true, title: true },
  });

  console.log(`Found ${records.length} published records.`);

  // TODO (Prompt 36): call embedRecord(record.id) for each
  for (const r of records) {
    console.log(`  - ${r.title} (${r.id})`);
  }

  console.log(
    "\nSkipped embedding generation — implement in Prompt 36.\n"
  );
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });