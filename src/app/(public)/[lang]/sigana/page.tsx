import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OralHistoryCard } from "@/components/modules/oral-history/oral-history-card";
import { getContentCultureLanguageId, localizeRecord } from "@/lib/content-translations";

export default async function OralHistoriesPage({
  params,
}: {
  params: { lang: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
    include: { moduleTranslations: { include: { module: true } } },
  });
  if (!language || !language.isActive) notFound();
  const cultureLanguageId = await getContentCultureLanguageId(language.id);

  const mod = await prisma.module.findUnique({
    where: { code: "oral_histories" },
  });
  if (!mod) notFound();

  const records = await prisma.culturalRecord.findMany({
    where: { languageId: cultureLanguageId, moduleId: mod.id, status: "published" },
    orderBy: { createdAt: "desc" },
    include: { media: true, translations: { where: { languageId: language.id } } },
  });
  const localizedRecords = records.map((record) => localizeRecord(record, language.id));

  const titleMap: Record<string, string> = {};
  for (const mt of language.moduleTranslations) {
    titleMap[mt.module.code] = mt.title;
  }
  const pageTitle = titleMap["oral_histories"] || "Oral Histories";

  const counties = Array.from(
    new Set(
      localizedRecords
        .map((r) => (r.data as any)?.county)
        .filter((x) => typeof x === "string")
    )
  );

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mb-2">
          {pageTitle}
        </h1>
        <p className="text-stone-500">
          Stories from Luo elders · {records.length}{" "}
          {records.length === 1 ? "story" : "stories"}
        </p>
      </header>

      {counties.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {counties.map((c) => (
            <span
              key={c}
              className="text-xs px-3 py-1.5 bg-white text-stone-600 border border-stone-200 rounded-full"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No oral histories published yet</p>
          <p className="text-sm mt-2">
            Elders can contribute via the dashboard
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {localizedRecords.map((r) => (
            <OralHistoryCard
              key={r.id}
              item={r as any}
              langCode={language.code}
            />
          ))}
        </div>
      )}
    </div>
  );
}
