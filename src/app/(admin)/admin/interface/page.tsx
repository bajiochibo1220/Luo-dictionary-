import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { InterfaceCopyEditor } from "@/components/admin/interface-copy-editor";

export default async function InterfacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;
  const languageIds = (user.languageRoles ?? []).filter(role => ["language_admin", "content_editor"].includes(role.role)).map(role => role.languageId);
  if (!user.isMasterSuperAdmin && !languageIds.length) redirect("/admin/dashboard");
  const languages = await prisma.language.findMany({ where: { isActive: true, code: { not: "eng" }, ...(user.isMasterSuperAdmin ? {} : { id: { in: languageIds } }) }, orderBy: { displayOrder: "asc" }, select: { code: true, nativeName: true } });
  return <InterfaceCopyEditor languages={languages} />;
}
