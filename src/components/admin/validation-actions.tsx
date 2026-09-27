"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ValidationChecklist } from "./validation-checklist";

export function ValidationActions({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [comments, setComments] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  async function validate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/content/${recordId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments, checklist: checks }),
      });
      if (!res.ok) throw new Error("Failed");

      toast.success("Content validated");
      router.push("/admin/validation-queue");
      router.refresh();
    } catch {
      toast.error("Validation failed");
    } finally {
      setBusy(false);
    }
  }

  async function requestRevision() {
    setBusy(true);
    try {
      const res = await fetch(`/api/content/${recordId}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments }),
      });
      if (!res.ok) throw new Error("Failed");

      toast.success("Sent back for revision");
      router.push("/admin/validation-queue");
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ValidationChecklist onChange={setChecks} />

      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
        <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
          Validator Notes
        </h2>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          placeholder="Optional notes on language or cultural accuracy..."
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={validate}
            disabled={busy}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {busy ? "..." : "✓ Validate"}
          </button>
          <button
            onClick={requestRevision}
            disabled={busy}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {busy ? "..." : "↩ Request Revision"}
          </button>
        </div>
      </div>
    </div>
  );
}