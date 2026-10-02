type TranslationFields = { title?: string | null; summary?: string | null; data?: unknown } | null | undefined;

const NON_TRANSLATABLE_FIELDS = new Set([
  "sourcePermission", "attributionPreference", "consentScope", "restrictionLevel",
  "embargoUntil", "countyCode", "siteName", "sourceReference", "sessionId",
]);

export function missingEnglishTranslation(sourceTitle: string, sourceData: unknown, translation: TranslationFields): string[] {
  if (!translation || !translation.title?.trim()) return ["English title"];
  if (!sourceData || typeof sourceData !== "object" || Array.isArray(sourceData)) return [];
  const source = sourceData as Record<string, unknown>;
  const english = translation.data && typeof translation.data === "object" && !Array.isArray(translation.data)
    ? translation.data as Record<string, unknown>
    : {};
  const missing = Object.entries(source)
    .filter(([key, value]) => !NON_TRANSLATABLE_FIELDS.has(key) && typeof value === "string" && value.trim())
    .filter(([key]) => typeof english[key] !== "string" || !(english[key] as string).trim())
    .map(([key]) => key);
  if (sourceTitle.trim() && !translation.title.trim()) missing.unshift("English title");
  return missing;
}
