import { getSystemSetting } from "@/lib/settings";


export type TextAiProvider = "deepseek" | "groq" | "gemini";
export async function getTextAiProvider(): Promise<TextAiProvider> {
  const saved = await getSystemSetting("ai_text_provider", "", { fresh: true });
  if (saved === "deepseek" || saved === "groq") return saved;
  return process.env.AI_TEXT_PROVIDER === "groq" ? "groq" : "deepseek";
}

function usableKey(value: string | undefined): string {
  const key = (value || "").replace(/\s+/g, "");
  return key && !/\.{3}|\u2022|\u2026|\*{3,}/.test(key) ? key : "";
}

export async function getDeepSeekApiKey(): Promise<string> {
  // A blank or masked environment template must not hide a real admin-saved key.
  const environmentKey = usableKey(process.env.DEEPSEEK_API_KEY);
  if (environmentKey) return environmentKey;
  const cachedKey = usableKey(await getSystemSetting("deepseek_api_key"));
  if (cachedKey) return cachedKey;
  // Another server instance may have saved the key while this instance still
  // holds an empty settings cache. Re-read before reporting missing credentials.
  return usableKey(await getSystemSetting("deepseek_api_key", "", { fresh: true }));
}

export async function getGroqApiKey(): Promise<string> {
  const environmentKey = usableKey(process.env.GROQ_API_KEY);
  if (environmentKey) return environmentKey;
  const cachedKey = usableKey(await getSystemSetting("groq_api_key"));
  return cachedKey || usableKey(await getSystemSetting("groq_api_key", "", { fresh: true }));
}

export async function hasTextAi(): Promise<boolean> {
  return !!(await (await getTextAiProvider() === "groq" ? getGroqApiKey() : getDeepSeekApiKey()));
}
