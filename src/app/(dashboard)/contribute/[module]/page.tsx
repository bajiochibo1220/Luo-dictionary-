import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DynamicContentForm } from "@/components/admin/dynamic-content-form";
import { BackLink } from "@/components/layout/back-link";

export default async function ContributePage({
  params,
}: {
  params: { module: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const languageRoles = (user.languageRoles ?? []) as any[];
  const primaryRole = languageRoles[0];

  if (!primaryRole && !user.isSuperAdmin) {
    return (
      <div className="p-6 md:p-10 pt-20 md:pt-10">
        <BackLink href="/contribute" label="Back" variant="on-sand" />
        <p className="mt-6 font-serif text-xl text-stone-900">
          You are not assigned to a language yet.
        </p>
      </div>
    );
  }

  const mod = await prisma.module.findUnique({
    where: { code: params.module },
  });
  if (!mod) notFound();

  let languageId: number;
  let languageName: string;

  if (user.isSuperAdmin && !primaryRole) {
    const first = await prisma.language.findFirst({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
    if (!first) notFound();
    languageId = first.id;
    languageName = first.nativeName;
  } else {
    const lang = await prisma.language.findUnique({
      where: { id: primaryRole.languageId },
    });
    if (!lang) notFound();
    languageId = lang.id;
    languageName = lang.nativeName;
  }

  const modTranslation = await prisma.moduleTranslation.findFirst({
    where: { moduleId: mod.id, languageId },
  });
  const translatedTitle = modTranslation?.title ?? mod.baseName;

  const fieldDefs = await prisma.fieldDefinition.findMany({
    where: { moduleId: mod.id },
    orderBy: { displayOrder: "asc" },
    include: { translations: { where: { languageId } } },
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
    <div className="p-6 md:p-10 pt-20 md:pt-10 max-w-4xl">
      <div className="mb-4">
        <BackLink href="/contribute" label="Back to contributions" variant="on-sand" />
      </div>

      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-800/60 font-semibold mb-1">
          {languageName} · Contribute
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 mb-2 leading-tight">
          Add to {translatedTitle}
        </h1>
        <p className="text-sm text-stone-800/70 leading-relaxed max-w-2xl">
          Fill in what you know. Required fields are marked with *. You can
          save as draft and come back later, or submit for review when ready.
        </p>
      </header>

      {formatted.length === 0 ? (
        <div className="py-16 text-center max-w-xl mx-auto">
          <p className="font-serif text-2xl text-stone-900 mb-2">
            This module has no fields yet
          </p>
          <p className="text-sm text-stone-800/70">
            Contact an administrator.
          </p>
        </div>
      ) : (
        <DynamicContentForm
          moduleCode={mod.code}
          languageId={languageId}
          languageName={languageName}
          fieldDefs={formatted}
        />
      )}
    </div>
  );
}