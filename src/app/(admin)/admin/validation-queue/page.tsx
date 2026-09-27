import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ValidationQueuePage() {
  const session = await auth();
  const user = session!.user as any;
  const isSuperAdmin = !!user.isSuperAdmin;

  const managedLanguageIds = isSuperAdmin
    ? undefined
    : ((user.languageRoles ?? []) as any[])
        .filter((r) =>
          ["language_admin", "cultural_expert"].includes(r.role)
        )
        .map((r) => r.languageId);

  const where: any = { status: "under_review" };
  if (managedLanguageIds) where.languageId = { in: managedLanguageIds };

  const records = await prisma.culturalRecord.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      language: { select: { code: true, nativeName: true } },
      module: { select: { baseName: true } },
    },
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          Cultural Validation Queue
        </h1>
        <p className="text-sm text-stone-500">
          {records.length} {records.length === 1 ? "item" : "items"} awaiting
          linguistic and cultural review
        </p>
      </header>

      {records.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
          <p className="text-4xl mb-4">✓</p>
          <p className="text-stone-600">No content awaiting validation</p>
          <p className="text-sm text-stone-400 mt-2">
            Items move here after moderation review
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl shadow-sm border border-stone-100 hover:border-amber-300 transition p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {r.module.baseName}
                    </span>
                    <span className="text-xs text-stone-400">
                      {r.language.nativeName}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg text-stone-800 mb-1">
                    {r.title}
                  </h3>
                </div>
                <Link
                  href={`/admin/validation-queue/${r.id}`}
                  className="text-xs uppercase tracking-wider text-amber-600 hover:text-amber-700 font-medium"
                >
                  Validate →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}