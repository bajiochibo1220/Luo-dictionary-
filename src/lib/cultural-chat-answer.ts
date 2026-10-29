import { z } from "zod";

const StoredAnswerSchema = z.object({
  languageCode: z.enum(["eng", "luo"]),
  answer: z.string().trim().min(1).max(18000),
  translation: z.string().trim().min(1).max(18000),
}).strict();

export const CulturalAnswerSchema = StoredAnswerSchema.superRefine((value, context) => {
  const markers = (text: string) => [...new Set(text.match(/\[Source \d+\]/g) ?? [])].sort().join("|");
  if (markers(value.answer) !== markers(value.translation)) {
    context.addIssue({ code: "custom", message: "Preserve every source marker in both versions." });
  }
  // Both supported languages use Latin script. Reject stray generated words in
  // another script instead of presenting them as a Dholuo/English translation.
  if ([...value.answer, ...value.translation].some(character => /\p{L}/u.test(character) && !/\p{Script=Latin}/u.test(character))) {
    context.addIssue({ code: "custom", message: "Use English and Dholuo in Latin script only." });
  }
});
export type CulturalAnswer = z.infer<typeof CulturalAnswerSchema>;
const PREFIX = "CULTURAL_HERITAGE_V1\n";

export function storeCulturalAnswer(value: { answer: string; languageCode?: string; translation?: string }) {
  const parsed = CulturalAnswerSchema.safeParse(value);
  return parsed.success ? PREFIX + JSON.stringify(parsed.data) : value.answer;
}
// Versioned in the existing response column; historical plain-text chats remain readable.
export function readCulturalAnswer(value: string): { answer: string; languageCode?: "eng" | "luo"; translation?: string } {
  if (value.startsWith(PREFIX)) {
    try { return StoredAnswerSchema.parse(JSON.parse(value.slice(PREFIX.length))); } catch { /* Legacy plain text. */ }
  }
  return { answer: value };
}
