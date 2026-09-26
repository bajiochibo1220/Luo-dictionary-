import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DynamicContentForm } from "@/components/admin/dynamic-content-form";

export default async function NewContentPage({
  params,
}: {
  params: { module: string };
}) {
  const session = await auth();
  const user = session!.user as any;

  const mod = await prisma.module.findUnique({
    where: { code: params.module },
  });
  if (!mod) notFound();

  // Pick language: first from user roles, else super admin uses first active language
  let languageId: number | null = null;
  let languageName = "";

  if (user.isSuperAdmin) {
    const first = await prisma.language.findFirst({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
    if (first) {
      languageId = first.id;
      languageName = first.nativeName;
    }
  } else {
    const role = ((user.languageRoles ?? []) as any[]).find((r) =>
      ["language_admin", "moderator", "content_editor", "contributor", "elder"].includes(r.role)
    );
    if (role) {
      const lang = await prisma.language.findUnique({
        where: { id: role.languageId },
      });
      if (lang) {
        languageId = lang.id;
        languageName = lang.nativeName;
      }
    }
  }

  if (!languageId) notFound();

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
        <p className="text-sm text-stone-500">
          Adding content in {languageName}
        </p>
      </header>

      <DynamicContentForm
        moduleCode={mod.code}
        languageId={languageId}
        languageName={languageName}
        fieldDefs={formatted}
      />
    </div>
  );
}