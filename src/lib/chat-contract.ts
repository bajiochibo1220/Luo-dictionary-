import { z } from "zod";

export const ConversationIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const languageCode = z.string().regex(/^[a-z]{2,8}(?:-[a-z0-9]+)?$/);
export const ChatRequestSchema = z.object({
  question: z.string().trim().min(2).max(2000),
  languageCode: languageCode.optional(), cultureCode: languageCode.optional(),
  conversationId: ConversationIdSchema.nullable().optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }).strict()).max(8).optional(),
  allowExternalAi: z.literal(true),
}).strict();
export const ConversationUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  pinned: z.boolean().optional(), archived: z.boolean().optional(),
}).strict().refine(value => Object.keys(value).length > 0);
export const ConversationCreateSchema = z.object({ title: z.string().trim().min(1).max(120).default("New chat") }).strict();
export const ChatSourceSchema = z.object({ id: z.string(), title: z.string(), module: z.string(), similarity: z.number().finite() });
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
