import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function ProverbDetailPage({
  params,
}: {
  params: { lang: string; id: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language) notFound();

  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id, languageId: language.id, status: "published", module: { code: "proverbs" } },
    include: { media: true },
  });
  if (!record) notFound();

  const d = record.data as any;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/${language.code}/ngero`}
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      >
        ← Back to Proverbs
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 md:p-12">
        {/* Original */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-3">
            Original
          </p>
          <p className="text-3xl md:text-4xl font-serif text-stone-800 leading-snug">
            &ldquo;{d.original_text || record.title}&rdquo;
          </p>
        </div>

        {/* Translation */}
        <div className="mb-8 pb-8 border-b border-stone-100">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">
            Translation
          </p>
          <p className="text-xl text-stone-600 italic">{d.translation || d.description || d.transcript || ""}</p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2">
              Meaning
            </h2>
            <p className="text-lg text-stone-800">{d.meaning || d.description || ""}</p>
          </div>

          {d.interpretation && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2">
                Interpretation
              </h2>
              <p className="text-stone-700">{d.interpretation}</p>
            </div>
          )}

          {d.context && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2">
                Context
              </h2>
              <p className="text-stone-700">{d.context}</p>
            </div>
          )}

          {d.usage && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2">
                Usage
              </h2>
              <p className="text-stone-700">{d.usage}</p>
            </div>
          )}

          {record.tags.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-2">
                Themes
              </h2>
              <div className="flex flex-wrap gap-2">
                {record.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-3 py-1 bg-amber-50 text-amber-700 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {record.media.map((item) => <div key={item.id} className="my-5 rounded-xl bg-white border border-stone-100 p-5">
        {item.type === "image" ? <img src={item.url} alt={record.title} className="max-h-[32rem] w-full object-contain" /> :
          item.type === "video" ? <video src={item.url} poster={item.thumbnailUrl ?? undefined} controls className="max-h-[32rem] w-full bg-stone-950" /> :
          item.type === "audio" ? <audio src={item.url} controls className="w-full" /> :
          <a href={item.url} target="_blank" rel="noreferrer" className="text-amber-800 underline">Open transcript or document</a>}
      </div>)}
    </div>
  );
}
