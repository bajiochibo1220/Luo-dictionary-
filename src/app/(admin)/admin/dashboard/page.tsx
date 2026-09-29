import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/stat-card";
import { ContentBarChart } from "@/components/admin/content-bar-chart";
import { PendingSummary } from "@/components/admin/pending-summary";
import { ContributorList } from "@/components/admin/contributor-list";
import { AiUsageCard } from "@/components/admin/ai-usage-card";
import { getSelectedAdminCultureId, getSelectedAdminLanguageId } from "@/lib/admin-language";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const isSuperAdmin = !!user.isSuperAdmin;

  // Which languages can this admin see?
  const selectedLanguageId = isSuperAdmin ? await getSelectedAdminLanguageId() : undefined;
  const selectedCultureId = isSuperAdmin ? await getSelectedAdminCultureId() : undefined;
  const managedLanguageIds: number[] = isSuperAdmin
    ? selectedLanguageId ? [selectedLanguageId] : (
        await prisma.language.findMany({
          where: { isActive: true },
          select: { id: true },
        })
      ).map((l) => l.id)
    : ((user.languageRoles ?? []) as any[])
        .filter((r) =>
          [
            "language_admin",
            "moderator",
            "content_editor",
            "cultural_expert",
          ].includes(r.role)
        )
        .map((r) => r.languageId);
  const recordScope: any = isSuperAdmin && selectedCultureId
    ? { languageId: selectedCultureId }
    : isSuperAdmin
    ? {}
    : { languageId: { in: managedLanguageIds } };

  // Stats
  const [
    totalRecords,
    pendingRecords,
    mediaCount,
    userCount,
    aiQueries,
  ] = await Promise.all([
    prisma.culturalRecord.count({
      where: recordScope,
    }),
    prisma.culturalRecord.count({
      where: {
        ...recordScope,
        status: "submitted",
      },
    }),
    prisma.mediaAsset.count({
      where: isSuperAdmin && selectedCultureId
        ? { OR: [{ languageId: selectedCultureId }, { record: { languageId: selectedCultureId } }] }
        : isSuperAdmin ? {} : { OR: [{ languageId: { in: managedLanguageIds } }, { record: { languageId: { in: managedLanguageIds } } }] },
    }),
    prisma.user.count({ where: isSuperAdmin && selectedLanguageId ? { languageRoles: { some: { languageId: selectedLanguageId } } } : {} }),
    prisma.aIResponse.count({
      where: { languageId: { in: managedLanguageIds } },
    }),
  ]);

  // Content by module
  const modules = await prisma.module.findMany({
    orderBy: { displayOrder: "asc" },
    include: { translations: { where: selectedLanguageId ? { languageId: selectedLanguageId } : undefined } },
  });

  const contentByModule = await Promise.all(
    modules.map(async (m) => ({
      label: m.translations[0]?.title ?? m.baseName,
      count: await prisma.culturalRecord.count({
        where: {
          ...recordScope,
          moduleId: m.id,
        },
      }),
    }))
  );
  const activeModules = contentByModule.filter((m) => m.count > 0);

  // Pending by module
  const pendingByModule = await Promise.all(
    modules.map(async (m) => ({
      label: m.translations[0]?.title ?? m.baseName,
      count: await prisma.culturalRecord.count({
        where: {
          ...recordScope,
          moduleId: m.id,
          status: "submitted",
        },
      }),
    }))
  );
  const pendingActive = pendingByModule.filter((m) => m.count > 0);

  // Recent contributors
  const contributorsRaw = await prisma.culturalRecord.groupBy({
    by: ["contributorId"],
    where: {
          ...recordScope,
      contributorId: { not: null },
    },
    _count: { contributorId: true },
    orderBy: { _count: { contributorId: "desc" } },
    take: 5,
  });

  const contributorIds = contributorsRaw
    .map((c) => c.contributorId)
    .filter(Boolean) as string[];

  const contributorUsers = await prisma.user.findMany({
    where: { id: { in: contributorIds } },
    select: { id: true, name: true, email: true },
  });

  const contributors = contributorsRaw.map((c) => {
    const u = contributorUsers.find((x) => x.id === c.contributorId);
    return {
      name: u?.name ?? "",
      email: u?.email ?? "",
      count: c._count.contributorId,
    };
  });

  // AI metrics
  const aiStats = await prisma.aIResponse.aggregate({
    where: { languageId: { in: managedLanguageIds } },
    _avg: { latencyMs: true },
    _count: { id: true },
  });

  const avgLatency = Math.round(aiStats._avg.latencyMs ?? 0);
  const totalAiQueries = aiStats._count.id;

  // Satisfaction: rating "up" vs total rated
  const rated = await prisma.aIResponse.count({
    where: {
      languageId: { in: managedLanguageIds },
      rating: { not: null },
    },
  });
  const up = await prisma.aIResponse.count({
    where: {
      languageId: { in: managedLanguageIds },
      rating: "up",
    },
  });
  const satisfactionPct = rated === 0 ? 0 : Math.round((up / rated) * 100);

  // Language label
  const primaryLang = isSuperAdmin
    ? (selectedLanguageId ? (await prisma.language.findUnique({ where: { id: selectedLanguageId }, select: { nativeName: true } }))?.nativeName : "All Languages")
    : managedLanguageIds.length > 0
    ? (
        await prisma.language.findFirst({
          where: { id: managedLanguageIds[0] },
          select: { name: true, nativeName: true },
        })
      )?.nativeName ?? "Admin"
    : "Admin";

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          {primaryLang} Dashboard
        </h1>
        <p className="text-sm text-stone-500">
          Managing {managedLanguageIds.length}{" "}
          {managedLanguageIds.length === 1 ? "language" : "languages"}
        </p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Records" value={totalRecords} accent="amber" />
        <StatCard
          label="Pending Review"
          value={pendingRecords}
          accent="green"
        />
        <StatCard label="Media Files" value={mediaCount} accent="blue" />
        <StatCard label="Users" value={userCount} accent="stone" />
      </div>

      {/* Charts + summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-stone-100 p-6">
          <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-6">
            Content by Module
          </h3>
          <ContentBarChart data={activeModules} />
        </div>

        <PendingSummary total={pendingRecords} byModule={pendingActive} />
      </div>

      {/* Contributors + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContributorList contributors={contributors} />

        <AiUsageCard
          queries={totalAiQueries}
          avgLatencyMs={avgLatency}
          satisfactionPct={satisfactionPct}
        />
      </div>
    </div>
  );
}
