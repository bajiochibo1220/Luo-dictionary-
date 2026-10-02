import { z } from "zod";
import type { Prisma } from "@prisma/client";

const COUNTY_ALIASES: Record<string, string> = {
  "HOMA BAY": "HBY",
  KISUMU: "KSM",
  SIAYA: "SYA",
  NYANZA: "NYA",
  "CROSS-COUNTY": "XCT",
  "CROSS COUNTY": "XCT",
};

function countyCodeValue(value: string): string {
  const normalized = value.trim().toUpperCase();
  return COUNTY_ALIASES[normalized] ?? normalized.replace(/\s+/g, "-");
}

export const CONSENT_SCOPES = [
  "pending",
  "research_only",
  "teaching",
  "public_excerpt",
  "community_only",
  "embargoed",
] as const;

export const RESTRICTION_LEVELS = [
  "public",
  "internal",
  "restricted",
  "sacred",
] as const;

export const governanceMetadataSchema = z
  .object({
    consentScope: z.enum(CONSENT_SCOPES),
    restrictionLevel: z.enum(RESTRICTION_LEVELS),
    embargoUntil: z.coerce.date().nullable().optional(),
    countyCode: z.string().trim().max(12).transform(countyCodeValue).nullable().optional(),
    siteName: z.string().trim().max(200).nullable().optional(),
    sourceReference: z.string().trim().max(500).nullable().optional(),
    sessionId: z.string().trim().toUpperCase().max(100).regex(/^(?:[A-Z0-9]{2,4}-\d{8}-[A-Z0-9]{2,8}-\d{3}|[A-Z0-9]+_\d{3})$/).nullable().optional(),
  })
  .superRefine((metadata, context) => {
    if (metadata.consentScope === "embargoed" && !metadata.embargoUntil) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["embargoUntil"],
        message: "An embargo end date is required for embargoed material.",
      });
    }
    if (metadata.consentScope !== "embargoed" && metadata.embargoUntil) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["embargoUntil"],
        message: "An embargo end date is only valid for embargoed material.",
      });
    }
  });

export type GovernanceMetadata = {
  consentScope: typeof CONSENT_SCOPES[number];
  restrictionLevel: typeof RESTRICTION_LEVELS[number];
  embargoUntil?: Date | null;
  countyCode?: string | null;
  siteName?: string | null;
  sourceReference?: string | null;
  sessionId?: string | null;
};
export type GovernanceAccessFields = {
  consentScope: string;
  restrictionLevel: string;
  embargoUntil?: Date | null;
};

export function parseGovernanceMetadata(input: Record<string, unknown> = {}) {
  const parsed = governanceMetadataSchema.safeParse({
    consentScope: input.consentScope ?? "pending",
    restrictionLevel: input.restrictionLevel ?? "internal",
    embargoUntil: input.embargoUntil ?? null,
    countyCode: input.countyCode ?? null,
    siteName: input.siteName ?? null,
    sourceReference: input.sourceReference ?? null,
    sessionId: input.sessionId ?? null,
  });
  if (!parsed.success) return parsed;
  const metadata = parsed.data as GovernanceMetadata;
  const policyError = governanceError(metadata);
  if (policyError) {
    return {
      success: false as const,
      error: { issues: [{ message: policyError, path: ["restrictionLevel"] }] },
    };
  }
  return { success: true as const, data: metadata };
}

/** Public release requires both explicit public-excerpt consent and public restriction. */
export function isPubliclyEligible(
  item: GovernanceAccessFields,
  now = new Date()
): boolean {
  if (item.restrictionLevel !== "public" || item.consentScope !== "public_excerpt") {
    return false;
  }
  return !item.embargoUntil || item.embargoUntil <= now;
}

export function canAccessGovernedItem(
  user: { isSuperAdmin?: boolean; languageRoles?: { role: string; languageId?: number }[] } | null,
  item: GovernanceAccessFields,
  languageId?: number,
  now = new Date()
): boolean {
  if (isPubliclyEligible(item, now)) return true;
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const roles = new Set((user.languageRoles ?? [])
    .filter((role) => languageId === undefined || role.languageId === languageId)
    .map((role) => role.role));
  if (item.embargoUntil && item.embargoUntil > now) return false;
  if (item.consentScope === "pending" || item.consentScope === "embargoed") return false;
  if (item.restrictionLevel === "sacred" || item.consentScope === "community_only") {
    return roles.has("elder") || roles.has("cultural_expert");
  }
  if (item.restrictionLevel === "restricted") {
    return roles.has("cultural_expert") || roles.has("language_admin");
  }
  if (item.consentScope === "research_only") {
    return roles.has("researcher") || roles.has("language_admin") || roles.has("cultural_expert");
  }
  if (item.consentScope === "teaching") {
    return roles.has("teacher") || roles.has("researcher") || roles.has("language_admin") || roles.has("cultural_expert");
  }
  return roles.has("language_admin") || roles.has("content_editor") || roles.has("cultural_expert") || roles.has("uploader") || roles.has("publisher");
}

