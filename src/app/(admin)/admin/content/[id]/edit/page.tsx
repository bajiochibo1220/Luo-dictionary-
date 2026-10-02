import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DynamicContentForm } from "@/components/admin/dynamic-content-form";
import { canEditContent, canUploadContent } from "@/lib/permissions";
import { canReviewGovernedItem } from "@/lib/governance";

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
    include: { module: true, language: true, provenance: { orderBy: { createdAt: "desc" } }, media: { select: { id: true, languageId: true, type: true, url: true, format: true, caption: true, consentScope: true, restrictionLevel: true } } },
  });
  if (!record) notFound();
  if (!["needs_edit", "draft", "rejected", "curated"].includes(record.status)) notFound();
  const currentUser = session?.user as any;
  if ((!canEditContent(session, record.languageId) && !canUploadContent(session, record.languageId)) || !canReviewGovernedItem(
    { isSuperAdmin: currentUser?.isSuperAdmin, languageRoles: currentUser?.languageRoles ?? [] },
    record,
    record.languageId
  )) notFound();

  const languageId = Number(searchParams.languageId) || record.languageId;
  const editingTranslation = languageId !== record.languageId;
  const [language, translation] = await Promise.all([
    editingTranslation ? prisma.language.findUnique({ where: { id: languageId } }) : Promise.resolve(record.language),
    editingTranslation ? prisma.culturalRecordTranslation.findUnique({ where: { recordId_languageId: { recordId: record.id, languageId } } }) : Promise.resolve(null),
  ]);
  if (!language || (editingTranslation && (!translation || (!canEditContent(session, record.languageId) && !canUploadContent(session, record.languageId))))) notFound();

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
    __title: editingTranslation ? translation?.title ?? "" : record.title,
    consentScope: record.consentScope,
    restrictionLevel: record.restrictionLevel,
    embargoUntil: record.embargoUntil?.toISOString() ?? null,
    countyCode: record.countyCode,
    siteName: record.siteName,
    sourceReference: record.sourceReference,
    sessionId: record.sessionId,
    __provenance: record.provenance[0] ?? null,
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
        isAdmin={editingTranslation || canEditContent(session, record.languageId)}
        isTranslation={editingTranslation}
        fieldDefs={formatted}
        initialData={initialData}
        recordId={record.id}
        redirectTo="/admin/content"
        existingMedia={record.media.filter((asset) => canReviewGovernedItem(
          { isSuperAdmin: currentUser?.isSuperAdmin, languageRoles: currentUser?.languageRoles ?? [] },
          asset,
          asset.languageId
        ))}
      />
    </div>
  );
}
