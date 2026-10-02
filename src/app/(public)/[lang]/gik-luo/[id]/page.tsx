import Link from "next/link";
import { publicRecordWhere, publicMediaWhere } from "@/lib/governance";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { findLocalizedRecord, getContentCultureLanguageId } from "@/lib/content-translations";
import { EnglishVersionLink } from "@/components/layout/english-version-link";

export default async function ArtifactDetailPage({
  params,
}: {
  params: { lang: string; id: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
  });
  if (!language) notFound();
  const cultureLanguageId = await getContentCultureLanguageId(language.id);

  const record = await findLocalizedRecord(params.id, language.id, "artifacts", cultureLanguageId);
  if (!record) notFound();

  const d = record.data as any;
  const image = record.media.find((m) => m.type === "image");

  const related = await prisma.culturalRecord.findMany({
    where: {
      languageId: cultureLanguageId,
      moduleId: record.moduleId,
      ...publicRecordWhere(),
      id: { not: record.id },
    },
    take: 3,
    include: { media: { where: publicMediaWhere() }, translations: { where: { languageId: language.id } } },
  });
  const localizedRelated = related.map((item) => ({ ...item, data: item.languageId === language.id ? item.data : item.translations[0]?.data ?? {}, summary: item.languageId === language.id ? item.summary : item.translations[0]?.summary ?? null }));

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/${language.code}/gik-luo`}
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      >
        ← Back to Artifacts
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="md:col-span-2"><EnglishVersionLink langCode={language.code} href={`/${language.code}/gik-luo/${record.id}`} /></div>
        {/* Image */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          {image ? (
            <img
              src={image.url}
              alt={record.title}
              className="w-full aspect-square object-cover"
            />
          ) : (
            <div className="w-full aspect-square bg-stone-100 flex items-center justify-center">
              <span className="text-7xl text-stone-300">🏺</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <span className="text-xs uppercase tracking-wider text-amber-600">
            Artifact
          </span>
          <h1 className="text-4xl font-serif text-stone-800 mt-2 mb-6">
            {record.title}
          </h1>

          <dl className="space-y-4">
            {d.description && (
              <div>
                <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                  Description
                </dt>
                <dd className="text-stone-700 leading-relaxed">
                  {d.description}
                </dd>
              </div>
            )}

            {d.origin && (
              <div>
                <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                  Origin
                </dt>
                <dd className="text-stone-700">{d.origin}</dd>
              </div>
            )}

            {d.clan && (
              <div>
                <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                  Clan
                </dt>
                <dd className="text-stone-700">{d.clan}</dd>
              </div>
            )}

            {d.usage && (
              <div>
                <dt className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                  Usage
                </dt>
                <dd className="text-stone-700">{d.usage}</dd>
              </div>
            )}
          </dl>

          {record.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {record.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-3 py-1 bg-amber-50 text-amber-700 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {record.media.filter((item) => item.type !== "image").map((item) => (
        <section key={item.id} className="mb-6 bg-white rounded-xl border border-stone-100 p-5">
          {item.type === "video" ? <video src={item.url} poster={item.thumbnailUrl ?? undefined} controls className="w-full max-h-[32rem] rounded-lg bg-stone-950" /> :
            item.type === "audio" ? <audio src={item.url} controls className="w-full" /> :
            <a href={item.url} target="_blank" rel="noreferrer" className="text-amber-800 underline">Open transcript or document</a>}
        </section>
      ))}

      {related.length > 0 && (
        <section>
          <h2 className="text-xl font-serif text-stone-700 mb-4">
            Related Artifacts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {localizedRelated.map((r) => {
              const img = r.media.find((m) => m.type === "image");
              return (
                <Link
                  key={r.id}
                  href={`/${language.code}/gik-luo/${r.id}`}
                  className="group bg-white rounded-lg border border-stone-100 hover:border-amber-300 hover:shadow transition overflow-hidden"
                >
                  <div className="aspect-square bg-stone-100 flex items-center justify-center">
                    {img ? (
                      <img
                        src={img.thumbnailUrl || img.url}
                        alt={r.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <span className="text-4xl text-stone-300">🏺</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-serif text-stone-800 text-sm">
                      {r.title}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
