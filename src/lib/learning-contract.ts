import { z } from "zod";

export const ResourceKind = z.enum(["lesson", "game", "event"]);
export const QuestionSchema = z.object({
  id: z.string().min(1).max(80), prompt: z.string().min(1).max(2000),
  choices: z.array(z.string().min(1).max(500)).min(2).max(8),
  answer: z.number().int().min(0).max(7), explanation: z.string().max(2000).default(""),
}).refine(q => q.answer < q.choices.length, "Answer must identify an available choice.");
export const ResourceInput = z.object({
  languageId: z.number().int().positive(), kind: ResourceKind,
  title: z.string().trim().min(2).max(200), description: z.string().trim().max(10000),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  audience: z.enum(["all", "children", "youth", "adults", "teachers"]).default("all"),
  body: z.object({
    text: z.string().max(100000).default(""),
    questions: z.array(QuestionSchema).max(100).default([]),
    teacherNotes: z.string().max(10000).default(""),
    activities: z.array(z.object({ type: z.enum(["reading", "writing", "speaking", "listening"]), instruction: z.string().min(1).max(4000) })).max(40).default([]),
  }).refine(body => new Set(body.questions.map(q => q.id)).size === body.questions.length, "Question IDs must be unique."),
  consentScope: z.enum(["pending", "teaching", "public_excerpt", "research_only"]).default("pending"),
  restrictionLevel: z.enum(["internal", "restricted", "sacred", "public"]).default("internal"),
  downloadAllowed: z.boolean().default(false),
  startsAt: z.string().datetime().nullable().default(null), endsAt: z.string().datetime().nullable().default(null),
  timeZone: z.string().max(80).default("Africa/Nairobi").refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }, "Invalid time zone."),
  location: z.string().max(500).nullable().default(null), sourceIds: z.array(z.string().uuid()).max(100).default([]),
}).superRefine((value, ctx) => {
  if (value.kind === "event" && !value.startsAt) ctx.addIssue({ code: "custom", message: "An event needs a start date." });
  if (value.endsAt && (!value.startsAt || value.endsAt < value.startsAt)) ctx.addIssue({ code: "custom", message: "End date must follow start date." });
  if (value.kind === "game" && !value.body.questions.length) ctx.addIssue({ code: "custom", message: "A game needs questions." });
});
export const ProgressInput = z.object({
  ownerId: z.string().uuid(),
  operationId: z.string().uuid(), resourceId: z.string().uuid(), version: z.number().int().positive(),
  answers: z.record(z.number().int().min(0).max(7)).default({}), position: z.number().int().min(0).max(100000).default(0),
  complete: z.boolean().default(false),
}).strict();
export type ResourceBody = z.infer<typeof ResourceInput>["body"];
export type LearningResourceView = {
  id: string; languageId: number; kind: "lesson" | "game" | "event"; title: string; description: string;
  level: string; audience: string; body: ResourceBody; status: string; version: number; downloadAllowed: boolean;
  startsAt: string | null; endsAt: string | null; timeZone: string; location: string | null; sourceIds?: string[]; consentScope?: string; restrictionLevel?: string;
};
export type LearningStateView = { resourceId: string; completed: boolean; bestScore: number; attempts: number; position: number };

export function gradeQuestions(body: ResourceBody, answers: Record<string, number>) {
  const results = body.questions.map(q => ({ id: q.id, correct: answers[q.id] === q.answer, answer: q.answer, explanation: q.explanation }));
  return { score: results.length ? Math.round(results.filter(r => r.correct).length * 100 / results.length) : 100, results };
}
