"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function SendToFinalReviewButton({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const response = await fetch(`/api/content/${recordId}/send-to-final-review`, { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not send this item on.");
      toast.success("Sent back to cultural review.");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not send this item on.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={() => void send()} disabled={busy} className="rounded-lg border border-amber-800 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50">
      {busy ? "Sending…" : "Send to cultural review"}
    </button>
  );
}
