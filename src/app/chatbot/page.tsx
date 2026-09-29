import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChatInterface } from "@/components/ai/chat-interface";
import { getSelectedAdminCultureId } from "@/lib/admin-language";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ChatbotPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const primaryRole = ((user.languageRoles ?? []) as any[])[0];
  let cultureCode = primaryRole?.languageCode ?? "luo";
  let languageCode = cultureCode;
  if (user.isSuperAdmin) {
    const languageId = await getSelectedAdminCultureId();
    if (languageId) {
      const language = await prisma.language.findUnique({ where: { id: languageId }, select: { code: true } });
      if (language) cultureCode = language.code;
    }
    languageCode = "eng";
  }

  return <ChatInterface languageCode={languageCode} cultureCode={cultureCode} />;
}
