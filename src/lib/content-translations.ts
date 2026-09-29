import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function getContentCultureLanguageId(defaultLanguageId: number): Promise<number> {
  const defaultLanguage = await prisma.language.findUnique({ where: { id: defaultLanguageId }, select: { code: true } });
  if (defaultLanguage?.code !== "eng") return defaultLanguageId;
  const cultureCode = cookies().get("content-culture")?.value;
  if (!cultureCode) return defaultLanguageId;
  const language = await prisma.language.findUnique({ where: { code: cultureCode }, select: { id: true } });
  return language?.id ?? defaultLanguageId;
}

export function localizedRecordWhere(languageId: number) {
  return {
    OR: [
      { languageId },
      { translations: { some: { languageId } } },
    ],
  };
}

/** Return the source record for its own locale and its translation elsewhere.
 * Deliberately never falls back to source-language descriptions. */
export function localizeRecord<T extends {
  languageId: number;
  data: unknown;
  summary: string | null;
  translations?: { languageId: number; data: unknown; summary: string | null }[];
}>(record: T, languageId: number) {
  if (record.languageId === languageId) return record;
  const translation = record.translations?.find((item) => item.languageId === languageId);
  return {
    ...record,
    data: translation?.data ?? {},
    summary: translation?.summary ?? null,
  };
}

export async function findLocalizedRecord(recordId: string, languageId: number, moduleCode: string, cultureLanguageId?: number) {
  const selectedCultureLanguageId = cultureLanguageId ?? await getContentCultureLanguageId(languageId);
  const record = await prisma.culturalRecord.findFirst({
    where: {
      id: recordId,
      languageId: selectedCultureLanguageId,
      status: "published",
      module: { code: moduleCode },
    },
    include: {
      media: true,
      transcripts: true,
      translations: { where: { languageId } },
    },
  });
  return record ? localizeRecord(record, languageId) : null;
}

/** Every contribution gets an English version attached to its source culture. */
export async function createDefaultRecordTranslations(
  tx: Prisma.TransactionClient,
  recordId: string,
  sourceLanguageId: number
) {
  const languages = await tx.language.findMany({
    where: { code: "eng" },
    select: { id: true },
  });
  const translations = languages
    .filter((language) => language.id !== sourceLanguageId)
    .map((language) => ({ recordId, languageId: language.id }));

  if (translations.length) {
    await tx.culturalRecordTranslation.createMany({ data: translations, skipDuplicates: true });
  }
}
