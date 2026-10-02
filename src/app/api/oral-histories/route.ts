import { NextRequest, NextResponse } from "next/server";
import { publicRecordWhere } from "@/lib/governance";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const langCode = searchParams.get("lang");
    const q = searchParams.get("q")?.trim() || "";
    const county = searchParams.get("county")?.trim() || "";

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

    const mod = await prisma.module.findUnique({
      where: { code: "oral_histories" },
    });
    if (!mod) {
      return NextResponse.json(
        { success: false, error: "Module missing" },
        { status: 500 }
      );
    }

    const where: any = {
      languageId: language.id,
      moduleId: mod.id,
      ...publicRecordWhere(),
    };

    if (county) where.tags = { has: county };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
      ];
    }

    const records = await prisma.culturalRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: records });
  } catch (err: any) {
    console.error("[oral-histories GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch" },
      { status: 500 }
    );
  }
}