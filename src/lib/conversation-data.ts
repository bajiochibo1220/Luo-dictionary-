import { readCulturalAnswer } from "@/lib/cultural-chat-answer";
import { prisma } from "@/lib/db";
import { ChatSourceSchema, type ConversationUpdateSchema } from "@/lib/chat-contract";
import type { z } from "zod";

// Every read/write includes the authenticated owner. Neither a caller-supplied
// account ID nor knowing another conversation's ID grants access.
export async function getConversation(userId: string, id: string, before?: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId }, select: { id: true, title: true, pinned: true, archived: true },
  });
  if (!conversation) return null;
  const cursor = before ? await prisma.aIResponse.findFirst({
    where: { id: before, conversationId: id }, select: { id: true, createdAt: true },
  }) : null;
  if (before && !cursor) return null;
  const rows = await prisma.aIResponse.findMany({
    where: { conversationId: id, ...(cursor ? { OR: [
      { createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ] } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101,
    select: { id: true, query: true, response: true, sources: true, createdAt: true },
  });
  const messages = rows.slice(0, 100).reverse().map(row => {
    const answer = readCulturalAnswer(row.response);
    return {
      id: row.id, query: row.query, response: answer.answer,
      languageCode: answer.languageCode, translation: answer.translation,
      sources: Array.isArray(row.sources) ? row.sources.flatMap(source => {
        const parsed = ChatSourceSchema.safeParse(source); return parsed.success ? [parsed.data] : [];
      }) : [], createdAt: row.createdAt.toISOString(),
    };
  });
  return { ...conversation, messages, beforeId: rows.length > 100 ? messages[0]?.id ?? null : null };
}

export async function updateConversation(userId: string, id: string, data: z.infer<typeof ConversationUpdateSchema>) {
  return prisma.$transaction(async transaction => {
    const changed = await transaction.conversation.updateMany({ where: { id, userId }, data });
    if (changed.count !== 1) return null;
    return transaction.conversation.findFirst({
      where: { id, userId }, select: { id: true, title: true, pinned: true, archived: true },
    });
  });
}

export async function deleteConversation(userId: string, id: string) {
  const result = await prisma.conversation.deleteMany({ where: { id, userId } });
  return result.count === 1;
}
