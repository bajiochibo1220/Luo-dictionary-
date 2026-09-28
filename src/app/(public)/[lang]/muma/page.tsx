import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DictionarySearch } from "@/components/modules/dictionary/dictionary-search";

export default async function DictionaryPage({
  params,
}: {
  params: { lang: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
    include: {
      moduleTranslations: { include: { module: true } },
    },
  });

  if (!language || !language.isActive) notFound();

  const titleMap: Record<string, string> = {};
  for (const mt of language.moduleTranslations) {
    titleMap[mt.module.code] = mt.title;
  }
  const pageTitle = titleMap["dictionary"] || "Dictionary";

  const [entries, records] = await Promise.all([
    prisma.dictionaryEntry.findMany({
      where: { languageId: language.id, status: "published" },
      orderBy: { dholuo: "asc" },
      take: 50,
    }),
    prisma.culturalRecord.findMany({
      where: { languageId: language.id, status: "published", module: { code: "dictionary" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { media: true },
    }),
  ]);
  const authoredEntries = records.map((record) => {
    const data = record.data as Record<string, any>;
    const audio = record.media.find((item) => item.type === "audio");
    return {
      id: record.id,
      dholuo: data.dholuo || record.title,
      english: data.english || "",
      kiswahili: data.kiswahili ?? null,
      pronunciation: data.pronunciation ?? null,
      grammarClass: data.grammarClass ?? null,
      audioUrl: audio?.url ?? null,
      media: record.media.map(({ id, type, url, thumbnailUrl }) => ({ id, type, url, thumbnailUrl })),
    };
  });
  const publicEntries = [...entries, ...authoredEntries]
    .sort((a, b) => a.dholuo.localeCompare(b.dholuo))
    .slice(0, 50);

  const emptyMessage =
    language.code === "luo"
      ? "Onge wach e muma"
      : "No entries yet";

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mb-2">
          {pageTitle}
        </h1>
        <p className="text-stone-500">
          {publicEntries.length} {publicEntries.length === 1 ? "entry" : "entries"}
        </p>
      </header>

      <DictionarySearch
        initialEntries={publicEntries}
        langCode={language.code}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
