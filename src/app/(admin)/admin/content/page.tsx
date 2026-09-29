import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContentTable } from "@/components/admin/content-table";
import { getSelectedAdminCultureId, getSelectedAdminLanguageId } from "@/lib/admin-language";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: { status?: string; module?: string };
}) {
  const session = await auth();
  const user = session!.user as any;
  const isSuperAdmin = !!user.isSuperAdmin;
  const selectedLanguageId = isSuperAdmin ? await getSelectedAdminLanguageId() : undefined;
  const selectedCultureId = isSuperAdmin ? await getSelectedAdminCultureId() : undefined;

  const managedLanguageIds = isSuperAdmin
    ? [selectedLanguageId].filter((id): id is number => Boolean(id))
    : ((user.languageRoles ?? []) as any[])
        .filter((r) =>
          ["language_admin", "moderator", "content_editor", "cultural_expert"].includes(r.role)
        )
        .map((r) => r.languageId);

  const where: any = {};
  if (isSuperAdmin && selectedCultureId) where.languageId = selectedCultureId;
  else where.OR = [
    { languageId: { in: managedLanguageIds } },
    { translations: { some: { languageId: { in: managedLanguageIds } } } },
  ];
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
      translations: { where: { languageId: selectedLanguageId ?? { in: managedLanguageIds } }, include: { language: { select: { code: true, nativeName: true } } } },
    },
  });

  const modules = await prisma.module.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const formatted = records.map((r) => {
    const translation = r.translations.find((item) => item.languageId !== r.languageId);
    const nativeIsManaged = managedLanguageIds.includes(r.languageId);
    const editLanguageId = isSuperAdmin && selectedLanguageId
      ? (r.languageId === selectedLanguageId ? r.languageId : translation?.languageId ?? selectedLanguageId)
      : nativeIsManaged ? r.languageId : translation?.languageId ?? r.languageId;
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      language: editLanguageId === r.languageId ? r.language : translation?.language ?? r.language,
      editLanguageId,
      canModerate: isSuperAdmin || nativeIsManaged,
      module: r.module,
    };
  });

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-1">Content</h1>
          <p className="text-sm text-stone-500">
            {formatted.length} {formatted.length === 1 ? "record" : "records"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {modules.filter((module) => module.isActive && !module.isStub).map((module) => (
            <Link key={module.code} href={`/admin/content/new/${module.code}${(selectedCultureId ?? selectedLanguageId) ? `?languageId=${selectedCultureId ?? selectedLanguageId}` : ""}`}
              className="px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-medium">
              + {module.baseName}
            </Link>
          ))}
        </div>
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
