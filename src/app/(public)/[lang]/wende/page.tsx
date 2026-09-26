import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SongCard } from "@/components/modules/songs/song-card";

export default async function SongsPage({
  params,
}: {
  params: { lang: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
    include: { moduleTranslations: { include: { module: true } } },
  });
  if (!language || !language.isActive) notFound();

  const mod = await prisma.module.findUnique({ where: { code: "songs" } });
  if (!mod) notFound();

  const records = await prisma.culturalRecord.findMany({
    where: { languageId: language.id, moduleId: mod.id, status: "published" },
    orderBy: { createdAt: "desc" },
  });

  const titleMap: Record<string, string> = {};
  for (const mt of language.moduleTranslations) {
    titleMap[mt.module.code] = mt.title;
  }
  const pageTitle = titleMap["songs"] || "Traditional Songs";

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mb-2">
          {pageTitle}
        </h1>
        <p className="text-stone-500">
          {records.length} {records.length === 1 ? "song" : "songs"} ·{" "}
          Traditional Luo music
        </p>
      </header>

      {records.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No songs published yet</p>
          <p className="text-sm mt-2">
            Traditional songs are being recorded and added
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {records.map((r) => (
            <SongCard key={r.id} song={r as any} langCode={language.code} />
          ))}
        </div>
      )}
    </div>
  );
}