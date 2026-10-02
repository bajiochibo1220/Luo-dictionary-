import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { canUploadContent } from "@/lib/permissions";
import { validatePhaseOneSubmission } from "@/lib/phase-one-content";

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
    include: { transcripts: { select: { text: true } } },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const userId = (session.user as any).id as string;
  const isUploader = canUploadContent(session, record.languageId);
  if (record.contributorId !== userId && !isUploader) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const uploaderResubmittingInternal = record.status === "curated" && isUploader;
  if (!["draft", "rejected", "needs_edit"].includes(record.status) && !uploaderResubmittingInternal) {
    return NextResponse.json(
      { success: false, error: "Only drafts, returned items, or internal items selected by a reviewer can enter cultural review." },
      { status: 409 }
    );
  }

  const module = await prisma.module.findUnique({ where: { id: record.moduleId }, select: { code: true } });
  const hasLinkedTranscript = record.transcripts.some((item) => item.text.trim().length > 0);
  const requiredError = validatePhaseOneSubmission(module?.code ?? "", record.title, record.data, hasLinkedTranscript);
  if (requiredError) return NextResponse.json({ success: false, error: requiredError }, { status: 400 });
  const recordData = record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : {};
  if (recordData.sourcePermission === "not_granted") {
    return NextResponse.json({ success: false, error: "Permission has not been granted. Keep this contribution as a draft." }, { status: 400 });
  }

  const oldStatus = record.status;

  // Make the transition conditional so concurrent requests cannot resubmit a
  // record after a reviewer has already acted on it.
  const transition = await prisma.culturalRecord.updateMany({
    where: {
      id: params.id,
      ...(!isUploader ? { contributorId: userId } : {}),
      status: { in: uploaderResubmittingInternal ? ["curated"] : ["draft", "rejected", "needs_edit"] },
    },
    data: { status: "submitted", publishedAt: null, validatorId: null },
  });
  if (transition.count !== 1) {
    return NextResponse.json(
      { success: false, error: "This contribution changed while you were submitting it. Refresh and try again." },
      { status: 409 }
    );
  }
  const updated = await prisma.culturalRecord.findUniqueOrThrow({ where: { id: params.id } });

  // Notify cultural experts first. Language admins are notified as overseers.
  const reviewers = await prisma.userLanguageRole.findMany({
    where: {
      languageId: record.languageId,
      role: "cultural_expert",
    },
    select: { userId: true },
  });

  if (reviewers.length > 0) {
    await prisma.notification.createMany({
      data: reviewers.map(({ userId }) => ({
        userId,
        type: "content_submitted",
        message: `New contribution waiting for cultural review: "${record.title}"`,
        link: `/admin/validation-queue/${record.id}`,
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
