import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { askQuestion } from "@/lib/ai/rag";
import { hasGemini } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  try {
    if (!hasGemini()) {
      return NextResponse.json(
        {
          success: false,
          error: "AI is not configured. Contact the administrator.",
        },
        { status: 400 }
      );
    }

    const session = await auth();
    const userId = (session?.user as any)?.id ?? null;

    const body = await req.json();
    const { question, languageCode } = body;

    if (!question || question.length < 2) {
      return NextResponse.json(
        { success: false, error: "Question required" },
        { status: 400 }
      );
    }

    let languageId: number | undefined;
    if (languageCode) {
      const lang = await prisma.language.findUnique({
        where: { code: languageCode },
      });
      if (lang) languageId = lang.id;
    }

    const result = await askQuestion(question, languageId);

    // Log the query for AI monitoring
    try {
      await prisma.aIResponse.create({
        data: {
          languageId: languageId ?? null,
          userId,
          query: question,
          response: result.answer,
          sources: result.sources,
          model: result.model,
          latencyMs: result.latencyMs,
        },
      });
    } catch (logErr) {
      console.error("[chat] failed to log AI response:", logErr);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[ai/chat]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Chat failed" },
      { status: 500 }
    );
  }
}