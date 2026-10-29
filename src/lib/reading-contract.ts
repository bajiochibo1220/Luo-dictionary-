import { z } from "zod";

export const PublicReadingSchema = z.object({
  id: z.string(), title: z.string(),
  sourceLanguageCode: z.string(), sourceLanguageName: z.string(),
  sourceText: z.string(), englishText: z.string(),
  transcripts: z.array(z.object({ id: z.string(), text: z.string(), languageCode: z.string(), role: z.string().nullable() })),
});
export type PublicReading = z.infer<typeof PublicReadingSchema>;

type OrderedRow = { id: string; sourceId?: string | null; createdAt?: Date; text: string; languageCode: string; speakerRole?: string | null };
// Old publication copies omitted sourceId and share an identical insertion time.
// Match ONLY already-public text to source ordering; never copy unpublished text.
export function orderTranscriptRows<T extends OrderedRow>(segments: T[], source: OrderedRow[] = []): T[] {
  const compare = (a: OrderedRow, b: OrderedRow) => a.sourceId && b.sourceId
    ? a.sourceId.localeCompare(b.sourceId, undefined, { numeric: true })
    : (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
  const key = (row: OrderedRow) => JSON.stringify([row.languageCode, row.speakerRole || "", row.text]);
  const positions = new Map<string, number[]>();
  [...source].sort(compare).forEach((row, index) => { const list = positions.get(key(row)) || []; list.push(index); positions.set(key(row), list); });
  const ranked = segments.map(row => ({ row, sequence: positions.get(key(row))?.shift() }));
  return ranked.sort((a, b) => {
    if (a.row.sourceId && b.row.sourceId) return compare(a.row, b.row);
    if (a.sequence !== undefined && b.sequence !== undefined) return a.sequence - b.sequence;
    return compare(a.row, b.row);
  }).map(item => item.row);
}

// Source identifiers establish document order, but are never part of the public DTO.
export function orderedTranscriptSegments<T extends OrderedRow>(segments: T[], source: OrderedRow[] = []) {
  return orderTranscriptRows(segments, source).filter(segment => segment.text.trim()).map(segment => ({
    id: segment.id, text: segment.text,
    languageCode: ["en", "eng", "english"].includes(segment.languageCode.toLowerCase()) ? "eng" : segment.languageCode.toLowerCase(),
    role: /^(interviewer|researcher|question)$/i.test(segment.speakerRole || "") ? "Interviewer"
      : /^(interviewee|respondent|participant|answer)(?:[ _-]+[a-z0-9]+)?$/i.test(segment.speakerRole || "") ? "Respondent" : null,
  }));
}
