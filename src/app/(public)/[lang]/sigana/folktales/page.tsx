import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FolktaleCard } from "@/components/modules/folktales/folktale-card";
import { getContentCultureLanguageId, localizeRecord } from "@/lib/content-translations";

export default async function FolktalesPage({
  params,
}: {
  params: { lang: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language || !language.isActive) notFound();
  const cultureLanguageId = await getContentCultureLanguageId(language.id);

  const mod = await prisma.module.findUnique({
    where: { code: "folktales" },
  });
  if (!mod) notFound();

  const records = await prisma.culturalRecord.findMany({
    where: { languageId: cultureLanguageId, moduleId: mod.id, status: "published" },
    orderBy: { createdAt: "desc" },
    include: { media: true, translations: { where: { languageId: language.id } } },
  });
  const localizedRecords = records.map((record) => localizeRecord(record, language.id));

  return (
    <div>
      <Link
        href={`/${language.code}/sigana`}
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      >
        ← Back to Sigana
      </Link>

      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mb-2">
          Folktales
        </h1>
        <p className="text-stone-500">
          Traditional Luo stories · {records.length}{" "}
          {records.length === 1 ? "tale" : "tales"}
        </p>
      </header>

      {localizedRecords.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No folktales published yet</p>
          <p className="text-sm mt-2">
            Check back soon — more stories are being added
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {localizedRecords.map((r) => (
            <FolktaleCard
              key={r.id}
              tale={r as any}
              langCode={language.code}
            />
          ))}
        </div>
      )}
    </div>
  );
}
