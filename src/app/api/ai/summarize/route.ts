import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processTranscript } from "@/lib/ai/summarize";
import { hasGemini } from "@/lib/ai/gemini";
import { isPubliclyEligible } from "@/lib/governance";
import { canReviewContent } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasGemini())) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { recordId } = body;

  if (!recordId) {
    return NextResponse.json(
      { error: "recordId required" },
      { status: 400 }
    );
  }

  const record = await prisma.culturalRecord.findUnique({
    where: { id: recordId },
    include: { transcripts: true },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  if (!canReviewContent(session, record.languageId)) {
    return NextResponse.json({ error: "Curator access is required for transcript processing." }, { status: 403 });
  }
  if (record.status !== "published" || !isPubliclyEligible(record)) {
    return NextResponse.json(
      { success: false, error: "AI processing is available only for content approved for public release." },
      { status: 403 }
    );
  }

  // Get or create transcript
  let transcriptId = record.transcripts[0]?.id;

  if (!transcriptId) {
    // Create transcript from record data
    const text = (record.data as any)?.transcript || "";
    if (!text) {
      return NextResponse.json(
        { error: "No transcript text found in this record" },
        { status: 400 }
      );
    }

    const newTranscript = await prisma.transcript.create({
      data: {
        languageId: record.languageId,
        recordId: record.id,
        text,
        languageCode: "dholuo",
        consentScope: record.consentScope,
        restrictionLevel: record.restrictionLevel,
        embargoUntil: record.embargoUntil,
        countyCode: record.countyCode,
        siteName: record.siteName,
        sourceReference: record.sourceReference,
        sessionId: record.sessionId,
      },
    });
    transcriptId = newTranscript.id;
  }

  const transcript = record.transcripts.find((item) => item.id === transcriptId);
  const transcriptForProcessing = transcript ?? await prisma.transcript.findUnique({ where: { id: transcriptId } });
  if (!transcriptForProcessing || !isPubliclyEligible(transcriptForProcessing)) {
    return NextResponse.json(
      { success: false, error: "This transcript is not approved for external AI processing." },
      { status: 403 }
    );
  }

  try {
    const result = await processTranscript(transcriptId);

    // Also update the record's summary field
    await prisma.culturalRecord.update({
      where: { id: recordId },
      data: { summary: result.summary },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[ai/summarize]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
