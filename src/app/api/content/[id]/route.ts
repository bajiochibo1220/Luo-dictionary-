import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canReviewContent } from "@/lib/permissions";
import { embedRecord } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
    include: {
      language: true,
      module: true,
      media: true,
      reviews: {
        include: { reviewer: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: record });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await prisma.culturalRecord.findUnique({ where: { id: params.id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const { title, data, tags } = body;
  const targetLanguageId = Number(body.languageId) || record.languageId;

  if (targetLanguageId !== record.languageId) {
    if (!canReviewContent(session, targetLanguageId)) {
      return NextResponse.json({ error: "You cannot edit this language" }, { status: 403 });
    }
    const languageTranslation = await prisma.culturalRecordTranslation.findUnique({
      where: { recordId_languageId: { recordId: record.id, languageId: targetLanguageId } },
    });
    if (!languageTranslation) return NextResponse.json({ error: "Translation not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      if (title !== undefined) await tx.culturalRecord.update({ where: { id: record.id }, data: { title } });
      return tx.culturalRecordTranslation.update({
        where: { id: languageTranslation.id },
        data: { data: data ?? languageTranslation.data, summary: typeof data?.description === "string" ? data.description : languageTranslation.summary },
      });
    });
    if (record.status === "published" && await hasGemini()) {
      try { await embedRecord(record.id, true); } catch (error) { console.error("[content translation] AI reindex failed:", error); }
    }
    return NextResponse.json({ success: true, data: updated });
  }

  const userId = (session.user as any).id;
  if (record.contributorId !== userId && !canReviewContent(session, record.languageId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: any = {};
  if (title !== undefined) update.title = title;
  if (data !== undefined) update.data = data;
  if (tags !== undefined) update.tags = tags;
  // Only the review workflow can change status.

  const updated = await prisma.culturalRecord.update({
    where: { id: params.id },
    data: update,
  });

  if (updated.status === "published" && await hasGemini()) {
    try { await embedRecord(record.id, true); } catch (error) { console.error("[content update] AI reindex failed:", error); }
  }

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.culturalRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
