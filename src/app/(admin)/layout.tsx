import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/layout/admin-shell";
import { cookies } from "next/headers";
import { getSelectedAdminCultureId } from "@/lib/admin-language";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  const languageRoles = (user.languageRoles ?? []) as any[];

  const isAdmin =
    isSuperAdmin ||
    languageRoles.some((r: any) =>
      ["language_admin", "uploader", "publisher", "content_editor", "cultural_expert"].includes(
        r.role
      )
    );

  if (!isAdmin) redirect("/");

  const [notificationCount, languages] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, read: false } }).catch(() => 0),
    prisma.language.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, code: true, nativeName: true, isActive: true } }),
  ]);
  const cookieLanguageId = Number(cookies().get("admin-language-id")?.value);
  const selectedLanguageId = languages.some((language) => language.id === cookieLanguageId)
    ? cookieLanguageId
    : languages.find((language) => language.code === "eng")?.id ?? languages[0]?.id ?? null;
  const selectedCultureId = isSuperAdmin ? await getSelectedAdminCultureId() ?? null : null;

  return (
    <AdminShell
      userEmail={user.email ?? ""}
      userName={user.name ?? null}
      userImage={user.image ?? null}
      isSuperAdmin={isSuperAdmin}
      isMasterSuperAdmin={!!user.isMasterSuperAdmin}
      roles={languageRoles}
      notificationCount={notificationCount}
      languages={languages}
      selectedLanguageId={selectedLanguageId}
      selectedCultureId={selectedCultureId}
    >
      {children}
    </AdminShell>
  );
}
