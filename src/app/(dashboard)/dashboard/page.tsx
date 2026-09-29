import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ModuleContent } from "@/components/layout/module-content";

function getRecordText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  return Object.values(data as Record<string, unknown>)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n")
    .slice(0, 700);
}

export default async function UserDashboardPage({
  searchParams,
}: {
  searchParams: { module?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const languageRoles = (user.languageRoles ?? []) as any[];
  const primaryRole = languageRoles[0];
  const languageId = primaryRole?.languageId;
  const languageCode = primaryRole?.languageCode ?? "luo";
  const englishLanguage = await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });

  const localizedSummary = (record: any, targetLanguageId: number) => {
    if (record.languageId === targetLanguageId) return record.summary || getRecordText(record.data);
    const translation = record.translations?.find((item: any) => item.languageId === targetLanguageId);
    return translation?.summary || getRecordText(translation?.data);
  };

  // ── Module view
  if (searchParams.module && languageId) {
    const mod = await prisma.module.findUnique({
      where: { code: searchParams.module },
      include: { translations: { where: { languageId } } },
    });

    if (mod) {
      const title = mod.translations[0]?.title ?? mod.baseName;

      const records = await prisma.culturalRecord.findMany({
        where: { moduleId: mod.id, languageId, status: "published" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { media: true, translations: { where: { languageId: { in: [languageId, ...(englishLanguage ? [englishLanguage.id] : [])] } } } },
      });
      const dictionaryEntries = mod.code === "dictionary"
        ? await prisma.dictionaryEntry.findMany({ where: { ...(languageCode === "eng" ? {} : { languageId }), status: "published" }, orderBy: { createdAt: "desc" }, take: 100, include: { media: true } })
        : [];

      const items = records.map((r) => ({
        id: r.id,
        title: r.title,
        summary: localizedSummary(r, languageId),
        englishSummary: englishLanguage ? localizedSummary(r, englishLanguage.id) : null,
        moduleCode: r.moduleId === mod.id ? mod.code : undefined,
        moduleName: mod.baseName,
        createdAt: r.createdAt.toISOString(),
        media: r.media.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          format: m.format,
        })),
      }));
      const dictionaryItems = dictionaryEntries.map((entry) => ({
        id: entry.id,
        title: entry.dholuo,
        summary: (languageCode === "eng" ? [entry.english, entry.kiswahili] : [entry.pronunciation]).filter(Boolean).join("\n"),
        englishSummary: [entry.english, entry.kiswahili].filter(Boolean).join("\n"),
        moduleCode: "dictionary",
        moduleName: "Dictionary",
        createdAt: entry.createdAt.toISOString(),
        media: entry.media.map((media) => ({ id: media.id, type: media.type, url: media.url, thumbnailUrl: media.thumbnailUrl, format: media.format })),
      }));

      return (
        <ModuleContent
          title={title}
          baseName={mod.baseName}
          languageName={primaryRole?.languageName ?? "Dholuo"}
          languageCode={languageCode}
          languageId={languageId}
          moduleCode={mod.code}
          items={[...items, ...dictionaryItems].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))}
        />
      );
    }
  }

  // ── Overview: text sits directly on the sand background
  if (!searchParams.module && languageId) {
    const [records, dictionaryEntries] = await Promise.all([
      prisma.culturalRecord.findMany({
        where: { status: "published", languageId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { media: true, translations: { where: { languageId: { in: [languageId, ...(englishLanguage ? [englishLanguage.id] : [])] } } }, module: { select: { code: true, baseName: true } } },
      }),
      prisma.dictionaryEntry.findMany({
        where: { ...(languageCode === "eng" ? {} : { languageId }), status: "published" },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { media: true },
      }),
    ]);
    const items = records.map((record) => ({
      id: record.id,
      title: record.title,
      summary: localizedSummary(record, languageId),
      englishSummary: englishLanguage ? localizedSummary(record, englishLanguage.id) : null,
      moduleCode: record.module.code,
      moduleName: record.module.baseName,
      createdAt: record.createdAt.toISOString(),
      media: record.media.map((media) => ({ id: media.id, type: media.type, url: media.url, thumbnailUrl: media.thumbnailUrl, format: media.format })),
    }));
    const dictionaryItems = dictionaryEntries.map((entry) => ({
      id: entry.id,
      title: entry.dholuo,
      summary: (languageCode === "eng" ? [entry.english, entry.kiswahili] : [entry.pronunciation]).filter(Boolean).join("\n"),
      englishSummary: [entry.english, entry.kiswahili].filter(Boolean).join("\n"),
      moduleCode: "dictionary",
      moduleName: "Dictionary",
      createdAt: entry.createdAt.toISOString(),
      media: entry.media.map((media) => ({ id: media.id, type: media.type, url: media.url, thumbnailUrl: media.thumbnailUrl, format: media.format })),
    }));
    const feedItems = [...items, ...dictionaryItems].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return <ModuleContent title="Community content" baseName="All modules" languageName={primaryRole?.languageName ?? "Dholuo"} languageCode={languageCode} languageId={languageId} moduleCode="all" items={feedItems} />;
  }

  return (
    <div className="p-6 md:p-10 pt-20 md:pt-12">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-800/60 font-semibold mb-2">
          {primaryRole?.languageName ?? "Dholuo"} · Overview
        </p>
        <h2 className="font-serif text-4xl md:text-5xl text-stone-900 leading-tight mb-3">
          Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h2>
        <div className="w-16 h-1 bg-amber-800/70 rounded-full" />
      </header>

      <div className="max-w-2xl space-y-4">
        <p className="text-lg md:text-xl text-stone-900/90 leading-relaxed font-serif">
          Pick a module from the sidebar to explore or contribute.
        </p>
        <p className="text-base text-stone-800/80 leading-relaxed">
          Use the filter tabs at the top of each module to browse by{" "}
          <span className="font-semibold text-amber-900">images</span>,{" "}
          <span className="font-semibold text-amber-900">audio</span>,{" "}
          <span className="font-semibold text-amber-900">video</span>, or{" "}
          <span className="font-semibold text-amber-900">transcripts</span>.
        </p>
        <p className="text-base text-stone-800/80 leading-relaxed">
          Your language:{" "}
          <strong className="text-amber-900 font-semibold">
            {primaryRole?.languageName ?? "Dholuo"}
          </strong>
        </p>
      </div>
    </div>
  );
}
