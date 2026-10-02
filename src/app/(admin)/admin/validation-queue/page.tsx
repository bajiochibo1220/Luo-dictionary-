import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function ValidationQueuePage() {
  const session = await auth();
  const user = session!.user as any;
  const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  const managedLanguageIds = ((user.languageRoles ?? []) as any[])
    .filter((role) => ["cultural_expert", "language_admin"].includes(role.role))
    .map((role) => role.languageId);
  if (!isSuperAdmin && !managedLanguageIds.length) redirect("/admin/dashboard");

  const where: any = {
    OR: [
      { status: "submitted" },
      { status: "under_review", validatorId: null },
      { status: "rejection_review" },
    ],
  };
  if (!isSuperAdmin) where.languageId = { in: managedLanguageIds };

  const records = await prisma.culturalRecord.findMany({
    where,
    orderBy: [{ moduleId: "asc" }, { createdAt: "asc" }],
    include: {
      language: { select: { code: true, nativeName: true } },
      module: { select: { code: true, baseName: true } },
    },
  });
  const grouped = new Map<string, typeof records>();
  for (const record of records) {
    grouped.set(record.module.code, [...(grouped.get(record.module.code) ?? []), record]);
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="mb-1 text-3xl font-serif text-stone-800">Cultural Validation Queue</h1>
        <p className="text-sm text-stone-500">{records.length} {records.length === 1 ? "item" : "items"} awaiting linguistic and cultural review</p>
      </header>
      {records.length === 0 ? (
        <div className="rounded-xl border border-stone-100 bg-white p-12 text-center">
          <p className="mb-4 text-4xl">✓</p>
          <p className="text-stone-600">No content awaiting validation</p>
          <p className="mt-2 text-sm text-stone-400">New contributions arrive here for cultural and language authenticity review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([moduleCode, items]) => (
            <section key={moduleCode} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <h2 className="border-b border-stone-200 bg-stone-50 px-5 py-3 font-semibold text-stone-800">
                {items[0].module.baseName} <span className="ml-1 text-sm font-normal text-stone-500">({items.length})</span>
              </h2>
              <div className="divide-y divide-stone-100">
                {items.map((record) => (
                  <article key={record.id} className="flex items-center justify-between gap-4 p-5 hover:bg-amber-50/40">
                    <div className="min-w-0">
                      <p className="mb-1 text-xs text-stone-500">
                        {record.language.nativeName}{record.status === "rejection_review" ? " · Peer rejection vote" : ""}
                      </p>
                      <h3 className="font-serif text-lg text-stone-800">{record.title}</h3>
                    </div>
                    <Link href={`/admin/validation-queue/${record.id}`} className="shrink-0 text-xs font-medium uppercase tracking-wider text-amber-700 hover:text-amber-800">Review →</Link>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}