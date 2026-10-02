import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { canValidateCulture } from "@/lib/permissions";
import { missingEnglishTranslation } from "@/lib/english-translation";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { comments, checklist } = body;
  const requiredChecks = ["spelling", "translation", "grammar", "pronunciation", "examples", "culture"];
  if (!checklist || requiredChecks.some((key) => checklist[key] !== true)) {
    return NextResponse.json({ error: "Complete every cultural validation checklist item before approving this content." }, { status: 400 });
  }

  const englishLanguage = await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });
  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
    include: { language: { select: { code: true } }, translations: englishLanguage ? { where: { languageId: englishLanguage.id } } : false },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canValidateCulture(session, record.languageId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (record.contributorId && record.contributorId === (session.user as any).id) {
    return NextResponse.json({ error: "You cannot culturally approve your own contribution. Ask another cultural expert to review it." }, { status: 403 });
  }
  const legacyCultureQueueItem = record.status === "under_review" && !record.validatorId;
  if (record.status !== "submitted" && !legacyCultureQueueItem) {
    return NextResponse.json({ error: "This item is no longer waiting for cultural review." }, { status: 409 });
  }
  if (record.language.code !== "eng") {
    const missing = missingEnglishTranslation(record.title, record.data, record.translations[0]);
    if (missing.length) return NextResponse.json({ error: `Complete the English version before cultural approval. Missing: ${missing.join(", ")}.` }, { status: 400 });
  }

  const oldStatus = record.status;

  await prisma.$transaction(async (tx) => {
    const moved = await tx.culturalRecord.updateMany({
      where: {
        id: params.id,
        status: record.status,
        ...(legacyCultureQueueItem ? { validatorId: null } : {}),
      },
      data: { status: "under_review", validatorId: (session.user as any).id },
    });
    if (moved.count !== 1) throw new Error("This item has already been reviewed.");
    await tx.reviewHistory.create({
      data: {
        recordId: params.id,
        reviewerId: (session.user as any).id,
        action: "validated_for_publishing",
        stage: "cultural_validation",
        comments: comments || "",
      },
    });
  });

  const publishers = await prisma.userLanguageRole.findMany({
    where: { languageId: record.languageId, role: "publisher" },
    select: { userId: true },
  });
  if (publishers.length) {
    await prisma.notification.createMany({
      data: publishers.map(({ userId }) => ({
        userId,
        type: "content_ready_for_publishing",
        message: `Cultural review passed: "${record.title}" is ready for publishing.`,
        link: "/admin/review-queue",
      })),
    });
  }

  await logAction({
    userId: (session.user as any).id,
    action: "content.validated",
    entityType: "cultural_record",
    entityId: params.id,
    oldValue: { status: oldStatus },
    newValue: { status: "under_review", checklist },
    ipAddress: req.headers.get("x-forwarded-for") || null,
    userAgent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ success: true });
}
