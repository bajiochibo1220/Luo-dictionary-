import { orderedTranscriptSegments } from "@/lib/reading-contract";
import archiver from "archiver";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { publicRecordWhere, publicMediaWhere } from "@/lib/governance";
import { publicCulturalData } from "@/lib/public-cultural-text";
import { publicFields } from "@/lib/public-projection";
import { repositoryExportFields } from "@/lib/repository-export";
import { cloudinary, configureCloudinary } from "@/lib/cloudinary";

type Asset = { id: string; type: string; format: string; caption: string | null; altText: string | null; url: string; publicId: string; resourceType: string; deliveryType: string; sizeBytes: bigint };
const assetSelect = { id: true, type: true, format: true, caption: true, altText: true, url: true, publicId: true, resourceType: true, deliveryType: true, sizeBytes: true } as const;
export class ContentDownloadError extends Error { constructor(public status: number, message: string) { super(message); } }
const safePart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "item";
const escapeHtml = (value: unknown): string => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
const display = (value: unknown) => typeof value === "string" ? value : JSON.stringify(value, null, 2);
const label = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
const detailText = (data: unknown) => data && typeof data === "object" ? Object.entries(data).filter(([, value]) => value != null && value !== "").map(([key, value]) => `${label(key)}\n${display(value)}`).join("\n\n") : display(data);
const detailHtml = (data: unknown) => data && typeof data === "object" ? `<dl>${Object.entries(data).filter(([, value]) => value != null && value !== "").map(([key, value]) => `<dt><strong>${escapeHtml(label(key))}</strong></dt><dd><pre>${escapeHtml(display(value))}</pre></dd>`).join("")}</dl>` : `<pre>${escapeHtml(display(data))}</pre>`;
const cleanData = <T,>(value: T): T => repositoryExportFields(publicFields(value));
const presentationData = (value: unknown) => cleanData(publicCulturalData(value));

