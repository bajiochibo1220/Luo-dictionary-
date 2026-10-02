"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { checksumSha256, finalizeMediaUpload, getMediaUploadSignature, uploadMediaInChunks } from "@/lib/media-upload-client";

type QueueItem = {
  key: string;
  file: File;
  title: string;
  recordId?: string;
  cloudUpload?: any;
  uploaded: boolean;
  error?: string;
};

function mediaType(file: File): string | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (/\.(avif|bmp|gif|heic|heif|jpeg|jpg|png|svg|tif|tiff|webp)$/i.test(file.name)) return "image";
  if (/\.(3gp|avi|m4v|mkv|mov|mp4|mpeg|mpg|ogv|webm|wmv)$/i.test(file.name)) return "video";
  if (/\.(aac|aif|aiff|flac|m4a|mp3|oga|ogg|wav|wma)$/i.test(file.name)) return "audio";
  if (["application/pdf", "text/plain", "application/rtf", "text/rtf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type) || /\.(pdf|txt|rtf|doc|docx|srt|vtt)$/i.test(file.name)) return "document";
  return null;
}

function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || name;
}

export function BulkMediaUploader({
  moduleCode,
  moduleName,
  languageId,
  languageCode,
}: {
  moduleCode: string;
  moduleName: string;
  languageId: number;
  languageCode: string;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState("");

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    if (started) return toast.error("Finish or retry this batch before starting another");
    if (list.length > 20) return toast.error("Select no more than 20 files per batch");
    const files = Array.from(list);
    const invalid = files.find((file) => !mediaType(file));
    if (invalid) return toast.error(`${invalid.name} is not a supported image, video, audio, or document file`);
    setQueue(files.map((file) => ({ key: crypto.randomUUID(), file, title: titleFromFilename(file.name), uploaded: false })));
  }

  async function publishBatch() {
    if (!queue.length || processing) return;
    setProcessing(true);
    setStarted(true);
    let working = [...queue];
    let activeKey: string | null = null;
    try {
      for (let index = 0; index < working.length; index += 1) {
        let item = working[index];
        activeKey = item.key;
        setProgress(`Preparing ${index + 1} of ${working.length}: ${item.title}`);
        if (!item.recordId) {
          const create = await fetch("/api/content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ languageId, moduleCode, title: item.title, data: { description: "", sourcePermission: "needs_review", attributionPreference: "ask_later" }, tags: [] }),
          });
          const result = await create.json();
          if (!create.ok || !result.success || !result.data?.id) throw new Error(result.error || `Could not prepare ${item.title}`);
          item = { ...item, recordId: result.data.id, error: undefined };
          working[index] = item;
          setQueue([...working]);
        }
        if (!item.uploaded && !item.cloudUpload) {
          setProgress(`Uploading ${index + 1} of ${working.length}: ${item.file.name}`);
          const details = { languageCode, moduleCode, recordId: item.recordId!, assetType: mediaType(item.file)! };
          const signed = await getMediaUploadSignature(item.file, details);
          const cloudUpload = await uploadMediaInChunks(item.file, signed, () => getMediaUploadSignature(item.file, details, signed.publicId));
          item = { ...item, cloudUpload, error: undefined };
          working[index] = item;
          setQueue([...working]);
        }
        if (!item.uploaded && item.cloudUpload) {
          await finalizeMediaUpload(
            { languageCode, moduleCode, recordId: item.recordId!, assetType: mediaType(item.file)! },
            item.cloudUpload,
            await checksumSha256(item.file),
          );
          item = { ...item, uploaded: true, cloudUpload: undefined, error: undefined };
          working[index] = item;
          setQueue([...working]);
        }
        activeKey = null;
      }

      toast.success(`${working.length} ${moduleName} upload${working.length === 1 ? "" : "s"} saved as drafts for governance and review`);
      setQueue([]);
      setStarted(false);
      router.push("/admin/content");
      router.refresh();
    } catch (error: any) {
      const message = error.message || "Batch upload failed";
      setQueue((current) => current.map((item) => item.key === activeKey ? { ...item, error: message } : item));
      toast.error(`${message}. Retry this batch to continue; completed uploads will not be repeated.`);
    } finally {
      setProcessing(false);
      setProgress("");
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif text-stone-900">Bulk media upload</h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-700">
            Upload up to twenty images, videos, audio files, or documents for {moduleName}. Each file is saved once as a draft. Review the items later without uploading the files again.
          </p>
        </div>
        <label className={`cursor-pointer rounded-full bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900 ${started ? "pointer-events-none opacity-50" : ""}`}>
          Select files
          <input
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.txt,.rtf,.doc,.docx,.srt,.vtt"
            className="sr-only"
            disabled={started || processing}
            onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }}
          />
        </label>
      </div>

      {queue.length > 0 && (
        <div className="mt-5 space-y-2">
          {queue.map((item, index) => (
            <div key={item.key} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
              <span className="w-6 text-xs text-stone-400">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800" title={item.file.name}>{item.title}</span>
              <span className="hidden text-xs capitalize text-stone-500 sm:inline">{mediaType(item.file)} · {(item.file.size / (1024 * 1024)).toFixed(1)} MB</span>
              <span className={`text-xs font-medium ${item.uploaded ? "text-green-700" : item.error ? "text-red-600" : "text-stone-400"}`}>
                {item.uploaded ? "Uploaded draft" : item.error ? "Retry pending" : item.recordId ? "Prepared" : "Queued"}
              </span>
              {(!started || (item.error && !item.uploaded)) && <button type="button" onClick={() => setQueue((current) => current.filter((queued) => queued.key !== item.key))} className="rounded px-2 text-lg text-stone-400 hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${item.file.name} from upload batch`} title={item.error && started ? "Remove failed upload from batch" : "Remove from batch"}>×</button>}
            </div>
          ))}
          {progress && <p className="text-sm text-stone-600" aria-live="polite">{progress}</p>}
          <button type="button" onClick={() => void publishBatch()} disabled={processing} className="mt-2 rounded-full bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50">
            {processing ? "Uploading…" : started ? "Retry batch" : `Upload ${queue.length} item${queue.length === 1 ? "" : "s"} as drafts`}
          </button>
          <p className="text-xs text-stone-500">Files upload one at a time for reliability. Items remain drafts until a reviewer records their consent, access level, and publication decision.</p>
        </div>
      )}
    </section>
  );
}
