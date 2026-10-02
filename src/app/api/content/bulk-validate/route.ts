import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canValidateCulture } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { missingEnglishTranslation } from "@/lib/english-translation";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Sign in first." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const ids: unknown[] = Array.isArray(body.recordIds) ? body.recordIds : [];
  if (!ids.length || ids.length > 100 || ids.some((id) => typeof id !== "string") || new Set(ids).size !== ids.length) {
    return NextResponse.json({ success: false, error: "Select between one and one hundred different items." }, { status: 400 });
  }
  const englishLanguage = await prisma.language.findUnique({ where: { code: "eng" }, select: { id: true } });
  const records = await prisma.culturalRecord.findMany({ where: { id: { in: ids as string[] } }, include: { language: { select: { code: true } }, translations: englishLanguage ? { where: { languageId: englishLanguage.id } } : false } });
  if (records.length !== ids.length) return NextResponse.json({ success: false, error: "One or more items could not be found." }, { status: 404 });
  const languageId = records[0].languageId;
  if (records.some((record) => record.languageId !== languageId || record.status !== "submitted" || record.contributorId === session.user!.id)) {
    return NextResponse.json({ success: false, error: "Select only items awaiting cultural review that you did not contribute." }, { status: 400 });
  }
  for (const record of records) {
    if (record.language.code !== "eng") {
      const missing = missingEnglishTranslation(record.title, record.data, record.translations[0]);
      if (missing.length) return NextResponse.json({ success: false, error: `${record.title}: complete the English version before cultural approval. Missing: ${missing.join(", ")}.` }, { status: 400 });
    }
  }
  if (!canValidateCulture(session, languageId)) return NextResponse.json({ success: false, error: "Only a cultural expert assigned to this language can approve these items." }, { status: 403 });
  const reviewerId = session.user.id!;
  await prisma.$transaction(async (tx) => {
    for (const record of records) {
      const result = await tx.culturalRecord.updateMany({ where: { id: record.id, status: "submitted" }, data: { status: "under_review", validatorId: reviewerId } });
      if (result.count !== 1) throw new Error(`"${record.title}" has already changed. Refresh and try again.`);
      await tx.reviewHistory.create({ data: { recordId: record.id, reviewerId, action: "validated_for_publishing", stage: "cultural_validation", comments: "Approved during bulk cultural review." } });
    }
  });
  await logAction({ userId: reviewerId, action: "content.bulk_validated", entityType: "cultural_record", entityId: records.map((record) => record.id).join(","), newValue: { count: records.length, languageId } });
  const publishers = await prisma.userLanguageRole.findMany({ where: { languageId, role: "publisher" }, select: { userId: true } });
  if (publishers.length) await prisma.notification.createMany({ data: publishers.map(({ userId }) => ({ userId, type: "content_ready_for_publishing", message: `${records.length} culturally approved item${records.length === 1 ? " is" : "s are"} ready for publishing.`, link: "/admin/review-queue" })) });
  return NextResponse.json({ success: true, count: records.length });
}
