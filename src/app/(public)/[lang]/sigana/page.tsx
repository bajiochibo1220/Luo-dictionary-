import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OralHistoryCard } from "@/components/modules/oral-history/oral-history-card";

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

  const mod = await prisma.module.findUnique({
    where: { code: "oral_histories" },
  });
  if (!mod) notFound();

  const records = await prisma.culturalRecord.findMany({
    where: { languageId: language.id, moduleId: mod.id, status: "published" },
    orderBy: { createdAt: "desc" },
  });

  const titleMap: Record<string, string> = {};
  for (const mt of language.moduleTranslations) {
    titleMap[mt.module.code] = mt.title;
  }
  const pageTitle = titleMap["oral_histories"] || "Oral Histories";

  const counties = Array.from(
    new Set(
      records
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
          {records.map((r) => (
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