import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function DictionaryDetailPage({
  params,
}: {
  params: { lang: string; id: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language) notFound();

  const entry = await prisma.dictionaryEntry.findUnique({
    where: { id: params.id },
  });
  if (!entry) notFound();

  const examples = (entry.examples as any[]) ?? [];
  const related = await prisma.dictionaryEntry.findMany({
    where: {
      languageId: language.id,
      grammarClass: entry.grammarClass ?? undefined,
      status: "published",
      id: { not: entry.id },
    },
    take: 4,
  });

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/${language.code}/muma`}
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      >
        ← Back to Dictionary
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 md:p-12">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="text-5xl font-serif text-stone-800">
              {entry.dholuo}
            </h1>
            {entry.grammarClass && (
              <span className="text-xs uppercase tracking-wider bg-amber-100 text-amber-700 px-3 py-1 rounded-full whitespace-nowrap">
                {entry.grammarClass}
              </span>
            )}
          </div>

          {entry.pronunciation && (
            <p className="text-stone-400 italic">/{entry.pronunciation}/</p>
          )}
        </header>

        <section className="space-y-6">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-1">
              English
            </h2>
            <p className="text-2xl text-stone-800 font-serif">
              {entry.english}
            </p>
          </div>

          {entry.kiswahili && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                Kiswahili
              </h2>
              <p className="text-xl text-stone-700">{entry.kiswahili}</p>
            </div>
          )}

          {examples.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2">
                Examples
              </h2>
              <ul className="space-y-2">
                {examples.map((ex: any, i: number) => (
                  <li
                    key={i}
                    className="p-3 bg-stone-50 rounded-lg border-l-4 border-amber-400"
                  >
                    <p className="text-stone-800 font-medium">{ex.dholuo}</p>
                    <p className="text-sm text-stone-500">{ex.english}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.synonyms.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2">
                Synonyms
              </h2>
              <div className="flex flex-wrap gap-2">
                {entry.synonyms.map((s, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {entry.antonyms.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2">
                Antonyms
              </h2>
              <div className="flex flex-wrap gap-2">
                {entry.antonyms.map((a, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {entry.wordOrigin && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                Origin
              </h2>
              <p className="text-stone-600 italic">{entry.wordOrigin}</p>
            </div>
          )}
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-serif text-stone-700 mb-4">
            Related words
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/${language.code}/muma/${r.id}`}
                className="block p-4 bg-white rounded-lg border border-stone-100 hover:border-amber-300 hover:shadow transition"
              >
                <p className="font-serif text-lg text-stone-800">
                  {r.dholuo}
                </p>
                <p className="text-sm text-stone-500">{r.english}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}