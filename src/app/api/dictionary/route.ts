import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

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

    const [entries, total] = await Promise.all([
      prisma.dictionaryEntry.findMany({
        where,
        orderBy: { dholuo: "asc" },
        skip,
        take: limit,
      }),
      prisma.dictionaryEntry.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: entries,
      meta: { page, total, limit },
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

    const userRoles =
      ((session.user as any).languageRoles as any[]) ?? [];
    const allowed = userRoles.some(
      (r) =>
        r.languageId === data.languageId &&
        ["elder", "contributor", "moderator", "content_editor", "language_admin"].includes(r.role)
    );

    if (!allowed && !(session.user as any).isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Not allowed to contribute to this language" },
        { status: 403 }
      );
    }

    const entry = await prisma.dictionaryEntry.create({
      data: {
        languageId: data.languageId,
        dholuo: data.dholuo,
        english: data.english,
        kiswahili: data.kiswahili,
        pronunciation: data.pronunciation,
        grammarClass: data.grammarClass,
        wordOrigin: data.wordOrigin,
        synonyms: data.synonyms ?? [],
        antonyms: data.antonyms ?? [],
        examples: data.examples ?? [],
        status: "submitted",
        contributorId: (session.user as any).id,
      },
    });

    return NextResponse.json({ success: true, data: entry });
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