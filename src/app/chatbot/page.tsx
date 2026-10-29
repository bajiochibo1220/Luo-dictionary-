import { maintenanceMessage } from "@/lib/maintenance";
import { MaintenanceNotice } from "@/components/layout/maintenance-notice";
import { auth } from "@/lib/auth";
import { ChatInterface } from "@/components/ai/chat-interface";
import { getSelectedAdminCultureId } from "@/lib/admin-language";
import { prisma } from "@/lib/db";
import { ConversationIdSchema } from "@/lib/chat-contract";
import { hasAnyAdminRole } from "@/lib/permissions";

export const metadata = { title: "CULTURAL HERITAGE | Luo Heritage", description: "Explore Luo culture, history, songs and Dholuo language with English and Dholuo translations." };

export const dynamic = "force-dynamic";

export default async function ChatbotPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const message = await maintenanceMessage();
  if (message) return <MaintenanceNotice message={message} />;
  const session = await auth();
  const user = session?.user as any;
  const primaryRole = ((user?.languageRoles ?? []) as any[])[0];
  const defaultLanguage = primaryRole ? null : await prisma.language.findFirst({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }],
    select: { code: true },
  });
  let cultureCode = primaryRole?.languageCode ?? defaultLanguage?.code ?? "luo";
  let languageCode = cultureCode;
  const admin = hasAnyAdminRole(session);
  if (admin) {
    const languageId = await getSelectedAdminCultureId();
    if (languageId) {
      const language = await prisma.language.findUnique({ where: { id: languageId }, select: { code: true } });
      if (language) cultureCode = language.code;
    }
    languageCode = "eng";
  }

  const selected = ConversationIdSchema.safeParse((await searchParams).conversation);
  return <ChatInterface languageCode={languageCode} cultureCode={cultureCode} guest={!session?.user} admin={admin} initialConversationId={selected.success ? selected.data : undefined} />;
}
