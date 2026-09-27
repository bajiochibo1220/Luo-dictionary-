import { prisma } from "@/lib/db";
import { getGemini } from "./gemini";

const MODEL = "gemini-embedding-001";

export async function embedText(text: string): Promise<number[]> {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    outputDimensionality: 768,
  } as any);
  return result.embedding.values;
}

function buildRecordText(record: {
  title: string;
  data: any;
  summary?: string | null;
}): string {
  const parts = [record.title];
  if (record.summary) parts.push(record.summary);
  const d = record.data as any;
  if (d) {
    for (const [, v] of Object.entries(d)) {
      if (typeof v === "string") parts.push(v);
      else if (Array.isArray(v))
        parts.push(v.filter((x) => typeof x === "string").join(" "));
    }
  }
  return parts.filter(Boolean).join("\n").slice(0, 8000);
}

export async function embedRecord(recordId: string, force = false) {
  const record = await prisma.culturalRecord.findUnique({
    where: { id: recordId },
  });
  if (!record) throw new Error("Record not found");

  if (!force) {
    const existing = await prisma.embedding.findFirst({
      where: { recordId },
    });
    if (existing) return { skipped: true, id: existing.id };
  }

  const text = buildRecordText(record);
  const vector = await embedText(text);
  const vectorStr = `[${vector.join(",")}]`;

  await prisma.$executeRawUnsafe(
    `DELETE FROM embeddings WHERE "recordId" = $1`,
    recordId
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO embeddings (id, "recordId", content, vector, model, "createdAt")
     VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, NOW())`,
    recordId,
    text,
    vectorStr,
    MODEL
  );

  return { skipped: false };
}

export async function embedDictionaryEntry(entryId: string, force = false) {
  const entry = await prisma.dictionaryEntry.findUnique({
    where: { id: entryId },
  });
  if (!entry) throw new Error("Entry not found");

  if (!force) {
    const existing = await prisma.embedding.findFirst({
      where: { dictionaryId: entryId },
    });
    if (existing) return { skipped: true, id: existing.id };
  }

  const text = [
    entry.dholuo,
    entry.english,
    entry.kiswahili,
    entry.pronunciation,
    ...(entry.synonyms ?? []),
    ...(entry.antonyms ?? []),
  ]
    .filter(Boolean)
    .join("\n");

  const vector = await embedText(text);
  const vectorStr = `[${vector.join(",")}]`;

  await prisma.$executeRawUnsafe(
    `DELETE FROM embeddings WHERE "dictionaryId" = $1`,
    entryId
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO embeddings (id, "dictionaryId", content, vector, model, "createdAt")
     VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, NOW())`,
    entryId,
    text,
    vectorStr,
    MODEL
  );

  return { skipped: false };
}

export async function embedTranscript(transcriptId: string, force = false) {
  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
  });
  if (!transcript) throw new Error("Transcript not found");

  if (!force) {
    const existing = await prisma.embedding.findFirst({
      where: { transcriptId },
    });
    if (existing) return { skipped: true, id: existing.id };
  }

  const text = transcript.text.slice(0, 8000);
  const vector = await embedText(text);
  const vectorStr = `[${vector.join(",")}]`;

  await prisma.$executeRawUnsafe(
    `DELETE FROM embeddings WHERE "transcriptId" = $1`,
    transcriptId
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO embeddings (id, "transcriptId", content, vector, model, "createdAt")
     VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, NOW())`,
    transcriptId,
    text,
    vectorStr,
    MODEL
  );

  return { skipped: false };
}