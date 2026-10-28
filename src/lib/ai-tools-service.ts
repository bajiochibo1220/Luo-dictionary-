import { z } from "zod";
import { prisma } from "@/lib/db";
import { publicMediaWhere, publicRecordWhere, isPubliclyEligible } from "@/lib/governance";
import { cloudinary, configureCloudinary } from "@/lib/cloudinary";
import { publicCulturalText } from "@/lib/public-cultural-text";
import { generateMediaAssistance } from "@/lib/ai/multimodal";
import { TutorError } from "@/lib/tutor-service";
import { logAction } from "@/lib/audit";
const Task = z.discriminatedUnion("task", [
  z.object({ task: z.enum(["ocr", "transcribe", "describe"]), assetId: z.string().uuid(), consent: z.literal(true) }).strict(),
  z.object({ task: z.literal("illustrate"), recordId: z.string().uuid(), consent: z.literal(true) }).strict(),
]);
export async function aiToolSources(languageId: number) {
  if (!Number.isSafeInteger(languageId) || languageId <= 0) throw new TutorError(400, "Choose a community.");
  const [assets, stories] = await Promise.all([
    prisma.mediaAsset.findMany({ where: { languageId, type: { in: ["image", "audio"] }, ...publicMediaWhere(), OR: [{ record: { is: publicRecordWhere() } }, { dictionary: { is: publicRecordWhere() } }] }, take: 100, orderBy: { createdAt: "desc" }, select: { id: true, type: true, caption: true, format: true, record: { select: { title: true } } } }),
    prisma.culturalRecord.findMany({ where: { languageId, module: { code: "folktales" }, ...publicRecordWhere() }, take: 100, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  return { capabilities: { ocr: true, describe: true, transcribe: false, illustrate: false }, assets: assets.map(asset => ({ id: asset.id, type: asset.type, title: asset.caption || asset.record?.title || asset.format || "Reviewed media" })), stories };
}
async function mediaBytes(address: string) {
  let response: Response | undefined;
  for (let redirects = 0; redirects < 4; redirects++) {
    const url = new URL(address);
    if (url.protocol !== "https:" || !["res.cloudinary.com", "api.cloudinary.com"].includes(url.hostname) || url.username || url.password) throw new TutorError(503, "Approved storage address unavailable.");
    response = await fetch(address, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(15000) });
    if ([301,302,303,307,308].includes(response.status)) { const next = response.headers.get("location"); await response.body?.cancel(); if (!next) throw new TutorError(503, "Media redirect unavailable."); address = new URL(next, address).href; continue; }
    break;
  }
  if (!response?.ok || !response.body) throw new TutorError(503, "Unable to open this source file.");
  const maximum = 8 * 1024 * 1024;
  if (Number(response.headers.get("Content-Length") || 0) > maximum) { await response.body.cancel(); throw new TutorError(413, "Choose a source smaller than 8 MB."); }
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.length; if (length > maximum) { await reader.cancel(); throw new TutorError(413, "Choose a source smaller than 8 MB."); } chunks.push(chunk.value); } }
  finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function runAiTool(userId: string, input: unknown) {
  const task = Task.parse(input);
  assertSupportedTask(task.task); let result; let entityId: string; let languageId: number;
  const started = Date.now();
  if (task.task === "illustrate") {
    const record = await prisma.culturalRecord.findFirst({ where: { id: task.recordId, module: { code: "folktales" }, ...publicRecordWhere() }, select: { id: true, title: true, summary: true, data: true, languageId: true } });
    if (!record) throw new TutorError(404, "Choose a reviewed public folktale.");
    result = await generateMediaAssistance(`Create one gentle educational illustration inspired by this approved story. Avoid sacred or historically authoritative claims. Source title: ${record.title}\n${record.summary || ""}\n${publicCulturalText(record.data).slice(0,6000)}`, undefined, true);
    entityId = record.id; languageId = record.languageId;
  } else {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: task.assetId }, include: { record: true, dictionary: true } });
    const parent = asset?.record ?? asset?.dictionary;
    if (!asset || !parent || parent.status !== "published" || !isPubliclyEligible(asset) || !isPubliclyEligible(parent)) throw new TutorError(404, "Only explicitly public approved media can be processed externally.");
    const audio = task.task === "transcribe";
    if (audio ? asset.type !== "audio" : asset.type !== "image") throw new TutorError(400, "Choose the appropriate media type for this tool.");
    if (asset.sizeBytes > BigInt(8 * 1024 * 1024)) throw new TutorError(413, "Choose a source smaller than 8 MB.");
    const mimeByFormat: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", mp4: "audio/mp4", flac: "audio/flac", webm: "audio/webm", aac: "audio/aac" };
    const mime = mimeByFormat[asset.format.toLowerCase()];
    if (!mime || !mime.startsWith(audio ? "audio/" : "image/")) throw new TutorError(400, "Use a supported image or audio format.");
    await configureCloudinary();
    const address = asset.deliveryType === "authenticated" ? cloudinary.utils.private_download_url(asset.publicId, asset.format, { resource_type: asset.resourceType, type: "authenticated", expires_at: Math.floor(Date.now()/1000)+90 }) : asset.url;
    const bytes = await mediaBytes(address);
    result = await generateMediaAssistance(task.task === "ocr" ? "Read and transcribe visible text exactly, preserving its language. Mark unreadable text [unclear]." : audio ? "Transcribe this audio faithfully in its original language. Include approximate speaker changes and timestamps where possible. Mark uncertainty [unclear]. Do not invent translations or names." : "Describe the visible objects and propose possible visual labels. Do not identify people or assert specific cultural provenance. Clearly distinguish observations from uncertain suggestions.", { bytes, mime, type: audio ? "audio" : "image" });
    entityId = asset.id; languageId = asset.languageId;
  }
  await prisma.aIResponse.create({ data: { userId, languageId, query: `Media tool: ${task.task}`, response: result.text || "AI-generated illustration (not an approved cultural record)", model: result.model, latencyMs: Date.now()-started, sources: [{ id: entityId, task: task.task }] } });
  await logAction({ userId, action: `ai.${task.task}`, entityType: task.task === "illustrate" ? "cultural_record" : "media_asset", entityId, newValue: { model: result.model, draftOnly: true } });
  return { ...result, draft: true };
}

function assertSupportedTask(task: string) {
  if (task === "transcribe" || task === "illustrate") throw new TutorError(503, "This tool is unavailable with DeepSeek. Image reading and image descriptions are available.");
}
