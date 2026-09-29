import { prisma } from "@/lib/db";
import { AdminsClient } from "./admins-client";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const session = await auth();
  const isMasterSuperAdmin = session?.user?.isMasterSuperAdmin === true;
  const assignedLanguageIds = (session?.user?.languageRoles ?? []).map((role) => role.languageId);
  const [admins, languages] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { isSuperAdmin: true },
          {
            languageRoles: {
              some: {
                role: {
                  in: [
                    "language_admin",
                    "moderator",
                    "content_editor",
                    "cultural_expert",
                  ],
                },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        isMasterSuperAdmin: true,
        status: true,
        languageRoles: {
          select: {
            id: true,
            role: true,
            language: { select: { code: true, nativeName: true } },
          },
        },
      },
    }),
    prisma.language.findMany({
      where: { isActive: true, ...(isMasterSuperAdmin ? {} : { id: { in: assignedLanguageIds } }) },
      orderBy: { displayOrder: "asc" },
      select: { id: true, code: true, nativeName: true },
    }),
  ]);

  return <AdminsClient admins={admins} languages={languages} isMasterSuperAdmin={isMasterSuperAdmin} />;
}
