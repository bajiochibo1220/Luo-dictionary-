import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { canContribute, canReviewContent, canUploadContent } from "@/lib/permissions";
import { createDefaultRecordTranslations } from "@/lib/content-translations";
import { buildRecordUri, canReviewGovernedItem, generateCollectionSessionId, getRepositoryDomain, parseGovernanceMetadata } from "@/lib/governance";
import { addContentVersion } from "@/lib/content-revisions";
import { validatePhaseOneSubmission } from "@/lib/phase-one-content";
import { parseContentProvenance } from "@/lib/content-provenance";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const languageId = Number(searchParams.get("languageId") || 0);
    const moduleCode = searchParams.get("module") || "";
    const status = searchParams.get("status") || "";
    const q = searchParams.get("q")?.trim() || "";
    const mine = searchParams.get("mine") === "true";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Number(searchParams.get("limit") || 50));
    const skip = (page - 1) * limit;

    const user = session.user as any;
    const isSuperAdmin = !!(user.isSuperAdmin || user.isMasterSuperAdmin);
    const roles = (user.languageRoles ?? []) as any[];
    const uploaderOnly = !isSuperAdmin && roles.length > 0 && roles.every((role) => role.role === "uploader");
    const managedLanguageIds = isSuperAdmin
      ? undefined
      : ((user.languageRoles ?? []) as any[])
          .filter((r) =>
            [
              "language_admin",
              "uploader",
              "publisher",
              "content_editor",
              "cultural_expert",
            ].includes(r.role)
          )
          .map((r) => r.languageId);

    const where: any = {};
    if (uploaderOnly) {
      where.contributorId = user.id;
    } else if (!isSuperAdmin) {
      where.AND = [{
        OR: [
          { languageId: { in: managedLanguageIds ?? [] } },
          { contributorId: user.id },
        ],
      }];
    }
    if (mine) where.contributorId = user.id;
    if (languageId > 0) where.languageId = languageId;
    else if (managedLanguageIds?.length) where.languageId = { in: managedLanguageIds };
    if (moduleCode) {
      const mod = await prisma.module.findUnique({
        where: { code: moduleCode },
      });
      if (mod) where.moduleId = mod.id;
    }
    if (status) where.status = status;
    if (q) where.title = { contains: q, mode: "insensitive" };

    const accessUser = { isSuperAdmin, languageRoles: user.languageRoles };
    // Apply governance before pagination and counting so inaccessible records
    // cannot leak their existence through page totals or sparse result pages.
    const candidates = await prisma.culturalRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        languageId: true,
        contributorId: true,
        consentScope: true,
        restrictionLevel: true,
        embargoUntil: true,
      },
    });
    const visibleIds = candidates
      .filter((record) => record.contributorId === user.id || canReviewGovernedItem(accessUser, record, record.languageId))
      .slice(skip, skip + limit)
      .map((record) => record.id);
    const total = candidates.filter((record) =>
      record.contributorId === user.id || canReviewGovernedItem(accessUser, record, record.languageId)
    ).length;
    const records = visibleIds.length ? await prisma.culturalRecord.findMany({
      where: { id: { in: visibleIds } },
      orderBy: { createdAt: "desc" },
      include: {
        language: { select: { code: true, name: true, nativeName: true } },
        module: { select: { code: true, baseName: true } },
        media: true,
        contributor: { select: { id: true, name: true, email: true, age: true } },
      },
    }) : [];

    const visibleRecords = records.map((record) => ({
        ...record,
        media: record.media.filter((asset) => record.contributorId === user.id || canReviewGovernedItem(accessUser, asset, asset.languageId)),
      }));

    return NextResponse.json({
      success: true,
      data: visibleRecords,
      meta: { page, total, limit },
    });
  } catch (err: any) {
    console.error("[content GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      languageId,
      moduleCode,
      title,
      data,
      tags,
      primaryMediaType,
      status,
    } = body;

    const governance = parseGovernanceMetadata(body);
    if (!governance.success) {
      return NextResponse.json({ success: false, error: governance.error.issues[0]?.message || "Invalid governance metadata" }, { status: 400 });
    }
    const provenance = parseContentProvenance(body.provenance);
    if (!provenance.success) return NextResponse.json({ success: false, error: provenance.error.issues[0]?.message || "Invalid provenance metadata" }, { status: 400 });

    if (!languageId || !moduleCode || !title) {
      return NextResponse.json(
        { success: false, error: "languageId, moduleCode, title required" },
        { status: 400 }
      );
    }

    const mod = await prisma.module.findUnique({ where: { code: moduleCode } });
    if (!mod) {
      return NextResponse.json(
        { success: false, error: "Module not found" },
        { status: 400 }
      );
    }
    const language = await prisma.language.findUnique({ where: { id: Number(languageId) } });
    if (!language) return NextResponse.json({ success: false, error: "Invalid language" }, { status: 400 });
    if (!canContribute(session, language.id)) return NextResponse.json({ success: false, error: "You cannot contribute to this language" }, { status: 403 });

    // Snapshot the user's current age
    const dbUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { age: true },
    });

    const isUploader = canUploadContent(session, language.id);
    const recordStatus = isUploader || canReviewContent(session, language.id) ? "draft" : status === "draft" ? "draft" : "submitted";
    if (recordStatus === "submitted") {
      const validationError = validatePhaseOneSubmission(moduleCode, title, data);
      if (validationError) return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const record = await prisma.$transaction(async (tx) => {
      const recordId = crypto.randomUUID();
      const sessionId = await generateCollectionSessionId(tx, governance.data);
      const domain = getRepositoryDomain(moduleCode);
      const r = await tx.culturalRecord.create({
        data: {
          id: recordId,
          languageId: language.id,
          moduleId: mod.id,
          title,
          data: data ?? {},
          tags: tags ?? [],
          // Public contributors can only submit for review. Admin publishing is
          // decided from the authenticated role, never from the request body.
          status: recordStatus,
          publishedAt: null,
          primaryMediaType: primaryMediaType ?? null,
          contributorAge: dbUser?.age ?? null,
          contributorId: (session.user as any).id,
          ...governance.data,
          sessionId,
          nrfUri: buildRecordUri(recordId, governance.data.consentScope, governance.data.restrictionLevel, recordStatus),
          nrfMetadata: {
            domainCode: domain.code,
            domain: domain.name,
            genre: moduleCode,
            consentScope: governance.data.consentScope,
            restrictionLevel: governance.data.restrictionLevel,
            embargoUntil: governance.data.embargoUntil?.toISOString() ?? null,
            countyCode: governance.data.countyCode,
            siteName: governance.data.siteName,
            sourceReference: governance.data.sourceReference,
            sessionId,
          },
        },
      });
      if (provenance.data) {
        await tx.provenance.create({
          data: {
            recordId: r.id,
            ...provenance.data,
            sourceLocation: provenance.data.sourceLocation ?? governance.data.siteName ?? null,
            collector: provenance.data.collector ?? (session.user as any).name ?? null,
          },
        });
      }

      const contentData = data && typeof data === "object" && !Array.isArray(data)
        ? data as Record<string, unknown>
        : {};
      const sourcePermission = contentData.sourcePermission;
      if (moduleCode === "oral_histories" || typeof sourcePermission === "string") {
        const confirmed = sourcePermission === "confirmed";
        const attribution = ["ask_later", "name", "anonymous", "community"].includes(String(contentData.attributionPreference))
          ? String(contentData.attributionPreference)
          : "ask_later";
        await tx.consentRecord.create({
          data: {
            languageId: language.id,
            recordId: r.id,
            contributorName: (session.user as any).name || "Undisclosed contributor",
            contributorType: "contributor",
            consentType: "source_permission",
            consentGiven: confirmed,
            consentDate: confirmed ? new Date() : null,
            sourcePermissionStatus: confirmed ? "confirmed" : sourcePermission === "not_granted" ? "not_granted" : "needs_review",
            attributionPreference: attribution,
            consentScope: governance.data.consentScope,
            restrictionLevel: governance.data.restrictionLevel,
            embargoUntil: governance.data.embargoUntil,
            notes: "Source-permission declaration captured with the contribution. Reviewer confirmation is recorded separately.",
          },
        });
      }

      await createDefaultRecordTranslations(tx, r.id, language.id);
      await addContentVersion(tx, {
        recordId: r.id,
        changedBy: (session.user as any).id,
        changeReason: "Initial submission",
        snapshot: {
          title: r.title,
          data: r.data as any,
          summary: r.summary,
          tags: r.tags,
          status: r.status,
          consentScope: r.consentScope,
          restrictionLevel: r.restrictionLevel,
          embargoUntil: r.embargoUntil?.toISOString() ?? null,
          countyCode: r.countyCode,
          siteName: r.siteName,
          sourceReference: r.sourceReference,
          sessionId: r.sessionId,
          provenance: provenance.data,
        } as any,
      });

      return r;
    }, { maxWait: 15_000, timeout: 30_000 });

    // Notify cultural reviewers first. Language administrators are included as overseers.
    if (record.status === "submitted") {
      const reviewers = await prisma.userLanguageRole.findMany({
        where: {
          languageId,
          role: "cultural_expert",
        },
        select: { userId: true },
      });
      if (reviewers.length > 0) {
        await prisma.notification.createMany({
          data: reviewers.map(({ userId }) => ({
            userId,
            type: "content_submitted",
            message: `New ${mod.baseName} contribution waiting for cultural review: "${title}"`,
            link: `/admin/validation-queue/${record.id}`,
          })),
        });
      }
    }

    await logAction({
      userId: (session.user as any).id,
      action: "content.created",
      entityType: "cultural_record",
      entityId: record.id,
      newValue: { title, moduleCode, status: recordStatus },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (err: any) {
    console.error("[content POST]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create" },
      { status: 500 }
    );
  }
}
