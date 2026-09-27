"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Language = {
  id: number;
  code: string;
  name: string;
  nativeName: string;
  isActive: boolean;
  recordCount: number;
};

export function LanguageDetailActions({ language }: { language: Language }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      const res = await fetch(`/api/languages/${language.id}/activate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(
        language.isActive ? "Language deactivated" : "Language activated"
      );
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setBusy(false);
    }
  }

  async function deleteLanguage() {
    if (language.recordCount > 0) {
      toast.error(
        `Cannot delete: ${language.recordCount} records exist. Delete them first.`
      );
      return;
    }
    if (
      !confirm(
        `Delete "${language.nativeName}" permanently? This cannot be undone.`
      )
    )
      return;

    setBusy(true);
    try {
      const res = await fetch(`/api/languages/${language.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success("Language deleted");
      router.push("/super-admin/languages");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
        <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
          Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={toggleActive}
            disabled={busy}
            className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
              language.isActive
                ? "bg-stone-100 text-stone-700 hover:bg-stone-200"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {language.isActive ? "Deactivate" : "Activate"}
          </button>
          <a
            href={`/${language.code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200"
          >
            Visit public site →
          </a>
        </div>
      </div>

      <div className="bg-red-50 rounded-xl border border-red-100 p-6">
        <h2 className="text-xs uppercase tracking-wider text-red-700 mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-stone-600 mb-4">
          {language.recordCount > 0
            ? `This language has ${language.recordCount} records and cannot be deleted.`
            : "Permanently delete this language and all its translations."}
        </p>
        <button
          onClick={deleteLanguage}
          disabled={busy || language.recordCount > 0}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          Delete Language
        </button>
      </div>
    </div>
  );
}