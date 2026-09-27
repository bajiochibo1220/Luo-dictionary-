import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LanguageDetailActions } from "@/components/admin/language-detail-actions";

export default async function LanguageDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!id) notFound();

  const language = await prisma.language.findUnique({
    where: { id },
    include: {
      userRoles: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
  if (!language) notFound();

  const [recordCount, mediaCount, translationCount] = await Promise.all([
    prisma.culturalRecord.count({ where: { languageId: id } }),
    prisma.mediaAsset.count({ where: { languageId: id } }),
    prisma.moduleTranslation.count({ where: { languageId: id } }),
  ]);

  return (
    <div>
      <header className="mb-8">
        <Link
          href="/super-admin/languages"
          className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-3"
        >
          ← Back to languages
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{language.flagIcon || "🌍"}</span>
            <div>
              <h1 className="text-3xl font-serif text-stone-800">
                {language.nativeName}
              </h1>
              <p className="text-sm text-stone-500">
                {language.name} · code: {language.code}
              </p>
              {language.isActive ? (
                <span className="inline-block text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full mt-2">
                  Active
                </span>
              ) : (
                <span className="inline-block text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full mt-2">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
            Records
          </p>
          <p className="text-2xl font-serif text-stone-800">{recordCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
            Media Files
          </p>
          <p className="text-2xl font-serif text-stone-800">{mediaCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
            Module Titles
          </p>
          <p className="text-2xl font-serif text-stone-800">
            {translationCount}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
            Admins
          </p>
          <p className="text-2xl font-serif text-stone-800">
            {language.userRoles.length}
          </p>
        </div>
      </div>

      <LanguageDetailActions
        language={{
          id: language.id,
          code: language.code,
          name: language.name,
          nativeName: language.nativeName,
          isActive: language.isActive,
          recordCount,
        }}
      />

      {language.userRoles.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-stone-100 p-6">
          <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
            Assigned Admins
          </h2>
          <ul className="space-y-2">
            {language.userRoles.map((r) => (
              <li key={r.id} className="text-sm flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm">
                  {(r.user.name || r.user.email).charAt(0).toUpperCase()}
                </span>
                <span className="text-stone-700">
                  {r.user.name || r.user.email}
                </span>
                <span className="text-xs text-stone-400">{r.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}