/** Allow curators to review ordinary pending/internal items without bypassing
 * community-only, restricted, or sacred access rules. */
export function canReviewGovernedItem(
  user: { isSuperAdmin?: boolean; languageRoles?: { role: string; languageId?: number }[] } | null,
  item: GovernanceAccessFields,
  languageId?: number,
  now = new Date()
): boolean {
  if (canAccessGovernedItem(user, item, languageId, now)) return true;
  if (!user) return false;
  if (item.restrictionLevel === "sacred" || item.restrictionLevel === "restricted" || item.consentScope === "community_only") {
    return false;
  }
  if (user.isSuperAdmin) return true;
  return (user.languageRoles ?? []).some((role) =>
    (languageId === undefined || role.languageId === languageId) &&
    ["language_admin", "uploader", "publisher", "content_editor", "cultural_expert"].includes(role.role)
  );
}

/** Prisma filter for objects eligible for public display or third-party AI processing. */
export function publicGovernanceWhere(now = new Date()) {
  return {
    AND: [
      { consentScope: "public_excerpt" },
      { restrictionLevel: "public" },
      { OR: [{ embargoUntil: null }, { embargoUntil: { lte: now } }] },
    ],
  };
}

export function publicRecordWhere(now = new Date()) {
  return {
    status: "published",
    ...publicGovernanceWhere(now),
  };
}

export function publicMediaWhere(now = new Date()) {
  return publicGovernanceWhere(now);
}

export function governanceError(metadata: GovernanceMetadata): string | null {
  if (
    metadata.consentScope === "public_excerpt" &&
    metadata.restrictionLevel !== "public"
  ) {
    return "Public-excerpt consent does not override a non-public restriction.";
  }
  if (
    metadata.consentScope === "community_only" &&
    metadata.restrictionLevel === "public"
  ) {
    return "Community-only material cannot have a public restriction level.";
  }
  return null;
}

export function buildRecordUri(
  recordId: string,
  consentScope = "pending",
  restrictionLevel = "internal",
  status = "draft"
): string {
  const area = consentScope === "public_excerpt" && restrictionLevel === "public" && status === "published"
    ? "public"
    : consentScope === "research_only"
    ? "research_only"
    : "restricted_sacred";
  return `/JOOUST/NRF/LuoAI_Repository/03_repository_products/records/${area}/${recordId}/record-v1.json`;
}

export function buildMediaAssetId(sessionId: string, mediaType: string, sequence: number): string {
  return `${sessionId}-${mediaType}-${String(sequence).padStart(3, "0")}`;
}

const DOMAIN_BY_MODULE: Record<string, { code: string; name: string }> = {
  dictionary: { code: "D01", name: "OralTraditions" },
  proverbs: { code: "D01", name: "OralTraditions" },
  riddles: { code: "D01", name: "OralTraditions" },
  oral_histories: { code: "D01", name: "OralTraditions" },
  folktales: { code: "D01", name: "OralTraditions" },
  artifacts: { code: "D03", name: "MaterialCulture" },
  heritage_sites: { code: "D05", name: "HeritageSpacesSites" },
  songs: { code: "D06", name: "PerformanceArts" },
  cultural_calendar: { code: "D11", name: "IndigenousTimeCalendar" },
};

export function getRepositoryDomain(moduleCode: string) {
  return DOMAIN_BY_MODULE[moduleCode] ?? { code: "D00", name: "Unclassified" };
}

function safePathPart(value: string, fallback: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || fallback;
}

function sessionSiteCode(sessionId: string, siteName?: string | null): string {
  const match = sessionId.match(/^[A-Z0-9]{2,4}-\d{8}-([A-Z0-9]{2,8})-\d{3}$/);
  if (match) return match[1];
  return safePathPart((siteName ?? "UNK").split(/[\s_-]+/)[0].toUpperCase(), "UNK").slice(0, 8).padEnd(2, "X");
}

