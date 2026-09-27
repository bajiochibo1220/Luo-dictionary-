import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action")?.trim() || "";
    const entityType = searchParams.get("entityType")?.trim() || "";
    const days = Math.max(1, Math.min(365, Number(searchParams.get("days") || 30)));
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(200, Number(searchParams.get("limit") || 100));
    const skip = (page - 1) * limit;
    const format = searchParams.get("format");

    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = { createdAt: { gte: since } };
    if (action) where.action = { contains: action, mode: "insensitive" };
    if (entityType) where.entityType = entityType;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // CSV export
    if (format === "csv") {
      const header = [
        "id",
        "timestamp",
        "user",
        "action",
        "entityType",
        "entityId",
        "ip",
      ].join(",");

      const rows = logs.map((l) =>
        [
          l.id,
          l.createdAt.toISOString(),
          l.user?.email ?? "system",
          l.action,
          l.entityType,
          l.entityId ?? "",
          l.ipAddress ?? "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );

      const csv = [header, ...rows].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: logs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
      meta: { page, total, limit },
    });
  } catch (err: any) {
    console.error("[audit-logs GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch" },
      { status: 500 }
    );
  }
}