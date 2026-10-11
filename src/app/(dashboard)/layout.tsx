import { maintenanceMessage } from "@/lib/maintenance";
import { MaintenanceNotice } from "@/components/layout/maintenance-notice";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefaultPublicLanguage, getPublicModules } from "@/lib/public-navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { FloatingChatbot } from "@/components/layout/floating-chatbot";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const message = await maintenanceMessage();
  if (message) return <MaintenanceNotice message={message} />;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const languageRoles = (user.languageRoles ?? []) as any[];
  const primaryRole = languageRoles[0];
  const fallbackLanguage = primaryRole ? null : await getDefaultPublicLanguage();
  const languageCode = primaryRole?.languageCode ?? fallbackLanguage?.code ?? "luo";
  const languageId = primaryRole?.languageId ?? fallbackLanguage?.id;

  const [modules, stats] = await Promise.all([
    languageId
      ? getPublicModules(languageId)
      : Promise.resolve([]),
    prisma.culturalRecord.groupBy({
      by: ["status"],
      where: { contributorId: user.id },
      _count: { _all: true },
    }),
  ]);

  const uploads = stats.reduce((total, group) => total + group._count._all, 0);
  const approved = stats.find((group) => group.status === "published")?._count._all ?? 0;
  const pending = stats.filter((group) => ["submitted", "under_review", "validated"].includes(group.status)).reduce((total, group) => total + group._count._all, 0);

  const formattedModules = modules.map((m) => ({
    code: m.code,
    title: m.translations[0]?.title ?? m.baseName,
    baseName: m.baseName,
  }));

  const userInitial = (user.name || user.email || "U").charAt(0).toUpperCase();
  const isAdmin =
    user.isSuperAdmin ||
    (user.languageRoles ?? []).some((r: any) =>
      ["language_admin", "uploader", "publisher", "content_editor", "cultural_expert"].includes(
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
        isSuperAdmin={!!(user.isSuperAdmin || user.isMasterSuperAdmin)}
        languageCode={languageCode}
        stats={{
          uploads,
          approved,
          pending,
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
