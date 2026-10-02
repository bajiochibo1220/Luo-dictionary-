import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MediaGrid } from "@/components/admin/media-grid";
import { getSelectedAdminCultureId } from "@/lib/admin-language";
import { redirect } from "next/navigation";

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: { type?: string; module?: string; lang?: string };
}) {
  const session = await auth();
  const user = session!.user as any;
  const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  if (!isSuperAdmin && !(user.languageRoles ?? []).some((role: any) => role.role === "language_admin")) redirect("/admin/dashboard");

  const managedLanguageIds = isSuperAdmin
    ? undefined
    : ((user.languageRoles ?? []) as any[])
        .filter((r) =>
          ["language_admin", "uploader", "publisher", "content_editor", "cultural_expert"].includes(r.role)
        )
        .map((r) => r.languageId);

  const where: any = {};
  const filters: any[] = [];
  if (isSuperAdmin) {
    const cultureId = await getSelectedAdminCultureId();
    if (cultureId) filters.push({ OR: [
      { languageId: cultureId },
      { record: { languageId: cultureId } },
    ] });
  } else if (managedLanguageIds) filters.push({ languageId: { in: managedLanguageIds } });
  if (searchParams.type) filters.push({ type: searchParams.type });
  if (searchParams.module) filters.push({ OR: [
    { record: { module: { code: searchParams.module } } },
    { recordId: null, nrfMetadata: { path: ["genre"], equals: searchParams.module } },
  ] });
  if (filters.length) where.AND = filters;

  const modules = await prisma.module.findMany({
    where: { isActive: true, isStub: false },
    orderBy: { displayOrder: "asc" },
    select: { code: true, baseName: true },
  });

  const assets = await prisma.mediaAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      language: { select: { code: true, nativeName: true } },
      record: {
        select: {
          id: true,
          title: true,
          status: true,
          module: { select: { code: true, baseName: true } },
        },
      },
    },
  });

  const formatted = assets.map((a) => ({
    id: a.id,
    type: a.type,
    url: a.url,
    publicId: a.publicId,
    resourceType: a.resourceType,
    format: a.format,
    sizeBytes: Number(a.sizeBytes),
    durationSecs: a.durationSecs,
    width: a.width,
    height: a.height,
    caption: a.caption,
    thumbnailUrl: a.thumbnailUrl,
    createdAt: a.createdAt.toISOString(),
    language: a.language,
    languageId: a.languageId,
    nrfMetadata: a.nrfMetadata,
    record: a.record,
  }));

  const totalSize = formatted.reduce((sum, a) => sum + a.sizeBytes, 0);
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          Media Library
        </h1>
        <p className="text-sm text-stone-500">
          {formatted.length} files · {sizeMB} MB
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/media"
          className={`text-xs px-3 py-1.5 rounded-full ${
            !searchParams.type && !searchParams.module
              ? "bg-amber-600 text-white"
              : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
          }`}
        >
          All
        </Link>
        {["image", "video", "audio", "document"].map((t) => (
          <Link
            key={t}
            href={`/admin/media?${new URLSearchParams({ ...(searchParams.module ? { module: searchParams.module } : {}), type: t })}`}
            className={`text-xs px-3 py-1.5 rounded-full capitalize ${
              searchParams.type === t
                ? "bg-amber-600 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      <form method="GET" action="/admin/media" className="mb-5 flex flex-wrap items-center gap-3">
        {searchParams.type && <input type="hidden" name="type" value={searchParams.type} />}
        <label htmlFor="media-module" className="text-sm font-medium text-stone-700">Content module</label>
        <select id="media-module" name="module" defaultValue={searchParams.module ?? ""} className="min-w-52 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800">
          <option value="">All modules</option>
          {modules.map((module) => <option key={module.code} value={module.code}>{module.baseName}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">Filter</button>
      </form>

      <MediaGrid assets={formatted} canDelete={isSuperAdmin} />
    </div>
  );
}
