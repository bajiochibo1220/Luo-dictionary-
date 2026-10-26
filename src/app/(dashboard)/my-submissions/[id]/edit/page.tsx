import { InterfaceText } from "@/components/shared/interface-language";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DynamicContentForm } from "@/components/admin/dynamic-content-form";
import { canEditContent, canUploadContent } from "@/lib/permissions";
import { canReviewGovernedItem } from "@/lib/governance";

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
  if (!currentUser?.id || record.contributorId !== currentUser.id) notFound();

  const languageId = Number(searchParams.languageId) || record.languageId;
  const editingTranslation = languageId !== record.languageId;
  const [language, translation] = await Promise.all([
    editingTranslation ? prisma.language.findUnique({ where: { id: languageId } }) : Promise.resolve(record.language),
    editingTranslation ? prisma.culturalRecordTranslation.findUnique({ where: { recordId_languageId: { recordId: record.id, languageId } } }) : Promise.resolve(null),
  ]);
  if (!language || (editingTranslation && !translation)) notFound();

  const translations = await prisma.culturalRecordTranslation.findMany({ where: { recordId: record.id }, include: { language: true } });
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
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1"><InterfaceText source="Edit " />{record.module.baseName}
        </h1>
        <p className="text-sm text-stone-500">
          {language.nativeName}<InterfaceText source={editingTranslation ? " translation" : ""} /><InterfaceText source=" · Status: " />{record.status}
        </p>
      </header>

      <nav className="flex gap-4 mb-6">
        <Link href={`/my-submissions/${record.id}/edit`}><InterfaceText source="Edit " />{record.language.nativeName}</Link>
        {translations.map(item => <Link key={item.id} href={`/my-submissions/${record.id}/edit?languageId=${item.languageId}`}><InterfaceText source="Edit " />{item.language.nativeName}</Link>)}
      </nav>
      <DynamicContentForm
        moduleCode={record.module.code}
        languageId={languageId}
        languageName={language.nativeName}
        languageCode={language.code}
        isAdmin={false}
        isTranslation={editingTranslation}
        fieldDefs={formatted}
        initialData={initialData}
        recordId={record.id}
        redirectTo="/my-submissions"
        existingMedia={record.media}
      />
    </div>
  );
}
