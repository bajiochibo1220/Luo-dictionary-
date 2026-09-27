import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processTranscript } from "@/lib/ai/summarize";
import { hasGemini } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasGemini()) {
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
      },
    });
    transcriptId = newTranscript.id;
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