import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canValidateCulture } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { randomUUID } from "node:crypto";
import { deleteFromCloudinary } from "@/lib/cloudinary";

const STAGE_PREFIX = "cultural_rejection_vote:";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Sign in first." }, { status: 401 });
  const userId = session.user.id;
  const body = await request.json().catch(() => ({}));
  const intent = body.intent;
  const comments = typeof body.comments === "string" ? body.comments.trim().slice(0, 2000) : "";
  const record = await prisma.culturalRecord.findUnique({ where: { id: params.id } });
  if (!record) return NextResponse.json({ success: false, error: "Content not found." }, { status: 404 });
  if (!canValidateCulture(session, record.languageId)) return NextResponse.json({ success: false, error: "Only an assigned cultural reviewer can propose or vote on this review." }, { status: 403 });
  if (record.contributorId === userId) return NextResponse.json({ success: false, error: "You cannot review your own contribution." }, { status: 403 });

  if (intent === "propose") {
    if (comments.length < 8) return NextResponse.json({ success: false, error: "Give a clear cultural reason of at least 8 characters." }, { status: 400 });
    if (record.status !== "submitted" && !(record.status === "under_review" && !record.validatorId)) {
      return NextResponse.json({ success: false, error: "This item is not waiting for cultural review." }, { status: 409 });
    }
    const otherReviewers = await prisma.userLanguageRole.findMany({
      where: { languageId: record.languageId, role: "cultural_expert", userId: { notIn: [userId, ...(record.contributorId ? [record.contributorId] : [])] }, user: { status: "active" } },
      select: { userId: true },
      distinct: ["userId"],
    });
    if (!otherReviewers.length) return NextResponse.json({ success: false, error: "An independent cultural reviewer must be assigned to this language before a rejection can be voted on." }, { status: 409 });

    const proposalStage = `${STAGE_PREFIX}${randomUUID()}`;
    try {
      await prisma.$transaction(async (tx) => {
        const moved = await tx.culturalRecord.updateMany({
          where: { id: record.id, status: record.status, ...(record.status === "under_review" ? { validatorId: null } : {}) },
          data: { status: "rejection_review", validatorId: userId },
        });
        if (moved.count !== 1) throw new Error("This item has already moved to another review stage.");
        await tx.reviewHistory.create({ data: { recordId: record.id, reviewerId: userId, action: "rejection_proposed", stage: proposalStage, comments } });
      });
    } catch (error) {
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not start the rejection review." }, { status: 409 });
    }
    await Promise.all([
      ...otherReviewers.map(({ userId: reviewerUserId }) => prisma.notification.create({
        data: {
          userId: reviewerUserId,
          type: "cultural_rejection_vote",
          message: `An independent cultural rejection vote is needed for "${record.title}".`,
          link: `/admin/validation-queue/${record.id}`,
        },
      })),
      logAction({
        userId,
        action: "content.rejection_proposed",
        entityType: "cultural_record",
        entityId: record.id,
        oldValue: { status: record.status },
        newValue: { status: "rejection_review", proposerId: userId, reason: comments, invitedReviewerCount: otherReviewers.length },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      }),
    ]);
    return NextResponse.json({ success: true, message: `Sent for independent review by ${otherReviewers.length} cultural reviewer${otherReviewers.length === 1 ? "" : "s"}.` });
  }

  if (intent !== "vote_invalid" && intent !== "vote_valid") return NextResponse.json({ success: false, error: "Choose propose, vote_invalid, or vote_valid." }, { status: 400 });
  if (intent === "vote_invalid" && comments.length < 8) return NextResponse.json({ success: false, error: "Give a clear reason for an invalid vote." }, { status: 400 });
  if (record.status !== "rejection_review") return NextResponse.json({ success: false, error: "There is no rejection vote open for this item." }, { status: 409 });

  const proposal = await prisma.reviewHistory.findFirst({ where: { recordId: record.id, stage: { startsWith: STAGE_PREFIX }, action: "rejection_proposed" }, orderBy: { createdAt: "desc" } });
  if (!proposal) return NextResponse.json({ success: false, error: "The rejection proposal could not be found." }, { status: 409 });
  const stage = proposal.stage;
  if (proposal.reviewerId === userId) return NextResponse.json({ success: false, error: "The reviewer who proposed rejection cannot vote on that proposal." }, { status: 403 });

  const reviewerAssignments = await prisma.userLanguageRole.findMany({
    where: { languageId: record.languageId, role: "cultural_expert", userId: { notIn: [proposal.reviewerId, ...(record.contributorId ? [record.contributorId] : [])] }, user: { status: "active" } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const eligibleIds = reviewerAssignments.map(({ userId: assignedUserId }) => assignedUserId);
  if (!eligibleIds.includes(userId)) return NextResponse.json({ success: false, error: "Only another active cultural expert assigned to this language may vote." }, { status: 403 });

  const existingVote = await prisma.reviewHistory.findFirst({ where: { recordId: record.id, reviewerId: userId, stage, action: { in: ["rejection_vote_invalid", "rejection_vote_valid"] } } });
  if (existingVote) return NextResponse.json({ success: false, error: "You have already voted on this proposal." }, { status: 409 });

  const action = intent === "vote_invalid" ? "rejection_vote_invalid" : "rejection_vote_valid";
  const threshold = Math.max(1, Math.ceil(eligibleIds.length / 3));
  const vote = await prisma.$transaction(async (tx) => {
    const current = await tx.culturalRecord.findUnique({ where: { id: record.id }, select: { status: true } });
    if (current?.status !== "rejection_review") throw new Error("This rejection vote has already closed.");
    const duplicate = await tx.reviewHistory.findFirst({ where: { recordId: record.id, reviewerId: userId, stage, action: { in: ["rejection_vote_invalid", "rejection_vote_valid"] } }, select: { id: true } });
    if (duplicate) throw new Error("You have already voted on this proposal.");
    await tx.reviewHistory.create({ data: { recordId: record.id, reviewerId: userId, action, stage, comments } });
    const votes = await tx.reviewHistory.findMany({
      where: { recordId: record.id, stage, reviewerId: { in: eligibleIds }, action: { in: ["rejection_vote_invalid", "rejection_vote_valid"] } },
      select: { reviewerId: true, action: true },
    });
    const distinctVotes = new Map(votes.map((item) => [item.reviewerId, item.action]));
    const invalidVotes = [...distinctVotes.values()].filter((item) => item === "rejection_vote_invalid").length;
    const validVotes = [...distinctVotes.values()].filter((item) => item === "rejection_vote_valid").length;
    let result: "open" | "rejected" | "cleared" = "open";
    if (invalidVotes >= threshold) {
      result = "rejected";
      await tx.culturalRecord.updateMany({ where: { id: record.id, status: "rejection_review" }, data: { status: "rejected", publishedAt: null } });
      await tx.reviewHistory.create({ data: { recordId: record.id, reviewerId: userId, action: "rejection_confirmed", stage, comments: `${invalidVotes} of ${eligibleIds.length} eligible independent reviewers voted culturally invalid; threshold ${threshold} reached.` } });
    } else if (distinctVotes.size >= eligibleIds.length) {
      result = "cleared";
      await tx.culturalRecord.updateMany({ where: { id: record.id, status: "rejection_review" }, data: { status: "submitted", validatorId: null } });
      await tx.reviewHistory.create({ data: { recordId: record.id, reviewerId: userId, action: "rejection_not_confirmed", stage, comments: `${invalidVotes} invalid and ${validVotes} valid votes; the rejection threshold was not reached.` } });
    }
    return { result, invalidVotes, validVotes };
  });

  let deletionFailed = false;
  if (vote.result === "rejected") {
    const media = await prisma.mediaAsset.findMany({
      where: { recordId: record.id },
      select: { id: true, publicId: true, resourceType: true, deliveryType: true },
    });
    const deletionResults = await Promise.allSettled(media.map((asset) => deleteFromCloudinary(
      asset.publicId,
      (asset.resourceType === "video" || asset.resourceType === "raw" ? asset.resourceType : "image"),
      (asset.deliveryType === "upload" ? "upload" : "authenticated"),
    )));
    deletionFailed = deletionResults.some((result) => result.status === "rejected");

    const reviewTrail = await prisma.reviewHistory.findMany({
      where: { recordId: record.id, stage },
      orderBy: { createdAt: "asc" },
      include: { reviewer: { select: { name: true, email: true } } },
    });
    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          userId,
          action: deletionFailed ? "content.rejection_deletion_failed" : "content.rejected_and_deleted",
          entityType: "cultural_record",
          entityId: record.id,
          oldValue: { status: "rejection_review" },
          newValue: {
            status: "rejected",
            deleted: !deletionFailed,
            mediaDeletionFailed: deletionFailed,
            title: record.title,
            languageId: record.languageId,
            moduleId: record.moduleId,
            proposerId: proposal.reviewerId,
            invalidVotes: vote.invalidVotes,
            validVotes: vote.validVotes,
            eligibleReviewers: eligibleIds.length,
            threshold,
            reviewTrail: reviewTrail.map((entry) => ({
              reviewerId: entry.reviewerId,
              reviewerName: entry.reviewer.name,
              reviewerEmail: entry.reviewer.email,
              action: entry.action,
              comments: entry.comments,
              createdAt: entry.createdAt.toISOString(),
            })),
          },
          ipAddress: request.headers.get("x-forwarded-for"),
          userAgent: request.headers.get("user-agent"),
        },
      });
      if (!deletionFailed) {
        await tx.culturalRecord.deleteMany({ where: { id: record.id, status: "rejected" } });
      }
    });
  }

  const message = vote.result === "rejected"
    ? deletionFailed
      ? "Reviewers confirmed the rejection. The item is hidden from public use, but attached files could not all be deleted; the failure and full vote history were logged."
      : "The independent reviewers confirmed the rejection. The item and attached files were deleted after the full vote history was archived."
    : vote.result === "cleared"
      ? "The rejection proposal did not reach the one-third threshold. The item returned to the cultural review queue."
      : `Vote recorded: ${vote.invalidVotes} invalid and ${vote.validVotes} valid.`;
  await logAction({
    userId,
    action: vote.result === "rejected" ? "content.rejection_confirmed" : "content.rejection_vote",
    entityType: "cultural_record",
    entityId: record.id,
    oldValue: { status: "rejection_review" },
    newValue: { status: vote.result === "rejected" ? "rejected" : vote.result === "cleared" ? "submitted" : "rejection_review", vote: intent, reason: comments, invalidVotes: vote.invalidVotes, validVotes: vote.validVotes, eligibleReviewers: eligibleIds.length, threshold },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ success: true, result: vote.result, message });
}
