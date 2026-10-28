import { generateDeepSeekText } from "./deepseek";
export async function generateText(prompt: string, instruction: string, timeoutMs = 40000) {
  return generateDeepSeekText(prompt, instruction, timeoutMs);
}
