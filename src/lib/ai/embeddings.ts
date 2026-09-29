import { prisma } from "@/lib/db";
import { getGemini } from "./gemini";

const MODEL = "gemini-embedding-001";

export async function embedText(text: string): Promise<number[]> {
  const genAI = await getGemini();
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
  media?: { type: string; format: string; caption: string | null; altText: string | null }[];
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
  for (const media of record.media ?? []) {
    parts.push(`${media.type} ${media.format} ${media.caption ?? ""} ${media.altText ?? ""}`);
  }
  return parts.filter(Boolean).join("\n").slice(0, 8000);
}

export async function embedRecord(recordId: string, force = false) {
  const record = await prisma.culturalRecord.findUnique({
    where: { id: recordId },
    include: { translations: true, media: { select: { type: true, format: true, caption: true, altText: true } } },
  });
  if (!record) throw new Error("Record not found");

  if (!force) {
    const existing = await prisma.$queryRawUnsafe<Array<{ languageId: number | null }>>(
      `SELECT "languageId" FROM embeddings WHERE "recordId" = $1`,
      recordId
    );
    const targetLanguageIds = [record.languageId, ...record.translations.map((translation) => translation.languageId)];
    if (targetLanguageIds.every((languageId) => existing.some((entry) => entry.languageId === languageId))) {
      return { skipped: true, id: recordId };
    }
  }

  const variants = [
    { languageId: record.languageId, data: record.data, summary: record.summary },
    ...record.translations.map((translation) => ({ languageId: translation.languageId, data: translation.data, summary: translation.summary })),
  ];

  await prisma.$executeRawUnsafe(`DELETE FROM embeddings WHERE "recordId" = $1`, recordId);
  for (const variant of variants) {
    const text = buildRecordText({
      title: record.title,
      data: variant.data ?? {},
      summary: variant.summary,
      media: variant.languageId === record.languageId ? record.media : [],
    });
    const vector = await embedText(text);
    const vectorStr = `[${vector.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO embeddings (id, "recordId", "languageId", content, vector, model, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5, NOW())`,
      recordId,
      variant.languageId,
      text,
      vectorStr,
      MODEL
    );
  }

  return { skipped: false };
}

export async function embedDictionaryEntry(entryId: string, force = false) {
  const entry = await prisma.dictionaryEntry.findUnique({
    where: { id: entryId },
  });
  if (!entry) throw new Error("Entry not found");

  const english = await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });
  const languageIds = Array.from(new Set([entry.languageId, ...(english ? [english.id] : [])]));
  if (!force) {
    const existing = await prisma.$queryRawUnsafe<Array<{ languageId: number | null }>>(
      `SELECT "languageId" FROM embeddings WHERE "dictionaryId" = $1`,
      entryId
    );
    if (languageIds.every((languageId) => existing.some((item) => item.languageId === languageId))) {
      return { skipped: true, id: entryId };
    }
  }

  await prisma.$executeRawUnsafe(`DELETE FROM embeddings WHERE "dictionaryId" = $1`, entryId);
  for (const languageId of languageIds) {
    const isEnglish = english?.id === languageId;
    const text = [
      entry.dholuo,
      ...(isEnglish ? [entry.english, entry.kiswahili] : []),
      entry.pronunciation,
      ...(entry.synonyms ?? []),
      ...(entry.antonyms ?? []),
    ].filter(Boolean).join("\n");
    const vector = await embedText(text);
    const vectorStr = `[${vector.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO embeddings (id, "dictionaryId", "languageId", content, vector, model, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5, NOW())`,
      entryId,
      languageId,
      text,
      vectorStr,
      MODEL
    );
  }

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
    `INSERT INTO embeddings (id, "transcriptId", "languageId", content, vector, model, "createdAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5, NOW())`,
    transcriptId,
    transcript.languageId,
    text,
    vectorStr,
    MODEL
  );

  return { skipped: false };
}
