import { getSystemSetting } from "@/lib/settings";
import { AiProviderError } from "./gemini-errors";
import { getGroqApiKey } from "./provider-config";

export async function generateGroqText(prompt: string, instruction: string, timeoutMs = 40000, image?: { mime: string; bytes: Buffer }, options?: { json?: boolean }): Promise<{ text: string; model: string }> {
  if (image && (!/^image\/(jpeg|png|gif|webp)$/.test(image.mime) || !image.bytes.length || image.bytes.length > 8 * 1024 * 1024)) throw new AiProviderError(400, "Choose a supported image smaller than 8 MB.");
  const key = await getGroqApiKey();
  const model = (image ? process.env.GROQ_VISION_MODEL || await getSystemSetting("groq_vision_model") || "qwen/qwen3.8-27b" : process.env.GROQ_MODEL || await getSystemSetting("groq_model") || "openai/gpt-oss-20b").trim();
  if (!key || key.includes("...") || key.includes("\u2022")) throw new AiProviderError(503, "Add your Groq API key in System > API Credentials, save it, then test the connection.");
  if (!/^[a-zA-Z0-9._/-]{1,150}$/.test(model)) throw new AiProviderError(503, "Check the Groq model in System settings.");
  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", redirect: "error", cache: "no-store",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ model, stream: false, ...(options?.json ? { response_format: { type: "json_object" } } : {}), max_completion_tokens: 2400, ...(model.startsWith("openai/gpt-oss-") ? { include_reasoning: false, reasoning_effort: "low" } : model.startsWith("qwen/") ? { reasoning_format: "hidden" } : {}),
        messages: [{ role: "system", content: instruction }, { role: "user", content: image ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${image.mime};base64,${image.bytes.toString("base64")}`, detail: "auto" } }] : prompt }] }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch { throw new AiProviderError(503, "Groq could not be reached in time. Please try again shortly."); }
  if (!response.ok) {
    await response.body?.cancel();
    const message = [401, 403].includes(response.status) ? "Groq rejected the API key. Check it in System settings."
      : response.status === 402 ? "The Groq API account has insufficient balance. Check the provider account."
      : response.status === 429 ? "Groq is rate limiting requests. Please try again shortly."
      : [400, 404, 422].includes(response.status) ? "Check the Groq model and API configuration in System settings."
      : "Groq is temporarily unavailable. Please try again shortly.";
    throw new AiProviderError(response.status === 429 ? 429 : 503, message, response.status);
  }
  let result;
  try { result = await response.json(); } catch { throw new AiProviderError(503, "Groq returned an unreadable response. Please retry."); }
  const choice = result.choices?.[0];
  const text = typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
  // Only the final answer is public. Never return reasoning_content, tool calls
  // or a truncated completion as if it were a complete answer.
  if (choice?.finish_reason !== "stop" || !text || choice.message.tool_calls?.length) throw new AiProviderError(503, "Groq did not complete an answer. Please retry with a shorter question.");
  return { text, model };
}
