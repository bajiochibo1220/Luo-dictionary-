import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const languageId = Number(searchParams.get("languageId") || 0);

    const where: any = {};
    if (languageId > 0) where.languageId = languageId;

    // Chatbot stats
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

    // Recent queries
    const recentQueries = await prisma.aIResponse.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        query: true,
        response: true,
        rating: true,
        flagged: true,
        model: true,
        latencyMs: true,
        createdAt: true,
        sources: true,
      },
    });

    // Flagged responses
    const flagged = await prisma.aIResponse.findMany({
      where: { ...where, flagged: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Embedding coverage
    const [totalRecords, totalEmbeddings] = await Promise.all([
      prisma.culturalRecord.count({
        where: { ...(languageId > 0 ? { languageId } : {}), status: "published" },
      }),
      prisma.embedding.count({
        where: languageId > 0 ? { record: { languageId } } : {},
      }),
    ]);

    const embeddingCoverage =
      totalRecords === 0 ? 0 : Math.round((totalEmbeddings / totalRecords) * 100);

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
          ...q,
          createdAt: q.createdAt.toISOString(),
        })),
        flagged: flagged.map((f) => ({
          ...f,
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