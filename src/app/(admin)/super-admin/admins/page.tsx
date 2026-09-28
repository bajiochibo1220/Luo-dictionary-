import { prisma } from "@/lib/db";
import { AdminsClient } from "./admins-client";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
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
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, code: true, nativeName: true },
    }),
  ]);

  return <AdminsClient admins={admins} languages={languages} />;
}