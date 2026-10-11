import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import crypto from "crypto";
import { checkedBackupPath } from "@/lib/database-backup";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user || !(session.user as any).isMasterSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const backup = await prisma.backup.findUnique({ where: { id: params.id } });
  if (!backup || !backup.fileUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try { checkedBackupPath(backup.fileUrl); } catch { return NextResponse.json({ error: "Invalid backup location" }, { status: 400 }); }
  if (!fs.existsSync(backup.fileUrl)) {
    return NextResponse.json(
      { error: "Backup file missing on disk" },
      { status: 404 }
    );
  }

  const content = fs.readFileSync(backup.fileUrl);
  if (backup.checksum && crypto.createHash("sha256").update(content).digest("hex") !== backup.checksum) return NextResponse.json({ error: "Backup integrity check failed" }, { status: 409 });

  return new NextResponse(content, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${backup.filename}"`,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user || !(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const backup = await prisma.backup.findUnique({ where: { id: params.id } });
  if (!backup) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (backup.fileUrl) { try { checkedBackupPath(backup.fileUrl); } catch { return NextResponse.json({ error: "Invalid backup location" }, { status: 400 }); } }
  if (backup.fileUrl && fs.existsSync(backup.fileUrl)) {
    try {
      fs.unlinkSync(backup.fileUrl);
    } catch (err) {
      console.error("[backup delete file]", err);
      return NextResponse.json({ error: "Could not delete the backup file" }, { status: 500 });
    }
  }

  await prisma.backup.delete({ where: { id: params.id } });

  await logAction({
    userId: (session.user as any).id,
    action: "backup.deleted",
    entityType: "backup",
    entityId: params.id,
    oldValue: { filename: backup.filename },
  });

  return NextResponse.json({ success: true });
}