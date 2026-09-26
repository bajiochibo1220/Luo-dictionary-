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
  if (!(session.user as any).isSuperAdmin) redirect("/");

  // Stats
  const [languages, totalUsers, totalRecords, totalMedia, totalAI] =
    await Promise.all([
      prisma.language.findMany({
        orderBy: { displayOrder: "asc" },
      }),
      prisma.user.count(),
      prisma.culturalRecord.count(),
      prisma.mediaAsset.count(),
      prisma.aIResponse.count(),
    ]);

  // Per-language stats
  const languagesWithStats = await Promise.all(
    languages.map(async (l) => {
      const [recordCount, userCount] = await Promise.all([
        prisma.culturalRecord.count({ where: { languageId: l.id } }),
        prisma.userLanguageRole.count({ where: { languageId: l.id } }),
      ]);
      return {
        code: l.code,
        name: l.name,
        nativeName: l.nativeName,
        isActive: l.isActive,
        recordCount,
        userCount,
      };
    })
  );

  const activeLanguages = languages.filter((l) => l.isActive).length;

  // Recent activity
  const activityRaw = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { user: { select: { name: true, email: true } } },
  });

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
  let dbHealthy: "healthy" | "warning" | "error" = "healthy";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbHealthy = "error";
  }

  const storageHealthy: "healthy" | "warning" | "error" =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== "placeholder"
      ? "healthy"
      : "warning";

  const aiHealthy: "healthy" | "warning" | "error" =
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-placeholder"
      ? "healthy"
      : "warning";

  const backupHealthy: "healthy" | "warning" | "error" = "warning";

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-1">
            Super Admin Dashboard
          </h1>
          <p className="text-sm text-stone-500">
            Platform-wide overview · {languages.length}{" "}
            {languages.length === 1 ? "language" : "languages"}
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