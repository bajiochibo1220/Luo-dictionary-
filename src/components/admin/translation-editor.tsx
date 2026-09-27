"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function TranslationEditor({
  id,
  languageId,
  endpoint,
  initialValue,
  label,
  hint,
}: {
  id: number;
  languageId: number;
  endpoint: "modules" | "fields";
  initialValue: string;
  label: string;
  hint?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = value !== initialValue;

  async function save() {
    if (!dirty) return;
    setBusy(true);
    try {
      const body: any = { languageId };
      if (endpoint === "modules") {
        body.moduleId = id;
        body.title = value;
      } else {
        body.fieldId = id;
        body.label = value;
      }

      const res = await fetch(`/api/translations/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }

      toast.success("Saved");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-stone-100 last:border-0">
      <div className="w-48 flex-shrink-0">
        <p className="text-sm text-stone-700">{label}</p>
        {hint && <p className="text-xs text-stone-400 mt-0.5">{hint}</p>}
      </div>

      <div className="flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
        />
      </div>

      <button
        onClick={save}
        disabled={!dirty || busy}
        className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-medium transition ${
          saved
            ? "bg-green-100 text-green-700"
            : dirty
            ? "bg-amber-600 text-white hover:bg-amber-700"
            : "bg-stone-100 text-stone-400 cursor-not-allowed"
        }`}
      >
        {busy ? "..." : saved ? "✓ Saved" : "Save"}
      </button>
    </div>
  );
}