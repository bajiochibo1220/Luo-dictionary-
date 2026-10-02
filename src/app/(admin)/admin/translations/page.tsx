import Link from "next/link";
import { prisma } from "@/lib/db";
import { TranslationEditor } from "@/components/admin/translation-editor";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function TranslationsPage({
  searchParams,
}: {
  searchParams: { lang?: string; module?: string; tab?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isSuperAdmin && !session.user.isMasterSuperAdmin && !(session.user.languageRoles ?? []).some((role: any) => role.role === "language_admin")) redirect("/admin/dashboard");
  const tab = searchParams.tab === "fields" ? "fields" : "modules";

  const languages = await prisma.language.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  const langCode = searchParams.lang || languages[0]?.code;
  const language = languages.find((l) => l.code === langCode) || languages[0];

  const modules = await prisma.module.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      translations: { where: { languageId: language?.id ?? -1 } },
    },
  });

  const moduleCode = searchParams.module || "proverbs";
  const selectedModule = modules.find((m) => m.code === moduleCode);

  const fieldDefs = selectedModule
    ? await prisma.fieldDefinition.findMany({
        where: { moduleId: selectedModule.id },
        orderBy: { displayOrder: "asc" },
        include: {
          translations: { where: { languageId: language?.id ?? -1 } },
        },
      })
    : [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          Translations
        </h1>
        <p className="text-sm text-stone-500">
          Edit module titles and field labels for each language. Changes apply
          live on the public site.
        </p>
      </header>

      {/* Language selector */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">
          Language
        </p>
        <div className="flex flex-wrap gap-2">
          {languages.map((l) => (
            <Link
              key={l.code}
              href={`/admin/translations?lang=${l.code}&tab=${tab}${
                tab === "fields" ? `&module=${moduleCode}` : ""
              }`}
              className={`text-sm px-4 py-1.5 rounded-full transition ${
                language?.code === l.code
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
              }`}
            >
              {l.nativeName}
            </Link>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-stone-200">
        <div className="flex gap-4">
          <Link
            href={`/admin/translations?lang=${langCode}&tab=modules`}
            className={`pb-3 text-sm uppercase tracking-wider transition ${
              tab === "modules"
                ? "text-amber-600 border-b-2 border-amber-600 font-medium"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Module Titles
          </Link>
          <Link
            href={`/admin/translations?lang=${langCode}&tab=fields&module=${moduleCode}`}
            className={`pb-3 text-sm uppercase tracking-wider transition ${
              tab === "fields"
                ? "text-amber-600 border-b-2 border-amber-600 font-medium"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Field Labels
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
        {!language ? (
          <p className="text-center text-stone-400 py-8">
            No active languages
          </p>
        ) : tab === "modules" ? (
          <>
            <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
              Module Titles in {language.nativeName}
            </h2>
            {modules.map((m) => {
              const t = m.translations[0];
              return (
                <TranslationEditor
                  key={m.id}
                  id={m.id}
                  languageId={language.id}
                  endpoint="modules"
                  initialValue={t?.title ?? m.baseName}
                  label={m.baseName}
                  hint={m.isStub ? "Stub (Phase 2)" : undefined}
                />
              );
            })}
          </>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">
                Module
              </p>
              <div className="flex flex-wrap gap-2">
                {modules.map((m) => (
                  <Link
                    key={m.code}
                    href={`/admin/translations?lang=${langCode}&tab=fields&module=${m.code}`}
                    className={`text-xs px-3 py-1 rounded-full transition ${
                      m.code === moduleCode
                        ? "bg-amber-600 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-amber-100"
                    }`}
                  >
                    {m.baseName}
                  </Link>
                ))}
              </div>
            </div>

            <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
              Field Labels for {selectedModule?.baseName} in{" "}
              {language.nativeName}
            </h2>

            {fieldDefs.length === 0 ? (
              <p className="text-center text-stone-400 py-8">
                No fields defined for this module
              </p>
            ) : (
              fieldDefs.map((f) => {
                const t = f.translations[0];
                return (
                  <TranslationEditor
                    key={f.id}
                    id={f.id}
                    languageId={language.id}
                    endpoint="fields"
                    initialValue={t?.label ?? f.baseLabel}
                    label={f.baseLabel}
                    hint={f.fieldCode}
                  />
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
