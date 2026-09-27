import Link from "next/link";
import { prisma } from "@/lib/db";
import { LanguageWizard } from "@/components/admin/language-wizard";

export default async function NewLanguagePage() {
  const modules = await prisma.module.findMany({
    orderBy: { displayOrder: "asc" },
    select: { id: true, code: true, baseName: true },
  });

  return (
    <div>
      <header className="mb-6 max-w-2xl mx-auto">
        <Link
          href="/super-admin/languages"
          className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-3"
        >
          ← Back to languages
        </Link>
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          Add a New Language
        </h1>
        <p className="text-sm text-stone-500">
          The platform will replicate all {modules.length} modules and
          translations for the new language.
        </p>
      </header>

      <LanguageWizard modules={modules} />
    </div>
  );
}