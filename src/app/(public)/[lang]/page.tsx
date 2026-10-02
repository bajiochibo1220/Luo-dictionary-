import Link from "next/link";
import { publicRecordWhere } from "@/lib/governance";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getContentCultureLanguageId, localizeRecord } from "@/lib/content-translations";

const MODULE_PATHS: Record<string, string> = {
  dictionary: "muma",
  proverbs: "ngero",
  riddles: "ngeche",
  oral_histories: "sigana",
  folktales: "sigana/folktales",
  songs: "wende",
  artifacts: "gik-luo",
  heritage_sites: "piny-luo",
  chatbot: "/chatbot",
};

export default async function LanguageHomePage({
  params,
}: {
  params: { lang: string };
}) {
  const language = await prisma.language.findUnique({
    where: { code: params.lang },
    include: {
      moduleTranslations: {
        include: { module: true },
      },
    },
  });

  if (!language || !language.isActive) {
    notFound();
  }
  const cultureLanguageId = await getContentCultureLanguageId(language.id);

  // Greeting per language
  const greetings: Record<string, string> = {
    luo: "Misawa!",
    eng: "Welcome!",
    kik: "Wĩ mwega!",
  };
  const greeting = greetings[language.code] || "Welcome!";

  // Fetch module list ordered
  const modules = await prisma.module.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  const titleMap: Record<string, string> = {};
  for (const mt of language.moduleTranslations) {
    titleMap[mt.module.code] = mt.title;
  }

  // Featured content — first 3 published records
  const featured = await prisma.culturalRecord.findMany({
    where: { languageId: cultureLanguageId, ...publicRecordWhere() },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: { module: true, translations: { where: { languageId: language.id } } },
  });
  const localizedFeatured = featured.map((record) => localizeRecord(record, language.id));

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mb-2">
          {greeting}
        </h1>
        <p className="text-stone-600">
          Explore {language.nativeName} language and culture
        </p>
      </div>

      {/* Module grid */}
      <section className="mb-16">
        <h2 className="text-2xl font-serif text-stone-700 mb-6">
          Explore
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((mod) => {
            const modulePath = MODULE_PATHS[mod.code];
            const isStub = mod.isStub || !modulePath;
            const href = !modulePath
              ? "#"
              : modulePath.startsWith("/")
              ? modulePath
              : `/${language.code}/${modulePath}`;
            const title = titleMap[mod.code] || mod.baseName;

            return (
              <Link
                key={mod.id}
                href={href}
                className={`group block p-6 bg-white rounded-xl shadow hover:shadow-lg transition border border-stone-100 hover:border-amber-300 ${
                  isStub ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-serif text-stone-800 group-hover:text-amber-700 transition">
                    {title}
                  </h3>
                  {isStub && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500">{mod.baseName}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured content */}
      {featured.length > 0 && (
        <section className="mb-16">
          <h2 className="text-2xl font-serif text-stone-700 mb-6">
            Featured
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {localizedFeatured.map((rec) => (
              <div
                key={rec.id}
                className="p-6 bg-white rounded-xl shadow border border-stone-100"
              >
                <span className="text-xs uppercase text-amber-600 font-medium">
                  {titleMap[rec.module.code] || rec.module.baseName}
                </span>
                <h3 className="text-lg font-serif text-stone-800 mt-1 line-clamp-2">
                  {rec.title}
                </h3>
                {rec.summary && (
                  <p className="text-sm text-stone-500 mt-2 line-clamp-3">
                    {rec.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
