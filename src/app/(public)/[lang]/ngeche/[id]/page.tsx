import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { findLocalizedRecord } from "@/lib/content-translations";
import { EnglishVersionLink } from "@/components/layout/english-version-link";

export default async function RiddleDetailPage({
  params,
}: {
  params: { lang: string; id: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language) notFound();

  const record = await findLocalizedRecord(params.id, language.id, "riddles");
  if (!record) notFound();

  const d = record.data as any;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/${language.code}/ngeche`}
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      >
        ← Back to Riddles
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 md:p-12">
        <EnglishVersionLink langCode={language.code} href={`/${language.code}/ngeche/${record.id}`} />
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-3">
            Riddle
          </p>
          <p className="text-3xl font-serif text-stone-800 leading-snug mb-3">
            {d.question}
          </p>
          {d.translation && (
            <p className="text-stone-500 italic">{d.translation}</p>
          )}
        </div>

        <div className="mb-8 pb-8 border-b border-stone-100">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">
            Answer
          </p>
          <p className="text-3xl font-serif text-amber-700 mb-1">
            {d.answer}
          </p>
          {d.answer_translation && (
            <p className="text-stone-500">{d.answer_translation}</p>
          )}
        </div>

        {d.context && (
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">
              Context
            </p>
            <p className="text-stone-700">{d.context}</p>
          </div>
        )}

        {record.tags.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">
              Themes
            </p>
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

      <div className="mt-8 text-center">
        <Link
          href={`/${language.code}/ngeche/quiz`}
          className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm uppercase tracking-wider font-medium"
        >
          Play Quiz
        </Link>
      </div>
    </div>
  );
}
