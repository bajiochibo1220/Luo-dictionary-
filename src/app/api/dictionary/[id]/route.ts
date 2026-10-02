import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicRecordWhere, parseGovernanceMetadata, buildRecordUri } from "@/lib/governance";
import { canReviewContent, isLanguageAdmin } from "@/lib/permissions";
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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.dictionaryEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canReviewContent(session, existing.languageId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  const publicEligible = governance.data.consentScope === "public_excerpt" && governance.data.restrictionLevel === "public" && (!governance.data.embargoUntil || governance.data.embargoUntil <= new Date());
  const { examples, ...fields } = body;
  const updated = await prisma.dictionaryEntry.update({
    where: { id: params.id },
    data: {
      ...fields,
      ...(examples === undefined ? {} : { examples: examples as Prisma.InputJsonValue }),
      ...governance.data,
      status: publicEligible ? "published" : existing.status === "published" ? "curated" : existing.status,
      publishedAt: publicEligible ? existing.publishedAt ?? new Date() : null,
      nrfUri: buildRecordUri(params.id, governance.data.consentScope, governance.data.restrictionLevel, publicEligible ? "published" : existing.status === "published" ? "curated" : existing.status),
      nrfMetadata: {
        ...(existing.nrfMetadata as Record<string, unknown> | null),
        ...governance.data,
        embargoUntil: governance.data.embargoUntil?.toISOString() ?? null,
      },
    },
  });
  await embedDictionaryEntry(updated.id, true).catch((error) => console.error("[dictionary PATCH] embedding sync failed:", error));

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

  const existing = await prisma.dictionaryEntry.findUnique({ where: { id: params.id }, select: { languageId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isLanguageAdmin(session, existing.languageId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.dictionaryEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
