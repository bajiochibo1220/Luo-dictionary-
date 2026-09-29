import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const isSuperAdmin = !!user.isSuperAdmin;
  const languageRoles = (user.languageRoles ?? []) as any[];

  const isAdmin =
    isSuperAdmin ||
    languageRoles.some((r: any) =>
      ["language_admin", "moderator", "content_editor", "cultural_expert"].includes(
        r.role
      )
    );

  if (!isAdmin) redirect("/");

  // Unread notifications count
  let notificationCount = 0;
  try {
    notificationCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });
  } catch {
    notificationCount = 0;
  }

  return (
    <AdminShell
      userEmail={user.email ?? ""}
      userName={user.name ?? null}
      userImage={user.image ?? null}
      isSuperAdmin={isSuperAdmin}
      notificationCount={notificationCount}
    >
      {children}
    </AdminShell>
  );
}
