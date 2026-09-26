import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContentTable } from "@/components/admin/content-table";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: { status?: string; module?: string };
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
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.module) {
    const mod = await prisma.module.findUnique({
      where: { code: searchParams.module },
    });
    if (mod) where.moduleId = mod.id;
  }

  const records = await prisma.culturalRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      language: { select: { code: true, nativeName: true } },
      module: { select: { code: true, baseName: true } },
    },
  });

  const modules = await prisma.module.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const formatted = records.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    language: r.language,
    module: r.module,
  }));

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-1">Content</h1>
          <p className="text-sm text-stone-500">
            {formatted.length} {formatted.length === 1 ? "record" : "records"}
          </p>
        </div>
        <Link
          href="/admin/content/new/proverbs"
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
        >
          + New
        </Link>
      </header>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/content"
          className={`text-xs px-3 py-1.5 rounded-full ${
            !searchParams.status
              ? "bg-amber-600 text-white"
              : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
          }`}
        >
          All
        </Link>
        {["draft", "submitted", "published", "rejected"].map((s) => (
          <Link
            key={s}
            href={`/admin/content?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full ${
              searchParams.status === s
                ? "bg-amber-600 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <ContentTable records={formatted} canDelete={isSuperAdmin} />
    </div>
  );
}