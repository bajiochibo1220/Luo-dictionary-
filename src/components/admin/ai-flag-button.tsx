"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function AiFlagButton({
  id,
  flagged,
}: {
  id: string;
  flagged: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState(flagged);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, flagged: !state }),
      });
      if (!res.ok) throw new Error("Failed");
      setState(!state);
      toast.success(state ? "Unflagged" : "Flagged for review");
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`text-xs px-2 py-1 rounded transition ${
        state
          ? "bg-red-100 text-red-700 hover:bg-red-200"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
      } disabled:opacity-50`}
    >
      {busy ? "..." : state ? "⚑ Flagged" : "⚐ Flag"}
    </button>
  );
}