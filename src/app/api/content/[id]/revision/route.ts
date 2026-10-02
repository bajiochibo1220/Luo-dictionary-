import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { canValidateCulture } from "@/lib/permissions";

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
  if (record.contributorId && record.contributorId === (session.user as any).id) {
    return NextResponse.json({ error: "You cannot review your own contribution. Ask another reviewer." }, { status: 403 });
  }
  const cultureStage = (record.status === "submitted" || (record.status === "under_review" && !record.validatorId)) && canValidateCulture(session, record.languageId);
  if (!cultureStage) return NextResponse.json({ error: "Only an assigned cultural expert can return an item for editing." }, { status: 403 });

  const oldStatus = record.status;
  const stage = "cultural_validation";

  await prisma.$transaction([
    prisma.culturalRecord.update({
      where: { id: params.id },
      data: { status: "needs_edit", validatorId: (session.user as any).id, publishedAt: null },
    }),
    prisma.reviewHistory.create({
      data: {
        recordId: params.id,
        reviewerId: (session.user as any).id,
        action: "editing_requested",
        stage,
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
    newValue: { status: "needs_edit", comments },
    ipAddress: req.headers.get("x-forwarded-for") || null,
    userAgent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ success: true });
}
