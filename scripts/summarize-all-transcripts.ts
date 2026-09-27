import { PrismaClient } from "@prisma/client";
import { processTranscript } from "../src/lib/ai/summarize";
import { hasGemini } from "../src/lib/ai/gemini";

const prisma = new PrismaClient();

async function main() {
  console.log("\nBatch summarizing all transcripts...\n");

  if (!hasGemini()) {
    console.error(
      "GEMINI_API_KEY is not configured. Add a real key to .env to run this script."
    );
    process.exit(1);
  }

  const transcripts = await prisma.transcript.findMany({
    where: {
      OR: [
        { aiSummary: null },
        { aiSummary: "" },
      ],
    },
    select: { id: true, speaker: true, text: true },
  });

  console.log(`Found ${transcripts.length} transcripts without summaries.\n`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < transcripts.length; i++) {
    const t = transcripts[i];
    const label = t.speaker || `Transcript ${i + 1}`;
    try {
      const result = await processTranscript(t.id);
      console.log(
        `  [${i + 1}/${transcripts.length}] OK    ${label}`
      );
      console.log(`         ${result.summary.slice(0, 100)}...`);
      succeeded++;
      await new Promise((res) => setTimeout(res, 300));
    } catch (err: any) {
      failed++;
      console.error(
        `  [${i + 1}/${transcripts.length}] FAIL  ${label} — ${err.message}`
      );
    }
  }

  console.log(
    `\nDone. OK: ${succeeded} · Failed: ${failed}\n`
  );
}

main()
  .catch((err) => {
    console.error("Batch summarization failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());