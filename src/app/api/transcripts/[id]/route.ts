import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canReviewGovernedItem, buildRecordUri, isPubliclyEligible } from "@/lib/governance";
import { canReviewContent } from "@/lib/permissions";
import { addContentVersion } from "@/lib/content-revisions";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const transcript = await prisma.transcript.findUnique({
    where: { id: params.id },
    include: { record: true },
  });
  if (!transcript) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const publicAccess = !!transcript.record && transcript.record.status === "published" && isPubliclyEligible(transcript) && isPubliclyEligible(transcript.record);
  if (!session?.user && !publicAccess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session?.user as any;
  const accessUser = user ? { isSuperAdmin: user.isSuperAdmin, languageRoles: user.languageRoles } : null;
  const mayRead = publicAccess || (!!accessUser && canReviewGovernedItem(accessUser, transcript, transcript.languageId)) ||
    transcript.record?.contributorId === user?.id;
  if (!mayRead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (transcript.record && transcript.record.contributorId !== user?.id &&
      !canReviewGovernedItem(accessUser, transcript.record, transcript.record.languageId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!user) {
    const { id, languageId, recordId, text, languageCode, timestamps, isAligned } = transcript;
    return NextResponse.json({ success: true, data: { id, languageId, recordId, text, languageCode, timestamps, isAligned } });
  }
  return NextResponse.json({ success: true, data: transcript });
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transcript = await prisma.transcript.findUnique({
    where: { id: params.id },
    include: { record: { include: { module: { select: { code: true } } } } },
  });
  if (!transcript) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!transcript.record || !canReviewContent(session, transcript.languageId) ||
      !canReviewGovernedItem(
        { isSuperAdmin: (session.user as any).isSuperAdmin, languageRoles: (session.user as any).languageRoles },
        transcript,
        transcript.languageId
      ) ||
      !canReviewGovernedItem(
        { isSuperAdmin: (session.user as any).isSuperAdmin, languageRoles: (session.user as any).languageRoles },
        transcript.record,
        transcript.record.languageId
      )) {
    return NextResponse.json({ error: "A language curator must edit linked transcripts." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 1_000_000) {
    return NextResponse.json({ error: "Transcript text is required and must be under 1 MB." }, { status: 400 });
  }
  if (body.text === transcript.text) return NextResponse.json({ success: true, unchanged: true, data: transcript });

  const userId = (session.user as any).id as string;
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.transcript.update({
      where: { id: transcript.id },
      data: { text: body.text.trim(), versionNo: { increment: 1 }, aiSummary: null, aiEntities: {} },
    });
    await addContentVersion(tx, {
      recordId: transcript.recordId!,
      changedBy: userId,
      changeReason: typeof body.changeReason === "string" ? body.changeReason.slice(0, 500) : "Transcript revised",
      snapshot: {
        type: "transcript_revision",
        transcriptId: transcript.id,
        transcriptVersion: transcript.versionNo,
        text: transcript.text,
        languageCode: transcript.languageCode,
        sourceId: transcript.sourceId,
        sourceUri: transcript.sourceUri,
        sourceChecksum: transcript.sourceChecksum,
      } as any,
    });

    if (transcript.record!.status === "published") {
      await tx.culturalRecord.update({
        where: { id: transcript.recordId! },
        data: {
          status: "curated",
          publishedAt: null,
          nrfUri: buildRecordUri(transcript.recordId!, transcript.record!.consentScope, transcript.record!.restrictionLevel, "curated"),
        },
      });
      await tx.embedding.deleteMany({ where: { recordId: transcript.recordId! } });
    }
    await tx.embedding.deleteMany({ where: { transcriptId: transcript.id } });
    return saved;
  });

  await logAction({
    userId,
    action: "transcript.revised",
    entityType: "transcript",
    entityId: transcript.id,
    oldValue: { version: transcript.versionNo, checksum: transcript.sourceChecksum },
    newValue: { version: updated.versionNo, recordId: transcript.recordId, status: transcript.record.status === "published" ? "curated" : transcript.record.status },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ success: true, data: updated });
}
