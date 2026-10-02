import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { canAccessGovernedItem } from "@/lib/governance";

export const dynamic = "force-dynamic";

const EXPORT_ROLES = new Set(["researcher", "language_admin", "cultural_expert", "uploader", "publisher"]);
const RELEASED_STATUSES = ["curated", "validated", "published"];
const METADATA_COLUMNS = ["kind", "id", "recordId", "dictionaryId", "languageId", "title", "dholuo", "english", "module", "status", "type", "format", "checksum", "sizeBytes", "durationSecs", "width", "height", "assetId", "nrfUri", "nrfMetadata", "consentScope", "restrictionLevel", "sourcePermission", "attributionPreference", "embargoUntil", "countyCode", "siteName", "sourceReference", "sessionId", "createdAt", "updatedAt"];

function csvCell(value: unknown): string {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\r\n");
}

function mayExport(sessionUser: any): boolean {
  return !!sessionUser?.isSuperAdmin || (sessionUser?.languageRoles ?? []).some((role: any) => EXPORT_ROLES.has(role.role));
}

async function exportVisionDataset(
  request: NextRequest,
  user: any,
  language: { code: string } | null,
  languageFilter: any,
  format: string,
  cursor: string | undefined,
  limit: number
) {
  if (!["json", "csv"].includes(format)) {
    return NextResponse.json({ success: false, error: "Vision exports use JSON or CSV format" }, { status: 400 });
  }
  const media = await prisma.mediaAsset.findMany({
    where: {
      ...languageFilter,
      type: "image",
      ...(cursor ? { id: { gt: cursor } } : {}),
      OR: [
        { record: { is: { status: { in: RELEASED_STATUSES } } } },
        { dictionary: { is: { status: { in: RELEASED_STATUSES } } } },
      ],
    },
    orderBy: { id: "asc" },
    take: limit + 1,
    select: {
      id: true, recordId: true, dictionaryId: true, languageId: true, format: true,
      checksum: true, width: true, height: true, assetId: true, nrfUri: true,
      consentScope: true, restrictionLevel: true, embargoUntil: true, countyCode: true,
      siteName: true, sessionId: true, caption: true, altText: true,
      record: { select: { id: true, title: true, status: true, languageId: true, consentScope: true, restrictionLevel: true, embargoUntil: true, data: true } },
      dictionary: { select: { id: true, dholuo: true, english: true, status: true, languageId: true, consentScope: true, restrictionLevel: true, embargoUntil: true } },
    },
  });
  const hasMore = media.length > limit;
  const page = media.slice(0, limit);
  const permitted = page.filter((asset) => {
    const parent = asset.record ?? asset.dictionary;
    return !!parent && canAccessGovernedItem(user, asset, asset.languageId) && canAccessGovernedItem(user, parent, parent.languageId);
  });
  const categoryNames = Array.from(new Set(permitted.map((asset) => asset.altText?.trim() || asset.caption?.trim()).filter((label): label is string => !!label))).sort();
  const categories = categoryNames.map((name, index) => ({ id: index + 1, name, supercategory: "" }));
  const categoryIds = new Map(categories.map((category) => [category.name, category.id]));
  const images = permitted.map((asset, index) => ({
    id: index + 1,
    file_name: asset.nrfUri,
    width: asset.width,
    height: asset.height,
    checksum_sha256: asset.checksum,
    asset_id: asset.assetId,
    language_id: asset.languageId,
    county_code: asset.countyCode,
    site_name: asset.siteName,
    session_id: asset.sessionId,
    consent_scope: asset.consentScope,
    restriction_level: asset.restrictionLevel,
    parent_id: asset.recordId ?? asset.dictionaryId,
    parent_title: asset.record?.title ?? asset.dictionary?.dholuo ?? null,
  }));
  const annotations = permitted.flatMap((asset, index) => {
    const label = asset.altText?.trim() || asset.caption?.trim();
    const categoryId = label ? categoryIds.get(label) : undefined;
    return categoryId ? [{ id: index + 1, image_id: index + 1, category_id: categoryId, caption: label }] : [];
  });
  const body = format === "csv"
    ? toCsv(permitted.map((asset, index) => ({
        image_id: index + 1,
        file_name: asset.nrfUri,
        width: asset.width,
        height: asset.height,
        checksum_sha256: asset.checksum,
        label: asset.altText?.trim() || asset.caption?.trim() || "",
        consent_scope: asset.consentScope,
        restriction_level: asset.restrictionLevel,
        county_code: asset.countyCode,
        site_name: asset.siteName,
        session_id: asset.sessionId,
      })), ["image_id", "file_name", "width", "height", "checksum_sha256", "label", "consent_scope", "restriction_level", "county_code", "site_name", "session_id"])
    : JSON.stringify({ info: { description: "LuoLinguaAI authorized image metadata export", language: language?.code ?? null }, images, annotations, categories }, null, 2);
  await logAction({
    userId: user.id,
    action: "nrf.export",
    entityType: "repository_export",
    newValue: { dataset: "vision", format, language: language?.code ?? null, imageCount: images.length, labeledImageCount: annotations.length },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });
  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="luolingua-vision.${format}"`,
      "Cache-Control": "private, no-store",
      ...(hasMore && page.length ? { "X-Next-Cursor": page[page.length - 1].id } : {}),
    },
  });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!mayExport(user)) return NextResponse.json({ success: false, error: "Researcher or curator access is required for repository exports" }, { status: 403 });

  const search = request.nextUrl.searchParams;
  const dataset = search.get("dataset") ?? "metadata";
  const format = search.get("format") ?? (dataset === "nlp" ? "jsonl" : "json");
  const languageCode = search.get("language") ?? undefined;
  const cursor = search.get("cursor") ?? undefined;
  const limit = Math.min(5000, Math.max(1, Number(search.get("limit") ?? 1000)));
  if (!["metadata", "nlp", "vision"].includes(dataset) || !["json", "csv", "jsonl"].includes(format)) {
    return NextResponse.json({ success: false, error: "Use dataset=metadata|nlp|vision and format=json|csv|jsonl" }, { status: 400 });
  }
  if (dataset === "nlp" && format !== "jsonl") {
    return NextResponse.json({ success: false, error: "NLP training exports use JSONL format" }, { status: 400 });
  }
  if (dataset === "metadata" && format === "jsonl") {
    return NextResponse.json({ success: false, error: "Metadata exports use JSON or CSV format" }, { status: 400 });
  }

  const language = languageCode
    ? await prisma.language.findUnique({ where: { code: languageCode }, select: { id: true, code: true } })
    : null;
  if (languageCode && !language) return NextResponse.json({ success: false, error: "Unknown language code" }, { status: 400 });
  const userLanguageIds: number[] | undefined = user.isSuperAdmin
    ? undefined
    : Array.from(new Set<number>((user.languageRoles ?? []).filter((role: any) => EXPORT_ROLES.has(role.role)).map((role: any) => Number(role.languageId)).filter(Number.isInteger)));
  const languageFilter: any = language ? { languageId: language.id } : userLanguageIds ? { languageId: { in: userLanguageIds } } : {};

  if (dataset === "vision") return exportVisionDataset(request, user, language, languageFilter, format, cursor, limit);

  let rows: Record<string, unknown>[] = [];
  let nextCursor: string | null = null;

  if (dataset === "nlp") {
    const transcripts = await prisma.transcript.findMany({
      where: {
        ...languageFilter,
        ...(cursor ? { id: { gt: cursor } } : {}),
        record: { status: { in: RELEASED_STATUSES } },
      },
      orderBy: { id: "asc" },
      take: limit + 1,
      select: { id: true, sourceId: true, text: true, languageCode: true, domain: true, genre: true, countyCode: true, siteName: true, sessionId: true, consentScope: true, restrictionLevel: true, sourceUri: true, sourceChecksum: true, versionNo: true, languageId: true, embargoUntil: true, record: { select: { status: true, consentScope: true, restrictionLevel: true, embargoUntil: true, languageId: true, data: true, consentRecords: { select: { id: true, consentType: true, consentGiven: true, consentDate: true, sourcePermissionStatus: true, attributionPreference: true, consentScope: true, restrictionLevel: true, embargoUntil: true, projectRef: true, reviewedAt: true } } } } },
    });
    const hasMore = transcripts.length > limit;
    const page = transcripts.slice(0, limit);
    const allowed = page.filter((item) => !!item.record &&
      canAccessGovernedItem(user, item, item.languageId) &&
      canAccessGovernedItem(user, item.record!, item.record!.languageId)
    );
    rows = allowed.map((item) => ({
      id: item.sourceId ?? item.id,
      text: item.text,
      language: item.languageCode,
      domain: item.domain,
      genre: item.genre,
      county_code: item.countyCode,
      site_name: item.siteName,
      session_id: item.sessionId,
      consent_scope: item.consentScope,
      restriction_level: item.restrictionLevel,
      source_uri: item.sourceUri,
      source_sha256: item.sourceChecksum,
      source_permission: (item.record?.data as Record<string, unknown> | undefined)?.sourcePermission ?? null,
      attribution_preference: (item.record?.data as Record<string, unknown> | undefined)?.attributionPreference ?? null,
      consent_records: item.record?.consentRecords ?? [],
      version: item.versionNo,
    }));
    nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;
  } else {
    const [records, dictionary, media] = await Promise.all([
      prisma.culturalRecord.findMany({
        where: { ...languageFilter, status: { in: RELEASED_STATUSES }, ...(cursor ? { id: { gt: cursor } } : {}) },
        orderBy: { id: "asc" }, take: limit + 1,
        select: { id: true, title: true, data: true, languageId: true, module: { select: { code: true } }, status: true, nrfUri: true, nrfMetadata: true, consentScope: true, restrictionLevel: true, embargoUntil: true, countyCode: true, siteName: true, sourceReference: true, sessionId: true, createdAt: true, updatedAt: true, consentRecords: { select: { id: true, consentType: true, consentGiven: true, consentDate: true, sourcePermissionStatus: true, attributionPreference: true, consentScope: true, restrictionLevel: true, embargoUntil: true, projectRef: true, reviewedAt: true } } },
      }),
      prisma.dictionaryEntry.findMany({
        where: { ...languageFilter, status: { in: RELEASED_STATUSES }, ...(cursor ? { id: { gt: cursor } } : {}) },
        orderBy: { id: "asc" }, take: limit + 1,
        select: { id: true, dholuo: true, english: true, languageId: true, status: true, nrfUri: true, nrfMetadata: true, consentScope: true, restrictionLevel: true, embargoUntil: true, countyCode: true, siteName: true, sourceReference: true, sessionId: true, createdAt: true, updatedAt: true },
      }),
      prisma.mediaAsset.findMany({
        where: { ...languageFilter, ...(cursor ? { id: { gt: cursor } } : {}), OR: [{ record: { is: { status: { in: RELEASED_STATUSES } } } }, { dictionary: { is: { status: { in: RELEASED_STATUSES } } } }] },
        orderBy: { id: "asc" }, take: limit + 1,
        select: { id: true, recordId: true, dictionaryId: true, languageId: true, type: true, format: true, checksum: true, sizeBytes: true, durationSecs: true, width: true, height: true, assetId: true, nrfUri: true, nrfMetadata: true, consentScope: true, restrictionLevel: true, embargoUntil: true, countyCode: true, siteName: true, sourceReference: true, sessionId: true, record: { select: { status: true, consentScope: true, restrictionLevel: true, embargoUntil: true, languageId: true, data: true, consentRecords: { select: { id: true, consentType: true, consentGiven: true, consentDate: true, sourcePermissionStatus: true, attributionPreference: true, consentScope: true, restrictionLevel: true, embargoUntil: true, projectRef: true, reviewedAt: true } } } }, dictionary: { select: { status: true, consentScope: true, restrictionLevel: true, embargoUntil: true, languageId: true } } },
      }),
    ]);
    const merged = [
      ...records.map((item) => ({ ...item, kind: "cultural_record", id: item.id })),
      ...dictionary.map((item) => ({ ...item, kind: "dictionary_entry", id: item.id })),
      ...media.map((item) => ({ ...item, kind: "media_asset", id: item.id })),
    ].sort((left, right) => left.id.localeCompare(right.id));
    const page = merged.filter((item) => !cursor || item.id > cursor).slice(0, limit + 1);
    const hasMore = page.length > limit;
    const selected = page.slice(0, limit);
    rows = selected.flatMap((item): Record<string, unknown>[] => {
      if (item.kind === "media_asset") {
        const asset = item as any;
        const parent = asset.record ?? asset.dictionary;
        if (!parent || !canAccessGovernedItem(user, asset, asset.languageId) || !canAccessGovernedItem(user, parent, parent.languageId)) return [];
        const { record, dictionary: _dictionary, ...metadata } = asset;
        const contentData = record?.data as Record<string, unknown> | undefined;
        return [{ kind: item.kind, ...metadata, sizeBytes: Number(asset.sizeBytes), sourcePermission: contentData?.sourcePermission ?? null, attributionPreference: contentData?.attributionPreference ?? null, consentRecords: record?.consentRecords ?? [] }];
      }
      const itemLanguageId = item.languageId;
      if (!canAccessGovernedItem(user, item as any, itemLanguageId)) return [];
      if (item.kind === "cultural_record") {
        const data = (item as any).data as Record<string, unknown>;
        return [{ ...item, data: undefined, sourcePermission: data.sourcePermission ?? null, attributionPreference: data.attributionPreference ?? null }];
      }
      return [{ ...item }];
    });
    nextCursor = hasMore ? selected[selected.length - 1]?.id ?? null : null;
  }

  const body = format === "jsonl"
    ? rows.map((row) => JSON.stringify(row)).join("\n")
    : format === "csv"
    ? toCsv(rows, METADATA_COLUMNS)
    : JSON.stringify(rows, null, 2);
  await logAction({
    userId: user.id,
    action: "nrf.export",
    entityType: "repository_export",
    newValue: { dataset, format, language: language?.code ?? null, recordCount: rows.length },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  const extension = format === "jsonl" ? "jsonl" : format;
  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : format === "jsonl" ? "application/x-ndjson; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="luolingua-${dataset}.${extension}"`,
      "Cache-Control": "private, no-store",
      ...(nextCursor ? { "X-Next-Cursor": nextCursor } : {}),
    },
  });
}
