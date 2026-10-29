import { generateDeepSeekText } from "./deepseek";
import { generateGroqText } from "./groq";
import { getTextAiProvider } from "./provider-config";
export async function generateText(prompt: string, instruction: string, timeoutMs = 40000, options?: { json?: boolean }) {
  return await getTextAiProvider() === "groq" ? generateGroqText(prompt, instruction, timeoutMs, undefined, options) : generateDeepSeekText(prompt, instruction, timeoutMs, undefined, options);
}
