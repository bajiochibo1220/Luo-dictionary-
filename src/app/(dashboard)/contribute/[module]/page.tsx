import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DynamicContentForm } from "@/components/admin/dynamic-content-form";

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
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
        <p className="text-stone-600">
          You are not assigned to a language yet.
        </p>
        <p className="text-sm text-stone-400 mt-2">
          Contact an administrator to be added as a contributor.
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
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      >
        ← Back to dashboard
      </Link>

      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          Contribute to {mod.baseName}
        </h1>
        <p className="text-sm text-stone-500">
          Language: {languageName}
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