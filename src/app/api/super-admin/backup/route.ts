import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(session.user as any).isSuperAdmin) {
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
  if (!(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { stdout, stderr } = await execAsync(
      'npx tsx scripts/backup-database.ts',
      { cwd: process.cwd(), timeout: 60000 }
    );

    if (stderr && !stderr.includes("Environment variables")) {
      console.error("[backup stderr]", stderr);
    }

    // Get the latest backup record
    const latest = await prisma.backup.findFirst({
      orderBy: { createdAt: "desc" },
    });

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
      output: stdout,
    });
  } catch (err: any) {
    console.error("[backup POST]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Backup failed" },
      { status: 500 }
    );
  }
}