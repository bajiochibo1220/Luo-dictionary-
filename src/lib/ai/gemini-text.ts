import { getSystemSetting } from "@/lib/settings";
import { AiProviderError } from "./gemini-errors";
import { requestGemini } from "./gemini-request";
export { AiProviderError } from "./gemini-errors";
const modelCooldowns = new Map<string, number>();
export async function getGeminiModelName() {
  const name = (process.env.GEMINI_MODEL || await getSystemSetting("gemini_model") || "gemini-3.6-flash").trim().replace(/^models\//, "");
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(name)) throw new AiProviderError(503, "Check the AI model setting in System settings.");
  return name;
}
// Keep conversation ownership/history in this application. Do not create
// provider-side conversation records or send private research collections.
export async function generateGeminiText(prompt: string, systemInstruction: string, modelName?: string, timeoutMs = 40000): Promise<{ text: string; model: string }> {
  const key = (process.env.GEMINI_API_KEY || await getSystemSetting("gemini_api_key") || "").replace(/\s+/g, "");
  if (!key || key.startsWith("AIza...")) throw new AiProviderError(503, "Configure the AI service key in System settings.");
  const model = modelName || await getGeminiModelName();
  const fallback = modelName ? model : (process.env.GEMINI_FALLBACK_MODEL || await getSystemSetting("gemini_fallback_model") || "gemini-3.5-flash-lite").trim().replace(/^models\//, "");
  const candidates = [...new Set([model, fallback].filter(Boolean))];
  const deadline = Date.now() + timeoutMs;
  let failure: unknown;
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    if (index < candidates.length - 1 && (modelCooldowns.get(candidate) ?? 0) > Date.now()) continue;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      // Text uses the standard stateless endpoint directly. The additional
      // Interactions round trip cannot restore a model's exhausted daily quota.
      const result = await requestGemini({ key, model: candidate, prompt, instruction: systemInstruction, timeout: remaining, standardOnly: true });
      const text = (result.steps || []).filter((step: { type?: string }) => step.type === "model_output")
        .flatMap((step: { content?: { type?: string; text?: string }[] }) => step.content || [])
        .filter((part: { type?: string; text?: string }) => part.type === "text" && typeof part.text === "string")
        .map((part: { text?: string }) => part.text || "").join("\n").trim();
      if (result.status !== "completed" || !text) throw new AiProviderError(503, "The AI did not complete an answer. Please try a clearer question.");
      modelCooldowns.delete(candidate);
      return { text, model: candidate };
    } catch (reason) {
      failure = reason;
      if (reason instanceof AiProviderError && [401, 403].includes(reason.providerStatus ?? 0)) throw reason;
      if (reason instanceof AiProviderError && reason.status === 429) {
        if (modelCooldowns.size >= 16) modelCooldowns.clear();
        modelCooldowns.set(candidate, Date.now() + 60_000);
      }
    }
  }
  throw failure ?? new AiProviderError(503, "The AI connection timed out. Please try again shortly.");
}
