import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppAccountSchema, ConversationHistorySchema } from "@/lib/account-contract";
import { getNativeSessionUserId } from "@/lib/native-auth";

export async function getCurrentAccount(request?: Request) {
  const authorization = request?.headers.get("Authorization");
  // A rejected bearer token must never fall back to a different browser user.
  const userId = authorization !== null && authorization !== undefined
    ? await getNativeSessionUserId(authorization)
    : (await auth())?.user?.id;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, image: true, avatarUrl: true, profileTypes: true,
      status: true, isSuperAdmin: true, isMasterSuperAdmin: true,
      languageRoles: { select: { languageId: true, role: true, language: { select: { code: true, name: true } } } },
    },
  });
  if (!user || user.status !== "active") return null;
  return AppAccountSchema.parse({
    id: user.id, name: user.name, email: user.email, image: user.avatarUrl || user.image,
    profileTypes: user.profileTypes,
    isSuperAdmin: user.isSuperAdmin || user.isMasterSuperAdmin,
    isMasterSuperAdmin: user.isMasterSuperAdmin,
    languageRoles: user.languageRoles.map(item => ({ languageId: item.languageId, role: item.role === "cultural_expert" ? "content_editor" : item.role, languageCode: item.language.code, languageName: item.language.name })),
  });
}

// Called with the authenticated user's ID, never an ID supplied by the client.
// The existing web chatbot and versioned client API read the same rows/query.
export async function getConversationHistory(userId: string, archived: boolean) {
  const records = await prisma.conversation.findMany({
    where: { userId, archived },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: { id: true, title: true, pinned: true, archived: true, updatedAt: true, _count: { select: { messages: true } } },
  });
  return ConversationHistorySchema.parse(records.map(record => ({
    id: record.id, title: record.title, pinned: record.pinned, archived: record.archived,
    messageCount: record._count.messages, updatedAt: record.updatedAt.toISOString(),
  })));
}
