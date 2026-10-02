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
    const theme = searchParams.get("theme")?.trim() || "";

    if (!langCode) {
      return NextResponse.json(
        { success: false, error: "lang required" },
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

    const proverbsModule = await prisma.module.findUnique({
      where: { code: "proverbs" },
    });
    if (!proverbsModule) {
      return NextResponse.json(
        { success: false, error: "Proverbs module missing" },
        { status: 500 }
      );
    }

    const where: any = {
      moduleId: proverbsModule.id,
      ...publicRecordWhere(),
      languageId: cultureLanguageId,
    };

    if (theme) where.tags = { has: theme };

    if (q) {
      where.AND = [...(where.AND ?? []), { OR: [
        { title: { contains: q, mode: "insensitive" } },
        { data: { path: ["translation"], string_contains: q } },
        { data: { path: ["meaning"], string_contains: q } },
        { translations: { some: { languageId: language.id, OR: [
          { data: { path: ["translation"], string_contains: q } },
          { data: { path: ["meaning"], string_contains: q } },
          { summary: { contains: q, mode: "insensitive" } },
        ] } } },
      ] }];
    }

    const records = await prisma.culturalRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { media: { where: publicGovernanceWhere() }, translations: { where: { languageId: language.id } } },
    });

    return NextResponse.json({ success: true, data: records.map((record) => localizeRecord(record, language.id)) });
  } catch (err: any) {
    console.error("[proverbs GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch proverbs" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  languageId: z.number().int().positive(),
  original_text: z.string().min(1),
  translation: z.string().min(1),
  meaning: z.string().min(1),
  interpretation: z.string().optional(),
  context: z.string().optional(),
  usage: z.string().optional(),
  themes: z.array(z.string()).optional(),
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);
    const governance = parseGovernanceMetadata(data);
    if (!governance.success) return NextResponse.json({ success: false, error: governance.error.issues[0]?.message || "Invalid governance metadata" }, { status: 400 });

    if (!canContribute(session, data.languageId)) {
      return NextResponse.json({ error: "You cannot contribute to this language" }, { status: 403 });
    }

    const proverbsModule = await prisma.module.findUnique({
      where: { code: "proverbs" },
    });
    if (!proverbsModule) {
      return NextResponse.json(
        { error: "Proverbs module missing" },
        { status: 500 }
      );
    }

    const canPublish = canReviewContent(session, data.languageId);
    const record = await prisma.$transaction(async (tx) => {
      const recordId = crypto.randomUUID();
      const sessionId = await generateCollectionSessionId(tx, governance.data);
      const domain = getRepositoryDomain("proverbs");
      const publicReady = governance.data.consentScope === "public_excerpt" && governance.data.restrictionLevel === "public" && (!governance.data.embargoUntil || governance.data.embargoUntil <= new Date());
      const status = canPublish && publicReady ? "published" : canPublish ? "draft" : "submitted";
      const created = await tx.culturalRecord.create({
        data: {
          id: recordId,
          languageId: data.languageId,
          moduleId: proverbsModule.id,
          title: data.original_text,
          data: {
            original_text: data.original_text,
            translation: data.translation,
            meaning: data.meaning,
            interpretation: data.interpretation,
            context: data.context,
            usage: data.usage,
          },
          tags: data.themes ?? [],
          status,
          publishedAt: status === "published" ? new Date() : null,
          reviewerId: status === "published" ? (session.user as any).id : null,
          contributorId: (session.user as any).id,
          ...governance.data,
          sessionId,
          nrfUri: buildRecordUri(recordId, governance.data.consentScope, governance.data.restrictionLevel, status),
          nrfMetadata: {
            domainCode: domain.code, domain: domain.name, genre: "proverbs",
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

    if (record.status === "published" && canPublish && await hasGemini()) {
      try { await embedRecord(record.id, true); }
      catch (error) { console.error("[proverbs POST] failed to update AI index:", error); }
    }

    return NextResponse.json({ success: true, data: record });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: err.errors[0].message },
        { status: 400 }
      );
    }
    console.error("[proverbs POST]", err);
    return NextResponse.json(
      { success: false, error: "Failed to create proverb" },
      { status: 500 }
    );
  }
}
