import { InterfaceText } from "@/components/shared/interface-language";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DynamicContentForm } from "@/components/admin/dynamic-content-form";
import { canEditContent, canUploadContent } from "@/lib/permissions";
import { canReviewGovernedItem } from "@/lib/governance";
import Link from "next/link";

export default async function EditContentPage({
  params: promisedParams,
  searchParams: promisedSearchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ languageId?: string }>;
}) {
  const params = await promisedParams;
  const searchParams = await promisedSearchParams;
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
  if (!language || (editingTranslation && (!canEditContent(session, record.languageId) && !canUploadContent(session, record.languageId)))) notFound();
  const englishLanguage = await prisma.language.findUnique({ where: { code: "eng" } });
  const pairedTranslation = englishLanguage ? await prisma.culturalRecordTranslation.findUnique({ where: { recordId_languageId: { recordId: record.id, languageId: englishLanguage.id } } }) : null;
  const pairedEditing = !editingTranslation && record.language.code !== "eng" && !!englishLanguage && canEditContent(session, record.languageId);

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
    label: f.baseLabel,
  }));

  const initialData = {
    ...(((editingTranslation ? translation?.data : record.data) as any) ?? {}),
    ...(editingTranslation && translation?.summary ? { description: translation.summary } : {}),
    __tags: record.tags,
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
      <header className="workspace-heading mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1"><InterfaceText source="Edit " />{record.module.baseName}
        </h1>
        <p className="text-sm text-stone-500">
          {language.nativeName}<InterfaceText source={editingTranslation ? " translation" : ""} /><InterfaceText source=" · Status: " />{record.status}
        </p>
      </header>

      {pairedEditing && <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm"><InterfaceText source="Edit and save both versions below, then return to review to send for publishing." /></p>}
      <div className={pairedEditing ? "grid items-start gap-5 xl:grid-cols-2" : ""}>
      <section><h2 className="mb-3 font-semibold">{language.nativeName}</h2><DynamicContentForm
        stayOnPage={pairedEditing}
        moduleCode={record.module.code}
        languageId={languageId}
        languageName={language.nativeName}
        languageCode={language.code}
        isAdmin={editingTranslation || canEditContent(session, record.languageId)}
        isTranslation={editingTranslation}
        fieldDefs={formatted}
        initialData={initialData}
        recordId={record.id}
        redirectTo={canEditContent(session, record.languageId) ? `/admin/validation-queue/${record.id}` : "/admin/content"}
        existingMedia={record.media.filter((asset) => canReviewGovernedItem(
          { isSuperAdmin: currentUser?.isSuperAdmin, languageRoles: currentUser?.languageRoles ?? [] },
          asset,
          asset.languageId
        ))}
      /></section>
      {pairedEditing && englishLanguage && <section><h2 className="mb-3 font-semibold"><InterfaceText source="English version" /></h2><DynamicContentForm
        stayOnPage
        moduleCode={record.module.code}
        languageId={englishLanguage.id}
        languageName={englishLanguage.nativeName}
        languageCode={englishLanguage.code}
        isAdmin
        isTranslation
        fieldDefs={formatted.map(field => ({ ...field, label: field.baseLabel }))}
        initialData={{ ...((pairedTranslation?.data as any) ?? {}), __title: pairedTranslation?.title ?? "" }}
        recordId={record.id}
        redirectTo={`/admin/validation-queue/${record.id}`}
      /></section>}
      </div>
      {pairedEditing && <Link href={`/admin/validation-queue/${record.id}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-amber-900 px-5 text-white"><InterfaceText source="Continue to review & publishing" /></Link>}
    </div>
  );
}
