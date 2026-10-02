import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSelectedAdminCultureId } from "@/lib/admin-language";
import { canReviewGovernedItem } from "@/lib/governance";

export const dynamic = "force-dynamic";

export default async function TranscriptLibraryPage() {
  const session = await auth();
  if (!session?.user) notFound();

  const user = session.user as any;
  const roles = user.languageRoles ?? [];
  const reviewerRoles = roles.filter((role: any) =>
    ["language_admin", "cultural_expert"].includes(role.role)
  );
  const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
  if (!isSuperAdmin && reviewerRoles.length === 0) notFound();

  const selectedCultureId = isSuperAdmin ? await getSelectedAdminCultureId() : undefined;
  const languageFilter = isSuperAdmin
    ? (selectedCultureId ? { languageId: selectedCultureId } : {})
    : { languageId: { in: reviewerRoles.map((role: any) => role.languageId) } };

  const records = await prisma.culturalRecord.findMany({
    where: {
      ...languageFilter,
      sessionId: { not: null },
      module: { code: "oral_histories" },
    },
    orderBy: [{ sessionId: "asc" }, { createdAt: "asc" }],
    include: {
      language: { select: { nativeName: true } },
      _count: { select: { transcripts: true } },
    },
  });

  const accessUser = { isSuperAdmin, isMasterSuperAdmin: user.isMasterSuperAdmin, languageRoles: roles };
  const visibleRecords = records.filter((record) =>
    canReviewGovernedItem(accessUser, record, record.languageId)
  );

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-stone-600">Internal library</p>
        <h1 className="mt-1 font-serif text-3xl text-stone-900">Transcripts</h1>
        <p className="mt-2 text-sm text-stone-700">
          Research-only transcripts available to reviewers for the languages they manage.
        </p>
      </header>

      {visibleRecords.length === 0 ? (
        <div className="rounded-xl border border-stone-900/10 bg-white/80 p-8 text-sm text-stone-600">
          No transcripts are available for this language selection.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-900/10 bg-white/90 shadow-sm">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-stone-200 px-4 py-3 text-xs uppercase tracking-wide text-stone-500">
            <span>Collection session</span>
            <span>Segments</span>
          </div>
          {visibleRecords.map((record) => (
            <Link
              key={record.id}
              href={`/admin/transcripts/${encodeURIComponent(record.sessionId!)}`}
              className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-stone-100 px-4 py-4 last:border-b-0 hover:bg-amber-50"
            >
              <span>
                <span className="block font-medium text-stone-900">{record.title}</span>
                <span className="mt-1 block text-xs text-stone-500">
                  {record.sessionId} · {record.language.nativeName} · {record.status}
                </span>
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
                {record._count.transcripts}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
