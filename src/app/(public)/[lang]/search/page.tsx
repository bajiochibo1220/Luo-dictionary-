import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SemanticSearch } from "@/components/ai/semantic-search";

export default async function SearchPage({
  params,
}: {
  params: { lang: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language || !language.isActive) notFound();

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif text-stone-800 mb-2">
          Semantic Search
        </h1>
        <p className="text-stone-500">
          Search by meaning, not just exact words — powered by AI
        </p>
      </header>

      <SemanticSearch langCode={language.code} />
    </div>
  );
}