import { z } from "zod";

export const TUTOR_MODES = ["conversation", "translation", "grammar", "writing", "story", "vocabulary"] as const;
export const TutorRequest = z.discriminatedUnion("mode", [
  z.object({ mode: z.enum(["conversation", "translation", "grammar", "writing", "story"]), languageId: z.number().int().positive(),
    text: z.string().trim().min(2).max(4000), level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
    english: z.boolean().default(true), consent: z.literal(true),
    history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(3000) })).max(6).default([]),
  }).strict(),
  z.object({ mode: z.literal("vocabulary"), languageId: z.number().int().positive(), consent: z.literal(true) }).strict(),
  z.object({ mode: z.literal("transcribe_recording"), languageId: z.number().int().positive(), consent: z.literal(true), mime: z.enum(["audio/webm","audio/mp4","audio/wav","audio/ogg","audio/mpeg","audio/aac"]), audio: z.string().min(4).max(2800000).regex(/^[A-Za-z0-9+/]+={0,2}$/) }).strict(),
  z.object({ mode: z.literal("grade"), attemptId: z.string().uuid(), answers: z.record(z.number().int().min(0).max(7)), consent: z.literal(true) }).strict(),
]);
export type TutorResponse = {
  text?: string; model?: string; attemptId?: string; score?: number;
  questions?: { id: string; prompt: string; choices: string[] }[];
  results?: { id: string; correct: boolean; answer: number; explanation: string }[];
  sources?: { id: string; title: string; href: string }[];
};
