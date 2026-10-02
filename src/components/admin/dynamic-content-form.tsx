"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { uploadMediaFile } from "@/lib/media-upload-client";

const CONSENT_CHOICES = ["pending", "research_only", "teaching", "public_excerpt", "community_only", "embargoed"] as const;
const RESTRICTION_CHOICES = ["public", "internal", "restricted", "sacred"] as const;

type FieldDef = {
  id: number;
  fieldCode: string;
  baseLabel: string;
  fieldType: string;
  isRequired: boolean;
  displayOrder: number;
  label: string;
};

type ExistingMedia = { id: string; type: string; url: string; format: string; caption: string | null };

export function DynamicContentForm({
  moduleCode,
  languageId,
  languageName,
  languageCode,
  fieldDefs,
  initialData,
  recordId,
  redirectTo = "/dashboard",
  isAdmin = false,
  isTranslation = false,
  isElderContributor = false,
  existingMedia = [],
}: {
  moduleCode: string;
  languageId: number;
  languageName: string;
  languageCode: string;
  fieldDefs: FieldDef[];
  initialData?: Record<string, any>;
  recordId?: string;
  redirectTo?: string;
  isAdmin?: boolean;
  isTranslation?: boolean;
  isElderContributor?: boolean;
  existingMedia?: ExistingMedia[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.__title || "");
  const [values, setValues] = useState<Record<string, any>>(
    initialData ?? {}
  );
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [sourcePermission, setSourcePermission] = useState<string>(initialData?.sourcePermission ?? "needs_review");
  const [attributionPreference, setAttributionPreference] = useState<string>(initialData?.attributionPreference ?? "ask_later");
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const requiresSourcePermission = !isTranslation;

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);
  const [governance, setGovernance] = useState({
    consentScope: initialData?.consentScope ?? "pending",
    restrictionLevel: initialData?.restrictionLevel ?? "internal",
    embargoUntil: initialData?.embargoUntil ? String(initialData.embargoUntil).slice(0, 10) : "",
    countyCode: initialData?.countyCode ?? "",
    siteName: initialData?.siteName ?? "",
    sourceReference: initialData?.sourceReference ?? "",
    sessionId: initialData?.sessionId ?? "",
  });
  const [provenance, setProvenance] = useState({
    sourceType: initialData?.__provenance?.sourceType ?? (initialData?.sourceReference ? "fieldwork" : "contributor_submission"),
    sourceName: initialData?.__provenance?.sourceName ?? initialData?.sourceReference ?? "",
    sourceDate: initialData?.__provenance?.sourceDate ? new Date(initialData.__provenance.sourceDate).toISOString().slice(0, 10) : "",
    sourceLocation: initialData?.__provenance?.sourceLocation ?? initialData?.siteName ?? "",
    collector: initialData?.__provenance?.collector ?? "",
    notes: initialData?.__provenance?.notes ?? "",
  });

  function update(fieldCode: string, value: any) {
    setValues((v) => ({ ...v, [fieldCode]: value }));
  }

  async function save(status: "draft" | "submitted") {
    if (requiresSourcePermission && status === "submitted" && sourcePermission === "not_granted") {
      toast.error("Keep this as a draft until permission is granted.");
      return;
    }
    // Validate required fields
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    for (const f of fieldDefs) {
      if (!recordId && f.isRequired && !String(values[f.fieldCode] ?? "").trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        languageId,
        moduleCode,
        title,
        status,
        data: {
          ...values,
          ...(requiresSourcePermission ? { sourcePermission, attributionPreference } : {}),
        },
        tags: [],
        ...governance,
        provenance: !isTranslation && provenance.sourceName.trim() ? {
          ...provenance,
          sourceDate: provenance.sourceDate || null,
          sourceLocation: provenance.sourceLocation || null,
          collector: provenance.collector || null,
          notes: provenance.notes || null,
        } : null,
        embargoUntil: governance.embargoUntil || null,
        countyCode: governance.countyCode || null,
        siteName: governance.siteName || null,
        sourceReference: governance.sourceReference || null,
        sessionId: governance.sessionId || null,
      };

      const url = recordId ? `/api/content/${recordId}` : "/api/content";
      const method = recordId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");

      const newId = recordId || json.data.id;
      for (const [assetType, file] of Object.entries(files)) {
        if (!file) continue;
        await uploadMediaFile(file, { languageCode, moduleCode, recordId: newId, assetType });
      }

      if (recordId && !isAdmin && status === "submitted") {
        const submit = await fetch(`/api/content/${newId}/submit`, { method: "POST" });
        const submitted = await submit.json();
        if (!submit.ok || !submitted.success) throw new Error(submitted.error || "Could not submit for review");
      }

      toast.success(
        isTranslation
          ? "Translation saved"
          : isAdmin
          ? recordId ? "Changes saved. Continue the item's review stage from the Content list." : "Draft saved. Send it to cultural review from the Content list when ready."
          : status === "submitted"
          ? "Submitted for cultural review"
          : "Saved as draft"
      );

      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function startAudioRecording() {
    if (sourcePermission !== "confirmed") {
      toast.error("Confirm the speaker or knowledge holder has given permission before recording.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Audio recording is not supported in this browser. You can upload an audio file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const extension = type.includes("mp4") ? "m4a" : "webm";
        const recording = new File(chunksRef.current, `${moduleCode}-${Date.now()}.${extension}`, { type });
        setFiles((current) => ({ ...current, audio: recording }));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);
        toast.success("Recording attached. Save a draft or submit it for review.");
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      toast.error("Microphone access was unavailable. Check browser permission or upload an audio file.");
    }
  }

  function stopAudioRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  return (
    <div className="bg-amber-50/95 backdrop-blur rounded-2xl border border-stone-900/10 p-6 md:p-8 shadow-lg">
      <div className="mb-6">
        <label className="block text-sm font-semibold text-stone-800 mb-1.5">
          Title <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-stone-900/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700 text-stone-900"
          placeholder="Give this contribution a title"
        />
      </div>

      {!fieldDefs.some((field) => field.fieldCode === "description") && (
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-semibold text-stone-800">Description</label>
          <textarea
            value={values.description ?? ""}
            onChange={(event) => update("description", event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-stone-900/20 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700"
            placeholder="Add a description now or come back to it later"
          />
        </div>
      )}

      {fieldDefs.map((f) => (
        <div key={f.id} className="mb-5">
          <label className="block text-sm font-semibold text-stone-800 mb-1.5">
            {f.label}
            {f.isRequired && <span className="text-red-600 ml-1">*</span>}
          </label>

          {f.fieldType === "textarea" ? (
            <textarea
              value={values[f.fieldCode] ?? ""}
              onChange={(e) => update(f.fieldCode, e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-stone-900/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700 text-stone-900"
            />
          ) : (
            <input
              type="text"
              value={values[f.fieldCode] ?? ""}
              onChange={(e) => update(f.fieldCode, e.target.value)}
              className="w-full px-4 py-3 bg-white border border-stone-900/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700 text-stone-900"
            />
          )}
        </div>
      ))}

      <section className="my-7 rounded-xl border border-stone-900/10 bg-white/60 p-4">
        <h3 className="font-semibold text-stone-800">Media and transcripts</h3>
        <p className="mb-4 mt-1 text-xs text-stone-600">Attached files stay with this item when you edit it. Choose a file only if you want to add another one.</p>
        {existingMedia.length > 0 && <div className="mb-4 rounded-lg border border-stone-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Already attached ({existingMedia.length})</p>
          <ul className="space-y-2">
            {existingMedia.map((asset) => <li key={asset.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-stone-700">{asset.caption || asset.type} · {asset.format}</span>
              <a href={asset.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-medium text-amber-800 underline">Open file</a>
            </li>)}
          </ul>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          {(["image", "video", "audio", "document"] as const).map((type) => (
            <label key={type} className="block text-sm text-stone-700 capitalize">
              {existingMedia.some((asset) => asset.type === type) ? `Add another ${type === "document" ? "transcript or document" : type}` : type === "document" ? "Transcript or document" : type}
              <input type="file" accept={type === "image" ? "image/*" : type === "video" ? "video/*" : type === "audio" ? "audio/*" : ".txt,.pdf,.doc,.docx"}
                onChange={(e) => setFiles((current) => ({ ...current, [type]: e.target.files?.[0] ?? null }))}
                className="mt-1 block w-full text-xs" />
            </label>
          ))}
        </div>
        {moduleCode === "oral_histories" && (
          <div className="mt-5 rounded-lg border border-stone-900/10 bg-white p-4">
            <p className="text-sm font-semibold text-stone-900">Record an oral-history audio narration</p>
            <p className="mt-1 text-xs leading-5 text-stone-700">Confirm permission first. The recording stays private until a reviewer checks the contribution and its access settings.</p>
            <button type="button" onClick={isRecording ? stopAudioRecording : startAudioRecording} disabled={loading} className="mt-3 min-h-11 rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {isRecording ? "Stop recording" : "Start recording"}
            </button>
            {files.audio && <p className="mt-2 text-xs text-stone-700" role="status">Audio attached: {files.audio.name}</p>}
          </div>
        )}
      </section>

      {!isTranslation && <section className="my-7 rounded-xl border border-stone-900/10 bg-white/60 p-4">
        <h3 className="font-semibold text-stone-800">Source and access</h3>
        <p className="mb-4 mt-1 text-xs text-stone-600">{isElderContributor ? "If you are unsure, leave permission for a reviewer to check." : "Set the source permission and access here. If unsure, leave it for review."} Public release needs confirmed permission.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {requiresSourcePermission && <label className="text-sm font-medium text-stone-800">Source permission
            <select value={sourcePermission} onChange={(event) => setSourcePermission(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2">
              <option value="needs_review">Not sure yet / ask a reviewer</option>
              <option value="confirmed">Permission confirmed</option>
              <option value="not_granted">Permission not granted</option>
            </select>
          </label>}
          {requiresSourcePermission && <label className="text-sm font-medium text-stone-800">Source credit
            <select value={attributionPreference} onChange={(event) => setAttributionPreference(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2">
              <option value="ask_later">Decide with a reviewer</option>
              <option value="name">Use the source's name (with permission)</option>
              <option value="anonymous">Keep the source anonymous</option>
              <option value="community">Credit the community</option>
            </select>
          </label>}
          <label className="text-sm font-medium text-stone-800">Consent scope
            <select value={governance.consentScope} onChange={(e) => setGovernance((v) => ({ ...v, consentScope: e.target.value }))} className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2">
              {CONSENT_CHOICES.map((choice) => <option key={choice} value={choice}>{choice.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-stone-800">Restriction level
            <select value={governance.restrictionLevel} onChange={(e) => setGovernance((v) => ({ ...v, restrictionLevel: e.target.value }))} className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2">
              {RESTRICTION_CHOICES.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
            </select>
          </label>
          {governance.consentScope === "embargoed" && <label className="text-sm font-medium text-stone-800">Embargo ends
            <input type="date" value={governance.embargoUntil} onChange={(e) => setGovernance((v) => ({ ...v, embargoUntil: e.target.value }))} className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2" />
          </label>}
        </div>
        {sourcePermission === "not_granted" && <p className="mt-3 rounded-lg bg-amber-100 p-3 text-sm text-stone-900" role="status">Keep this as a draft. Do not submit or publish this material without permission. Ask a reviewer for guidance.</p>}
        <details className="mt-4 rounded-lg border border-stone-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-stone-700">More collection details (optional)</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-stone-800">County code
            <input value={governance.countyCode} onChange={(e) => setGovernance((v) => ({ ...v, countyCode: e.target.value }))} placeholder="HBY, KSM, SYA" className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-stone-800">Site
            <input value={governance.siteName} onChange={(e) => setGovernance((v) => ({ ...v, siteName: e.target.value }))} className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-stone-800">Source reference
            <input value={governance.sourceReference} onChange={(e) => { const value = e.target.value; setGovernance((v) => ({ ...v, sourceReference: value })); setProvenance((v) => ({ ...v, sourceName: v.sourceName || value })); }} className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-stone-800">Collection session ID
            <input value={governance.sessionId} onChange={(e) => setGovernance((v) => ({ ...v, sessionId: e.target.value }))} placeholder="County-YYYYMMDD-SITE-001" className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2" />
          </label>
        </div>
        <div className="mt-5 border-t border-stone-900/10 pt-4">
          <h4 className="text-sm font-semibold text-stone-800">Collection provenance</h4>
          <p className="mb-3 mt-1 text-xs text-stone-600">Record the source and collection context when known. These details stay with the curated record.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-stone-800">Source type
              <input value={provenance.sourceType} onChange={(e) => setProvenance((v) => ({ ...v, sourceType: e.target.value }))} placeholder="Interview, archive, field notes" className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-stone-800">Source name or identifier
              <input value={provenance.sourceName} onChange={(e) => setProvenance((v) => ({ ...v, sourceName: e.target.value }))} placeholder="Collection or source reference" className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-stone-800">Collection date
              <input type="date" value={provenance.sourceDate} onChange={(e) => setProvenance((v) => ({ ...v, sourceDate: e.target.value }))} className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-stone-800">Collector
              <input value={provenance.collector} onChange={(e) => setProvenance((v) => ({ ...v, collector: e.target.value }))} className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-stone-800">Source location
              <input value={provenance.sourceLocation} onChange={(e) => setProvenance((v) => ({ ...v, sourceLocation: e.target.value }))} className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-stone-800 sm:col-span-2">Provenance notes
              <textarea value={provenance.notes} onChange={(e) => setProvenance((v) => ({ ...v, notes: e.target.value }))} rows={3} className="mt-1 block w-full rounded-lg border border-stone-900/20 bg-white px-3 py-2" />
            </label>
          </div>
        </div>
        </details>
      </section>}

      <div className="flex items-center gap-3 pt-6 border-t border-stone-900/10">
        {!isTranslation && !isAdmin && <button
          type="button"
          onClick={() => save("draft")}
          disabled={loading}
          className="min-h-11 rounded-full border border-stone-900/25 bg-white/70 px-5 py-3 font-semibold text-stone-900 hover:bg-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save private draft"}
        </button>}
        <button
          type="button"
          onClick={() => save(isAdmin ? "draft" : "submitted")}
          disabled={loading}
          className="px-6 py-3 bg-amber-700 text-amber-50 rounded-full font-semibold hover:bg-amber-800 disabled:opacity-50 transition shadow-lg"
        >
          {loading ? "Saving..." : isTranslation ? "Save translation" : isAdmin ? recordId ? "Save changes" : "Save draft" : "Submit for reviewer"}
        </button>
      </div>

      <p className="text-xs text-stone-800/60 mt-4 leading-relaxed">
        {!isTranslation && <>New submissions go to cultural review, then to a content editor, then to a language administrator for final approval.</>}
      </p>
    </div>
  );
}
