"use client";
import { InterfaceInput, InterfaceText, InterfaceTextarea } from "@/components/shared/interface-language";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { uploadMediaFile } from "@/lib/media-upload-client";

const MEDIA_TYPES = [
  { key: "image", label: "Image", accept: "image/*", icon: "🖼️" },
  { key: "audio", label: "Audio", accept: "audio/*", icon: "🎵" },
  { key: "video", label: "Video", accept: "video/*", icon: "🎬" },
  { key: "transcript", label: "Transcript", accept: "", icon: "📄" },
  { key: "text", label: "Text only", accept: "", icon: "📝" },
];

export function ContributeModal({
  languageCode,
  languageId,
  moduleCode,
  moduleName,
  defaultMediaType = "text",
  onClose,
}: {
  languageCode: string;
  languageId: number;
  moduleCode: string;
  moduleName: string;
  defaultMediaType?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mediaType, setMediaType] = useState(defaultMediaType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const requiresStructuredForm = true;

  async function handleSubmit(status: "draft" | "submitted") {
    if (!title.trim()) {
      toast.error(<InterfaceText source={"Please add a title"} />);
      return;
    }

    if (status === "submitted" && !file && !transcript.trim() && !description.trim()) {
      toast.error(<InterfaceText source={"Add a file, transcript, or description before submitting"} />);
      return;
    }

    setUploading(true);

    try {
      const payload: any = {
        languageId,
        moduleCode,
        title: title.trim(),
        data: {
          description: description.trim() || null,
          transcript: transcript.trim() || null,
        },
        tags: [],
        status: "draft",
        primaryMediaType: mediaType,
      };

      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");

      if (file) {
        await uploadMediaFile(file, {
          languageCode,
          moduleCode,
          recordId: json.data.id,
          assetType: mediaType === "transcript" ? "document" : mediaType,
        });
      }

      if (status === "submitted") {
        const submitRes = await fetch(`/api/content/${json.data.id}/submit`, { method: "POST" });
        const submitJson = await submitRes.json();
        if (!submitRes.ok || !submitJson.success) throw new Error(submitJson.error || "Could not submit for review");
      }

      toast.success(
        <InterfaceText source={status === "submitted"
          ? "Submitted for cultural review"
          : "Saved as draft"} />
      );

      router.refresh();
      onClose();
    } catch (err: any) {
      toast.error(<InterfaceText source={err.message || "Failed to save"} />);
    } finally {
      setUploading(false);
    }
  }

  if (requiresStructuredForm) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-amber-50 rounded-2xl shadow-2xl max-w-lg w-full p-6">
          <p className="text-xs uppercase tracking-widest text-stone-600 font-semibold mb-2"><InterfaceText source="Structured contribution" /></p>
          <h2 className="font-serif text-2xl text-stone-900 mb-3"><InterfaceText source="Add to " />{moduleName}</h2>
          <p className="text-sm text-stone-700 leading-relaxed mb-6"><InterfaceText source="This collection needs specific language and cultural details. The contribution form will guide you through the required fields and consent choices." /></p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-full border border-stone-900/20 text-stone-800"><InterfaceText source="Cancel" /></button>
            <button
              onClick={() => { onClose(); router.push(`/contribute/${moduleCode}`); }}
              className="px-5 py-2 rounded-full bg-stone-900 text-amber-50 font-semibold"
            ><InterfaceText source="Open contribution form" /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#cfc09a] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-900/15 bg-[#a9895a]">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-800/60"><InterfaceText source="Contribute to " />{moduleName}
            </p>
            <h2 className="font-serif text-xl text-stone-900"><InterfaceText source="Share your knowledge" /></h2>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-stone-800/60 hover:text-stone-900"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Media type picker */}
          <div>
            <label className="block text-sm font-semibold text-stone-800 mb-2"><InterfaceText source="What are you contributing?" /></label>
            <div className="grid grid-cols-5 gap-2">
              {MEDIA_TYPES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMediaType(m.key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                    mediaType === m.key
                      ? "bg-stone-900 text-amber-50 border-stone-900 shadow-lg"
                      : "bg-amber-50/70 text-stone-800 border-stone-900/20 hover:border-amber-800"
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-stone-800 mb-1.5"><InterfaceText source="Title " /><span className="text-red-600">*</span>
            </label>
            <InterfaceInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this a clear, short title"
              className="w-full px-4 py-3 bg-white border border-stone-900/20 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-stone-900"
            />
          </div>

          {/* File upload for image/audio/video */}
          {(mediaType === "image" ||
            mediaType === "audio" ||
            mediaType === "video") && (
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                {MEDIA_TYPES.find((m) => m.key === mediaType)?.label}<InterfaceText source=" file" /></label>
              <input
                type="file"
                accept={MEDIA_TYPES.find((m) => m.key === mediaType)?.accept}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full px-4 py-3 bg-white border border-stone-900/20 rounded-xl text-stone-900 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-amber-700 file:text-white file:font-medium file:text-sm hover:file:bg-amber-800"
              />
              {file && (
                <p className="text-xs text-stone-800/70 mt-2">
                  {file.name} · {(file.size / 1024).toFixed(1)}<InterfaceText source=" KB" /></p>
              )}
            </div>
          )}

          {/* Transcript textarea (for transcript or text types) */}
          {(mediaType === "transcript" || mediaType === "text") && (
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                <InterfaceText source={mediaType === "transcript" ? "Transcript text" : "Text"} />
              </label>
              <InterfaceTextarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={8}
                placeholder="Type or paste the content here..."
                className="w-full px-4 py-3 bg-white border border-stone-900/20 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-stone-900"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-stone-800 mb-1.5"><InterfaceText source="Description / context" /></label>
            <InterfaceTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add context, meaning, or any details that help others understand."
              className="w-full px-4 py-3 bg-white border border-stone-900/20 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-700 text-stone-900"
            />
          </div>

          <p className="text-xs text-stone-800/70 leading-relaxed"><InterfaceText source="Your name, age, and account details are recorded with this submission. Moderators use your age to help judge the authenticity of cultural content." /></p>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-900/15 p-4 bg-[#a9895a] flex items-center justify-between gap-3">
          <button
            onClick={() => handleSubmit("draft")}
            disabled={uploading}
            className="px-5 py-2.5 bg-white/70 text-stone-900 rounded-full font-semibold hover:bg-white disabled:opacity-50 transition text-sm"
          ><InterfaceText source="Save draft" /></button>
          <button
            onClick={() => handleSubmit("submitted")}
            disabled={uploading}
            className="px-6 py-2.5 bg-stone-900 text-amber-50 rounded-full font-semibold hover:bg-amber-900 disabled:opacity-50 transition text-sm shadow-lg"
          >
            <InterfaceText source={uploading ? "Submitting..." : "Submit for review"} />
          </button>
        </div>
      </div>
    </div>
  );
}
