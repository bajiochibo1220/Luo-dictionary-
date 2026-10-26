import { InterfaceText } from "@/components/shared/interface-language";
import { auth } from "@/lib/auth";
import { getDefaultPublicLanguage } from "@/lib/public-navigation";
import { WebLearningHub } from "@/components/shared/web-learning-hub";
import { prisma } from "@/lib/db";
export default async function LearnPage({ searchParams }: { searchParams: Promise<{ resource?: string; languageId?: string; section?: string }> }) {
  const params = await searchParams;
  const languageId = Number(params.languageId);
  const [session, language] = await Promise.all([auth(), Number.isSafeInteger(languageId) && languageId > 0 ? prisma.language.findFirst({ where: { id: languageId, isActive: true }, select: { id: true } }) : getDefaultPublicLanguage()]);
  if (!session?.user || !language) return <p className="p-8"><InterfaceText source="Sign in and choose an active language to learn." /></p>;
  return <WebLearningHub initialKind={params.section} userId={session.user.id} languageId={language.id} initialResourceId={typeof params.resource === "string" ? params.resource : undefined} />;
}
