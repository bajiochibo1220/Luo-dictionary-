import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { askQuestion } from "@/lib/ai/rag";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Please sign in to use the AI assistant." },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    // ── Guard: user might be stale (deleted after DB reset)
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your session has expired. Please sign out and sign in again.",
          code: "STALE_SESSION",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { question, languageCode, conversationId } = body;

    if (!question || question.length < 2) {
      return NextResponse.json(
        { success: false, error: "Question required" },
        { status: 400 }
      );
    }

    let languageId: number | undefined;
    let cultureLanguageId: number | undefined;
    if (languageCode) {
      const lang = await prisma.language.findUnique({
        where: { code: languageCode },
      });
      if (lang) languageId = lang.id;
    }
    const chatUser = session.user as any;
    if (chatUser.isSuperAdmin) {
      const { getSelectedAdminCultureId } = await import("@/lib/admin-language");
      cultureLanguageId = await getSelectedAdminCultureId();
    } else {
      cultureLanguageId = chatUser.languageRoles?.[0]?.languageId;
    }

    let convId = conversationId;
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Verify the conversation exists and belongs to this user
    if (convId) {
      const owned = await prisma.conversation.findFirst({
        where: { id: convId, userId },
        select: { id: true },
      });
      if (!owned) convId = null;
      else {
        const previousMessages = await prisma.aIResponse.findMany({
          where: { conversationId: convId },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { query: true, response: true },
        });
        history = previousMessages.reverse().flatMap((message) => [
          { role: "user" as const, content: message.query },
          { role: "assistant" as const, content: message.response },
        ]);
      }
    }

    // Create a new conversation if none
    if (!convId) {
      const title =
        question.length > 60 ? question.slice(0, 60) + "…" : question;
      const conv = await prisma.conversation.create({
        data: { userId, title },
      });
      convId = conv.id;
    }

    const result = await askQuestion(question, languageId, cultureLanguageId, history);

    await prisma.$transaction([
      prisma.aIResponse.create({
        data: {
          conversationId: convId,
          languageId: languageId ?? null,
          userId,
          query: question,
          response: result.answer,
          sources: result.sources as any,
          model: result.model,
          latencyMs: result.latencyMs,
        },
      }),
      prisma.conversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { ...result, conversationId: convId },
    });
  } catch (err: any) {
    console.error("[ai/chat]", err);

    // Catch Prisma FK error just in case
    if (err?.code === "P2003") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your session has expired. Please sign out and sign in again.",
          code: "STALE_SESSION",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: err.message || "Chat failed" },
      { status: 500 }
    );
  }
}