export function buildMediaUri(
  sessionId: string,
  assetId: string,
  context: {
    countyCode?: string | null;
    siteName?: string | null;
    moduleCode?: string;
    mediaType?: string;
    extension?: string | null;
    recordedAt?: Date | null;
  } = {}
): string {
  const session = sessionId.match(/^[A-Z0-9]{2,4}-(\d{4})(\d{2})\d{2}-[A-Z0-9]{2,8}-\d{3}$/);
  const date = context.recordedAt ?? new Date();
  const year = session?.[1] ?? String(date.getUTCFullYear());
  const month = session?.[2] ?? String(date.getUTCMonth() + 1).padStart(2, "0");
  const county = safePathPart((context.countyCode ?? "UNK").toUpperCase(), "UNK");
  const siteCode = sessionSiteCode(sessionId, context.siteName);
  const siteName = safePathPart(context.siteName ?? "Unspecified", "Unspecified");
  const domain = getRepositoryDomain(context.moduleCode ?? "");
  const mediaType = context.mediaType === "document" ? "fieldnotes" : safePathPart(context.mediaType ?? "audio", "audio");
  const extension = safePathPart((context.extension ?? "bin").replace(/^\./, "").toLowerCase(), "bin");
  return `/JOOUST/NRF/LuoAI_Repository/02_fieldwork/${county}/${siteCode}_${siteName}/${year}/${month}/sessions/${safePathPart(sessionId, "unknown-session")}/domain=${domain.code}_${domain.name}/raw/${mediaType}/${safePathPart(assetId, "unknown-asset")}.${extension}`;
}

export async function generateCollectionSessionId(
  tx: Prisma.TransactionClient,
  input: { sessionId?: string | null; countyCode?: string | null; siteName?: string | null; date?: Date }
): Promise<string> {
  if (input.sessionId) return input.sessionId;
  const county = safePathPart((input.countyCode ?? "UNK").toUpperCase(), "UNK").slice(0, 4);
  const date = input.date ?? new Date();
  const ymd = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  const site = sessionSiteCode("", input.siteName);
  const prefix = `${county}-${ymd}-${site}-`;
  // The lock function returns PostgreSQL's `void` type. Prisma cannot decode
  // that result as a normal query column, so materialize the lock in a CTE and
  // return a supported integer column instead.
  await tx.$queryRaw<Array<{ locked: number }>>`
    WITH lock_result AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtext(${`luolingua-session:${prefix}`}))
    )
    SELECT 1::int AS locked FROM lock_result
  `;
  const count = await tx.culturalRecord.count({ where: { sessionId: { startsWith: prefix } } });
  const sequence = count + 1;
  if (sequence > 999) throw new Error(`No collection session sequence remains for ${prefix}`);
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

export async function ensureRecordCollectionSessionId(
  tx: Prisma.TransactionClient,
  recordId: string,
  input: { countyCode?: string | null; siteName?: string | null; date?: Date }
): Promise<string> {
  const record = await tx.culturalRecord.findUnique({ where: { id: recordId }, select: { sessionId: true } });
  if (!record) throw new Error("Content record not found");
  if (record.sessionId) return record.sessionId;

  const generated = await generateCollectionSessionId(tx, input);
  const claimed = await tx.culturalRecord.updateMany({
    where: { id: recordId, sessionId: null },
    data: { sessionId: generated },
  });
  if (claimed.count === 1) return generated;

  const current = await tx.culturalRecord.findUnique({ where: { id: recordId }, select: { sessionId: true } });
  if (!current?.sessionId) throw new Error("Could not assign a collection session ID");
  return current.sessionId;
}

export async function lockMediaAssetSequence(
  tx: Prisma.TransactionClient,
  sessionId: string,
  mediaType: string
): Promise<number> {
  await tx.$queryRaw<Array<{ locked: number }>>`
    WITH lock_result AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtext(${`luolingua-media:${sessionId}:${mediaType}`}))
    )
    SELECT 1::int AS locked FROM lock_result
  `;
  return (await tx.mediaAsset.count({ where: { sessionId, type: mediaType } })) + 1;
}

export async function linkRecordConsentToMedia(
  tx: Prisma.TransactionClient,
  recordId: string,
  mediaAssetId: string
): Promise<void> {
  const consents = await tx.consentRecord.findMany({ where: { recordId }, select: { id: true } });
  if (!consents.length) return;
  await tx.consentRecordAsset.createMany({
    data: consents.map((consent) => ({ consentRecordId: consent.id, mediaAssetId })),
    skipDuplicates: true,
  });
}
