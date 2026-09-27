import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const oldStatus = record.status;

  const updated = await prisma.culturalRecord.update({
    where: { id: params.id },
    data: { status: "submitted" },
  });

  await logAction({
    userId: (session.user as any).id,
    action: "content.submitted",
    entityType: "cultural_record",
    entityId: params.id,
    oldValue: { status: oldStatus },
    newValue: { status: "submitted" },
    ipAddress: req.headers.get("x-forwarded-for") || null,
    userAgent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ success: true, data: updated });
}