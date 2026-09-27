import { prisma } from "@/lib/db";
import { getGemini } from "./gemini";

const MODEL = "gemini-3.8-flash";

export async function summarizeTranscript(transcriptId: string) {
  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
  });
  if (!transcript) throw new Error("Transcript not found");

  const genAI = getGemini();
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `Summarize the following Luo oral history transcript in exactly 3 sentences in English. Preserve the names of people, places, and clans. Be factual and do not invent details.

Transcript:
${transcript.text.slice(0, 6000)}

Return ONLY the 3-sentence summary, nothing else.`;

  const result = await model.generateContent(prompt);
  const summary = result.response.text().trim();

  await prisma.transcript.update({
    where: { id: transcriptId },
    data: { aiSummary: summary },
  });

  return { summary };
}

export async function extractEntities(transcriptId: string) {
  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
  });
  if (!transcript) throw new Error("Transcript not found");

  const genAI = getGemini();
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `Extract named entities from the following Luo oral history transcript. Return ONLY a JSON object with three arrays, nothing else. No markdown, no code fences.

Format:
{
  "people": ["name1", "name2"],
  "places": ["place1", "place2"],
  "clans": ["clan1", "clan2"]
}

Transcript:
${transcript.text.slice(0, 6000)}`;

  const result = await model.generateContent(prompt);
  let raw = result.response.text().trim();

  // Strip code fences if present
  raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();

  let entities: { people?: string[]; places?: string[]; clans?: string[] } = {};
  try {
    entities = JSON.parse(raw);
  } catch {
    entities = { people: [], places: [], clans: [] };
  }

  await prisma.transcript.update({
    where: { id: transcriptId },
    data: { aiEntities: entities },
  });

  return { entities };
}

export async function processTranscript(transcriptId: string) {
  const summary = await summarizeTranscript(transcriptId);
  const entities = await extractEntities(transcriptId);
  return { summary: summary.summary, entities: entities.entities };
}