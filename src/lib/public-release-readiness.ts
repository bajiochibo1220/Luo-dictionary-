import { hasPublicReleaseSourcePermission } from "@/lib/phase-one-content";

/** Server-authored staff decision; source-permission evidence remains separate. */
export function hasPublicReleasePermission(record: { data: unknown; nrfMetadata?: unknown }): boolean {
  if (hasPublicReleaseSourcePermission("", record.data)) return true;
  const data = record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : {};
  const metadata = record.nrfMetadata && typeof record.nrfMetadata === "object" ? record.nrfMetadata as Record<string, unknown> : {};
  const decision = metadata.staffPublicRelease as Record<string, unknown> | undefined;
  return !!decision && typeof decision.approvedById === "string" && !!decision.approvedById && decision.sourcePermission === (data.sourcePermission ?? null);
}

type ReleaseRecord = {
  title: string; consentScope: string; restrictionLevel: string;
  embargoUntil?: Date | null; data: unknown; module: { code: string };
};

export function publicReleaseIssues(record: ReleaseRecord, now = new Date()): string[] {
  const issues: string[] = [];
  if (!record.title.trim()) issues.push("Add a title.");
  if (record.consentScope !== "public_excerpt") issues.push("In Source and access, set Consent scope to public excerpt only after public sharing has been authorized.");
  if (record.restrictionLevel !== "public") issues.push("In Source and access, set Restriction level to public if the material is approved for public access.");
  if (record.embargoUntil && record.embargoUntil > now) issues.push(`The embargo ends on ${record.embargoUntil.toISOString().slice(0, 10)}. Public release must wait until then.`);
  if (!hasPublicReleaseSourcePermission(record.module.code, record.data)) issues.push("In Source and access, set Source permission to Permission confirmed after confirming permission with the source or rights holder.");
  return issues;
}
