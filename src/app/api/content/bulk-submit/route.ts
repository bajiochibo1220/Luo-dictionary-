import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canUploadContent } from "@/lib/permissions";
import { validatePhaseOneSubmission } from "@/lib/phase-one-content";
import { logAction } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const recordIds: unknown[] = Array.isArray(body.recordIds) ? body.recordIds : [];
  if (!recordIds.length || recordIds.length > 100 || recordIds.some((id) => typeof id !== "string") || new Set(recordIds).size !== recordIds.length) {
    return NextResponse.json({ success: false, error: "Select between one and one hundred different items." }, { status: 400 });
  }

  const records = await prisma.culturalRecord.findMany({
    where: { id: { in: recordIds as string[] } },
    include: { module: { select: { code: true } }, transcripts: { select: { text: true } } },
  });
  if (records.length !== recordIds.length) return NextResponse.json({ success: false, error: "One or more items could not be found." }, { status: 404 });
  for (const record of records) {
    if (!["draft", "rejected", "curated"].includes(record.status)) {
      return NextResponse.json({ success: false, error: `${record.title}: status is “${record.status}”; only drafts, returned items, and internally curated items can be sent for cultural review.` }, { status: 400 });
    }
    if (!canUploadContent(session, record.languageId)) {
      return NextResponse.json({ success: false, error: `${record.title}: only an uploader assigned to this language can send uploaded content for cultural review.` }, { status: 403 });
    }
    const hasLinkedTranscript = record.transcripts.some((item) => item.text.trim().length > 0);
    const issue = validatePhaseOneSubmission(record.module.code, record.title, record.data, hasLinkedTranscript);
    if (issue) return NextResponse.json({ success: false, error: `${record.title}: ${issue}` }, { status: 400 });
    const data = record.data && typeof record.data === "object" && !Array.isArray(record.data) ? record.data as Record<string, unknown> : {};
    if (data.sourcePermission === "not_granted") return NextResponse.json({ success: false, error: `${record.title}: source permission was not granted.` }, { status: 400 });
  }

  const userId = (session.user as any).id as string;
  await prisma.$transaction(async (tx) => {
    for (const record of records) {
      const allowedStatuses = record.status === "curated" ? ["curated"] : ["draft", "rejected"];
      const moved = await tx.culturalRecord.updateMany({
        where: { id: record.id, status: { in: allowedStatuses } },
        data: { status: "submitted", validatorId: null, publishedAt: null },
      });
      if (moved.count !== 1) throw new Error(`"${record.title}" has already changed. Refresh and try again.`);
      await tx.reviewHistory.create({
        data: { recordId: record.id, reviewerId: userId, action: "submitted_for_cultural_review", stage: "cultural_validation", comments: "Submitted for cultural authenticity review." },
      });
    }
  }, { maxWait: 15_000, timeout: 30_000 });

  const groups = new Map<number, typeof records>();
  for (const record of records) groups.set(record.languageId, [...(groups.get(record.languageId) ?? []), record]);
  for (const [languageId, languageRecords] of groups) {
    const reviewers = await prisma.userLanguageRole.findMany({
      where: { languageId, role: "cultural_expert" },
      select: { userId: true },
      distinct: ["userId"],
    });
    if (reviewers.length) {
      try {
        await prisma.notification.createMany({
          data: reviewers.map(({ userId: recipientId }) => ({
            userId: recipientId,
            type: "content_submitted",
            message: `${languageRecords.length} item${languageRecords.length === 1 ? " is" : "s are"} waiting for cultural review.`,
            link: "/admin/validation-queue",
          })),
        });
      } catch (error) {
        console.error("[content/bulk-submit] Reviewer notification failed:", error);
      }
    }
  }

  try {
    await logAction({
      userId,
      action: "content.bulk_submitted_for_cultural_review",
      entityType: "cultural_record",
      entityId: records.map((record) => record.id).join(","),
      newValue: {
        count: records.length,
        languages: [...groups.keys()],
        modules: [...new Set(records.map((record) => record.moduleId))],
      },
    });
  } catch (error) {
    console.error("[content/bulk-submit] Audit log failed:", error);
  }

  return NextResponse.json({ success: true, count: records.length });
  } catch (error: any) {
    console.error("[content/bulk-submit] Failed:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Could not send the selected items to cultural review." },
      { status: 500 },
    );
  }
}
