import { redirect } from "next/navigation";
import Link from "next/link";
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
  const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  const isMasterSuperAdmin = !!user.isMasterSuperAdmin;
  const userRoles = (user.languageRoles ?? []) as any[];

  if (!isSuperAdmin && !userRoles.some((role) => role.role === "language_admin")) {
    const roleLanguages = (roleName: string) => [...new Set<number>(userRoles.filter((role) => role.role === roleName).map((role) => Number(role.languageId)))];
    const uploaderLanguages = roleLanguages("uploader");
    const cultureLanguages = roleLanguages("cultural_expert");
    const editorLanguages = roleLanguages("content_editor");
    const publisherLanguages = roleLanguages("publisher");
    const [uploadsToFinish, culturePending, editorPending, publishPending, publishedHistory] = await Promise.all([
      uploaderLanguages.length ? prisma.culturalRecord.count({ where: { languageId: { in: uploaderLanguages }, contributorId: user.id, status: "draft" } }) : 0,
      cultureLanguages.length ? prisma.culturalRecord.count({ where: { languageId: { in: cultureLanguages }, OR: [{ status: "submitted" }, { status: "under_review", validatorId: null }, { status: "rejection_review" }], AND: [{ OR: [{ contributorId: null }, { contributorId: { not: user.id } }] }] } }) : 0,
      editorLanguages.length ? prisma.culturalRecord.count({ where: { languageId: { in: editorLanguages }, status: "needs_edit" } }) : 0,
      publisherLanguages.length ? prisma.culturalRecord.count({ where: { languageId: { in: publisherLanguages }, status: "under_review", validatorId: { not: null } } }) : 0,
      publisherLanguages.length ? prisma.culturalRecord.count({ where: { languageId: { in: publisherLanguages }, status: "published" } }) : 0,
    ]);
    const roleWork = [
      ...(uploaderLanguages.length ? [{ title: "Uploads to complete", count: uploadsToFinish, href: "/admin/content?status=draft", description: "Continue preparing your assigned content and media." }] : []),
      ...(cultureLanguages.length ? [{ title: "Cultural reviews", count: culturePending, href: "/admin/validation-queue", description: "Compare the Indigenous-language item with its English version." }] : []),
      ...(editorLanguages.length ? [{ title: "Items needing edits", count: editorPending, href: "/admin/editor-queue", description: "Complete requested edits and return items to cultural review." }] : []),
      ...(publisherLanguages.length ? [{ title: "Ready to publish", count: publishPending, href: "/admin/review-queue", description: "Publish culturally approved items for your assigned languages." }, { title: "Published history", count: publishedHistory, href: "/admin/published-history", description: "Review the published content for your assigned languages." }] : []),
    ];
    const languageNames = [...new Set<string>(userRoles.map((role) => role.languageName).filter(Boolean))];
    return <main className="mx-auto max-w-6xl">
      <header className="mb-8"><p className="text-xs uppercase tracking-widest text-amber-900">Role workspace</p><h1 className="mt-1 font-serif text-3xl text-stone-900">{languageNames.length ? languageNames.join(", ") : "Your"} Dashboard</h1><p className="mt-2 text-sm text-stone-700">This workspace shows the tasks and records available to your assigned role.</p></header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{roleWork.map((item) => <Link key={item.title} href={item.href} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-500 hover:shadow-md"><p className="text-sm font-semibold text-stone-700">{item.title}</p><p className="mt-2 text-4xl font-semibold text-amber-900">{item.count}</p><p className="mt-2 text-sm text-stone-600">{item.description}</p><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-800">Open workspace →</p></Link>)}</section>
      {roleWork.length === 0 && <p className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">No workflow role is assigned to this account yet.</p>}
    </main>;
  }

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
            "uploader",
            "publisher",
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
    prisma.user.count({ where: isSuperAdmin && selectedLanguageId ? { languageRoles: { some: { languageId: selectedLanguageId } } } : isSuperAdmin ? {} : { languageRoles: { some: { languageId: { in: managedLanguageIds } } } } }),
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

  const hasLanguageAdminRole = userRoles.some((role) => role.role === "language_admin");
  const hasCultureRole = isSuperAdmin || hasLanguageAdminRole || userRoles.some((role) => role.role === "cultural_expert");
  const hasEditorRole = isSuperAdmin || hasLanguageAdminRole || userRoles.some((role) => role.role === "content_editor");
  const hasFinalRole = isSuperAdmin || hasLanguageAdminRole || userRoles.some((role) => role.role === "publisher");
  const hasUploaderRole = isSuperAdmin || hasLanguageAdminRole || userRoles.some((role) => role.role === "uploader");
  const [cultureQueueCount, editorQueueCount, finalQueueCount] = await Promise.all([
    hasCultureRole ? prisma.culturalRecord.count({
      where: {
        ...recordScope,
        OR: [{ status: "submitted" }, { status: "under_review", validatorId: null }],
        AND: [{ OR: [{ contributorId: null }, { contributorId: { not: user.id } }] }],
      },
    }) : Promise.resolve(0),
    hasEditorRole ? prisma.culturalRecord.count({ where: { ...recordScope, status: "needs_edit", validatorId: { not: null } } }) : Promise.resolve(0),
    hasFinalRole ? prisma.culturalRecord.count({ where: { ...recordScope, status: "under_review", validatorId: { not: null } } }) : Promise.resolve(0),
  ]);
  const workQueues = [
    ...(hasCultureRole ? [{ title: isSuperAdmin && !userRoles.some((role) => role.role === "cultural_expert") ? "Cultural review oversight" : "Cultural review", count: cultureQueueCount, href: "/admin/validation-queue", help: "A cultural expert must check each item first." }] : []),
    ...(hasEditorRole ? [{ title: "Editor work", count: editorQueueCount, href: "/admin/editor-queue", help: "Edit items returned by cultural reviewers." }] : []),
    ...(hasFinalRole ? [{ title: "Publishing", count: finalQueueCount, href: "/admin/review-queue", help: "Publish items that passed cultural review and any requested editing." }] : []),
    ...(hasUploaderRole ? [{ title: "Upload content", count: pendingRecords, href: "/admin/content", help: "Upload content in your assigned language areas and send it for cultural review." }] : []),
  ];

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
          {isMasterSuperAdmin ? "Master Super Admin" : primaryLang} Dashboard
        </h1>
        <p className="text-sm text-stone-500">
          Managing {managedLanguageIds.length}{" "}
          {managedLanguageIds.length === 1 ? "language" : "languages"}
        </p>
      </header>

      {workQueues.length > 0 && <section aria-labelledby="work-queue-title" className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="work-queue-title" className="text-lg font-semibold text-stone-800">Your next work</h2>
            <p className="text-sm text-stone-500">Each item moves to the next role only after this stage is complete.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {workQueues.map((queue) => <Link key={queue.title} href={queue.href} className="rounded-xl border border-stone-200 bg-white p-4 transition hover:border-amber-400 hover:shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-stone-800">{queue.title}</h3>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">{queue.count}</span>
            </div>
            <p className="mt-2 text-sm text-stone-600">{queue.help}</p>
            <p className="mt-3 text-xs font-semibold text-amber-800">Open queue →</p>
          </Link>)}
        </div>
      </section>}

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
