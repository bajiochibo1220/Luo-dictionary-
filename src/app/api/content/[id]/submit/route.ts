import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

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

  // Notify moderators and admins for this language
  const moderators = await prisma.userLanguageRole.findMany({
    where: {
      languageId: record.languageId,
      role: { in: ["moderator", "language_admin"] },
    },
    select: { userId: true },
  });

  if (moderators.length > 0) {
    await prisma.notification.createMany({
      data: moderators.map((m) => ({
        userId: m.userId,
        type: "content_submitted",
        message: `New contribution submitted: "${record.title}"`,
        link: `/admin/review-queue/${record.id}`,
      })),
    });
  }

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