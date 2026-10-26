import { getCurrentAccount } from "@/lib/account-data";
import { getDefaultPublicLanguage } from "@/lib/public-navigation";
import { prisma } from "@/lib/db";
import { WebStaffWorkspace } from "@/components/shared/web-staff-workspace";
export default async function Page() {
  const [account, language, english] = await Promise.all([getCurrentAccount(), getDefaultPublicLanguage(), prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } })]);
  if (!account || !language) return <p className="p-8">Sign in with an assigned staff role.</p>;
  const languages = await prisma.language.findMany({ where: { isActive: true }, select: { id: true, code: true, nativeName: true, name: true }, orderBy: { displayOrder: "asc" } });
  return <WebStaffWorkspace languages={languages} account={account} languageId={language.id} englishLanguageId={english?.id} />;
}
