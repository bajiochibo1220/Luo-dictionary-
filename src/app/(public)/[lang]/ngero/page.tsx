import { notFound } from "next/navigation";
import { publicRecordWhere, publicMediaWhere } from "@/lib/governance";
import { prisma } from "@/lib/db";
import { ProverbGrid } from "@/components/modules/proverbs/proverb-grid";
import { getContentCultureLanguageId, localizeRecord } from "@/lib/content-translations";

export default async function ProverbsPage({
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
    where: { code: "proverbs" },
  });
  if (!mod) notFound();

  const records = await prisma.culturalRecord.findMany({
    where: { languageId: cultureLanguageId, moduleId: mod.id, ...publicRecordWhere() },
    orderBy: { createdAt: "desc" },
    include: { media: { where: publicMediaWhere() }, translations: { where: { languageId: language.id } } },
  });
  const localizedRecords = records.map((record) => localizeRecord(record, language.id));

  // collect unique themes
  const themeSet = new Set<string>();
  for (const r of localizedRecords) {
    for (const t of r.tags) themeSet.add(t);
  }
  const allThemes = Array.from(themeSet).sort();

  const titleMap: Record<string, string> = {};
  for (const mt of language.moduleTranslations) {
    titleMap[mt.module.code] = mt.title;
  }
  const pageTitle = titleMap["proverbs"] || "Proverbs";

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mb-2">
          {pageTitle}
        </h1>
        <p className="text-stone-500">
          {records.length} {records.length === 1 ? "proverb" : "proverbs"} ·{" "}
          Wisdom passed down through generations
        </p>
      </header>

      <ProverbGrid
        initialProverbs={localizedRecords as any}
        langCode={language.code}
        allThemes={allThemes}
      />
    </div>
  );
}
