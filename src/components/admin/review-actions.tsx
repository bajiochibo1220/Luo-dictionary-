"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ReviewActions({ recordId, canAct }: { recordId: string; canAct: boolean }) {
  const router = useRouter();
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);
    try {
      const res = await fetch(`/api/content/${recordId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Publishing failed");
      toast.success(result.publicRelease ? "Published" : "Approved for internal curation. It remains private until release conditions are met.");
      router.push("/admin/review-queue");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publishing failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-stone-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xs uppercase tracking-wider text-stone-400">Publisher</h2>
      <p className="mb-4 text-sm leading-6 text-stone-700">Check source permission and attached files before publishing. Only an assigned publisher can release content publicly.</p>
      {canAct ? <>
        <textarea value={comments} onChange={(event) => setComments(event.target.value)} rows={3} placeholder="Optional publishing note..." className="mb-4 w-full rounded-lg border border-stone-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        <button onClick={() => void publish()} disabled={busy} className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">{busy ? "Publishing…" : "Publish"}</button>
      </> : <p className="text-sm text-blue-900">You can view this item, but only an assigned publisher can publish it.</p>}
    </div>
  );
}
