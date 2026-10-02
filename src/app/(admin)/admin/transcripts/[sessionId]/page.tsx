import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canReviewGovernedItem } from "@/lib/governance";
import { TranscriptSegments } from "@/components/admin/transcript-segments";

export const dynamic = "force-dynamic";

export default async function TranscriptSessionPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const session = await auth();
  if (!session?.user) notFound();

  const user = session.user as any;
  const records = await prisma.culturalRecord.findMany({
    where: {
      sessionId: params.sessionId,
      module: { code: "oral_histories" },
    },
    include: {
      language: { select: { nativeName: true } },
      transcripts: {
        orderBy: { sourceId: "asc" },
        select: {
          id: true,
          sourceId: true,
          text: true,
          speakerRole: true,
          sourceUri: true,
          consentScope: true,
          restrictionLevel: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const accessUser = { isSuperAdmin: user.isSuperAdmin, languageRoles: user.languageRoles ?? [] };
  const visibleRecords = records.filter((record) =>
    canReviewGovernedItem(accessUser, record, record.languageId)
  );
  if (visibleRecords.length === 0) notFound();

  const visibleTranscripts = visibleRecords.flatMap((record) =>
    record.transcripts
      .filter((transcript) => canReviewGovernedItem(accessUser, transcript, record.languageId))
  );
  const record = visibleRecords[0];

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/transcripts" className="text-sm text-amber-900 underline">
        Back to transcripts
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-xs uppercase tracking-widest text-stone-600">
          {record.language.nativeName} · {record.consentScope.replaceAll("_", " ")} / {record.restrictionLevel}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-stone-900">{record.title}</h1>
        <p className="mt-2 text-sm text-stone-600">
          Session {record.sessionId} · {visibleTranscripts.length} transcript segments
        </p>
      </header>

      <TranscriptSegments segments={visibleTranscripts} />
    </div>
  );
}
