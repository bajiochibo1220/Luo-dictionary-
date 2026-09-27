import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  const current = await prisma.language.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.language.update({
    where: { id },
    data: { isActive: !current.isActive },
  });

  await logAction({
    userId: (session.user as any).id,
    action: updated.isActive ? "language.activated" : "language.deactivated",
    entityType: "language",
    entityId: String(id),
    oldValue: { isActive: current.isActive },
    newValue: { isActive: updated.isActive },
  });

  return NextResponse.json({ success: true, data: updated });
}