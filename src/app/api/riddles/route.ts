import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    const mod = await prisma.module.findUnique({
      where: { code: "riddles" },
    });
    if (!mod) {
      return NextResponse.json(
        { success: false, error: "Riddles module missing" },
        { status: 500 }
      );
    }

    const where: any = {
      languageId: language.id,
      moduleId: mod.id,
      status: "published",
    };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { data: { path: ["translation"], string_contains: q } },
      ];
    }

    const records = await prisma.culturalRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: records });
  } catch (err: any) {
    console.error("[riddles GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch riddles" },
      { status: 500 }
    );
  }
}