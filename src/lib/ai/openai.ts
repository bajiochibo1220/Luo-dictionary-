import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "sk-placeholder" || apiKey === "sk-...") {
      throw new Error(
        "OPENAI_API_KEY is not configured. Add a real key to .env to use AI features."
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export function hasOpenAI(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!apiKey && apiKey !== "sk-placeholder" && apiKey !== "sk-...";
}