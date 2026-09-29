import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DynamicContentForm } from "@/components/admin/dynamic-content-form";
import { canReviewContent } from "@/lib/permissions";

export default async function EditContentPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { languageId?: string };
}) {
  const session = await auth();
  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
    include: { module: true, language: true },
  });
  if (!record) notFound();

  const languageId = Number(searchParams.languageId) || record.languageId;
  const editingTranslation = languageId !== record.languageId;
  const [language, translation] = await Promise.all([
    editingTranslation ? prisma.language.findUnique({ where: { id: languageId } }) : Promise.resolve(record.language),
    editingTranslation ? prisma.culturalRecordTranslation.findUnique({ where: { recordId_languageId: { recordId: record.id, languageId } } }) : Promise.resolve(null),
  ]);
  if (!language || (editingTranslation && (!translation || !canReviewContent(session, languageId)))) notFound();

  const fieldDefs = await prisma.fieldDefinition.findMany({
    where: { moduleId: record.moduleId },
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

  const initialData = {
    ...(((editingTranslation ? translation?.data : record.data) as any) ?? {}),
    ...(editingTranslation && translation?.summary ? { description: translation.summary } : {}),
    __title: record.title,
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          Edit {record.module.baseName}
        </h1>
        <p className="text-sm text-stone-500">
          {language.nativeName}{editingTranslation ? " translation" : ""} · Status: {record.status}
        </p>
      </header>

      <DynamicContentForm
        moduleCode={record.module.code}
        languageId={languageId}
        languageName={language.nativeName}
        languageCode={language.code}
        isAdmin={editingTranslation || canReviewContent(session, record.languageId)}
        isTranslation={editingTranslation}
        fieldDefs={formatted}
        initialData={initialData}
        recordId={record.id}
      />
    </div>
  );
}
