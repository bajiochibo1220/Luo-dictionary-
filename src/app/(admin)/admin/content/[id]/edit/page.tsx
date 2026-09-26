import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DynamicContentForm } from "@/components/admin/dynamic-content-form";

export default async function EditContentPage({
  params,
}: {
  params: { id: string };
}) {
  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
    include: { module: true, language: true },
  });
  if (!record) notFound();

  const fieldDefs = await prisma.fieldDefinition.findMany({
    where: { moduleId: record.moduleId },
    orderBy: { displayOrder: "asc" },
    include: {
      translations: {
        where: { languageId: record.languageId },
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

  const initialData = {
    ...((record.data as any) ?? {}),
    __title: record.title,
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          Edit {record.module.baseName}
        </h1>
        <p className="text-sm text-stone-500">
          {record.language.nativeName} · Status: {record.status}
        </p>
      </header>

      <DynamicContentForm
        moduleCode={record.module.code}
        languageId={record.languageId}
        languageName={record.language.nativeName}
        fieldDefs={formatted}
        initialData={initialData}
        recordId={record.id}
      />
    </div>
  );
}