import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSystemSetting } from "@/lib/settings";

export async function getGemini(): Promise<GoogleGenerativeAI> {
  const apiKey = process.env.GEMINI_API_KEY || await getSystemSetting("gemini_api_key");
  if (!apiKey || apiKey.startsWith("AIza...")) {
    throw new Error("Gemini API key is not configured. Set it in Super Admin → System → API Keys.");
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function hasGemini(): Promise<boolean> {
  const key = process.env.GEMINI_API_KEY || await getSystemSetting("gemini_api_key");
  return !!key && !key.startsWith("AIza...");
}
