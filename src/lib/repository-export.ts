const protectedKeys = new Set(["nrfmetadata", "consentrecords", "consentlinks", "sourcepermission", "attributionpreference", "sourceuri", "sourcereference", "sourceid", "sourcename", "participantid", "participantname", "collector", "narrator", "speaker", "speakername", "email", "phone", "identity", "latitude", "longitude", "lat", "lng", "lon", "gps", "exactgps", "preciselocation", "coordinates", "sessionid", "sitename", "provenance"]);
export function mayReadConsentEvidence(user: { isSuperAdmin?: boolean; isMasterSuperAdmin?: boolean; languageRoles?: { languageId: number; role: string }[] }, languageId?: number) {
  return !!(user.isSuperAdmin || user.isMasterSuperAdmin || user.languageRoles?.some(role => role.languageId === languageId && ["language_admin", "content_editor"].includes(role.role)));
}
export function repositoryExportFields<T>(value: T, privileged = false): T {
  if (privileged || value === null || value === undefined || value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(item => repositoryExportFields(item)) as T;
  if (typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !protectedKeys.has(key.replaceAll("_", "").toLowerCase()) && !key.startsWith("__")).map(([key, item]) => [key, repositoryExportFields(item)])) as T;
}
export function spreadsheetCell(value: unknown): string {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  const safe = /^[\s]*[=+@\-\t\r]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}
