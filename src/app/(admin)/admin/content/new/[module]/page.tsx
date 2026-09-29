import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DynamicContentForm } from "@/components/admin/dynamic-content-form";
import { canReviewContent } from "@/lib/permissions";
import { BulkMediaUploader } from "@/components/admin/bulk-media-uploader";
import { getSelectedAdminCultureId } from "@/lib/admin-language";

export default async function NewContentPage({
  params,
  searchParams,
}: {
  params: { module: string };
  searchParams: { languageId?: string };
}) {
  const session = await auth();
  const user = session!.user as any;

  const mod = await prisma.module.findUnique({
    where: { code: params.module },
  });
  if (!mod) notFound();

  const adminRoles = (user.languageRoles ?? []).filter((role: any) =>
    ["language_admin", "moderator", "content_editor", "cultural_expert"].includes(role.role)
  );
  const allowedLanguageIds = adminRoles.map((role: any) => role.languageId);
  const selectedAdminLanguageId = user.isSuperAdmin ? await getSelectedAdminCultureId() : undefined;
  const languages = await prisma.language.findMany({
    where: user.isSuperAdmin ? {} : { isActive: true, id: { in: allowedLanguageIds } },
    orderBy: { displayOrder: "asc" },
    select: { id: true, code: true, name: true, nativeName: true },
  });
  const requestedLanguageId = Number(searchParams.languageId) || selectedAdminLanguageId;
  const selectedLanguage = languages.find((language) => language.id === requestedLanguageId) ?? languages[0];
  if (!selectedLanguage) notFound();
  const languageId = selectedLanguage.id;

  // Load field definitions + translations for this module + language
  const fieldDefs = await prisma.fieldDefinition.findMany({
    where: { moduleId: mod.id },
    orderBy: { displayOrder: "asc" },
    include: {
      translations: {
        where: { languageId },
      },
    },
  });

  const formatted = fieldDefs.map((f) => ({
    id: f.id,
    fieldCode: f.fieldCode,
    baseLabel: f.baseLabel,
    fieldType: f.fieldType,
    isRequired: f.isRequired,
    displayOrder: f.displayOrder,
    label: f.translations[0]?.label || f.baseLabel,
  }));

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          New {mod.baseName}
        </h1>
        <p className="text-sm text-stone-500">Adding content in {selectedLanguage.nativeName}</p>
      </header>

      {languages.length > 1 && <nav aria-label="Content language" className="mb-6 flex flex-wrap gap-2">
        {languages.map((language) => <a key={language.id} href={`/admin/content/new/${mod.code}?languageId=${language.id}`}
          aria-current={language.id === languageId ? "page" : undefined}
          className={`rounded-full border px-4 py-2 text-sm ${language.id === languageId ? "border-amber-800 bg-amber-800 text-white" : "border-stone-300 bg-white text-stone-700"}`}>
          {language.nativeName}
        </a>)}
      </nav>}

      {canReviewContent(session, languageId) && (
        <BulkMediaUploader
          moduleCode={mod.code}
          moduleName={mod.baseName}
          languageId={languageId}
          languageCode={selectedLanguage.code}
        />
      )}

      <DynamicContentForm
        moduleCode={mod.code}
        languageId={languageId}
        languageName={selectedLanguage.nativeName}
        languageCode={selectedLanguage.code}
        fieldDefs={formatted}
        isAdmin={canReviewContent(session, languageId)}
      />
    </div>
  );
}
