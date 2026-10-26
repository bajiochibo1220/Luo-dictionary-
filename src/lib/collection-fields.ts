export type CollectionField = { id: number; fieldCode: string; baseLabel: string; fieldType: string; isRequired: boolean; displayOrder: number; label: string };
const additions: Record<string, [string, string, boolean?][]> = {"dictionary":[["meaning","Definition"],["examples","Example sentences"],["synonyms","Words with similar meanings"],["antonyms","Words with opposite meanings"],["wordOrigin","Word origin"]],"proverbs":[["related_proverbs","Related proverbs"]],"riddles":[["explanation","Explain the answer",true],["difficulty","Difficulty"]],"oral_histories":[["history","Historical account"],["migration","Migration account"],["events","Events described"]],"folktales":[["characters","Characters"]],"songs":[["musical_notation","Musical notation"]],"artifacts":[["materials","Materials"],["current_status","Current condition"],["museum_location","Public museum or collection"]],"heritage_sites":[["local_stories","Local stories"],["tourism_info","Visitor information"]]};
// JSON-backed fields extend old module configurations without changing stored data.
export function completeCollectionFields(moduleCode: string, configured: CollectionField[]): CollectionField[] {
  const fields = configured.filter(field => field.fieldCode !== "title").map(field => ({ ...field, isRequired: field.isRequired || moduleCode === "riddles" && field.fieldCode === "explanation" }));
  for (const [index, [code, label, required]] of (additions[moduleCode] ?? []).entries()) {
    if (!fields.some(field => field.fieldCode === code)) fields.push({id: -1000-index, fieldCode: code, baseLabel: label, label, fieldType: "textarea", isRequired: !!required, displayOrder: 1000+index});
  }
  return fields;
}
