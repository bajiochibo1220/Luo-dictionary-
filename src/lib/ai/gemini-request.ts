import { AiProviderError } from "./gemini-errors";

type Part = { type: string; text?: string; data?: string; mime_type?: string };
type Options = { key: string; model: string; prompt: string; instruction: string; timeout: number;
  media?: { type: "image" | "audio"; mime: string; bytes: Buffer }; illustration?: boolean; standardOnly?: boolean };
let interactionsRetryAt = 0;

/** Both transports are stateless: history stays in our own application. */
export async function requestGemini(options: Options): Promise<{ status: string; steps: { type: string; content: Part[] }[] }> {
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(options.model)) throw new AiProviderError(503, "Check the AI model setting in System settings.");
  const headers = { "x-goog-api-key": options.key, "Content-Type": "application/json" };
  const started = Date.now();
  if (!options.standardOnly && Date.now() >= interactionsRetryAt) {
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST", headers,
        body: JSON.stringify({ model: options.model, store: false,
          input: options.media || options.illustration ? [{ type: "text", text: options.prompt }, ...(options.media ? [{ type: options.media.type, mime_type: options.media.mime, data: options.media.bytes.toString("base64") }] : [])] : options.prompt,
          system_instruction: options.instruction,
          ...(!options.illustration ? { generation_config: { max_output_tokens: 1800, thinking_level: "low" } } : {}),
        }), signal: AbortSignal.timeout(Math.min(options.timeout, 8000)),
      });
      if (response.ok) return await response.json();
      await response.body?.cancel();
      if ([401, 403].includes(response.status)) throw new AiProviderError(503, "The AI service key or account needs attention in System settings.", response.status);
      // The project's Interactions quota can be exhausted while its standard
      // generation quota still works. Avoid making every user wait on it again.
      interactionsRetryAt = Date.now() + 60_000;
    } catch (reason) {
      if (reason instanceof AiProviderError) throw reason;
      interactionsRetryAt = Date.now() + 60_000;
    }
  }
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`, {
      method: "POST", headers,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: options.prompt }, ...(options.media ? [{ inlineData: { mimeType: options.media.mime, data: options.media.bytes.toString("base64") } }] : [])] }],
        systemInstruction: { parts: [{ text: options.instruction }] },
        generationConfig: options.illustration ? { responseModalities: ["TEXT", "IMAGE"] } : { maxOutputTokens: 1800,
          ...(/^gemini-3/.test(options.model) ? { thinkingConfig: { thinkingLevel: options.model.includes("flash-lite") ? "minimal" : "low" } } : {}) },
      }), signal: AbortSignal.timeout(Math.max(1000, options.timeout - (Date.now() - started))),
    });
  } catch { throw new AiProviderError(503, "The AI connection timed out. Please try again shortly."); }
  if (!response.ok) {
    await response.body?.cancel();
    throw new AiProviderError(response.status === 429 ? 429 : 503,
      response.status === 429 ? "The AI provider quota was reached. Try again later or check the service quota in System settings." : "The AI service key, model or account needs attention in System settings.", response.status);
  }
  const result = await response.json();
  // Never expose thought parts, blocked candidates or unfinished generations.
  const candidate = result.candidates?.[0];
  const content: Part[] = (candidate?.content?.parts || []).filter((part: { thought?: boolean }) => !part.thought).flatMap((part: { text?: string; inlineData?: { data?: string; mimeType?: string } }) =>
    typeof part.text === "string" ? [{ type: "text", text: part.text }] : part.inlineData?.data ? [{ type: "image", data: part.inlineData.data, mime_type: part.inlineData.mimeType }] : []);
  return { status: candidate?.finishReason === "STOP" ? "completed" : "incomplete", steps: [{ type: "model_output", content }] };
}
