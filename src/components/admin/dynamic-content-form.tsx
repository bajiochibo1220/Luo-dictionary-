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
  fieldDefs,
  initialData,
  recordId,
}: {
  moduleCode: string;
  languageId: number;
  languageName: string;
  fieldDefs: FieldDef[];
  initialData?: Record<string, any>;
  recordId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.__title || "");
  const [values, setValues] = useState<Record<string, any>>(
    initialData ?? {}
  );

  function update(fieldCode: string, value: any) {
    setValues((v) => ({ ...v, [fieldCode]: value }));
  }

  async function save(status: "draft" | "submitted") {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        languageId,
        moduleCode,
        title,
        data: values,
        tags: [],
        status,
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

      if (status === "submitted" && recordId) {
        await fetch(`/api/content/${recordId}/submit`, { method: "POST" });
      }

      toast.success(
        status === "submitted" ? "Submitted for review" : "Saved as draft"
      );
      router.push("/admin/content");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-8">
      <div className="mb-6">
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Enter a title"
        />
      </div>

      {fieldDefs.map((f) => (
        <div key={f.id} className="mb-6">
          <label className="block text-sm font-medium text-stone-700 mb-1">
            {f.label}
            {f.isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>

          {f.fieldType === "textarea" ? (
            <textarea
              value={values[f.fieldCode] ?? ""}
              onChange={(e) => update(f.fieldCode, e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          ) : (
            <input
              type="text"
              value={values[f.fieldCode] ?? ""}
              onChange={(e) => update(f.fieldCode, e.target.value)}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
        <button
          onClick={() => save("draft")}
          disabled={loading}
          className="px-6 py-2.5 bg-white border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          onClick={() => save("submitted")}
          disabled={loading}
          className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Submit for Review"}
        </button>
      </div>
    </div>
  );
}