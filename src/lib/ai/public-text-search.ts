import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publicRecordWhere, publicMediaWhere } from "@/lib/governance";
import { publicCulturalText } from "@/lib/public-cultural-text";

export type TextSearchResult = { record_id: string; is_dictionary: boolean; title: string; module: string; module_code: string; content: string; similarity: number; transcript_text?: string };
const ignored = new Set(["the", "and", "for", "with", "about", "what", "which", "show", "tell", "please", "explain", "does", "this", "that", "have", "from", "are", "can", "you", "your", "how", "meaning", "mean"]);

/** Public-only source lookup without sending a question to an embedding API. */
export async function searchPublicText(question: string, cultureLanguageId?: number, limit = 10): Promise<TextSearchResult[]> {
  const terms = [...new Set((question.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).filter(term => term.length >= 2 && !ignored.has(term)))].slice(0, 8);
  if (!terms.length) return [];
  const language = cultureLanguageId ? { languageId: cultureLanguageId } : {};
  const fields = ["description", "text", "story", "transcript", "dholuo", "english", "original_text", "translation", "question", "answer", "meaning", "explanation"];
  const matches: Prisma.CulturalRecordWhereInput[] = terms.flatMap(term => [
    { title: { contains: term, mode: "insensitive" } }, { summary: { contains: term, mode: "insensitive" } },
    ...fields.map(field => ({ data: { path: [field], string_contains: term, mode: "insensitive" as const } })),
    { translations: { some: { OR: [{ title: { contains: term, mode: "insensitive" as const } }, { summary: { contains: term, mode: "insensitive" as const } }] } } },
  ]);
  const [records, dictionary, transcripts] = await Promise.all([
    prisma.culturalRecord.findMany({ where: { ...publicRecordWhere(), ...language, OR: matches }, take: 40, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, summary: true, data: true, module: { select: { baseName: true, code: true } } } }),
    prisma.dictionaryEntry.findMany({ where: { ...publicRecordWhere(), ...language, OR: terms.flatMap(term => [{ dholuo: { contains: term, mode: "insensitive" as const } }, { english: { contains: term, mode: "insensitive" as const } }]) }, take: 30, select: { id: true, dholuo: true, english: true } }),
    prisma.transcript.findMany({ where: { ...publicMediaWhere(), record: { is: { ...publicRecordWhere(), ...language } }, OR: terms.map(term => ({ text: { contains: term, mode: "insensitive" as const } })) }, take: 20, select: { text: true, record: { select: { id: true, title: true, module: { select: { baseName: true, code: true } } } } } }),
  ]);
  const candidates = [
    ...records.map(record => ({ record_id: record.id, is_dictionary: false, title: record.title, module: record.module.baseName, module_code: record.module.code, content: [record.summary, publicCulturalText(record.data)].filter(Boolean).join("\n") })),
    ...dictionary.map(entry => ({ record_id: entry.id, is_dictionary: true, title: entry.dholuo, module: "Dictionary", module_code: "dictionary", content: `${entry.dholuo}: ${entry.english}` })),
    ...transcripts.flatMap(item => item.record ? [{ record_id: item.record.id, is_dictionary: false, title: item.record.title, module: item.record.module.baseName, module_code: item.record.module.code, content: item.text, transcript_text: item.text }] : []),
  ];
  const ranked = candidates.map(item => ({ ...item, similarity: terms.reduce((score, term) => score + (item.title.toLowerCase().includes(term) ? 2 : 0) + (item.content.toLowerCase().includes(term) ? 1 : 0), 0) / (terms.length * 3) })).sort((a, b) => b.similarity - a.similarity);
  const seen = new Set<string>();
  return ranked.filter(item => { const key = `${item.is_dictionary}:${item.record_id}`; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, Math.min(20, Math.max(1, limit)));
}
