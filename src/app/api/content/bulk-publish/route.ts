import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canReviewContent } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const recordIds = Array.isArray(body.recordIds) ? body.recordIds : [];
  if (recordIds.length < 1 || recordIds.length > 20 || recordIds.some((id: unknown) => typeof id !== "string") || new Set(recordIds).size !== recordIds.length) {
    return NextResponse.json({ success: false, error: "Choose between one and twenty unique records" }, { status: 400 });
  }

  const records = await prisma.culturalRecord.findMany({
    where: { id: { in: recordIds } },
    select: { id: true, title: true, languageId: true, moduleId: true, status: true, _count: { select: { media: true } } },
  });
  if (records.length !== recordIds.length) {
    return NextResponse.json({ success: false, error: "One or more records were not found" }, { status: 404 });
  }
  const languageId = records[0].languageId;
  const moduleId = records[0].moduleId;
  if (records.some((record) => record.languageId !== languageId || record.moduleId !== moduleId || record.status !== "draft" || record._count.media < 1)) {
    return NextResponse.json({ success: false, error: "All items must be media-backed drafts in the same language and content area" }, { status: 400 });
  }
  if (!canReviewContent(session, languageId)) {
    return NextResponse.json({ success: false, error: "You cannot publish content in this language" }, { status: 403 });
  }

  const reviewerId = (session.user as any).id;
  const publishedAt = new Date();
  await prisma.$transaction(async (tx) => {
    for (const record of records) {
      await tx.culturalRecord.update({
        where: { id: record.id },
        data: { status: "published", publishedAt, reviewerId },
      });
      await tx.reviewHistory.create({
        data: {
          recordId: record.id,
          reviewerId,
          action: "approved",
          stage: "moderation",
          comments: "Published in a bulk media upload",
        },
      });
    }
  });

  await Promise.all(records.map((record) => logAction({
    userId: reviewerId,
    action: "content.approved",
    entityType: "cultural_record",
    entityId: record.id,
    oldValue: { status: "draft" },
    newValue: { status: "published", source: "bulk_media_upload" },
    ipAddress: req.headers.get("x-forwarded-for") || null,
    userAgent: req.headers.get("user-agent") || null,
  })));

  return NextResponse.json({ success: true, count: records.length });
}
