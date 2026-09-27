import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { embedText } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Please sign in to use semantic search." },
        { status: 401 }
      );
    }

    if (!hasGemini()) {
      return NextResponse.json(
        { success: false, error: "AI is not configured" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { query, languageCode, limit = 10 } = body;

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Query too short" },
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

    const queryVector = await embedText(query);
    const vectorStr = `[${queryVector.join(",")}]`;
    const langFilter = languageId ? `AND cr."languageId" = ${languageId}` : "";
    const take = Math.min(20, Math.max(1, Number(limit)));

    const results = await prisma.$queryRawUnsafe(
      `SELECT
         cr.id,
         cr.title,
         m."baseName" AS module,
         m.code AS "moduleCode",
         1 - (e.vector <=> $1::vector) AS similarity,
         LEFT(e.content, 240) AS excerpt
       FROM embeddings e
       JOIN cultural_records cr ON cr.id = e."recordId"
       JOIN modules m ON m.id = cr."moduleId"
       WHERE e."recordId" IS NOT NULL
         AND cr.status = 'published'
         ${langFilter}
       ORDER BY e.vector <=> $1::vector
       LIMIT $2`,
      vectorStr,
      take
    );

    return NextResponse.json({
      success: true,
      data: (results as any[]).map((r) => ({
        id: r.id,
        title: r.title,
        module: r.module,
        moduleCode: r.moduleCode,
        similarity: Math.round(r.similarity * 1000) / 1000,
        excerpt: r.excerpt,
      })),
    });
  } catch (err: any) {
    console.error("[ai/search]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Search failed" },
      { status: 500 }
    );
  }
}