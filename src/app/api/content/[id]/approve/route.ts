import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { canReviewContent } from "@/lib/permissions";
import { embedRecord } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";

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
  if (!canReviewContent(session, record.languageId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const oldStatus = record.status;

  await prisma.$transaction([
    prisma.culturalRecord.update({
      where: { id: params.id },
      data: {
        status: "published",
        publishedAt: new Date(),
        reviewerId: (session.user as any).id,
      },
    }),
    prisma.reviewHistory.create({
      data: {
        recordId: params.id,
        reviewerId: (session.user as any).id,
        action: "approved",
        stage: "moderation",
        comments,
      },
    }),
  ]);

  await logAction({
    userId: (session.user as any).id,
    action: "content.approved",
    entityType: "cultural_record",
    entityId: params.id,
    oldValue: { status: oldStatus },
    newValue: { status: "published" },
    ipAddress: req.headers.get("x-forwarded-for") || null,
    userAgent: req.headers.get("user-agent") || null,
  });

  if (await hasGemini()) {
    try {
      await embedRecord(record.id, true);
    } catch (error) {
      console.error("[content approve] failed to update AI index:", error);
    }
  }

  return NextResponse.json({ success: true });
}
