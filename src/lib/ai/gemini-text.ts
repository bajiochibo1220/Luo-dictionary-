import { getSystemSetting } from "@/lib/settings";

export class AiProviderError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function getGeminiModelName() {
  const name = (process.env.GEMINI_MODEL || await getSystemSetting("gemini_model") || "gemini-3.8-flash").trim().replace(/^models\//, "");
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(name)) throw new AiProviderError(503, "Check the AI model setting in System settings.");
  return name;
}
// Keep conversation ownership/history in this application. Do not create
// provider-side conversation records or send private research collections.
export async function generateGeminiText(prompt: string, systemInstruction: string, modelName?: string, timeoutMs = 25000) {
  const key = (process.env.GEMINI_API_KEY || await getSystemSetting("gemini_api_key") || "").replace(/\s+/g, "");
  if (!key || key.startsWith("AIza...")) throw new AiProviderError(503, "Configure the AI service key in System settings.");
  const model = modelName || await getGeminiModelName();
  let response: Response;
  try {
    response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST", headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: prompt, system_instruction: systemInstruction, store: false, generation_config: { max_output_tokens: 1800, thinking_level: "low" } }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch { throw new AiProviderError(503, "The AI connection timed out. Please try again shortly."); }
  if (!response.ok) {
    if (response.status === 429) throw new AiProviderError(429, "The AI provider limit was reached. Try again later or check the service quota.");
    if ([400, 401, 403, 404].includes(response.status)) throw new AiProviderError(503, "The AI service key, model or account needs attention in System settings.");
    throw new AiProviderError(503, "The AI provider is temporarily unavailable. Please try again shortly.");
  }
  const result = await response.json();
  const text = (result.steps || []).filter((step: { type?: string }) => step.type === "model_output")
    .flatMap((step: { content?: { type?: string; text?: string }[] }) => step.content || [])
    .filter((part: { type?: string; text?: string }) => part.type === "text" && typeof part.text === "string")
    .map((part: { text: string }) => part.text).join("\n").trim();
  if (result.status !== "completed" || !text) throw new AiProviderError(503, "The AI did not complete an answer. Please try a clearer question.");
  return { text, model };
}
