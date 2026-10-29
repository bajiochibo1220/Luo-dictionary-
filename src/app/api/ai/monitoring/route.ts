import { readCulturalAnswer } from "@/lib/cultural-chat-answer";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicRecordWhere } from "@/lib/governance";
import { canReviewContent } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const languageId = Number(searchParams.get("languageId") || 0);
    const user = session.user as any;
    const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
    const reviewLanguageIds = Array.from(new Set<number>(
      (user.languageRoles ?? [])
        .filter((role: any) => ["language_admin", "uploader", "publisher", "content_editor"].includes(role.role))
        .map((role: any) => Number(role.languageId))
        .filter(Number.isInteger)
    ));
    if (!isSuperAdmin && !reviewLanguageIds.length) {
      return NextResponse.json({ error: "Curator access is required." }, { status: 403 });
    }
    if (languageId > 0 && !isSuperAdmin && !canReviewContent(session, languageId)) {
      return NextResponse.json({ error: "You cannot view AI activity for this language." }, { status: 403 });
    }

    const where: any = isSuperAdmin ? {} : { languageId: { in: reviewLanguageIds } };
    if (languageId > 0) where.languageId = languageId;

    const [totalQueries, avgLatency, ratedCount, upCount, flaggedCount] =
      await Promise.all([
        prisma.aIResponse.count({ where }),
        prisma.aIResponse.aggregate({
          where,
          _avg: { latencyMs: true },
        }),
        prisma.aIResponse.count({
          where: { ...where, rating: { not: null } },
        }),
        prisma.aIResponse.count({
          where: { ...where, rating: "up" },
        }),
        prisma.aIResponse.count({
          where: { ...where, flagged: true },
        }),
      ]);

    const satisfactionPct =
      ratedCount === 0 ? 0 : Math.round((upCount / ratedCount) * 100);

    const recentQueries = await prisma.aIResponse.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const flagged = await prisma.aIResponse.findMany({
      where: { ...where, flagged: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const [totalRecords, totalEmbeddings] = await Promise.all([
      prisma.culturalRecord.count({
        where: { ...(!isSuperAdmin ? { languageId: { in: reviewLanguageIds } } : {}), ...(languageId > 0 ? { languageId } : {}), ...publicRecordWhere() },
      }),
      prisma.culturalRecord.count({ where: { ...(!isSuperAdmin ? { languageId: { in: reviewLanguageIds } } : {}), ...(languageId > 0 ? { languageId } : {}), ...publicRecordWhere(), embeddings: { some: {} } } }),
    ]);

    const embeddingCoverage =
      totalRecords === 0
        ? 0
        : Math.round((totalEmbeddings / totalRecords) * 100);

    return NextResponse.json({
      success: true,
      data: {
        chatbot: {
          totalQueries,
          avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
          satisfactionPct,
          ratedCount,
          flaggedCount,
        },
        embeddings: {
          totalRecords,
          totalEmbeddings,
          coveragePct: embeddingCoverage,
        },
        recentQueries: recentQueries.map((q) => ({
          ...q, response: readCulturalAnswer(q.response).answer, translation: readCulturalAnswer(q.response).translation,
          createdAt: q.createdAt.toISOString(),
        })),
        flagged: flagged.map((f) => ({
          ...f, response: readCulturalAnswer(f.response).answer, translation: readCulturalAnswer(f.response).translation,
          createdAt: f.createdAt.toISOString(),
        })),
      },
    });
  } catch (err: any) {
    console.error("[ai-monitoring GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch" },
      { status: 500 }
    );
  }
}
