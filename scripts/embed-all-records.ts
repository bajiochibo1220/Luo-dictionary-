import { PrismaClient } from "@prisma/client";
import { embedRecord } from "../src/lib/ai/embeddings";
import { hasGemini } from "../src/lib/ai/gemini";

const prisma = new PrismaClient();

async function main() {
  console.log("\nBatch embedding all published records...\n");

  if (!hasGemini()) {
    console.error(
      "GEMINI_API_KEY is not configured. Add a real key to .env to run this script."
    );
    process.exit(1);
  }

  const records = await prisma.culturalRecord.findMany({
    where: { status: "published" },
    select: { id: true, title: true },
  });

  console.log(`Found ${records.length} published records.\n`);

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    try {
      const result = await embedRecord(r.id);
      if (result.skipped) {
        skipped++;
        console.log(`  [${i + 1}/${records.length}] SKIP  ${r.title}`);
      } else {
        succeeded++;
        console.log(`  [${i + 1}/${records.length}] OK    ${r.title}`);
      }
      await new Promise((res) => setTimeout(res, 300));
    } catch (err: any) {
      failed++;
      console.error(
        `  [${i + 1}/${records.length}] FAIL  ${r.title} — ${err.message}`
      );
    }
  }

  console.log(
    `\nDone. OK: ${succeeded} · Skipped: ${skipped} · Failed: ${failed}\n`
  );
}

main()
  .catch((err) => {
    console.error("Batch embedding failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());