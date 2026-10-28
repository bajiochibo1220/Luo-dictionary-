import type { GoogleGenerativeAI } from "@google/generative-ai";
import { AiProviderError } from "./gemini-errors";

// Retain the old indexing contract for existing jobs, without contacting Google.
export async function getGemini(): Promise<GoogleGenerativeAI> {
  throw new AiProviderError(503, "External embedding generation is retired. DeepSeek uses public text search.");
}
export async function hasGemini(): Promise<boolean> { return false; }
