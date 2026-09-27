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

  const body = await req.json().catch(() => ({}));
  const comments = body.comments || "";

  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const oldStatus = record.status;

  await prisma.$transaction([
    prisma.culturalRecord.update({
      where: { id: params.id },
      data: { status: "revision" },
    }),
    prisma.reviewHistory.create({
      data: {
        recordId: params.id,
        reviewerId: (session.user as any).id,
        action: "revision_requested",
        stage: "moderation",
        comments,
      },
    }),
  ]);

  await logAction({
    userId: (session.user as any).id,
    action: "content.revision_requested",
    entityType: "cultural_record",
    entityId: params.id,
    oldValue: { status: oldStatus },
    newValue: { status: "revision", comments },
    ipAddress: req.headers.get("x-forwarded-for") || null,
    userAgent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ success: true });
}