import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ModuleContent } from "@/components/layout/module-content";
import { DashboardOverview } from "@/components/shared/dashboard-overview";
import { getDefaultPublicLanguage } from "@/lib/public-navigation";
import { getPublicLibrary } from "@/lib/public-library";

export default async function UserDashboardPage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const { module: moduleCode } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (moduleCode === "chatbot") redirect("/chatbot");
  const primaryRole = session.user.languageRoles?.[0];
  const fallback = primaryRole ? null : await getDefaultPublicLanguage();
  const languageId = primaryRole?.languageId ?? fallback?.id;
  const languageCode = primaryRole?.languageCode ?? fallback?.code ?? "luo";
  const languageName = primaryRole?.languageName ?? fallback?.nativeName ?? "Dholuo";
  if (moduleCode && languageId) {
    const library = await getPublicLibrary({ id: languageId, code: languageCode, nativeName: languageName }, moduleCode);
    if (library) return <ModuleContent key={moduleCode} {...library} />;
  }
  return <DashboardOverview languageName={languageName} name={session.user.name} />;
}
