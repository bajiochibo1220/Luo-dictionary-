import { prisma } from "@/lib/db";
import { getGemini } from "./gemini";
import { embedText } from "./embeddings";
import { CULTURAL_ASSISTANT_PROMPT } from "./prompts";

const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-2.5-flash";

const MEDIA_KEYWORDS: Record<string, string[]> = {
  video: ["video", "videos", "watch", "footage", "clip", "clips"],
  image: ["image", "images", "photo", "photos", "picture", "pictures"],
  audio: ["audio", "listen", "sound", "song", "songs", "recording", "recordings"],
};

function detectMediaIntent(question: string): string | null {
  const q = question.toLowerCase();
  for (const [type, keywords] of Object.entries(MEDIA_KEYWORDS)) {
    if (keywords.some((k) => q.includes(k))) return type;
  }
  return null;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateWithRetry(
  prompt: string,
  systemInstruction: string
): Promise<{ text: string; model: string }> {
  const genAI = await getGemini();
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];

  let lastError: any = null;

  for (const modelName of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });
        const result = await model.generateContent(prompt);
        return { text: result.response.text(), model: modelName };
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        const isRetryable =
          msg.includes("503") ||
          msg.includes("Service Unavailable") ||
          msg.includes("high demand") ||
          msg.includes("429") ||
          msg.includes("overloaded") ||
          msg.includes("ECONNRESET") ||
          msg.includes("fetch failed");

        if (!isRetryable) {
          // Non-retryable error → try the next model immediately
          break;
        }

        // Wait before retrying: 1s, 2s, 4s
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
  }

  throw new Error(
    "The AI service is temporarily overloaded. Please try again in a few seconds."
  );
}

export type RAGSource = {
  id: string;
  title: string;
  module: string;
  similarity: number;
};

export type RAGMediaItem = {
  recordId: string;
  title: string;
  module: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string | null;
  format: string | null;
};

export type RAGAnswer = {
  answer: string;
  sources: RAGSource[];
  media: RAGMediaItem[];
  mediaFilter: string | null;
  model: string;
  latencyMs: number;
};

export async function askQuestion(
  question: string,
  languageId?: number,
  cultureLanguageId?: number
): Promise<RAGAnswer> {
  const start = Date.now();
  const mediaFilter = detectMediaIntent(question);
  const responseLanguage = languageId
    ? (await prisma.language.findUnique({ where: { id: languageId }, select: { nativeName: true } }))?.nativeName
    : null;

  const queryVector = await embedText(question);
  const vectorStr = `[${queryVector.join(",")}]`;
  const langFilter = languageId ? `AND e."languageId" = ${languageId}` : "";
  const cultureFilter = cultureLanguageId
    ? `AND ((e."recordId" IS NOT NULL AND cr."languageId" = ${cultureLanguageId})
        OR (e."dictionaryId" IS NOT NULL AND de."languageId" = ${cultureLanguageId})
        OR (e."transcriptId" IS NOT NULL AND cr."languageId" = ${cultureLanguageId}))`
    : "";

  const results = await prisma.$queryRawUnsafe<
    Array<{
      record_id: string;
      is_dictionary: boolean;
      title: string;
      module: string;
      module_code: string;
      content: string;
      similarity: number;
    }>
  >(
    `SELECT
       COALESCE(e."recordId", e."dictionaryId", e."transcriptId") AS record_id,
       (e."dictionaryId" IS NOT NULL) AS is_dictionary,
       COALESCE(cr.title, de.dholuo, 'Transcript') AS title,
       COALESCE(m."baseName", CASE WHEN de.id IS NOT NULL THEN 'Dictionary' ELSE 'Transcript' END) AS module,
       COALESCE(m.code, CASE WHEN de.id IS NOT NULL THEN 'dictionary' ELSE 'transcripts' END) AS module_code,
       e.content AS content,
       1 - (e.vector <=> $1::vector) AS similarity
       FROM embeddings e
       LEFT JOIN transcripts t ON t.id = e."transcriptId"
       LEFT JOIN cultural_records cr ON cr.id = COALESCE(e."recordId", t."recordId")
       LEFT JOIN dictionary_entries de ON de.id = e."dictionaryId"
       LEFT JOIN modules m ON m.id = cr."moduleId"
       WHERE ((e."recordId" IS NOT NULL AND cr.status = 'published')
          OR (e."dictionaryId" IS NOT NULL AND de.status = 'published')
          OR (e."transcriptId" IS NOT NULL AND t."recordId" IS NOT NULL AND cr.status = 'published'))
         ${langFilter}
         ${cultureFilter}
       ORDER BY e.vector <=> $1::vector
       LIMIT 10`,
    vectorStr
  );

  const rankedResults = results.sort((a, b) => b.similarity - a.similarity).slice(0, 5);

  if (rankedResults.length === 0) {
    return {
      answer:
        "I don't have information on that in my current sources. Please try a different question or ask about our available content.",
      sources: [],
      media: [],
      mediaFilter,
      model: PRIMARY_MODEL,
      latencyMs: Date.now() - start,
    };
  }

  const recordIds = rankedResults.filter((r) => !r.is_dictionary).map((r) => r.record_id);
  const dictionaryIds = rankedResults.filter((r) => r.is_dictionary).map((r) => r.record_id);
  const mediaQuery: any = { OR: [{ recordId: { in: recordIds } }, { dictionaryId: { in: dictionaryIds } }] };
  if (mediaFilter) mediaQuery.type = mediaFilter;

  const mediaAssets = await prisma.mediaAsset.findMany({
    where: mediaQuery,
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const mediaMap = new Map<string, typeof mediaAssets>();
  for (const a of mediaAssets) {
    const contentId = a.recordId ?? a.dictionaryId;
    if (!contentId) continue;
    if (!mediaMap.has(contentId)) mediaMap.set(contentId, []);
    mediaMap.get(contentId)!.push(a);
  }

  const media: RAGMediaItem[] = [];
  for (const r of rankedResults) {
    const assets = mediaMap.get(r.record_id) ?? [];
    for (const a of assets) {
      media.push({
        recordId: r.record_id,
        title: r.title,
        module: r.module,
        mediaType: a.type,
        url: a.url,
        thumbnailUrl: a.thumbnailUrl,
        format: a.format,
      });
    }
  }

  const context = rankedResults
    .map(
      (r, i) =>
        `[Source ${i + 1}] (${r.module}) ${r.title}\n${r.content.slice(0, 800)}`
    )
    .join("\n\n---\n\n");

  const prompt = `Sources:\n${context}\n\n---\n\nQuestion: ${question}\n\nAnswer using the sources above. Cite them as [Source N].${
    mediaFilter
      ? ` The user asked for ${mediaFilter} content. Mention that you found ${media.length} ${mediaFilter} items and that they appear in the results panel.`
      : ""
  }`;

  const { text: answer, model: usedModel } = await generateWithRetry(
    prompt,
    `${CULTURAL_ASSISTANT_PROMPT}\nRespond in ${responseLanguage || "English"}.`
  );

  return {
    answer,
    sources: rankedResults.map((r) => ({
      id: r.record_id,
      title: r.title,
      module: r.module,
      similarity: Math.round(r.similarity * 100) / 100,
    })),
    media,
    mediaFilter,
    model: usedModel,
    latencyMs: Date.now() - start,
  };
}
