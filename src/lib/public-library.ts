import { publicCulturalText } from "@/lib/public-cultural-text";
import { prisma } from "@/lib/db";
import { publicMediaWhere, publicRecordWhere } from "@/lib/governance";
import { getPublicModules } from "@/lib/public-navigation";
import type { ContentItem } from "@/lib/app-content";

const recordText = publicCulturalText;

// Shared public projection: never serialize contributor identities, consent
// documents or internal repository metadata from raw Prisma records.
export async function getPublicLibrary(language: { id: number; code: string; nativeName: string }, moduleCode: string, page: { records?: string; dictionary?: string; query?: string } = {}) {
  const modules = await getPublicModules(language.id);
  const mod = modules.find(item => item.code === moduleCode);
  if (!mod || mod.code === "chatbot") return null;
  const isMediaLibrary = mod.code === "audio_visual";
  const englishLanguage = language.code === "eng" ? { id: language.id } : await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });
  const media = { where: publicMediaWhere(), select: { id: true, type: true, url: true, thumbnailUrl: true, format: true } };
  const [records, entries] = await Promise.all([
    page.records === "end" ? Promise.resolve([]) : prisma.culturalRecord.findMany({
      where: { ...(isMediaLibrary ? { media: { some: publicMediaWhere() } } : { moduleId: mod.id }), ...(language.code === "eng" ? {} : { languageId: language.id }), ...publicRecordWhere(), ...(page.query ? { OR: [{ title: { contains: page.query, mode: "insensitive" as const } }, { translations: { some: { languageId: englishLanguage?.id ?? language.id, title: { contains: page.query, mode: "insensitive" as const } } } }] } : {}) },
      ...(page.records ? { cursor: { id: page.records }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50,
      select: {
        id: true, title: true, summary: true, data: true, languageId: true, createdAt: true,
        module: { select: { code: true, baseName: true } }, media,
        translations: { where: { languageId: { in: Array.from(new Set([language.id, ...(englishLanguage ? [englishLanguage.id] : [])])) } }, select: { languageId: true, title: true, summary: true, data: true } },
      },
    }),
    mod.code === "dictionary" && page.dictionary !== "end" ? prisma.dictionaryEntry.findMany({
      where: { ...(language.code === "eng" ? {} : { languageId: language.id }), ...publicRecordWhere(), ...(page.query ? { OR: ["dholuo", "english", "kiswahili"].map(field => ({ [field]: { contains: page.query, mode: "insensitive" as const } })) } : {}) },
      ...(page.dictionary ? { cursor: { id: page.dictionary }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100,
      select: { id: true, dholuo: true, english: true, kiswahili: true, pronunciation: true, grammarClass: true, wordOrigin: true, synonyms: true, antonyms: true, examples: true, createdAt: true, media },
    }) : Promise.resolve([]),
  ]);
  function summary(record: typeof records[number], id: number): string {
    if (record.languageId === id) return record.summary || recordText(record.data);
    const translation = record.translations.find(item => item.languageId === id);
    return translation?.summary || recordText(translation?.data);
  }
  const items: ContentItem[] = [
    ...records.map(record => ({
      id: record.id,
      kind: "cultural" as const,
      title: record.languageId === language.id ? record.title : record.translations.find(item => item.languageId === language.id)?.title || record.title,
      englishTitle: record.translations.find(item => item.languageId === englishLanguage?.id)?.title ?? null,
      englishBodyText: recordText(record.translations.find(item => item.languageId === englishLanguage?.id)?.data),
      summary: summary(record, language.id), englishSummary: englishLanguage ? summary(record, englishLanguage.id) : null,
      bodyText: recordText(record.languageId === language.id ? record.data : record.translations.find(item => item.languageId === language.id)?.data),
      moduleCode: record.module?.code ?? mod.code, moduleName: record.module?.baseName ?? mod.baseName,
      createdAt: record.createdAt.toISOString(),
      media: record.media.map(asset => ({ id: asset.id, type: asset.type, url: `/api/media/${asset.id}/file`, thumbnailUrl: asset.type === "image" ? `/api/media/${asset.id}/file` : null, format: asset.format })),
    })),
    ...entries.map(entry => ({
      id: entry.id, title: entry.dholuo, kind: "dictionary" as const,
      summary: (language.code === "eng" ? [entry.english, entry.kiswahili] : [entry.pronunciation]).filter(Boolean).join("\n"),
      englishTitle: entry.english,
      englishSummary: [entry.english, entry.kiswahili].filter(Boolean).join("\n"),
      bodyText: [entry.english, entry.kiswahili, entry.pronunciation, entry.grammarClass, entry.wordOrigin, entry.synonyms?.join(", "), entry.antonyms?.join(", "), entry.examples ? JSON.stringify(entry.examples) : null].filter(Boolean).join("\n\n"),
      moduleCode: "dictionary", moduleName: "Dictionary", createdAt: entry.createdAt.toISOString(),
      media: entry.media.map(asset => ({ id: asset.id, type: asset.type, url: `/api/media/${asset.id}/file`, thumbnailUrl: asset.type === "image" ? `/api/media/${asset.id}/file` : null, format: asset.format })),
    })),
  ].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return {
    title: mod.translations[0]?.title ?? mod.baseName, baseName: mod.baseName,
    languageName: language.nativeName, languageCode: language.code, languageId: language.id,
    moduleCode: isMediaLibrary ? "all" : mod.code,
    canContribute: !isMediaLibrary && mod._count.fieldDefinitions > 0,
    items, limits: { records: 50, dictionaryEntries: 100 },
    continuation: { records: records.length === 50 ? records[records.length - 1].id : null, dictionary: entries.length === 100 ? entries[entries.length - 1].id : null },
  };
}
