import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SitesMap } from "@/components/modules/heritage-sites/sites-map";
import { getContentCultureLanguageId, localizeRecord } from "@/lib/content-translations";

export default async function HeritageSitesPage({
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
    where: { code: "heritage_sites" },
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
  const pageTitle = titleMap["heritage_sites"] || "Heritage Sites";

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mb-2">
          {pageTitle}
        </h1>
        <p className="text-stone-500">
          {records.length} {records.length === 1 ? "site" : "sites"} · Sacred
          and historical places of the Luo
        </p>
      </header>

      <SitesMap sites={localizedRecords as any} langCode={language.code} />
    </div>
  );
}
