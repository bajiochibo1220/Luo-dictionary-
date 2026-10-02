import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canValidateCulture } from "@/lib/permissions";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
    include: { module: { select: { code: true } }, transcripts: { select: { text: true } } },
  });
  if (!record) return NextResponse.json({ error: "Content not found." }, { status: 404 });
  if (!canValidateCulture(session, record.languageId)) return NextResponse.json({ error: "Only an assigned cultural reviewer can approve this item." }, { status: 403 });
  if (record.contributorId && record.contributorId === session.user.id) return NextResponse.json({ error: "You cannot review your own contribution." }, { status: 403 });
  if (record.status !== "submitted" && !(record.status === "under_review" && !record.validatorId)) {
    return NextResponse.json({ error: "This item is no longer waiting for cultural review." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const requiredChecks = ["spelling", "translation", "grammar", "pronunciation", "examples", "culture"];
  if (!body.checklist || requiredChecks.some((key) => body.checklist[key] !== true)) {
    return NextResponse.json({ error: "Complete every cultural validation checklist item before approving the item for publishing." }, { status: 400 });
  }
  const reviewerId = session.user.id;
  const comments = typeof body.comments === "string" ? body.comments.slice(0, 2000) : "";
  const oldStatus = record.status;
  await prisma.$transaction(async (tx) => {
    const moved = await tx.culturalRecord.updateMany({
      where: { id: record.id, status: oldStatus, ...(oldStatus === "under_review" ? { validatorId: null } : {}) },
      data: {
        status: "under_review",
        publishedAt: null,
        validatorId: reviewerId,
        reviewerId: null,
      },
    });
    if (moved.count !== 1) throw new Error("This item has already moved to another review stage.");
    await tx.reviewHistory.create({
      data: {
        recordId: record.id,
        reviewerId,
        action: "validated_for_publishing",
        stage: "cultural_validation",
        comments: `${comments || "Cultural review passed; sent for publisher release."}\nChecklist: ${JSON.stringify(body.checklist)}`,
      },
    });
  });
  const publishers = await prisma.userLanguageRole.findMany({ where: { languageId: record.languageId, role: "publisher" }, select: { userId: true } });
  if (publishers.length) await prisma.notification.createMany({ data: publishers.map(({ userId }) => ({ userId, type: "content_ready_for_publishing", message: `Cultural review passed: "${record.title}" is ready for publishing.`, link: "/admin/review-queue" })) });
  return NextResponse.json({ success: true, status: "under_review", message: "Sent to the publisher queue." });
}