export async function prepareContentDownload(id: string, kind: "cultural" | "dictionary") {
  const media = { where: publicMediaWhere(), select: assetSelect, orderBy: { createdAt: "asc" as const } };
  const common = { language: { select: { id: true, code: true, name: true, nativeName: true } }, media };
  const record = kind === "dictionary"
    ? await prisma.dictionaryEntry.findFirst({ where: { id, ...publicRecordWhere() }, select: { ...common, id: true, dholuo: true, english: true, kiswahili: true, pronunciation: true, grammarClass: true, wordOrigin: true, synonyms: true, antonyms: true, examples: true, publishedAt: true } })
    : await prisma.culturalRecord.findFirst({ where: { id, ...publicRecordWhere() }, select: { ...common, id: true, title: true, summary: true, data: true, tags: true, publishedAt: true, isProvisional: true, module: { select: { code: true, baseName: true } }, translations: { select: { title: true, summary: true, data: true, language: { select: { code: true, name: true, nativeName: true } } }, orderBy: { languageId: "asc" } }, transcripts: { where: publicMediaWhere(), select: { id: true, text: true, languageCode: true, timestamps: true, sourceId: true, speakerRole: true, createdAt: true }, orderBy: { createdAt: "asc" } }, publicationOf: { select: { transcripts: { select: { id: true, text: true, languageCode: true, sourceId: true, speakerRole: true, createdAt: true } } } } } });
  if (!record) throw new ContentDownloadError(404, "This item is not available for public download.");
  const assets: Asset[] = record.media;
  const entries = assets.map((asset, index) => ({ id: asset.id, type: asset.type, caption: asset.caption, altText: asset.altText, sizeBytes: String(asset.sizeBytes), file: `media/${String(index + 1).padStart(3, "0")}-${safePart(asset.type)}-${safePart(asset.id)}.${safePart(asset.format)}` }));
  const { media: _media, ...rawFields } = record;
  if ("publicationOf" in rawFields) delete (rawFields as { publicationOf?: unknown }).publicationOf;
  const fields = "data" in rawFields ? { ...rawFields, data: presentationData(rawFields.data), translations: rawFields.translations.map(translation => ({ ...translation, data: presentationData(translation.data) })) } : rawFields;
  const metadata = { ...cleanData(fields), kind, media: entries };
  const title = "title" in record ? record.title : record.dholuo;
  const dictionaryData = "dholuo" in record ? { dholuo: record.dholuo, english: record.english, kiswahili: record.kiswahili, pronunciation: record.pronunciation, grammarClass: record.grammarClass, wordOrigin: record.wordOrigin, synonyms: record.synonyms, antonyms: record.antonyms, examples: record.examples } : {};
  const sections = [{ title, language: record.language.nativeName, code: record.language.code, summary: "summary" in record ? record.summary : record.english, data: "data" in record ? presentationData(record.data) : cleanData(dictionaryData) }, ...("translations" in record ? record.translations.map(translation => ({ title: translation.title || title, language: translation.language.nativeName, code: translation.language.code, summary: translation.summary, data: presentationData(translation.data) })) : [])];
  const transcripts = "transcripts" in record ? orderedTranscriptSegments(record.transcripts, record.publicationOf?.transcripts).map(transcript => ({ ...transcript, timestamps: cleanData(record.transcripts.find(item => item.id === transcript.id)?.timestamps ?? null) })) : [];
  for (const section of sections) {
    const embedded = section.data && typeof section.data === "object" && "transcript" in section.data ? section.data.transcript : null;
    if (typeof embedded === "string" && embedded.trim() && !transcripts.some(item => item.text.trim() === embedded.trim() && item.languageCode === section.code)) transcripts.push({ id: `embedded-${section.code}`, languageCode: section.code, text: embedded, role: null, timestamps: null });
  }
  const transcriptFiles = transcripts.map((transcript, index) => ({ ...transcript, file: `transcripts/${String(index + 1).padStart(3, "0")}-${safePart(transcript.languageCode)}-${safePart(transcript.id)}.txt` }));
  const description = sections.map(section => `${section.title}\n${section.language}\n\n${section.summary || ""}\n\n${detailText(section.data) || ""}`).join("\n\n--------------------\n\n") + (entries.length ? "\n\nATTACHED FILES\n" + entries.map(entry => `${entry.file}\n${entry.caption || ""}\n${entry.altText || ""}`).join("\n\n") : "");
  const notice = "isProvisional" in record && record.isProvisional ? "Published before review. Review and editing are in progress." : "";
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'"><title>${escapeHtml(title)}</title><style>body{max-width:960px;margin:2rem auto;padding:0 1rem;font:17px/1.65 system-ui;color:#173c39;background:#faf8f2}section,figure{margin:2rem 0;padding:1rem;background:white;border:1px solid #d5d7d0;border-radius:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}img,video,audio{max-width:100%;max-height:75vh}a{color:#80400d}h1,h2{line-height:1.3}</style><h1>${escapeHtml(title)}</h1>${notice ? `<p>${escapeHtml(notice)}</p>` : ""}${sections.map(section => `<section><h2>${escapeHtml(section.title)} (${escapeHtml(section.language)})</h2><pre>${escapeHtml(section.summary)}</pre>${detailHtml(section.data)}</section>`).join("")}${transcriptFiles.map(transcript => `<section><h2>Transcript (${escapeHtml(transcript.languageCode)})${transcript.role ? ` - ${escapeHtml(transcript.role)}` : ""}</h2><pre>${escapeHtml(transcript.text)}</pre>${transcript.timestamps ? `<pre>${escapeHtml(display(transcript.timestamps))}</pre>` : ""}<a href="${escapeHtml(transcript.file)}" download>Download transcript</a></section>`).join("")}${entries.map(entry => `<figure>${entry.type === "image" ? `<img src="${entry.file}" alt="${escapeHtml(entry.altText || entry.caption || title)}">` : entry.type === "video" ? `<video src="${entry.file}" controls preload="metadata"></video>` : entry.type === "audio" ? `<audio src="${entry.file}" controls preload="metadata"></audio>` : ""}<figcaption>${escapeHtml(entry.caption || entry.type)}</figcaption><a href="${entry.file}" download>Open original file</a></figure>`).join("")}</html>`;
  const files = [{ name: "index.html", text: html }, { name: "descriptions.txt", text: `${title}\n${notice}\n\n${description}` }, { name: "metadata.json", text: JSON.stringify({ ...metadata, transcripts: transcriptFiles }, null, 2) }, { name: "README.txt", text: "Extract this entire ZIP into a folder. Open index.html to read the descriptions and transcripts and view or play supported media offline. Original attachments are in media/. Transcript text is in transcripts/. Descriptions and available translations are also in descriptions.txt and metadata.json. Some media formats need a compatible player. Public access does not remove the source's stated rights or licence.\n" }, ...transcriptFiles.map(transcript => ({ name: transcript.file, text: `${title}\n\n${description}\n\nTRANSCRIPT (${transcript.languageCode})${transcript.role ? ` - ${transcript.role}` : ""}\n\n${transcript.text}\n${transcript.timestamps ? display(transcript.timestamps) : ""}` }))];
  return { title, id: record.id, languageId: record.language.id, kind, filename: `${safePart(title)}-${safePart(record.id)}.zip`, files, assets, entries };
}

