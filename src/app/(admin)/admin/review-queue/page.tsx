import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSelectedAdminCultureId } from "@/lib/admin-language";

export default async function ReviewQueuePage() {
  const session = await auth();
  const user = session!.user as any;
  const isSuperAdmin = !!user.isSuperAdmin;

  const managedLanguageIds = isSuperAdmin
    ? undefined
    : ((user.languageRoles ?? []) as any[])
        .filter((r) =>
          ["language_admin", "moderator", "content_editor"].includes(r.role)
        )
        .map((r) => r.languageId);

  const where: any = { status: "submitted" };
  if (isSuperAdmin) { const cultureId = await getSelectedAdminCultureId(); if (cultureId) where.languageId = cultureId; }
  else if (managedLanguageIds) where.languageId = { in: managedLanguageIds };

  const records = await prisma.culturalRecord.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      language: { select: { code: true, nativeName: true } },
      module: { select: { baseName: true } },
      media: true,
    },
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          Review Queue
        </h1>
        <p className="text-sm text-stone-500">
          {records.length} {records.length === 1 ? "item" : "items"} pending
        </p>
      </header>

      {records.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
          <p className="text-4xl mb-4">✓</p>
          <p className="text-stone-600">All caught up!</p>
          <p className="text-sm text-stone-400 mt-2">
            No content waiting for review
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((r) => {
            const d = r.data as any;
            const preview =
              d.original_text || d.question || d.title || r.title;
            return (
              <div
                key={r.id}
                className="bg-white rounded-xl shadow-sm border border-stone-100 hover:border-amber-300 transition p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                        {r.module.baseName}
                      </span>
                      <span className="text-xs text-stone-400">
                        {r.language.nativeName}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg text-stone-800 mb-1">
                      {r.title}
                    </h3>
                    <p className="text-sm text-stone-500 line-clamp-2">
                      {preview}
                    </p>
                  </div>
                  <div className="text-right text-xs text-stone-400 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString("en-KE", {
                      dateStyle: "medium",
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
                  <Link
                    href={`/admin/review-queue/${r.id}`}
                    className="text-xs uppercase tracking-wider text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Review →
                  </Link>
                  {r.media.length > 0 && (
                    <span className="text-xs text-stone-400">
                      · {r.media.length} media file
                      {r.media.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
