import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const languageId = Number(searchParams.get("languageId") || 0);
    const moduleCode = searchParams.get("module") || "";
    const status = searchParams.get("status") || "";
    const q = searchParams.get("q")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Number(searchParams.get("limit") || 50));
    const skip = (page - 1) * limit;

    const user = session.user as any;
    const isSuperAdmin = !!user.isSuperAdmin;
    const managedLanguageIds = isSuperAdmin
      ? undefined
      : ((user.languageRoles ?? []) as any[])
          .filter((r) =>
            ["language_admin", "moderator", "content_editor", "cultural_expert"].includes(r.role)
          )
          .map((r) => r.languageId);

    const where: any = {};

    if (languageId > 0) {
      where.languageId = languageId;
    } else if (managedLanguageIds) {
      where.languageId = { in: managedLanguageIds };
    }

    if (moduleCode) {
      const mod = await prisma.module.findUnique({ where: { code: moduleCode } });
      if (mod) where.moduleId = mod.id;
    }

    if (status) where.status = status;
    if (q) where.title = { contains: q, mode: "insensitive" };

    const [records, total] = await Promise.all([
      prisma.culturalRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          language: { select: { code: true, name: true, nativeName: true } },
          module: { select: { code: true, baseName: true } },
        },
      }),
      prisma.culturalRecord.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: records,
      meta: { page, total, limit },
    });
  } catch (err: any) {
    console.error("[content GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { languageId, moduleCode, title, data, tags } = body;

    if (!languageId || !moduleCode || !title) {
      return NextResponse.json(
        { success: false, error: "languageId, moduleCode, title required" },
        { status: 400 }
      );
    }

    const mod = await prisma.module.findUnique({ where: { code: moduleCode } });
    if (!mod) {
      return NextResponse.json(
        { success: false, error: "Module not found" },
        { status: 400 }
      );
    }

    const record = await prisma.culturalRecord.create({
      data: {
        languageId,
        moduleId: mod.id,
        title,
        data: data ?? {},
        tags: tags ?? [],
        status: "draft",
        contributorId: (session.user as any).id,
      },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (err: any) {
    console.error("[content POST]", err);
    return NextResponse.json(
      { success: false, error: "Failed to create" },
      { status: 500 }
    );
  }
}