import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { canContribute, canReviewContent } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const langCode = searchParams.get("lang");
    const q = searchParams.get("q")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Number(searchParams.get("limit") || 50));
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

    const where: any = {
      languageId: language.id,
      status: "published",
    };

    if (q.length >= 1) {
      where.OR = [
        { dholuo: { contains: q, mode: "insensitive" } },
        { english: { contains: q, mode: "insensitive" } },
        { kiswahili: { contains: q, mode: "insensitive" } },
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

    const [entries, records, total] = await Promise.all([
      prisma.dictionaryEntry.findMany({
        where,
        orderBy: { dholuo: "asc" },
        take: limit + skip,
      }),
      prisma.culturalRecord.findMany({
        where: { languageId: language.id, status: "published", module: { code: "dictionary" } },
        orderBy: { createdAt: "desc" },
        take: limit + skip,
        include: { media: true },
      }),
      prisma.dictionaryEntry.count({ where }),
    ]);

    const recordEntries = records.map((record) => {
      const data = record.data as Record<string, any>;
      const audio = record.media.find((item) => item.type === "audio");
      return {
        id: record.id,
        dholuo: data.dholuo || record.title,
        english: data.english || "",
        kiswahili: data.kiswahili ?? null,
        pronunciation: data.pronunciation ?? null,
        grammarClass: data.grammarClass ?? null,
        audioUrl: audio?.url ?? null,
        media: record.media.map(({ id, type, url, thumbnailUrl }) => ({ id, type, url, thumbnailUrl })),
        status: record.status,
      };
    }).filter((entry) => !q || [entry.dholuo, entry.english, entry.kiswahili ?? ""].some((value) => value.toLowerCase().includes(q.toLowerCase())));
    const combined = [...entries, ...recordEntries].sort((a, b) => a.dholuo.localeCompare(b.dholuo)).slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: combined,
      meta: { page, total: total + recordEntries.length, limit },
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

    if (!canContribute(session, data.languageId)) {
      return NextResponse.json(
        { success: false, error: "Not allowed to contribute to this language" },
        { status: 403 }
      );
    }

    const module = await prisma.module.findUnique({ where: { code: "dictionary" } });
    if (!module) return NextResponse.json({ success: false, error: "Dictionary module missing" }, { status: 500 });
    const isAdmin = canReviewContent(session, data.languageId);
    const record = await prisma.culturalRecord.create({
      data: {
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
        status: isAdmin ? "published" : "submitted",
        publishedAt: isAdmin ? new Date() : null,
        contributorId: (session.user as any).id,
      },
    });

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
