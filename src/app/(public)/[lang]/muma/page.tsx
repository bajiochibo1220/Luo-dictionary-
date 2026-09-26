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

  const entries = await prisma.dictionaryEntry.findMany({
    where: { languageId: language.id, status: "published" },
    orderBy: { dholuo: "asc" },
    take: 50,
  });

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
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
      </header>

      <DictionarySearch
        initialEntries={entries}
        langCode={language.code}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}