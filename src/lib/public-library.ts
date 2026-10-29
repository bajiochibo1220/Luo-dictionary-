import { mediaThumbnail } from "@/lib/media-preview";
import { publicCulturalText } from "@/lib/public-cultural-text";
import { prisma } from "@/lib/db";
import { publicMediaWhere, publicRecordWhere, publicGovernanceWhere } from "@/lib/governance";
import { getPublicModules } from "@/lib/public-navigation";
import type { ContentItem } from "@/lib/app-content";
import { PRD_SUBJECTS } from "@/lib/prd-content-catalog";

const recordText = publicCulturalText;

// Shared public projection: never serialize contributor identities, consent
// documents or internal repository metadata from raw Prisma records.
export async function getPublicLibrary(language: { id: number; code: string; nativeName: string }, moduleCode: string, page: { records?: string; dictionary?: string; query?: string; subject?: string; category?: string } = {}) {
  if (moduleCode === "subjects" && !PRD_SUBJECTS.some(value => value === page.subject)) return null;
  const modules = await getPublicModules(language.id);
  const isDiscovery = moduleCode === "discover";
  const isSubjectLibrary = moduleCode === "subjects";
  const mod = isDiscovery ? { id: -1, code: "discover", baseName: "Discover heritage", translations: [], _count: { fieldDefinitions: 0 } } : isSubjectLibrary ? { id: -1, code: "subjects", baseName: page.subject!, translations: [], _count: { fieldDefinitions: 0 } } : modules.find(item => item.code === moduleCode);
  if (!mod || mod.code === "chatbot") return null;
  const isMediaLibrary = mod.code === "audio_visual";
  const category = page.category && page.category !== "all" ? modules.find(item => item.code === page.category && !["audio_visual", "chatbot"].includes(item.code)) : undefined;
  if (page.category && page.category !== "all" && (!(isMediaLibrary || isDiscovery) || !category)) return null;
  const recordLimit = isDiscovery ? 12 : 50;
  const dictionaryLimit = isDiscovery ? 6 : 100;
  const englishLanguage = language.code === "eng" ? { id: language.id } : await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });
  const media = { where: publicMediaWhere(), select: { id: true, type: true, url: true, thumbnailUrl: true, format: true } };
  const [records, entries] = await Promise.all([
    page.records === "end" ? Promise.resolve([]) : prisma.culturalRecord.findMany({
      where: { ...(isDiscovery ? { moduleId: category ? category.id : { in: modules.filter(item => !["chatbot", "audio_visual"].includes(item.code)).map(item => item.id) } } : isSubjectLibrary ? { moduleId: { in: modules.filter(item => item.code !== "chatbot").map(item => item.id) }, data: { path: ["subject_area"], equals: page.subject } } : isMediaLibrary ? { media: { some: publicMediaWhere() }, ...(category ? { moduleId: category.id } : {}) } : { moduleId: mod.id }), ...(language.code === "eng" ? {} : { languageId: language.id }), ...publicRecordWhere(), ...(page.query ? { OR: [{ title: { contains: page.query, mode: "insensitive" as const } }, { translations: { some: { languageId: englishLanguage?.id ?? language.id, title: { contains: page.query, mode: "insensitive" as const } } } }] } : {}) },
      ...(page.records ? { cursor: { id: page.records }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: recordLimit,
      select: {
        id: true, title: true, summary: true, data: true, languageId: true, createdAt: true, isProvisional: true,
        module: { select: { code: true, baseName: true } }, media,
        _count: { select: { transcripts: { where: publicGovernanceWhere() } } },
        translations: { where: { languageId: { in: Array.from(new Set([language.id, ...(englishLanguage ? [englishLanguage.id] : [])])) } }, select: { languageId: true, title: true, summary: true, data: true } },
      },
    }),
    (mod.code === "dictionary" || isDiscovery && (!category || category.code === "dictionary") && modules.some(item => item.code === "dictionary") || isSubjectLibrary && page.subject === "Dholuo dictionary" && modules.some(item => item.code === "dictionary")) && page.dictionary !== "end" ? prisma.dictionaryEntry.findMany({
      where: { ...(language.code === "eng" ? {} : { languageId: language.id }), ...publicRecordWhere(), ...(page.query ? { OR: ["dholuo", "english", "kiswahili"].map(field => ({ [field]: { contains: page.query, mode: "insensitive" as const } })) } : {}) },
      ...(page.dictionary ? { cursor: { id: page.dictionary }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: dictionaryLimit,
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
      isProvisional: record.isProvisional,
      kind: "cultural" as const,
      transcriptCount: record._count?.transcripts || 0,
      title: record.languageId === language.id ? record.title : record.translations.find(item => item.languageId === language.id)?.title || record.title,
      englishTitle: record.translations.find(item => item.languageId === englishLanguage?.id)?.title ?? null,
      englishBodyText: recordText(record.translations.find(item => item.languageId === englishLanguage?.id)?.data),
      summary: summary(record, language.id), englishSummary: englishLanguage ? summary(record, englishLanguage.id) : null,
      bodyText: recordText(record.languageId === language.id ? record.data : record.translations.find(item => item.languageId === language.id)?.data),
      moduleCode: record.module?.code ?? mod.code, moduleName: record.module?.baseName ?? mod.baseName,
      createdAt: record.createdAt.toISOString(),
      media: record.media.map(asset => ({ id: asset.id, type: asset.type, url: `/api/media/${asset.id}/file`, thumbnailUrl: mediaThumbnail(asset.id, asset.type), format: asset.format })),
    })),
    ...entries.map(entry => ({
      id: entry.id, title: entry.dholuo, kind: "dictionary" as const,
      summary: (language.code === "eng" ? [entry.english, entry.kiswahili] : [entry.pronunciation]).filter(Boolean).join("\n"),
      englishTitle: entry.english,
      englishSummary: [entry.english, entry.kiswahili].filter(Boolean).join("\n"),
      bodyText: [entry.english, entry.kiswahili, entry.pronunciation, entry.grammarClass, entry.wordOrigin, entry.synonyms?.join(", "), entry.antonyms?.join(", "), entry.examples ? JSON.stringify(entry.examples) : null].filter(Boolean).join("\n\n"),
      moduleCode: "dictionary", moduleName: "Dictionary", createdAt: entry.createdAt.toISOString(),
      media: entry.media.map(asset => ({ id: asset.id, type: asset.type, url: `/api/media/${asset.id}/file`, thumbnailUrl: mediaThumbnail(asset.id, asset.type), format: asset.format })),
    })),
  ].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return {
    title: mod.baseName, baseName: mod.baseName,
    languageName: language.nativeName, languageCode: language.code, languageId: language.id,
    moduleCode: isMediaLibrary ? "all" : mod.code,
    ...(isMediaLibrary || isDiscovery ? { categories: modules.filter(item => !["audio_visual", "chatbot"].includes(item.code)).map(item => ({ code: item.code, name: item.baseName })) } : {}),
    ...(isSubjectLibrary ? { subject: page.subject } : {}),
    canContribute: !isMediaLibrary && !isDiscovery && mod._count.fieldDefinitions > 0,
    items, limits: { records: recordLimit, dictionaryEntries: dictionaryLimit },
    continuation: { records: records.length === recordLimit ? records[records.length - 1].id : null, dictionary: entries.length === dictionaryLimit ? entries[entries.length - 1].id : null },
  };
}
