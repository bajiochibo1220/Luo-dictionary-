import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { createDatabaseBackup } from "@/lib/database-backup";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(session.user as any).isMasterSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const backups = await prisma.backup.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    data: backups.map((b) => ({
      ...b,
      sizeBytes: Number(b.sizeBytes),
      createdAt: b.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(session.user as any).isMasterSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const latest = await createDatabaseBackup();

    await logAction({
      userId: (session.user as any).id,
      action: "backup.created",
      entityType: "backup",
      entityId: latest?.id ?? null,
      newValue: { filename: latest?.filename },
    });

    return NextResponse.json({
      success: true,
      data: latest
        ? {
            ...latest,
            sizeBytes: Number(latest.sizeBytes),
            createdAt: latest.createdAt.toISOString(),
          }
        : null,
      output: "Complete database snapshot created. Media file bytes require a separate storage backup.",
    });
  } catch (err: any) {
    console.error("[backup POST]", err);
    return NextResponse.json(
      { success: false, error: "Backup failed. Check the database connection and backup directory." },
      { status: 500 }
    );
  }
}