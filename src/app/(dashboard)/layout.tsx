import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { FloatingChatbot } from "@/components/layout/floating-chatbot";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const languageRoles = (user.languageRoles ?? []) as any[];
  const primaryRole = languageRoles[0];
  const languageCode = primaryRole?.languageCode ?? "luo";

  const [modules, stats] = await Promise.all([
    primaryRole?.languageId
      ? prisma.module.findMany({
          where: { isActive: true, isStub: false },
          orderBy: { displayOrder: "asc" },
          include: {
            translations: { where: { languageId: primaryRole.languageId } },
          },
        })
      : Promise.resolve([]),
    Promise.all([
      prisma.culturalRecord.count({ where: { contributorId: user.id } }),
      prisma.culturalRecord.count({
        where: { contributorId: user.id, status: "published" },
      }),
      prisma.culturalRecord.count({
        where: {
          contributorId: user.id,
          status: { in: ["submitted", "under_review", "validated"] },
        },
      }),
    ]),
  ]);

  const formattedModules = modules.map((m) => ({
    code: m.code,
    title: m.translations[0]?.title ?? m.baseName,
    baseName: m.baseName,
  }));

  const userInitial = (user.name || user.email || "U").charAt(0).toUpperCase();
  const isAdmin =
    user.isSuperAdmin ||
    (user.languageRoles ?? []).some((r: any) =>
      ["language_admin", "moderator", "content_editor", "cultural_expert"].includes(
        r.role
      )
    );

  return (
    <div className="h-screen flex flex-col bg-[#b89a68] overflow-hidden">
      <AppTopbar
        userInitial={userInitial}
        userName={user.name ?? null}
        userEmail={user.email ?? ""}
        userImage={user.image ?? null}
        isAdmin={isAdmin}
        languageCode={languageCode}
        stats={{
          uploads: stats[0],
          approved: stats[1],
          pending: stats[2],
        }}
      />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-stone-900">
            Loading...
          </div>
        }
      >
        <AppShell sidebar={<AppSidebar modules={formattedModules} />}>
          {children}
        </AppShell>
      </Suspense>
      <FloatingChatbot />
    </div>
  );
}
