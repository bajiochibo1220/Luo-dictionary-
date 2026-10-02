import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { embedDictionaryEntry, embedRecord } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import { canReviewContent } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasGemini())) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured. Add to .env" },
      { status: 400 }
    );
  }

  const { recordId, force } = await req.json();
  if (!recordId) {
    return NextResponse.json(
      { error: "recordId required" },
      { status: 400 }
    );
  }

  const [record, dictionaryEntry] = await Promise.all([
    prisma.culturalRecord.findUnique({ where: { id: recordId }, select: { languageId: true } }),
    prisma.dictionaryEntry.findUnique({ where: { id: recordId }, select: { languageId: true } }),
  ]);
  const languageId = record?.languageId ?? dictionaryEntry?.languageId;
  if (languageId === undefined) return NextResponse.json({ error: "Content not found" }, { status: 404 });
  if (!canReviewContent(session, languageId)) return NextResponse.json({ error: "Curator access is required to manage AI indexing." }, { status: 403 });

  try {
    const result = record
      ? await embedRecord(recordId, !!force)
      : await embedDictionaryEntry(recordId, !!force);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[ai/embed]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
