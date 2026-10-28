import { assertServiceAvailable } from "@/lib/maintenance";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertAiQuota } from "@/lib/ai/quota";
import { prisma } from "@/lib/db";
import { embedText } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";
import { getContentCultureLanguageId } from "@/lib/content-translations";
import { getTextAiProvider } from "@/lib/ai/provider-config";
import { searchPublicText } from "@/lib/ai/public-text-search";

export async function POST(req: NextRequest) {
  try {
    await assertServiceAvailable();
    const session = await auth();
    const provider = await getTextAiProvider();
    if (provider === "gemini" && !(await hasGemini())) {
      return NextResponse.json(
        { success: false, error: "AI is not configured" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { query, languageCode, limit = 10 } = body;

    if (typeof query !== "string" || query.trim().length < 2 || query.length > 2000 || !Number.isInteger(limit) || limit < 1 || limit > 20 || (languageCode !== undefined && typeof languageCode !== "string")) {
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

    await assertAiQuota(req, session?.user?.id);
    if (provider === "deepseek") {
      const cultureLanguageId = languageId ? await getContentCultureLanguageId(languageId) : undefined;
      const results = await searchPublicText(query, cultureLanguageId, limit);
      return NextResponse.json({ success: true, data: results.map(result => ({ id: result.record_id, title: result.title, module: result.module, moduleCode: result.module_code, similarity: result.similarity, excerpt: result.content.slice(0, 240) })) });
    }
    const queryVector = await embedText(query);
    const vectorStr = `[${queryVector.join(",")}]`;
    // Content has a source locale plus separate translation vectors. Filter on
    // the vector locale so translated records are searchable in that language.
    const langFilter = languageId ? `AND e."languageId" = ${languageId}` : "";
    const cultureLanguageId = languageId ? await getContentCultureLanguageId(languageId) : undefined;
    const cultureFilter = cultureLanguageId
      ? `AND ((e."recordId" IS NOT NULL AND cr."languageId" = ${cultureLanguageId}) OR (e."dictionaryId" IS NOT NULL AND de."languageId" = ${cultureLanguageId}) OR (e."transcriptId" IS NOT NULL AND cr."languageId" = ${cultureLanguageId}))`
      : "";
    const take = Math.min(20, Math.max(1, Number(limit)));

    const results = await prisma.$queryRawUnsafe(
      `SELECT
         COALESCE(cr.id, t."recordId", de.id) AS id,
         COALESCE(crt.title, cr.title, de.dholuo, 'Transcript') AS title,
         COALESCE(m."baseName", CASE WHEN de.id IS NOT NULL THEN 'Dictionary' ELSE 'Transcript' END) AS module,
         COALESCE(m.code, CASE WHEN de.id IS NOT NULL THEN 'dictionary' ELSE 'oral_histories' END) AS "moduleCode",
         1 - (e.vector <=> $1::vector) AS similarity,
         LEFT(e.content, 240) AS excerpt
       FROM embeddings e
       LEFT JOIN transcripts t ON t.id = e."transcriptId"
       LEFT JOIN cultural_records cr ON cr.id = COALESCE(e."recordId", t."recordId")
         LEFT JOIN cultural_record_translations crt ON crt."recordId" = cr.id AND crt."languageId" = e."languageId"
       LEFT JOIN dictionary_entries de ON de.id = e."dictionaryId"
       LEFT JOIN modules m ON m.id = cr."moduleId"
       WHERE ((e."recordId" IS NOT NULL AND cr.status = 'published'
              AND cr."consentScope" = 'public_excerpt' AND cr."restrictionLevel" = 'public'
              AND (cr."embargoUntil" IS NULL OR cr."embargoUntil" <= NOW()))
          OR (e."dictionaryId" IS NOT NULL AND de.status = 'published'
              AND de."consentScope" = 'public_excerpt' AND de."restrictionLevel" = 'public'
              AND (de."embargoUntil" IS NULL OR de."embargoUntil" <= NOW()))
          OR (e."transcriptId" IS NOT NULL AND t."recordId" IS NOT NULL AND cr.status = 'published'
              AND cr."consentScope" = 'public_excerpt' AND cr."restrictionLevel" = 'public'
              AND (cr."embargoUntil" IS NULL OR cr."embargoUntil" <= NOW())
              AND t."consentScope" = 'public_excerpt' AND t."restrictionLevel" = 'public'
              AND (t."embargoUntil" IS NULL OR t."embargoUntil" <= NOW())))
         ${langFilter}
         ${cultureFilter}
       ORDER BY e.vector <=> $1::vector
       LIMIT $2`,
      vectorStr,
      take
    );

    return NextResponse.json({
      success: true,
      data: (results as any[]).filter((r) => r.similarity >= 0.35).filter((r, index, all) => all.findIndex((item) => item.id === r.id) === index).map((r) => ({
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
      { success: false, error: [429, 503].includes(err.status) ? err.message : "Search is temporarily unavailable. Please try again." },
      { status: err.status || 500, headers: err.retryAfter ? { "Retry-After": String(err.retryAfter) } : undefined }
    );
  }
}
