import { prisma } from "@/lib/db";
import { getGemini } from "./gemini";
import { publicMediaWhere, isPubliclyEligible } from "@/lib/governance";

const MODEL = "gemini-embedding-001";

export async function embedText(text: string): Promise<number[]> {
  const genAI = await getGemini();
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    outputDimensionality: 768,
  } as any);
  const vector = result.embedding.values;
  if (vector.length !== 768 || vector.some(value => !Number.isFinite(value))) throw new Error("Provider returned an invalid embedding.");
  return vector;
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
    for (const [key, v] of Object.entries(d)) {
      if (["sourcePermission", "attributionPreference"].includes(key)) continue;
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
    include: { translations: true, media: { where: publicMediaWhere(), select: { type: true, format: true, caption: true, altText: true } } },
  });
  if (!record) throw new Error("Record not found");

  if (record.status !== "published" || !isPubliclyEligible(record)) {
    await prisma.$executeRawUnsafe(`DELETE FROM embeddings WHERE "recordId" = $1`, recordId);
    return { skipped: true, id: recordId, reason: "not_publicly_eligible" };
  }

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
    { languageId: record.languageId, title: record.title, data: record.data, summary: record.summary },
    ...record.translations.map((translation) => ({ languageId: translation.languageId, title: translation.title ?? record.title, data: translation.data, summary: translation.summary })),
  ];

  const replacements: Array<{ languageId: number; text: string; vectorStr: string }> = [];
  for (const variant of variants) {
    const text = buildRecordText({
      title: variant.title,
      data: variant.data ?? {},
      summary: variant.summary,
      media: variant.languageId === record.languageId ? record.media : [],
    });
    const vector = await embedText(text);
    const vectorStr = `[${vector.join(",")}]`;
    replacements.push({ languageId: variant.languageId, text: text, vectorStr });
  }

  await prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT id FROM cultural_records WHERE id = $1 FOR UPDATE', recordId);
    const current = await tx.culturalRecord.findUnique({ where: { id: recordId } });
    if (!current || current.updatedAt.getTime() !== record.updatedAt.getTime() || current.status !== "published" || !isPubliclyEligible(current)) throw new Error("Content changed during indexing; retry with the current version.");
    await tx.$executeRawUnsafe(`DELETE FROM embeddings WHERE "recordId" = $1`, recordId);
    for (const replacement of replacements) {
      await tx.$executeRawUnsafe(`INSERT INTO embeddings (id, "recordId", "languageId", content, vector, model, "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5, NOW())`, recordId, replacement.languageId, replacement.text, replacement.vectorStr, MODEL);
    }
  });
  return { skipped: false };
}

export async function embedDictionaryEntry(entryId: string, force = false) {
  const entry = await prisma.dictionaryEntry.findUnique({
    where: { id: entryId },
  });
  if (!entry) throw new Error("Entry not found");

  if (entry.status !== "published" || !isPubliclyEligible(entry)) {
    await prisma.$executeRawUnsafe(`DELETE FROM embeddings WHERE "dictionaryId" = $1`, entryId);
    return { skipped: true, id: entryId, reason: "not_publicly_eligible" };
  }

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

  const replacements: Array<{ languageId: number; text: string; vectorStr: string }> = [];
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
    replacements.push({ languageId: languageId, text: text, vectorStr });
  }

  await prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT id FROM dictionary_entries WHERE id = $1 FOR UPDATE', entryId);
    const current = await tx.dictionaryEntry.findUnique({ where: { id: entryId } });
    if (!current || current.updatedAt.getTime() !== entry.updatedAt.getTime() || current.status !== "published" || !isPubliclyEligible(current)) throw new Error("Content changed during indexing; retry with the current version.");
    await tx.$executeRawUnsafe(`DELETE FROM embeddings WHERE "dictionaryId" = $1`, entryId);
    for (const replacement of replacements) {
      await tx.$executeRawUnsafe(`INSERT INTO embeddings (id, "dictionaryId", "languageId", content, vector, model, "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5, NOW())`, entryId, replacement.languageId, replacement.text, replacement.vectorStr, MODEL);
    }
  });
  return { skipped: false };
}

export async function embedTranscript(transcriptId: string, force = false) {
  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
    include: { record: { include: { translations: { include: { language: { select: { code: true } } } } } } },
  });
  if (!transcript) throw new Error("Transcript not found");

  if (!transcript.record || transcript.record.status !== "published" || !isPubliclyEligible(transcript) || !isPubliclyEligible(transcript.record)) {
    await prisma.$executeRawUnsafe(`DELETE FROM embeddings WHERE "transcriptId" = $1`, transcriptId);
    return { skipped: true, id: transcriptId, reason: "not_publicly_eligible" };
  }

  const variants = new Map<number, string>([[transcript.languageId, transcript.text]]);
  const englishTranslation = transcript.record.translations.find((item) => item.language.code === "eng");
  const englishText = (englishTranslation?.data as any)?.transcript;
  if (typeof englishText === "string" && englishText.trim()) {
    variants.set(englishTranslation!.languageId, englishText.trim());
  }

  if (!force) {
    const existing = await prisma.embedding.findMany({ where: { transcriptId }, select: { languageId: true } });
    if ([...variants.keys()].every((languageId) => existing.some((entry) => entry.languageId === languageId))) {
      return { skipped: true, id: transcriptId };
    }
  }

  const replacements: Array<{ languageId: number; text: string; vectorStr: string }> = [];
  for (const [languageId, text] of variants) {
    const vector = await embedText(text.slice(0, 8000));
    const vectorStr = `[${vector.join(",")}]`;
    replacements.push({ languageId: languageId, text: text.slice(0, 8000), vectorStr });
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.transcript.findUnique({ where: { id: transcriptId }, include: { record: true } });
    if (!current || current.text !== transcript.text || !current.record || current.record.status !== "published" || !isPubliclyEligible(current) || !isPubliclyEligible(current.record)) throw new Error("Transcript changed during indexing; retry with the current version.");
    await tx.$executeRawUnsafe(`DELETE FROM embeddings WHERE "transcriptId" = $1`, transcriptId);
    for (const replacement of replacements) {
      await tx.$executeRawUnsafe(`INSERT INTO embeddings (id, "transcriptId", "languageId", content, vector, model, "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5, NOW())`, transcriptId, replacement.languageId, replacement.text, replacement.vectorStr, MODEL);
    }
  });
  return { skipped: false };
}