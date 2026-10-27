import { publicLocation } from "@/lib/public-location";
import { KnowledgeLinks } from "@/lib/knowledge-links";
import { RESEARCH_KINDS } from "@/lib/prd-content-catalog";
const REQUIRED_FIELDS: Record<string, string[]> = {
  research: ["research_kind", "abstract", "license"],
  dictionary: ["dholuo", "english"],
  proverbs: ["original_text", "translation", "meaning"],
  riddles: ["question", "answer", "explanation"],
  oral_histories: ["transcript"],
};

/** Require explicit source/rights-holder permission before public release. */
export function hasPublicReleaseSourcePermission(
  _moduleCode: string,
  data: unknown
): boolean {
  const values = data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  return values.sourcePermission === "confirmed";
}

/** Validate the minimum bilingual/content shape when a cultural item is submitted. */
export function validatePhaseOneSubmission(
  moduleCode: string,
  title: string,
  data: unknown,
  hasLinkedTranscript = false
): string | null {
  if (data && typeof data === "object" && !Array.isArray(data) && "related_records" in data && !KnowledgeLinks.safeParse((data as Record<string,unknown>).related_records).success) return "Check the related-record relationships.";
  if (data && typeof data === "object" && (data as Record<string,unknown>).public_map_permission === "confirmed" && !publicLocation(data)) return "Add valid latitude and longitude for the approved public map location.";
  const required = REQUIRED_FIELDS[moduleCode];
  if (!title?.trim()) return "A title is required before submission.";
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    if (!required) return null;
    return "Add the required content fields before submission.";
  }
  const values = data as Record<string, unknown>;
  if (moduleCode === "research" && typeof values.research_kind === "string" && !Object.hasOwn(RESEARCH_KINDS, values.research_kind)) return "Choose a valid research document type.";
  if (values.sourcePermission === "not_granted") {
    return "Permission has not been granted. Keep this contribution as a draft.";
  }
  if (!required) return null;
  const missing = required.filter((key) => {
    if (moduleCode === "oral_histories" && key === "transcript" && hasLinkedTranscript) return false;
    return typeof values[key] !== "string" || !(values[key] as string).trim();
  });
  if (!missing.length) return null;
  const labels: Record<string, string> = {
    dholuo: "Dholuo word",
    english: "English meaning",
    original_text: "Original proverb",
    translation: "English translation",
    meaning: "Meaning or explanation",
    question: "Riddle question",
    answer: "Riddle answer",
    explanation: "Riddle explanation",
    transcript: "Transcript",
  };
  return `Complete these required fields before submitting: ${missing.map((key) => labels[key] ?? key).join(", ")}.`;
}
