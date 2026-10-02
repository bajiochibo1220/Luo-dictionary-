import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { askQuestion } from "@/lib/ai/rag";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;

    // ── Guard: user might be stale (deleted after DB reset)
    const dbUser = userId ? await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    }) : null;

    if (userId && !dbUser) {
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
    const { question, languageCode, cultureCode, conversationId } = body;

    if (typeof question !== "string" || question.trim().length < 2 || question.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Enter a question between 2 and 2000 characters." },
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
    const chatUser = session?.user as any;
    if (chatUser?.isSuperAdmin) {
      const { getSelectedAdminCultureId } = await import("@/lib/admin-language");
      cultureLanguageId = await getSelectedAdminCultureId();
    } else {
      cultureLanguageId = chatUser?.languageRoles?.[0]?.languageId;
    }
    if (!cultureLanguageId && cultureCode) {
      cultureLanguageId = (await prisma.language.findFirst({
        where: { code: cultureCode, isActive: true },
        select: { id: true },
      }))?.id;
    }

    let convId = userId ? conversationId : null;
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (!userId && Array.isArray(body.history)) {
      history = body.history
        .filter((turn: any) => (turn?.role === "user" || turn?.role === "assistant") && typeof turn?.content === "string")
        .slice(-8)
        .map((turn: any) => ({ role: turn.role, content: turn.content.slice(0, 2000) }));
    }

    // Verify the conversation exists and belongs to this user
    if (convId && userId) {
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
    if (!convId && userId) {
      const title =
        question.length > 60 ? question.slice(0, 60) + "…" : question;
      const conv = await prisma.conversation.create({
        data: { userId, title },
      });
      convId = conv.id;
    }

    const result = await askQuestion(question, languageId, cultureLanguageId, history);

    if (userId) {
      await prisma.aIResponse.create({
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
      });
    }
    if (convId) {
      await prisma.conversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...result, conversationId: convId },
    });
  } catch (err: any) {
    // Provider errors can contain request headers or credentials. Keep them
    // out of logs and user-visible API responses.
    console.error("[ai/chat] request failed", { name: err?.name || "Error" });

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
      {
        success: false,
        error: "Sorry, something went wrong. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
