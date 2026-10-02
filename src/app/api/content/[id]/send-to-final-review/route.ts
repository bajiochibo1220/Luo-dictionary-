import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canSendToFinalReview } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { validatePhaseOneSubmission } from "@/lib/phase-one-content";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Sign in first." }, { status: 401 });

  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
    include: { module: { select: { code: true } }, transcripts: { select: { text: true } } },
  });
  if (!record) return NextResponse.json({ success: false, error: "Content not found." }, { status: 404 });
  if (!canSendToFinalReview(session, record.languageId)) {
    return NextResponse.json({ success: false, error: "Only the assigned content editor can send this item back to cultural review." }, { status: 403 });
  }
  if (record.status !== "needs_edit" || !record.validatorId) {
    return NextResponse.json({ success: false, error: "This item must be returned by a cultural expert before an editor can resubmit it for cultural review." }, { status: 409 });
  }

  const hasLinkedTranscript = record.transcripts.some((item) => item.text.trim().length > 0);
  const validationError = validatePhaseOneSubmission(record.module.code, record.title, record.data, hasLinkedTranscript);
  if (validationError) return NextResponse.json({ success: false, error: validationError }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const reviewerId = (session.user as any).id as string;
  await prisma.$transaction(async (tx) => {
    const moved = await tx.culturalRecord.updateMany({
      where: { id: record.id, status: "needs_edit", validatorId: { not: null } },
      data: { status: "submitted", validatorId: null, publishedAt: null },
    });
    if (moved.count !== 1) throw new Error("This item has already moved to another review stage.");
    await tx.reviewHistory.create({
      data: {
        recordId: record.id,
        reviewerId,
        action: "editor_changes_submitted_for_cultural_review",
        stage: "editorial_review",
        comments: typeof body.comments === "string" ? body.comments.slice(0, 2000) : "",
      },
    });
  });

  const reviewers = await prisma.userLanguageRole.findMany({
    where: { languageId: record.languageId, role: "cultural_expert" },
    select: { userId: true },
  });
  if (reviewers.length) {
    await prisma.notification.createMany({
      data: reviewers.map(({ userId }) => ({
        userId,
        type: "content_submitted",
        message: `Edited item ready for cultural re-review: "${record.title}".`,
        link: "/admin/validation-queue",
      })),
    });
  }

  await logAction({
    userId: reviewerId,
    action: "content.editor_changes_sent_for_cultural_review",
    entityType: "cultural_record",
    entityId: record.id,
    oldValue: { status: "needs_edit" },
    newValue: { status: "submitted", nextStage: "cultural_validation" },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ success: true, status: "submitted" });
}
