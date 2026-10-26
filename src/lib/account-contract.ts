import { z } from "zod";

// Personal records use the existing server user ID on every platform. Provider
// credentials/password hashes never form part of the client-facing account.
export const AppAccountSchema = z.object({
  id: z.string(), name: z.string().nullable(), email: z.string(), image: z.string().nullable(),
  profileTypes: z.array(z.string()),
  isSuperAdmin: z.boolean(), isMasterSuperAdmin: z.boolean(),
  languageRoles: z.array(z.object({ languageId: z.number().int().positive(), languageCode: z.string(), languageName: z.string(), role: z.string() })),
});

export const ConversationHistorySchema = z.array(z.object({
  id: z.string(), title: z.string(), pinned: z.boolean(), archived: z.boolean(),
  messageCount: z.number().int().nonnegative(), updatedAt: z.string().datetime(),
}));

export type AppAccount = z.infer<typeof AppAccountSchema>;
export type ConversationHistory = z.infer<typeof ConversationHistorySchema>;
