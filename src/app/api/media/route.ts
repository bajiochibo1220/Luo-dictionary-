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
    const type = searchParams.get("type")?.trim() || "";
    const languageId = Number(searchParams.get("languageId") || 0);
    const q = searchParams.get("q")?.trim() || "";

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
    if (languageId > 0) where.languageId = languageId;
    else if (managedLanguageIds) where.languageId = { in: managedLanguageIds };
    if (type) where.type = type;
    if (q) where.OR = [
      { caption: { contains: q, mode: "insensitive" } },
      { publicId: { contains: q, mode: "insensitive" } },
    ];

    const assets = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        language: { select: { code: true, nativeName: true } },
        record: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: assets.map((a) => ({
        ...a,
        sizeBytes: Number(a.sizeBytes),
      })),
    });
  } catch (err: any) {
    console.error("[media GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch" },
      { status: 500 }
    );
  }
}