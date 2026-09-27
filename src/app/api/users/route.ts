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
    const role = searchParams.get("role")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const languageId = Number(searchParams.get("languageId") || 0);
    const q = searchParams.get("q")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Number(searchParams.get("limit") || 50));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ];
    }
    if (role || languageId > 0) {
      where.languageRoles = {
        some: {
          ...(role ? { role } : {}),
          ...(languageId > 0 ? { languageId } : {}),
        },
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          isSuperAdmin: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          languageRoles: {
            select: {
              id: true,
              role: true,
              language: { select: { code: true, nativeName: true } },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      meta: { page, total, limit },
    });
  } catch (err: any) {
    console.error("[users GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch" },
      { status: 500 }
    );
  }
}