import { getSystemSetting } from "@/lib/settings";


export type TextAiProvider = "deepseek" | "gemini";
export async function getTextAiProvider(): Promise<TextAiProvider> {
  // Legacy provider selections cannot reactivate Google after this migration.
  return "deepseek";
}

export async function hasTextAi(): Promise<boolean> {
  const key = process.env.DEEPSEEK_API_KEY || await getSystemSetting("deepseek_api_key");
  return !!key?.trim() && !key.includes("...") && !key.includes("\u2022");
}
