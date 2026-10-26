// Only presentation fields belong in public text or external AI requests.
const publicKeys = new Set(["dholuo", "english", "kiswahili", "pronunciation", "grammarClass", "wordOrigin", "examples", "synonyms", "antonyms", "original", "original_text", "translation", "meaning", "interpretation", "context", "usage", "question", "answer", "explanation", "difficulty", "transcript", "story", "text", "moral", "lyrics", "instruments", "musical_notation", "cultural_context", "description", "traditional_use", "materials", "history", "current_status", "museum_location", "tourism_info", "visiting_info", "characters", "teacher_notes", "children_version", "related_proverbs", "local_stories", "migration", "events"]);
export function publicCulturalText(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  return Object.entries(data as Record<string, unknown>).filter(([key]) => publicKeys.has(key)).map(([key, value]) => {
    const text = typeof value === "string" ? value : Array.isArray(value) ? value.filter(item => typeof item === "string").join("; ") : "";
    return text.trim() ? key.replaceAll("_", " ") + ": " + text : "";
  }).filter(Boolean).join("\n\n");
}
