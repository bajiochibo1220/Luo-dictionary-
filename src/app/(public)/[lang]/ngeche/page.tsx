import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RiddleGrid } from "@/components/modules/riddles/riddle-grid";

export default async function RiddlesPage({
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
    where: { code: "riddles" },
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
  const pageTitle = titleMap["riddles"] || "Riddles";

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mb-2">
          {pageTitle}
        </h1>
        <p className="text-stone-500">
          {records.length} {records.length === 1 ? "riddle" : "riddles"} ·{" "}
          Traditional Luo riddling games
        </p>
      </header>

      <RiddleGrid
        initialRiddles={records as any}
        langCode={language.code}
      />
    </div>
  );
}