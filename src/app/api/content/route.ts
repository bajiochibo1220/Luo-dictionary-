import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { canContribute, canReviewContent } from "@/lib/permissions";

export const dynamic = "force-dynamic";

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
    const mine = searchParams.get("mine") === "true";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Number(searchParams.get("limit") || 50));
    const skip = (page - 1) * limit;

    const user = session.user as any;
    const isSuperAdmin = !!user.isSuperAdmin;
    const managedLanguageIds = isSuperAdmin
      ? undefined
      : ((user.languageRoles ?? []) as any[])
          .filter((r) =>
            [
              "language_admin",
              "moderator",
              "content_editor",
              "cultural_expert",
            ].includes(r.role)
          )
          .map((r) => r.languageId);

    const where: any = {};
    if (mine) where.contributorId = user.id;
    if (languageId > 0) where.languageId = languageId;
    else if (managedLanguageIds) where.languageId = { in: managedLanguageIds };
    if (moduleCode) {
      const mod = await prisma.module.findUnique({
        where: { code: moduleCode },
      });
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
          media: true,
          contributor: { select: { id: true, name: true, email: true, age: true } },
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
    const {
      languageId,
      moduleCode,
      title,
      data,
      tags,
      primaryMediaType,
      status,
    } = body;

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
    const language = await prisma.language.findUnique({ where: { id: Number(languageId) } });
    if (!language) return NextResponse.json({ success: false, error: "Invalid language" }, { status: 400 });
    if (!canContribute(session, language.id)) return NextResponse.json({ success: false, error: "You cannot contribute to this language" }, { status: 403 });

    // Snapshot the user's current age
    const dbUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { age: true },
    });

    const canPublish = canReviewContent(session, language.id);
    const recordStatus = canPublish ? "draft" : status === "draft" ? "draft" : "submitted";

    const record = await prisma.$transaction(async (tx) => {
      const r = await tx.culturalRecord.create({
        data: {
          languageId,
          moduleId: mod.id,
          title,
          data: data ?? {},
          tags: tags ?? [],
          // Public contributors can only submit for review. Admin publishing is
          // decided from the authenticated role, never from the request body.
          status: recordStatus,
          publishedAt: null,
          primaryMediaType: primaryMediaType ?? null,
          contributorAge: dbUser?.age ?? null,
          contributorId: (session.user as any).id,
        },
      });

      return r;
    });

    // Notify moderators if submitted
    if (record.status === "submitted") {
      const moderators = await prisma.userLanguageRole.findMany({
        where: {
          languageId,
          role: { in: ["moderator", "language_admin"] },
        },
        select: { userId: true },
      });
      if (moderators.length > 0) {
        await prisma.notification.createMany({
          data: moderators.map((m) => ({
            userId: m.userId,
            type: "content_submitted",
            message: `New ${mod.baseName} contribution: "${title}"`,
            link: `/admin/review-queue/${record.id}`,
          })),
        });
      }
    }

    await logAction({
      userId: (session.user as any).id,
      action: "content.created",
      entityType: "cultural_record",
      entityId: record.id,
      newValue: { title, moduleCode, status: recordStatus },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (err: any) {
    console.error("[content POST]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create" },
      { status: 500 }
    );
  }
}
