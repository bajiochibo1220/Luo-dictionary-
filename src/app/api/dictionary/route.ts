import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { canContribute, canReviewContent } from "@/lib/permissions";
import { createDefaultRecordTranslations, getContentCultureLanguageId, localizeRecord } from "@/lib/content-translations";
import { embedRecord } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";
import { buildRecordUri, generateCollectionSessionId, getRepositoryDomain, parseGovernanceMetadata, publicGovernanceWhere, publicRecordWhere } from "@/lib/governance";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const langCode = searchParams.get("lang");
    const q = searchParams.get("q")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Number(searchParams.get("limit") || 50));
    const skip = (page - 1) * limit;

    if (!langCode) {
      return NextResponse.json(
        { success: false, error: "lang query param required" },
        { status: 400 }
      );
    }

    const language = await prisma.language.findUnique({
      where: { code: langCode },
    });
    if (!language) {
      return NextResponse.json(
        { success: false, error: "Invalid language" },
        { status: 400 }
      );
    }

    const cultureLanguageId = await getContentCultureLanguageId(language.id);
    const where: any = {
      languageId: cultureLanguageId,
      ...publicRecordWhere(),
    };
    const culturalRecordWhere: any = {
      languageId: cultureLanguageId,
      ...publicRecordWhere(),
      module: { code: "dictionary" },
    };

    if (q.length >= 1) {
      where.OR = [
        { dholuo: { contains: q, mode: "insensitive" } },
        { english: { contains: q, mode: "insensitive" } },
        { kiswahili: { contains: q, mode: "insensitive" } },
      ];
      culturalRecordWhere.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { data: { path: ["dholuo"], string_contains: q } },
        { data: { path: ["english"], string_contains: q } },
        { data: { path: ["kiswahili"], string_contains: q } },
        { data: { path: ["meaning"], string_contains: q } },
        { data: { path: ["wordOrigin"], string_contains: q } },
        { translations: { some: { languageId: language.id, OR: [
          { title: { contains: q, mode: "insensitive" } },
          { data: { path: ["dholuo"], string_contains: q } },
          { data: { path: ["english"], string_contains: q } },
          { data: { path: ["kiswahili"], string_contains: q } },
          { data: { path: ["meaning"], string_contains: q } },
          { data: { path: ["wordOrigin"], string_contains: q } },
        ] } } },
      ];
    }

    if (q.length >= 1) {
      try {
        await prisma.analyticsEvent.create({
          data: {
            eventType: "search",
            languageId: language.id,
            metadata: { query: q },
            userAgent: req.headers.get("user-agent") || null,
          },
        });
      } catch (err) {
        console.error("[analytics] search track failed:", err);
      }
    }

    const [entries, records, total, recordTotal] = await Promise.all([
      prisma.dictionaryEntry.findMany({
        where,
        orderBy: { dholuo: "asc" },
      }),
      prisma.culturalRecord.findMany({
        where: culturalRecordWhere,
        orderBy: { createdAt: "desc" },
        include: { media: { where: publicGovernanceWhere() }, translations: { where: { languageId: language.id } } },
      }),
      prisma.dictionaryEntry.count({ where }),
      prisma.culturalRecord.count({ where: culturalRecordWhere }),
    ]);

    const recordEntries = records.map((record) => localizeRecord(record, language.id)).map((record) => {
      const data = record.data as Record<string, any>;
      const audio = record.media.find((item) => item.type === "audio");
      return {
        id: record.id,
        dholuo: data.dholuo || record.title,
        english: data.english || "",
        kiswahili: data.kiswahili ?? null,
        pronunciation: data.pronunciation ?? null,
        grammarClass: data.grammarClass ?? null,
        meaning: data.meaning ?? null,
        wordOrigin: data.wordOrigin ?? null,
        synonyms: data.synonyms ?? [],
        antonyms: data.antonyms ?? [],
        examples: data.examples ?? [],
        audioUrl: audio?.url ?? null,
        media: record.media.map(({ id, type, url, thumbnailUrl }) => ({ id, type, url, thumbnailUrl })),
        status: record.status,
      };
    });
    const combined = [...entries, ...recordEntries].sort((a, b) => a.dholuo.localeCompare(b.dholuo)).slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: combined,
      meta: { page, total: total + recordTotal, limit },
    });
  } catch (err: any) {
    console.error("[dictionary GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dictionary" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  languageId: z.number().int().positive(),
  dholuo: z.string().min(1),
  english: z.string().min(1),
  kiswahili: z.string().optional(),
  pronunciation: z.string().optional(),
  grammarClass: z.string().optional(),
  wordOrigin: z.string().optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  examples: z.any().optional(),
  consentScope: z.enum(["pending", "research_only", "teaching", "public_excerpt", "community_only", "embargoed"]).optional(),
  restrictionLevel: z.enum(["public", "internal", "restricted", "sacred"]).optional(),
  embargoUntil: z.coerce.date().nullable().optional(),
  countyCode: z.string().trim().max(12).nullable().optional(),
  siteName: z.string().trim().max(200).nullable().optional(),
  sourceReference: z.string().trim().max(500).nullable().optional(),
  sessionId: z.string().trim().max(100).regex(/^[A-Za-z0-9_-]+$/).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = createSchema.parse(body);
    const governance = parseGovernanceMetadata(data);
    if (!governance.success) return NextResponse.json({ success: false, error: governance.error.issues[0]?.message || "Invalid governance metadata" }, { status: 400 });

    if (!canContribute(session, data.languageId)) {
      return NextResponse.json(
        { success: false, error: "Not allowed to contribute to this language" },
        { status: 403 }
      );
    }

    const module = await prisma.module.findUnique({ where: { code: "dictionary" } });
    if (!module) return NextResponse.json({ success: false, error: "Dictionary module missing" }, { status: 500 });
    const isAdmin = canReviewContent(session, data.languageId);
    const publicReady = governance.data.consentScope === "public_excerpt" && governance.data.restrictionLevel === "public" && (!governance.data.embargoUntil || governance.data.embargoUntil <= new Date());
    const entryStatus = isAdmin && publicReady ? "published" : isAdmin ? "draft" : "submitted";
    const record = await prisma.$transaction(async (tx) => {
      const recordId = crypto.randomUUID();
      const sessionId = await generateCollectionSessionId(tx, governance.data);
      const domain = getRepositoryDomain("dictionary");
      const created = await tx.culturalRecord.create({
        data: {
          id: recordId,
          languageId: data.languageId,
          moduleId: module.id,
          title: data.dholuo,
          data: {
            dholuo: data.dholuo,
            english: data.english,
            kiswahili: data.kiswahili ?? null,
            pronunciation: data.pronunciation ?? null,
            grammarClass: data.grammarClass ?? null,
            wordOrigin: data.wordOrigin ?? null,
            synonyms: data.synonyms ?? [],
            antonyms: data.antonyms ?? [],
            examples: data.examples ?? [],
          },
          status: entryStatus,
          publishedAt: entryStatus === "published" ? new Date() : null,
          contributorId: (session.user as any).id,
          ...governance.data,
          sessionId,
          nrfUri: buildRecordUri(recordId, governance.data.consentScope, governance.data.restrictionLevel, entryStatus),
          nrfMetadata: {
            domainCode: domain.code, domain: domain.name, genre: "dictionary",
            consentScope: governance.data.consentScope,
            restrictionLevel: governance.data.restrictionLevel,
            embargoUntil: governance.data.embargoUntil?.toISOString() ?? null,
            countyCode: governance.data.countyCode,
            siteName: governance.data.siteName,
            sourceReference: governance.data.sourceReference,
            sessionId,
          },
        },
      });
      await createDefaultRecordTranslations(tx, created.id, data.languageId);
      return created;
    });

    if (record.status === "published" && isAdmin && await hasGemini()) {
      try {
        await embedRecord(record.id, true);
      } catch (error) {
        console.error("[dictionary POST] failed to update AI index:", error);
      }
    }

    return NextResponse.json({ success: true, data: record });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: err.errors[0].message },
        { status: 400 }
      );
    }
    console.error("[dictionary POST]", err);
    return NextResponse.json(
      { success: false, error: "Failed to create entry" },
      { status: 500 }
    );
  }
}
