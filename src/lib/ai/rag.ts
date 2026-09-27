import { prisma } from "@/lib/db";
import { getGemini } from "./gemini";
import { embedText } from "./embeddings";
import { CULTURAL_ASSISTANT_PROMPT } from "./prompts";

const CHAT_MODEL = "gemini-3.8-flash";

export type RAGSource = {
  id: string;
  title: string;
  module: string;
  similarity: number;
};

export type RAGAnswer = {
  answer: string;
  sources: RAGSource[];
  model: string;
  latencyMs: number;
};

export async function askQuestion(
  question: string,
  languageId?: number
): Promise<RAGAnswer> {
  const start = Date.now();
  const genAI = getGemini();

  // 1. Embed the question
  const queryVector = await embedText(question);
  const vectorStr = `[${queryVector.join(",")}]`;

  // 2. Retrieve top 5 similar records
  const langFilter = languageId ? `AND cr."languageId" = ${languageId}` : "";

  const results = await prisma.$queryRawUnsafe<
    Array<{
      record_id: string;
      title: string;
      module: string;
      content: string;
      similarity: number;
    }>
  >(
    `SELECT
       e."recordId" AS record_id,
       cr.title AS title,
       m."baseName" AS module,
       e.content AS content,
       1 - (e.vector <=> $1::vector) AS similarity
     FROM embeddings e
     JOIN cultural_records cr ON cr.id = e."recordId"
     JOIN modules m ON m.id = cr."moduleId"
     WHERE e."recordId" IS NOT NULL
       AND cr.status = 'published'
       ${langFilter}
     ORDER BY e.vector <=> $1::vector
     LIMIT 5`,
    vectorStr
  );

  if (results.length === 0) {
    return {
      answer:
        "I don't have information on that in my current sources. Please try a different question or ask about our available content.",
      sources: [],
      model: CHAT_MODEL,
      latencyMs: Date.now() - start,
    };
  }

  // 3. Build context
  const context = results
    .map(
      (r, i) =>
        `[Source ${i + 1}] (${r.module}) ${r.title}\n${r.content.slice(0, 800)}`
    )
    .join("\n\n---\n\n");

  // 4. Call Gemini chat
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction: CULTURAL_ASSISTANT_PROMPT,
  });

  const prompt = `Sources:\n${context}\n\n---\n\nQuestion: ${question}\n\nAnswer using the sources above. Cite them as [Source N].`;

  const result = await model.generateContent(prompt);
  const answer = result.response.text();

  return {
    answer,
    sources: results.map((r) => ({
      id: r.record_id,
      title: r.title,
      module: r.module,
      similarity: Math.round(r.similarity * 100) / 100,
    })),
    model: CHAT_MODEL,
    latencyMs: Date.now() - start,
  };
}