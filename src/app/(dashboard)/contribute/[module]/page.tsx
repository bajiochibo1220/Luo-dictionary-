import { InterfaceText } from "@/components/shared/interface-language";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DynamicContentForm } from "@/components/admin/dynamic-content-form";
import { BackLink } from "@/components/layout/back-link";

export default async function ContributePage({
  params: promisedParams,
}: {
  params: Promise<{ module: string }>;
}) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const languageRoles = (user.languageRoles ?? []) as any[];
  const primaryRole = languageRoles[0];

  const mod = await prisma.module.findUnique({
    where: { code: params.module, isActive: true, isStub: false },
  });
  if (!mod) notFound();

  let languageId: number;
  let languageName: string;
  let languageCode: string;

  if (!primaryRole) {
    const first = await prisma.language.findFirst({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }],
    });
    if (!first) notFound();
    languageId = first.id;
    languageName = first.nativeName;
    languageCode = first.code;
  } else {
    const lang = await prisma.language.findUnique({
      where: { id: primaryRole.languageId },
    });
    if (!lang) notFound();
    languageId = lang.id;
    languageName = lang.nativeName;
    languageCode = lang.code;
  }

  const [modTranslation, fieldDefs] = await Promise.all([
    prisma.moduleTranslation.findFirst({ where: { moduleId: mod.id, languageId } }),
    prisma.fieldDefinition.findMany({
      where: { moduleId: mod.id },
      orderBy: { displayOrder: "asc" },
      include: { translations: { where: { languageId } } },
    }),
  ]);
  const translatedTitle = modTranslation?.title ?? mod.baseName;

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
          {languageName}<InterfaceText source=" · Contribute" /></p>
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 mb-2 leading-tight"><InterfaceText source="Add to " />{translatedTitle}
        </h1>
        <p className="text-sm text-stone-800/70 leading-relaxed max-w-2xl"><InterfaceText source="Fill in what you know. Required fields are marked with *. You can save as draft and come back later, or submit for review when ready." /></p>
      </header>

      {formatted.length === 0 ? (
        <div className="py-16 text-center max-w-xl mx-auto">
          <p className="font-serif text-2xl text-stone-900 mb-2"><InterfaceText source="This module has no fields yet" /></p>
          <p className="text-sm text-stone-800/70"><InterfaceText source="Contact an administrator." /></p>
        </div>
      ) : (
        <DynamicContentForm
          moduleCode={mod.code}
          languageId={languageId}
          languageName={languageName}
          languageCode={languageCode}
          redirectTo="/my-submissions"
          fieldDefs={formatted}
          isElderContributor={primaryRole?.role === "elder"}
        />
      )}
    </div>
  );
}
