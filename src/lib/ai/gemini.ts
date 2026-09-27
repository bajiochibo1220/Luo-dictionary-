import { GoogleGenerativeAI } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith("AIza...") || apiKey === "") {
      throw new Error(
        "GEMINI_API_KEY is not configured. Get one free at https://aistudio.google.com/apikey"
      );
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export function hasGemini(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return !!key && !key.startsWith("AIza...");
}