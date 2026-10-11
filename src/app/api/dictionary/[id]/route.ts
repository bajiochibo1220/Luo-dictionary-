import { assertServiceAvailable } from "@/lib/maintenance";
import { withApiErrors } from "@/lib/content-workflow";
import { addContentVersion } from "@/lib/content-revisions";
import { createDefaultRecordTranslations } from "@/lib/content-translations";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicRecordWhere, canReadRecord, parseGovernanceMetadata, buildRecordUri } from "@/lib/governance";
import { canEditContent, isLanguageAdmin } from "@/lib/permissions";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { embedDictionaryEntry } from "@/lib/ai/embeddings";

const updateSchema = z.object({
  dholuo: z.string().min(1).optional(),
  english: z.string().min(1).optional(),
  kiswahili: z.string().nullable().optional(),
  pronunciation: z.string().nullable().optional(),
  grammarClass: z.string().nullable().optional(),
  wordOrigin: z.string().nullable().optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  examples: z.unknown().optional(),
  consentScope: z.enum(["pending", "research_only", "teaching", "public_excerpt", "community_only", "embargoed"]).optional(),
  restrictionLevel: z.enum(["public", "internal", "restricted", "sacred"]).optional(),
  embargoUntil: z.coerce.date().nullable().optional(),
  countyCode: z.string().trim().max(12).nullable().optional(),
  siteName: z.string().trim().max(200).nullable().optional(),
  sourceReference: z.string().trim().max(500).nullable().optional(),
  sessionId: z.string().trim().max(100).regex(/^[A-Za-z0-9_-]+$/).nullable().optional(),
}).strict();

async function handleGET(
  _req: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  await assertServiceAvailable();
  const entry = await prisma.dictionaryEntry.findUnique({
    where: { id: params.id, ...publicRecordWhere() },
  });

  if (!entry) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: entry });
}

async function handlePATCH(
  req: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.dictionaryEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditContent(session, existing.languageId) || !canReadRecord(session.user, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof updateSchema>;
  try { body = updateSchema.parse(await req.json()); }
  catch (error: any) { return NextResponse.json({ error: error.errors?.[0]?.message ?? "Invalid request" }, { status: 400 }); }
  const governance = parseGovernanceMetadata({
    consentScope: body.consentScope ?? existing.consentScope,
    restrictionLevel: body.restrictionLevel ?? existing.restrictionLevel,
    embargoUntil: body.embargoUntil === undefined ? existing.embargoUntil : body.embargoUntil,
    countyCode: body.countyCode === undefined ? existing.countyCode : body.countyCode,
    siteName: body.siteName === undefined ? existing.siteName : body.siteName,
    sourceReference: body.sourceReference === undefined ? existing.sourceReference : body.sourceReference,
    sessionId: body.sessionId === undefined ? existing.sessionId : body.sessionId,
  });
  if (!governance.success) return NextResponse.json({ error: governance.error.issues[0]?.message ?? "Invalid governance metadata" }, { status: 400 });
  const contentModule = await prisma.module.findUnique({ where: { code: "dictionary" } });
  if (!contentModule) return NextResponse.json({ error: "Dictionary module is not configured" }, { status: 409 });
  const fields = { ...existing, ...body };
  const data = { dholuo: fields.dholuo, english: fields.english, kiswahili: fields.kiswahili, pronunciation: fields.pronunciation, grammarClass: fields.grammarClass, wordOrigin: fields.wordOrigin, synonyms: fields.synonyms, antonyms: fields.antonyms, examples: fields.examples, sourcePermission: "needs_review" };
  const updated = await prisma.$transaction(async (tx) => {
    const moved = await tx.dictionaryEntry.updateMany({ where: { id: existing.id, updatedAt: existing.updatedAt }, data: { status: "curated", publishedAt: null } });
    if (moved.count !== 1) throw Object.assign(new Error("Entry already changed; refresh and retry."), { status: 409 });
    const alreadyConverted = await tx.culturalRecord.findUnique({ where: { id: existing.id } });
    if (alreadyConverted) throw Object.assign(new Error("Use the Content editor to revise this dictionary entry."), { status: 409 });
    const record = await tx.culturalRecord.create({ data: { id: existing.id, languageId: existing.languageId, moduleId: contentModule.id, title: fields.dholuo, data: data as Prisma.InputJsonValue, tags: [], status: "draft", contributorId: session.user.id, ...governance.data, nrfUri: buildRecordUri(existing.id, governance.data.consentScope, governance.data.restrictionLevel, "draft") } });
    await tx.mediaAsset.updateMany({ where: { dictionaryId: existing.id }, data: { dictionaryId: null, recordId: record.id } });
    await createDefaultRecordTranslations(tx, record.id, record.languageId);
    await addContentVersion(tx, { recordId: record.id, changedBy: session.user.id!, changeReason: "Legacy dictionary entry moved into the reviewed content workflow", snapshot: { title: record.title, data: record.data, status: "draft" } as any });
    await tx.$executeRawUnsafe('DELETE FROM embeddings WHERE "dictionaryId" = $1', existing.id);
    return record;
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.dictionaryEntry.findUnique({ where: { id: params.id }, select: { languageId: true, status: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isLanguageAdmin(session, existing.languageId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (existing.status === "published") return NextResponse.json({ error: "Published content cannot be deleted" }, { status: 409 });
  await prisma.dictionaryEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export const PATCH = withApiErrors(handlePATCH);

export const GET = withApiErrors(handleGET);
