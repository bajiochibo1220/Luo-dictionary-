import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContentCultureLanguageId, localizeRecord } from "@/lib/content-translations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const langCode = searchParams.get("lang");
    const q = searchParams.get("q")?.trim() || "";

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

    const mod = await prisma.module.findUnique({
      where: { code: "folktales" },
    });
    if (!mod) {
      return NextResponse.json(
        { success: false, error: "Module missing" },
        { status: 500 }
      );
    }

    const where: any = {
      moduleId: mod.id,
      status: "published",
      languageId: cultureLanguageId,
    };
    if (q) where.title = { contains: q, mode: "insensitive" };

    const records = await prisma.culturalRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { media: true, translations: { where: { languageId: language.id } } },
    });

    return NextResponse.json({ success: true, data: records.map((record) => localizeRecord(record, language.id)) });
  } catch (err: any) {
    console.error("[folktales GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch" },
      { status: 500 }
    );
  }
}
