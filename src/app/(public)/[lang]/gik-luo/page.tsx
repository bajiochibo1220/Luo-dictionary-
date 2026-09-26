import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ArtifactGrid } from "@/components/modules/artifacts/artifact-grid";

export default async function ArtifactsPage({
  params,
}: {
  params: { lang: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
    include: { moduleTranslations: { include: { module: true } } },
  });
  if (!language || !language.isActive) notFound();

  const mod = await prisma.module.findUnique({ where: { code: "artifacts" } });
  if (!mod) notFound();

  const records = await prisma.culturalRecord.findMany({
    where: { languageId: language.id, moduleId: mod.id, status: "published" },
    orderBy: { createdAt: "desc" },
    include: { media: true },
  });

  const titleMap: Record<string, string> = {};
  for (const mt of language.moduleTranslations) {
    titleMap[mt.module.code] = mt.title;
  }
  const pageTitle = titleMap["artifacts"] || "Cultural Artifacts";

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mb-2">
          {pageTitle}
        </h1>
        <p className="text-stone-500">
          {records.length}{" "}
          {records.length === 1 ? "artifact" : "artifacts"} · Traditional
          objects and their stories
        </p>
      </header>

      <ArtifactGrid artifacts={records as any} langCode={language.code} />
    </div>
  );
}