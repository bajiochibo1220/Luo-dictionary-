import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { canContribute, canReviewContent } from "@/lib/permissions";
import { createDefaultRecordTranslations, getContentCultureLanguageId, localizeRecord } from "@/lib/content-translations";
import { embedRecord } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";

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
      status: "published",
      languageId: cultureLanguageId,
    };

    if (theme) where.tags = { has: theme };

    if (q) {
      where.AND = [{ OR: [
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
      include: { media: true, translations: { where: { languageId: language.id } } },
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
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

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
      const created = await tx.culturalRecord.create({
        data: {
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
          status: canPublish ? "published" : "submitted",
          publishedAt: canPublish ? new Date() : null,
          reviewerId: canPublish ? (session.user as any).id : null,
          contributorId: (session.user as any).id,
        },
      });
      await createDefaultRecordTranslations(tx, created.id, data.languageId);
      return created;
    });

    if (canPublish && await hasGemini()) {
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