async function openAsset(asset: Asset, signal: AbortSignal) {
  signal.throwIfAborted();
  let address = asset.deliveryType === "authenticated" ? cloudinary.utils.private_download_url(asset.publicId, asset.format, { resource_type: asset.resourceType, type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 300 }) : asset.url;
  for (let redirect = 0; redirect < 4; redirect++) {
    const url = new URL(address);
    if (url.protocol !== "https:" || !["res.cloudinary.com", "api.cloudinary.com"].includes(url.hostname) || url.username || url.password || url.port) throw new Error("A source file is unavailable. Please retry the download.");
    const response = await fetch(url, { redirect: "manual", cache: "no-store", signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location"); await response.body?.cancel();
      if (!location) break;
      address = new URL(location, address).href; continue;
    }
    if (!response.ok || response.status !== 200 || !response.body) { await response.body?.cancel(); break; }
    return response.body;
  }
  throw new Error("A source file is unavailable. Please retry the download.");
}

export async function streamContentDownload(bundle: Awaited<ReturnType<typeof prepareContentDownload>>, requestSignal: AbortSignal) {
  if (bundle.assets.length) await configureCloudinary();
  const controller = new AbortController();
  const signal = AbortSignal.any([requestSignal, controller.signal, AbortSignal.timeout(270000)]);
  const archive = archiver("zip", { forceZip64: true, store: true });
  const sources: Readable[] = [];
  const readers = new Set<ReadableStreamDefaultReader<Uint8Array>>();
  const stop = () => { controller.abort(); for (const reader of readers) void reader.cancel().catch(() => {}); for (const source of sources) source.destroy(); };
  archive.once("close", stop);
  archive.on("error", stop);
  archive.on("warning", () => archive.destroy(new Error("The complete item could not be downloaded. Please retry.")));
  const abort = () => archive.destroy(new Error("Download cancelled or timed out."));
  signal.addEventListener("abort", abort, { once: true });
  archive.once("close", () => signal.removeEventListener("abort", abort));
  for (const file of bundle.files) archive.append(file.text, { name: file.name });
  bundle.assets.forEach((asset, index) => {
    const source = Readable.from((async function* () {
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      try {
        reader = (await openAsset(asset, signal)).getReader();
        readers.add(reader);
        while (true) { signal.throwIfAborted(); const chunk = await reader.read(); if (chunk.done) break; yield chunk.value; }
      } catch { throw new Error("A source file could not be downloaded. Please retry the complete item."); }
      finally { if (reader) { readers.delete(reader); await reader.cancel().catch(() => {}); reader.releaseLock(); } }
    })(), { objectMode: false, highWaterMark: 65536 });
    source.on("error", () => archive.destroy(new Error("A source file could not be downloaded. Please retry the complete item.")));
    sources.push(source); archive.append(source, { name: bundle.entries[index].file });
  });
  const iterator = archive[Symbol.asyncIterator]();
  const stream = new ReadableStream<Uint8Array>({
    async pull(output) {
      try { const next = await iterator.next(); if (next.done) output.close(); else output.enqueue(next.value); }
      catch (error) { output.error(error); }
    },
    async cancel() { archive.destroy(); try { await iterator.return?.(); } catch {} },
  }, { highWaterMark: 65536, size: chunk => chunk.byteLength });
  void archive.finalize().catch(() => archive.destroy(new Error("The complete item could not be downloaded. Please retry.")));
  if (signal.aborted) abort();
  return stream;
}
