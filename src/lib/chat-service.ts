import { prisma } from "@/lib/db";
import { assertAiQuota } from "@/lib/ai/quota";
import { askQuestion, type ChatTurn } from "@/lib/ai/rag";
import type { AppAccount } from "@/lib/account-contract";
import type { ChatRequest } from "@/lib/chat-contract";

export class ChatRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function answerChat(request: Request, account: AppAccount | null, input: ChatRequest) {
  if (input.conversationId && !account) throw new ChatRequestError(401, "Sign in to open saved chats.");
  const conversation = input.conversationId && account ? await prisma.conversation.findFirst({
    where: { id: input.conversationId, userId: account.id }, select: { id: true, archived: true },
  }) : null;
  if (input.conversationId && !conversation) throw new ChatRequestError(404, "Chat not found.");
  if (conversation?.archived) throw new ChatRequestError(409, "Unarchive this chat before sending a message.");
  const codes = [...new Set([input.languageCode, input.cultureCode].filter((code): code is string => !!code))];
  const languages = codes.length ? await prisma.language.findMany({
    where: { code: { in: codes }, isActive: true }, select: { id: true, code: true },
  }) : [];
  if (codes.some(code => !languages.some(language => language.code === code))) throw new ChatRequestError(400, "Select an available language.");
  const languageId = languages.find(language => language.code === input.languageCode)?.id;
  const cultureId = languages.find(language => language.code === input.cultureCode)?.id
    ?? account?.languageRoles[0]?.languageId ?? languageId;
  let history: ChatTurn[] = account ? [] : input.history ?? [];
  if (conversation) {
    const previous = await prisma.aIResponse.findMany({
      where: { conversationId: conversation.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 4,
      select: { query: true, response: true },
    });
    history = previous.reverse().flatMap(message => [
      { role: "user" as const, content: message.query.slice(0, 2000) },
      { role: "assistant" as const, content: message.response.slice(0, 2000) },
    ]);
  }
  await assertAiQuota(request, account?.id);
  // Existing retrieval is limited to approved public content even for admins.
  // Never create a saved chat before the provider has produced an answer.
  const result = await askQuestion(input.question, languageId, cultureId, history);
  const conversationId = await prisma.$transaction(async transaction => {
    let id: string | null = null;
    if (account) {
      const active = await transaction.user.findUnique({ where: { id: account.id }, select: { status: true } });
      if (active?.status !== "active") throw new ChatRequestError(401, "Your session expired. Please sign in again.");
      if (conversation) {
        // The owner/archived predicate is checked again, and this update locks
        // the row before inserting its answer. Concurrent deletion rolls back.
        const changed = await transaction.conversation.updateMany({
          where: { id: conversation.id, userId: account.id, archived: false }, data: { updatedAt: new Date() },
        });
        if (changed.count !== 1) throw new ChatRequestError(409, "This chat changed. Reload before sending again.");
        id = conversation.id;
      } else {
        const created = await transaction.conversation.create({ data: {
          userId: account.id, title: input.question.length > 60 ? `${input.question.slice(0, 60)}…` : input.question,
        } });
        id = created.id;
      }
    }
    await transaction.aIResponse.create({ data: {
      conversationId: id, languageId: languageId ?? null, userId: account?.id ?? null,
      query: input.question, response: result.answer, sources: result.sources,
      model: result.model, latencyMs: result.latencyMs,
    } });
    return id;
  }, { maxWait: 5_000, timeout: 15_000 });
  return { ...result, conversationId };
}
