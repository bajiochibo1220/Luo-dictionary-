import { InterfaceText } from "@/components/shared/interface-language";
import fs from "fs";
import { getSystemSettings } from "@/lib/settings";
import { hasGemini } from "@/lib/ai/gemini";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/stat-card";
import { LanguageBreakdown } from "@/components/admin/language-breakdown";
import { SystemHealth } from "@/components/admin/system-health";
import { RecentActivity } from "@/components/admin/recent-activity";
import { QuickActions } from "@/components/admin/quick-actions";

export default async function SuperAdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(session.user as any).isSuperAdmin && !(session.user as any).isMasterSuperAdmin) redirect("/");

  // Stats
  const [languages, totalUsers, recordsByLanguage, usersByLanguage, totalMedia, totalAI, activityRaw, latestBackup, settings] =
    await Promise.all([
      prisma.language.findMany({
        orderBy: { displayOrder: "asc" },
      }),
      prisma.user.count(),
      prisma.culturalRecord.groupBy({ by: ["languageId"], _count: { _all: true } }),
      prisma.userLanguageRole.groupBy({ by: ["languageId"], _count: { _all: true } }),
      prisma.mediaAsset.count(),
      prisma.aIResponse.count(),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true, email: true } } } }),
      prisma.backup.findFirst({ orderBy: { createdAt: "desc" } }),
      getSystemSettings(),
    ]);

  // Per-language stats
  const totalRecords = recordsByLanguage.reduce((total, group) => total + group._count._all, 0);
  const recordCounts = new Map(recordsByLanguage.map((group) => [group.languageId, group._count._all]));
  const userCounts = new Map(usersByLanguage.map((group) => [group.languageId, group._count._all]));
  const languagesWithStats = languages.map((l) => {
      return {
        code: l.code,
        name: l.name,
        nativeName: l.nativeName,
        isActive: l.isActive,
        recordCount: recordCounts.get(l.id) ?? 0,
        userCount: userCounts.get(l.id) ?? 0,
      };
    });

  const activeLanguages = languages.filter((l) => l.isActive).length;

  const activity = activityRaw.map((a) => ({
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    userName:
      a.user?.name || a.user?.email?.split("@")[0] || "System",
    createdAt: new Date(a.createdAt).toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  }));

  // Simple system health checks
  // The successful live statistics queries establish database connectivity.
  const dbHealthy = "healthy" as const;
  const storageHealthy = (settings.cloudinary_cloud_name || process.env.CLOUDINARY_CLOUD_NAME) && (settings.cloudinary_api_key || process.env.CLOUDINARY_API_KEY) && (settings.cloudinary_api_secret || process.env.CLOUDINARY_API_SECRET) ? "configured" as const : "warning" as const;
  const aiHealthy = await hasGemini() ? "configured" as const : "warning" as const;
  const backupHealthy = latestBackup?.fileUrl && fs.existsSync(latestBackup.fileUrl) && Date.now() - latestBackup.createdAt.getTime() < 7 * 86400000 ? "healthy" as const : "warning" as const;

  return (
    <div>
      <header className="workspace-heading mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-1"><InterfaceText source="Super Admin Dashboard" /></h1>
          <p className="text-sm text-stone-500"><InterfaceText source="Platform-wide overview · " />{languages.length}{" "}
            <InterfaceText source={languages.length === 1 ? "language" : "languages"} />
          </p>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Languages"
          value={`${activeLanguages}/${languages.length}`}
          accent="amber"
        />
        <StatCard label="Users" value={totalUsers} accent="green" />
        <StatCard label="Records" value={totalRecords} accent="blue" />
        <StatCard label="Media" value={totalMedia} accent="stone" />
        <StatCard label="AI Queries" value={totalAI} accent="amber" />
      </div>

      {/* Language breakdown + health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <LanguageBreakdown languages={languagesWithStats} />
        </div>
        <SystemHealth
          database={dbHealthy}
          storage={storageHealthy}
          ai={aiHealthy}
          backup={backupHealthy}
        />
      </div>

      {/* Activity + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity entries={activity} />
        <QuickActions />
      </div>
    </div>
  );
}
