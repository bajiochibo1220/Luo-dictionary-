"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type FieldDef = {
  id: number;
  fieldCode: string;
  baseLabel: string;
  fieldType: string;
  isRequired: boolean;
  displayOrder: number;
  label: string;
};

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
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.__title || "");
  const [values, setValues] = useState<Record<string, any>>(
    initialData ?? {}
  );
  const [files, setFiles] = useState<Record<string, File | null>>({});

  function update(fieldCode: string, value: any) {
    setValues((v) => ({ ...v, [fieldCode]: value }));
  }

  async function save(status: "draft" | "submitted") {
    // Validate required fields
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    for (const f of fieldDefs) {
      if (f.isRequired && !values[f.fieldCode]) {
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
        data: values,
        tags: [],
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
        const form = new FormData();
        form.set("file", file);
        form.set("languageCode", languageCode);
        form.set("moduleCode", moduleCode);
        form.set("recordId", newId);
        form.set("assetType", assetType);
        const upload = await fetch("/api/media/upload", { method: "POST", body: form });
        const uploaded = await upload.json();
        if (!upload.ok || !uploaded.success) throw new Error(uploaded.error || `Failed to upload ${assetType}`);
      }

      if (isAdmin && json.data.status !== "published") {
        const publish = await fetch(`/api/content/${newId}/approve`, { method: "POST" });
        const published = await publish.json();
        if (!publish.ok || !published.success) throw new Error(published.error || "Content could not be published");
      }

      toast.success(
        isAdmin
          ? "Content published"
          : status === "submitted"
          ? "Submitted for review — a moderator will check it shortly"
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
        <p className="text-xs text-stone-600 mt-1 mb-4">Uploads are saved with this entry and shown in its content area.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["image", "video", "audio", "document"] as const).map((type) => (
            <label key={type} className="block text-sm text-stone-700 capitalize">
              {type === "document" ? "Transcript or document" : type}
              <input type="file" accept={type === "image" ? "image/*" : type === "video" ? "video/*" : type === "audio" ? "audio/*" : ".txt,.pdf,.doc,.docx"}
                onChange={(e) => setFiles((current) => ({ ...current, [type]: e.target.files?.[0] ?? null }))}
                className="mt-1 block w-full text-xs" />
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-6 border-t border-stone-900/10">
        <button
          onClick={() => save("submitted")}
          disabled={loading}
          className="px-6 py-3 bg-amber-700 text-amber-50 rounded-full font-semibold hover:bg-amber-800 disabled:opacity-50 transition shadow-lg"
        >
          {loading ? "Saving..." : isAdmin ? "Publish content" : "Submit for Review"}
        </button>
      </div>

      <p className="text-xs text-stone-800/60 mt-4 leading-relaxed">
        Submitted content goes to the moderation queue. A moderator reviews
        it, then a cultural expert validates language accuracy, then it is
        published.
      </p>
    </div>
  );
}
