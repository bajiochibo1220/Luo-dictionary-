import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContentTable } from "@/components/admin/content-table";
import { getSelectedAdminCultureId } from "@/lib/admin-language";
import { canEditContent, canFinalizeContent, canReviewContent, canSendToFinalReview, canUploadContent, canValidateCulture } from "@/lib/permissions";
import { redirect } from "next/navigation";

type SearchParams = { status?: string; module?: string; languageId?: string };

export default async function ContentPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const user = session!.user as any;
  const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  const isMasterSuperAdmin = !!user.isMasterSuperAdmin;
  const roles = (user.languageRoles ?? []) as any[];
  if (!isSuperAdmin && !roles.some((role) => ["language_admin", "uploader"].includes(role.role))) redirect("/admin/dashboard");
  const uploaderOnly = !isSuperAdmin && roles.length > 0 && roles.every((role) => role.role === "uploader");
  const languageRoles = roles.filter((role) => ["language_admin", "uploader", "publisher", "content_editor", "cultural_expert"].includes(role.role));
  const managedLanguageIds = [...new Set(languageRoles.map((role) => role.languageId))];

  const modules = await prisma.module.findMany({ orderBy: { displayOrder: "asc" } });
  const englishLanguage = await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });
  const where: any = {};
  if (uploaderOnly) where.contributorId = user.id;
  else if (!isSuperAdmin) where.languageId = { in: managedLanguageIds };
  else if (searchParams.languageId && Number.isInteger(Number(searchParams.languageId))) where.languageId = Number(searchParams.languageId);

  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.module) {
    const module = modules.find((item) => item.code === searchParams.module);
    if (module) where.moduleId = module.id;
  }

  const records = await prisma.culturalRecord.findMany({
    where,
    orderBy: [{ moduleId: "asc" }, { createdAt: "desc" }],
    take: 500,
    include: {
      language: { select: { code: true, nativeName: true } },
      module: { select: { code: true, baseName: true } },
    },
  });

  const formatted = records.map((record) => ({
    id: record.id,
    title: record.title,
    status: record.status,
    validatorId: record.validatorId,
    createdAt: record.createdAt.toISOString(),
    editLanguageId: record.languageId,
    englishLanguageId: englishLanguage?.id ?? null,
    language: record.language,
    module: record.module,
    canModerate: canUploadContent(session, record.languageId),
    canEdit: canEditContent(session, record.languageId),
    canDelete: isSuperAdmin || roles.some((role) => role.languageId === record.languageId && role.role === "language_admin"),
    canCultureReview: canValidateCulture(session, record.languageId),
    canForward: canSendToFinalReview(session, record.languageId),
    canFinalReview: !!record.validatorId && canFinalizeContent(session, record.languageId),
    canPublish: !!record.validatorId && canFinalizeContent(session, record.languageId),
  }));

  const canBulkWorkflow = roles.some((role) => ["language_admin", "uploader", "cultural_expert", "publisher", "content_editor"].includes(role.role));
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
    const query = params.toString();
    return `/admin/content${query ? `?${query}` : ""}`;
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-serif text-stone-800">Content</h1>
          <p className="text-sm text-stone-500">Items are grouped by language and content area. Select several items at the same stage to move them together.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {modules.filter((module) => module.isActive && !module.isStub && !!createLanguageId && canUploadContent(session, createLanguageId)).map((module) => (
            <Link key={module.code} href={`/admin/content/new/${module.code}${createLanguageId ? `?languageId=${createLanguageId}` : ""}`} className="rounded-lg bg-amber-800 px-3 py-2 text-xs font-medium text-white hover:bg-amber-900">
              + {module.baseName}
            </Link>
          ))}
        </div>
      </header>

      {isSuperAdmin && <details className="mobile-filter-group mb-3 rounded-xl border border-stone-200/80 bg-white/90 p-3 shadow-sm">
        <summary className="cursor-pointer list-none text-sm font-semibold text-stone-700">Filter by language <span className="ml-1 text-xs font-normal text-stone-400">{searchParams.languageId ? "· selected" : "· all"}</span></summary>
        <nav aria-label="Filter by language" className="mt-3 flex flex-wrap gap-2">
        <Link href={paramsFor({ languageId: undefined })} className={`rounded-full px-3 py-1.5 text-xs ${!searchParams.languageId ? "bg-stone-800 text-white" : "border border-stone-200 bg-white text-stone-600"}`}>All languages</Link>
        {(await prisma.language.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, nativeName: true } })).map((language) => (
          <Link key={language.id} href={paramsFor({ languageId: String(language.id) })} className={`rounded-full px-3 py-1.5 text-xs ${searchParams.languageId === String(language.id) ? "bg-stone-800 text-white" : "border border-stone-200 bg-white text-stone-600"}`}>{language.nativeName}</Link>
        ))}
        </nav>
      </details>}

      <details className="mobile-filter-group mb-3 rounded-xl border border-stone-200/80 bg-white/90 p-3 shadow-sm">
        <summary className="cursor-pointer list-none text-sm font-semibold text-stone-700">Filter by content area <span className="ml-1 text-xs font-normal text-stone-400">{searchParams.module ? `· ${modules.find((module) => module.code === searchParams.module)?.baseName ?? "selected"}` : "· all"}</span></summary>
        <nav aria-label="Filter by content area" className="mt-3 flex flex-wrap gap-2">
        <Link href={paramsFor({ module: undefined })} className={`rounded-full px-3 py-1.5 text-xs ${!searchParams.module ? "bg-amber-700 text-white" : "border border-stone-200 bg-white text-stone-600"}`}>All content areas</Link>
        {modules.filter((module) => module.isActive && !module.isStub).map((module) => (
          <Link key={module.code} href={paramsFor({ module: module.code })} className={`rounded-full px-3 py-1.5 text-xs ${searchParams.module === module.code ? "bg-amber-700 text-white" : "border border-stone-200 bg-white text-stone-600"}`}>{module.baseName}</Link>
        ))}
        </nav>
      </details>

      <details className="mobile-filter-group mb-4 rounded-xl border border-stone-200/80 bg-white/90 p-3 shadow-sm">
        <summary className="cursor-pointer list-none text-sm font-semibold text-stone-700">Filter by status <span className="ml-1 text-xs font-normal text-stone-400">{searchParams.status ? `· ${searchParams.status.replaceAll("_", " ")}` : "· all"}</span></summary>
        <nav aria-label="Filter by status" className="mt-3 flex flex-wrap gap-2">
        <Link href={paramsFor({ status: undefined })} className={`rounded-full px-3 py-1.5 text-xs ${!searchParams.status ? "bg-stone-800 text-white" : "border border-stone-200 bg-white text-stone-600"}`}>All statuses</Link>
        {["draft", "submitted", "needs_edit", "under_review", "curated", "published", "rejected"].map((status) => (
          <Link key={status} href={paramsFor({ status })} className={`rounded-full px-3 py-1.5 text-xs ${searchParams.status === status ? "bg-stone-800 text-white" : "border border-stone-200 bg-white text-stone-600"}`}>{status.replaceAll("_", " ")}</Link>
        ))}
        </nav>
      </details>

      <ContentTable records={formatted} canDelete={isSuperAdmin || roles.some((role) => role.role === "language_admin")} canBulkWorkflow={canBulkWorkflow} />
    </div>
  );
}
