import { z } from "zod";
export const GameMode = z.enum(["quiz", "vocabulary_race", "word_puzzle", "memory", "proverbs", "story_completion", "treasure_hunt", "artifact", "battle"]);
export const GAME_LABELS: Record<z.infer<typeof GameMode>, string> = {
  quiz: "Knowledge quiz", vocabulary_race: "Vocabulary race", word_puzzle: "Word puzzle", memory: "Memory challenge",
  proverbs: "Proverbs challenge", story_completion: "Story completion", treasure_hunt: "Cultural treasure hunt", artifact: "Artifact identification", battle: "Language battle",
};
export function normalizeGameAnswer(value: string) { return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase(); }
export function typedChoice(choices: string[], value: string) { return choices.findIndex(choice => normalizeGameAnswer(choice) === normalizeGameAnswer(value)); }
