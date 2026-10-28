import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canPublishBeforeReview } from "@/lib/permissions";
import { isPubliclyEligible, mayReviewRecord } from "@/lib/governance";
import { hasPublicReleaseSourcePermission } from "@/lib/phase-one-content";
import { EARLY_PUBLICATION_STATUSES, writePublication } from "@/lib/content-publication";
import { withApiErrors } from "@/lib/content-workflow";

export const POST = withApiErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const actorId = session.user.id;
  const publication = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM cultural_records WHERE id = ${id} FOR UPDATE`;
    const record = await tx.culturalRecord.findUnique({ where: { id }, include: { module: { select: { code: true } } } });
    if (!record) throw Object.assign(new Error("Content not found."), { status: 404 });
    if (!canPublishBeforeReview(session, record.languageId) || !mayReviewRecord(session.user, record) || record.contributorId === actorId) {
      throw Object.assign(new Error("An independent reviewer, editor, publisher or administrator assigned to this language must publish this upload."), { status: 403 });
    }
    if (record.publicationOfId || !EARLY_PUBLICATION_STATUSES.includes(record.status)) throw Object.assign(new Error("This item cannot be published before review at its current stage."), { status: 409 });
    if (await tx.culturalRecord.findUnique({ where: { publicationOfId: id } })) throw Object.assign(new Error("This upload already has a public version. Complete review and publish the reviewed version to replace it."), { status: 409 });
    if (!record.title.trim() || !isPubliclyEligible(record) || !hasPublicReleaseSourcePermission(record.module.code, record.data)) {
      throw Object.assign(new Error("A title, public consent, public access and confirmed source permission are required before public release."), { status: 400 });
    }
    const published = await writePublication(tx, id, actorId, true);
    if (record.status === "draft") await tx.culturalRecord.update({ where: { id }, data: { status: "submitted", validatorId: null } });
    await tx.reviewHistory.create({ data: { recordId: id, reviewerId: actorId, action: "published_before_review", stage: "early_publication", comments: "Public snapshot released; cultural and editorial review remains pending." } });
    await tx.auditLog.create({ data: { userId: actorId, action: "content.published_before_review", entityType: "cultural_record", entityId: id, newValue: { publicationId: published.id, isProvisional: true } } });
    return published;
  }, { timeout: 60_000 });
  return NextResponse.json({ success: true, publicationId: publication.id, isProvisional: true });
});
