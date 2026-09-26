"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ReviewActions({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function doAction(action: "approve" | "reject" | "revision") {
    setBusy(action);
    try {
      const res = await fetch(`/api/content/${recordId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments }),
      });
      if (!res.ok) throw new Error("Failed");

      const labels = {
        approve: "approved",
        reject: "rejected",
        revision: "sent back for revision",
      };

      toast.success(`Content ${labels[action]}`);
      router.push("/admin/review-queue");
      router.refresh();
    } catch {
      toast.error(`${action} failed`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
        Reviewer Notes
      </h2>
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        rows={3}
        placeholder="Optional feedback for the contributor..."
        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
      />

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => doAction("approve")}
          disabled={!!busy}
          className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {busy === "approve" ? "..." : "✓ Approve"}
        </button>
        <button
          onClick={() => doAction("revision")}
          disabled={!!busy}
          className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {busy === "revision" ? "..." : "↩ Revision"}
        </button>
        <button
          onClick={() => doAction("reject")}
          disabled={!!busy}
          className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {busy === "reject" ? "..." : "✕ Reject"}
        </button>
      </div>
    </div>
  );
}