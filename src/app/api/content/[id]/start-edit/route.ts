import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContent } from "@/lib/permissions";
import { canReadRecord } from "@/lib/governance";
import { withApiErrors } from "@/lib/content-workflow";

export const POST = withApiErrors(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM cultural_records WHERE id = ${id} FOR UPDATE`;
    const record = await tx.culturalRecord.findUnique({ where: { id } });
    if (!record || !canReadRecord(session.user, record)) throw Object.assign(new Error("Content not found."), { status: 404 });
    if (!canEditContent(session, record.languageId)) throw Object.assign(new Error("Only an assigned editor can review and edit this item."), { status: 403 });
    if (!["submitted", "under_review"].includes(record.status) || record.validatorId) throw Object.assign(new Error("This item has moved to another stage. Refresh the queue."), { status: 409 });
    await tx.culturalRecord.update({ where: { id }, data: { status: "needs_edit", validatorId: session.user.id } });
    await tx.reviewHistory.create({ data: { recordId: id, reviewerId: session.user.id, action: "editor_review_started", stage: "editorial_review", comments: "Editor opened the community-language and English versions for review and editing." } });
    await tx.auditLog.create({ data: { userId: session.user.id, action: "content.editor_review_started", entityType: "cultural_record", entityId: id, oldValue: { status: record.status }, newValue: { status: "needs_edit" } } });
  });
  return NextResponse.json({ success: true });
});
