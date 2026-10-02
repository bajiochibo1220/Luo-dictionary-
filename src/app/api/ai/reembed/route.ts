import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { embedRecord, embedDictionaryEntry, embedTranscript } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";
import { publicGovernanceWhere, publicRecordWhere } from "@/lib/governance";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!(await hasGemini())) {
    return NextResponse.json(
      { error: "Gemini API key is not configured. Add it in Super Admin → System → API Credentials." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const languageId = body.languageId as number | undefined;
  const force = !!body.force;

  const [records, dictionaryEntries, transcripts] = await Promise.all([
    prisma.culturalRecord.findMany({
    where: {
      ...publicRecordWhere(),
      ...(languageId ? { OR: [{ languageId }, { translations: { some: { languageId } } }] } : {}),
    },
    select: { id: true },
    }),
    // Each dictionary entry may produce an English vector as well as its
    // source-language vector, so include all entries when rebuilding one locale.
    prisma.dictionaryEntry.findMany({ where: { ...publicRecordWhere() }, select: { id: true } }),
    prisma.transcript.findMany({ where: { ...publicGovernanceWhere(), ...(languageId ? { languageId } : {}), record: { ...publicRecordWhere() } }, select: { id: true } }),
  ]);

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  const jobs = [
    ...records.map((item) => ({ id: item.id, run: () => embedRecord(item.id, force) })),
    ...dictionaryEntries.map((item) => ({ id: item.id, run: () => embedDictionaryEntry(item.id, force) })),
    ...transcripts.map((item) => ({ id: item.id, run: () => embedTranscript(item.id, force) })),
  ];

  for (const job of jobs) {
    try {
      const result = await job.run();
      if (result.skipped) skipped++;
      else succeeded++;
      await new Promise((res) => setTimeout(res, 200));
    } catch (err: any) {
      failed++;
      errors.push(`${job.id}: ${err.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      total: jobs.length,
      succeeded,
      skipped,
      failed,
      errors: errors.slice(0, 5),
    },
  });
}
