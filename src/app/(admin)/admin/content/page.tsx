import { InterfaceText } from "@/components/shared/interface-language";
import { canReadRecord } from "@/lib/governance";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContentTable } from "@/components/admin/content-table";
import { getSelectedAdminCultureId } from "@/lib/admin-language";
import { canDeleteContent, canEditContent, canFinalizeContent, canPublishBeforeReview, canReviewContent, canSendToFinalReview, canUploadContent, canValidateCulture } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { publicReleaseIssues } from "@/lib/public-release-readiness";

type SearchParams = { status?: string; module?: string; languageId?: string; page?: string };

export default async function ContentPage({ searchParams: promisedSearchParams }: { searchParams: Promise<SearchParams> }) {
  const searchParams = await promisedSearchParams;
  const requestedPage = Number(searchParams.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session!.user as any;
  const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  const isMasterSuperAdmin = !!user.isMasterSuperAdmin;
  const roles = (user.languageRoles ?? []) as any[];
  if (!isSuperAdmin && !roles.some((role) => ["language_admin", "uploader", "publisher", "content_editor"].includes(role.role))) redirect("/admin/dashboard");
  const uploaderOnly = !isSuperAdmin && roles.length > 0 && roles.every((role) => role.role === "uploader");
  const languageRoles = roles.filter((role) => ["language_admin", "uploader", "publisher", "content_editor"].includes(role.role));
  const managedLanguageIds = [...new Set(languageRoles.map((role) => role.languageId))];

  const modules = await prisma.module.findMany({ orderBy: { displayOrder: "asc" } });
  const englishLanguage = await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });
  const where: any = { publicationOfId: null };
  if (uploaderOnly) where.contributorId = user.id;
  else if (!isSuperAdmin) where.languageId = { in: managedLanguageIds };
  else if (searchParams.languageId && Number.isInteger(Number(searchParams.languageId))) where.languageId = Number(searchParams.languageId);

  if (searchParams.status) where.status = searchParams.status === "published" ? { in: ["published", "published_source"] } : searchParams.status;
  if (searchParams.module) {
    const contentModule = modules.find((item) => item.code === searchParams.module);
    if (contentModule) where.moduleId = contentModule.id;
  }

  const candidates = await prisma.culturalRecord.findMany({
    where,
    orderBy: [{ moduleId: "asc" }, { createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * 500,
    take: 501,
    include: {
      language: { select: { code: true, nativeName: true } },
      module: { select: { code: true, baseName: true } },
      publication: { select: { id: true, status: true, isProvisional: true } },
    },
  });
  const hasMore = candidates.length > 500;
  const records = candidates.slice(0, 500).filter((record) => canReadRecord(session!.user, record));

  const formatted = records.map((record) => ({
    id: record.id,
    contributorId: record.contributorId,
    title: record.title,
    status: record.status,
    hasPublicVersion: record.publication?.status === "published",
    earlyPublicationIssues: publicReleaseIssues(record),
    canEarlyPublish: !record.publication && ["draft", "submitted", "under_review", "needs_edit"].includes(record.status) && canPublishBeforeReview(session, record.languageId),
    validatorId: record.validatorId,
    createdAt: record.createdAt.toISOString(),
    editLanguageId: record.languageId,
    englishLanguageId: englishLanguage?.id ?? null,
    language: record.language,
    module: record.module,
    canModerate: canUploadContent(session, record.languageId),
    canEdit: canEditContent(session, record.languageId),
    canDelete: canDeleteContent(session, record),
    canCultureReview: canValidateCulture(session, record.languageId),
    canForward: canSendToFinalReview(session, record.languageId),
    canFinalReview: !!record.validatorId && canFinalizeContent(session, record.languageId),
    canPublish: record.contributorId !== user.id && !!record.validatorId && canFinalizeContent(session, record.languageId),
  }));

  const canBulkWorkflow = isSuperAdmin || roles.some((role) => ["language_admin", "uploader", "content_editor", "publisher"].includes(role.role));
  const selectedCultureId = await getSelectedAdminCultureId();
  const uploaderLanguageIds = [...new Set(roles.filter((role) => ["uploader", "language_admin"].includes(role.role)).map((role) => role.languageId))];
  const requestedUploaderLanguageId = searchParams.languageId ? Number(searchParams.languageId) : undefined;
  const createLanguageId = isMasterSuperAdmin
    ? requestedUploaderLanguageId ?? selectedCultureId ?? (await prisma.language.findFirst({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true } }))?.id
    : [requestedUploaderLanguageId, selectedCultureId, uploaderLanguageIds[0]]
      .find((languageId): languageId is number => !!languageId && uploaderLanguageIds.includes(languageId));
  const paramsFor = (changes: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const values: SearchParams = { ...searchParams, ...changes };
    if (values.module) params.set("module", values.module);
    if (values.status) params.set("status", values.status);
    if (values.languageId) params.set("languageId", values.languageId);
    if (values.page) params.set("page", values.page);
    const query = params.toString();
    return `/admin/content${query ? `?${query}` : ""}`;
  };

  return (
    <div>
      <header className="workspace-heading mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-serif text-stone-800"><InterfaceText source="Content" /></h1>
          <p className="text-sm text-stone-500"><InterfaceText source="Choose a content area, then filter by language or status. Select visible items to manage them together." /></p>
        </div>
        {!!createLanguageId && canUploadContent(session, createLanguageId) && <details className="upload-picker">
          <summary className="flex min-h-11 w-fit max-w-full cursor-pointer items-center rounded-lg bg-amber-800 px-4 text-sm font-semibold text-white"><InterfaceText source="+ New upload" /></summary>
          <nav aria-label="Choose a content area for your upload" className="upload-picker-options mt-3 rounded-xl border border-stone-300 bg-white p-3 shadow-sm">
          {modules.filter((contentModule) => contentModule.isActive && !contentModule.isStub && !!createLanguageId && canUploadContent(session, createLanguageId)).map((contentModule) => (
            <Link key={contentModule.code} href={`/admin/content/new/${contentModule.code}${createLanguageId ? `?languageId=${createLanguageId}` : ""}`} className="flex min-h-11 min-w-0 items-center whitespace-normal break-words rounded-lg border border-stone-200 px-3 py-3 text-sm font-medium text-stone-900 hover:bg-amber-50">
              + {contentModule.baseName}
            </Link>
          ))}
          </nav>
        </details>}
      </header>

      {isSuperAdmin && <details className="mobile-filter-group mb-3 rounded-xl border border-stone-200/80 bg-white/90 p-3 shadow-xs">
        <summary className="cursor-pointer list-none text-sm font-semibold text-stone-700"><InterfaceText source="Filter by language " /><span className="ml-1 text-xs font-normal text-stone-400"><InterfaceText source={searchParams.languageId ? "· selected" : "· all"} /></span></summary>
        <nav aria-label="Filter by language" className="mt-3 flex flex-wrap gap-2">
        <Link href={paramsFor({ languageId: undefined, page: undefined })} className={`rounded-full px-3 py-1.5 text-xs ${!searchParams.languageId ? "bg-stone-800 text-white" : "border border-stone-200 bg-white text-stone-600"}`}><InterfaceText source="All languages" /></Link>
        {(await prisma.language.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, nativeName: true } })).map((language) => (
          <Link key={language.id} href={paramsFor({ languageId: String(language.id), page: undefined })} className={`rounded-full px-3 py-1.5 text-xs ${searchParams.languageId === String(language.id) ? "bg-stone-800 text-white" : "border border-stone-200 bg-white text-stone-600"}`}>{language.nativeName}</Link>
        ))}
        </nav>
      </details>}


      {searchParams.status && <p className="mb-3 text-sm text-stone-600"><InterfaceText source="Workflow filter:" /> {searchParams.status.replaceAll("_", " ")} · <Link href={paramsFor({ status: undefined, page: undefined })} className="underline"><InterfaceText source="Clear status filter" /></Link></p>}
      <ContentTable records={formatted} canDelete={formatted.some((record) => record.canDelete)} canBulkWorkflow={canBulkWorkflow} areaNavigation={<nav aria-label="Content areas" className="flex flex-wrap gap-2">{[{ code: "", baseName: "All content areas" }, ...modules.filter(item => item.isActive && !item.isStub)].map(item => <Link key={item.code} href={paramsFor({ module: item.code || undefined, page: undefined })} aria-current={(searchParams.module || "") === item.code ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm font-medium ${(searchParams.module || "") === item.code ? "border-teal-900 bg-teal-900 text-white" : "border-stone-200 text-stone-700 hover:bg-stone-50"}`}><InterfaceText source={item.baseName} /></Link>)}</nav>} />
      {(page > 1 || hasMore) && <nav aria-label="More content batches" className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-xl border bg-white p-4 text-sm">{page > 1 && <Link href={paramsFor({ page: String(page - 1) })} className="inline-flex min-h-11 items-center underline"><InterfaceText source="Previous 500 uploads" /></Link>}<span><InterfaceText source="Upload batch" /> {page}</span>{hasMore && <Link href={paramsFor({ page: String(page + 1) })} className="inline-flex min-h-11 items-center underline"><InterfaceText source="Next 500 uploads" /></Link>}</nav>}
    </div>
  );
}
