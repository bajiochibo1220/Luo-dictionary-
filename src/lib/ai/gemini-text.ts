import { getSystemSetting } from "@/lib/settings";
import { AiProviderError } from "./gemini-errors";
import { requestGemini } from "./gemini-request";
export { AiProviderError } from "./gemini-errors";
export async function getGeminiModelName() {
  const name = (process.env.GEMINI_MODEL || await getSystemSetting("gemini_model") || "gemini-3.6-flash").trim().replace(/^models\//, "");
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(name)) throw new AiProviderError(503, "Check the AI model setting in System settings.");
  return name;
}
// Keep conversation ownership/history in this application. Do not create
// provider-side conversation records or send private research collections.
export async function generateGeminiText(prompt: string, systemInstruction: string, modelName?: string, timeoutMs = 25000): Promise<{ text: string; model: string }> {
  const key = (process.env.GEMINI_API_KEY || await getSystemSetting("gemini_api_key") || "").replace(/\s+/g, "");
  if (!key || key.startsWith("AIza...")) throw new AiProviderError(503, "Configure the AI service key in System settings.");
  const model = modelName || await getGeminiModelName();
  let result;
  try { result = await requestGemini({ key, model, prompt, instruction: systemInstruction, timeout: timeoutMs }); }
  catch (reason) {
    if (modelName || reason instanceof AiProviderError && (reason.status === 429 || [401, 403].includes(reason.providerStatus ?? 0))) throw reason;
    const fallback = (process.env.GEMINI_FALLBACK_MODEL || await getSystemSetting("gemini_fallback_model") || "gemini-3.6-flash").trim().replace(/^models\//, "");
    if (fallback === model) throw reason;
    return generateGeminiText(prompt, systemInstruction, fallback, timeoutMs);
  }
  const text = (result.steps || []).filter((step: { type?: string }) => step.type === "model_output")
    .flatMap((step: { content?: { type?: string; text?: string }[] }) => step.content || [])
    .filter((part: { type?: string; text?: string }) => part.type === "text" && typeof part.text === "string")
    .map((part: { text?: string }) => part.text || "").join("\n").trim();
  if (result.status !== "completed" || !text) throw new AiProviderError(503, "The AI did not complete an answer. Please try a clearer question.");
  return { text, model };
}
