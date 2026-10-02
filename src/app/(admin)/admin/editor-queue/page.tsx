import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SendToFinalReviewButton } from "@/components/admin/send-to-final-review-button";

export const dynamic = "force-dynamic";

export default async function EditorQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  const roles = user.languageRoles ?? [];
  const languageIds: number[] = [...new Set<number>(roles
    .filter((role: any) => ["content_editor", "language_admin"].includes(role.role))
    .map((role: any) => Number(role.languageId)))];
  if (languageIds.length === 0 && !isSuperAdmin) redirect("/admin/dashboard");

  const records = await prisma.culturalRecord.findMany({
    where: {
      status: "needs_edit",
      ...(isSuperAdmin ? {} : { languageId: { in: languageIds } }),
    },
    orderBy: [{ moduleId: "asc" }, { createdAt: "asc" }],
    include: {
      language: { select: { nativeName: true } },
      module: { select: { code: true, baseName: true } },
      media: { select: { type: true, format: true } },
    },
  });

  const recordsWithRole = records.map((record) => ({
    ...record,
    canForward: user.isMasterSuperAdmin || roles.some((role: any) => role.languageId === record.languageId && ["content_editor", "language_admin"].includes(role.role)),
  }));
  const grouped = new Map<string, typeof recordsWithRole>();
  for (const record of recordsWithRole) {
    const group = grouped.get(record.module.baseName) ?? [];
    group.push(record);
    grouped.set(record.module.baseName, group);
  }

  return (
    <main className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-stone-500">Stage 2 · Content editors</p>
        <h1 className="mt-1 font-serif text-3xl text-stone-900">Editor Queue</h1>
        <p className="mt-2 text-sm text-stone-600">These items were returned by cultural reviewers for edits. Make the requested changes, then send them back for cultural review.</p>
      </header>

      {records.length === 0 ? (
        <div className="rounded-xl border border-stone-900/10 bg-white p-8 text-sm text-stone-600">No items have been returned for editing.</div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([moduleName, items]) => (
            <section key={moduleName} className="overflow-hidden rounded-xl border border-stone-900/10 bg-white">
              <h2 className="border-b border-stone-200 bg-stone-50 px-4 py-3 font-semibold text-stone-800">{moduleName} <span className="ml-1 text-sm font-normal text-stone-500">({items.length})</span></h2>
              <ul className="divide-y divide-stone-100">
                {items.map((record) => (
                  <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                    <div>
                      <p className="font-medium text-stone-900">{record.title}</p>
                      <p className="mt-1 text-xs text-stone-500">{record.language.nativeName} · {record.media.length} attached file{record.media.length === 1 ? "" : "s"}</p>
                    </div>
    <div className="flex flex-wrap gap-2">
                      {record.canForward && <Link href={`/admin/content/${record.id}/edit`} className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900">Edit details</Link>}
                      {record.canForward ? <SendToFinalReviewButton recordId={record.id} /> : <span className="self-center text-xs text-stone-500">Waiting for an assigned editor</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
