import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSystemSetting } from "@/lib/settings";

async function getGeminiApiKey(): Promise<string> {
  const configured = process.env.GEMINI_API_KEY || await getSystemSetting("gemini_api_key");
  // API keys are single tokens. Remove whitespace introduced by copy/paste so
  // it cannot become an invalid HTTP header value.
  return configured.replace(/\s+/g, "");
}

export async function getGemini(): Promise<GoogleGenerativeAI> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey || apiKey.startsWith("AIza...")) {
    throw new Error("Gemini API key is not configured. Set it in Super Admin → System → API Keys.");
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function hasGemini(): Promise<boolean> {
  const key = await getGeminiApiKey();
  return !!key && !key.startsWith("AIza...");
}
