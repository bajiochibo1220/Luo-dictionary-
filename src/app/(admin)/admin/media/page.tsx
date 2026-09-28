import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MediaGrid } from "@/components/admin/media-grid";

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: { type?: string; lang?: string };
}) {
  const session = await auth();
  const user = session!.user as any;
  const isSuperAdmin = !!user.isSuperAdmin;

  const managedLanguageIds = isSuperAdmin
    ? undefined
    : ((user.languageRoles ?? []) as any[])
        .filter((r) =>
          ["language_admin", "moderator", "content_editor", "cultural_expert"].includes(r.role)
        )
        .map((r) => r.languageId);

  const where: any = {};
  if (managedLanguageIds) where.languageId = { in: managedLanguageIds };
  if (searchParams.type) where.type = searchParams.type;

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
          module: { select: { code: true } },
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
            !searchParams.type
              ? "bg-amber-600 text-white"
              : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
          }`}
        >
          All
        </Link>
        {["image", "video", "audio", "document"].map((t) => (
          <Link
            key={t}
            href={`/admin/media?type=${t}`}
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

      <MediaGrid assets={formatted} canDelete={isSuperAdmin} />
    </div>
  );
}
