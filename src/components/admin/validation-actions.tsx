"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ValidationChecklist } from "./validation-checklist";

type RejectionProposal = { proposerName: string; reason: string; invalidVotes: number; validVotes: number; threshold: number; hasVoted: boolean; canVote: boolean };

export function ValidationActions({ recordId, canAct, rejectionProposal }: { recordId: string; canAct: boolean; rejectionProposal?: RejectionProposal | null }) {
  const router = useRouter();
  const [comments, setComments] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  async function culturalDecision() {
    setBusy(true);
    try {
      const res = await fetch(`/api/content/${recordId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments, checklist: checks }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Cultural review failed");

      toast.success("Cultural review passed. The item is now in the publisher queue.");
      router.push("/admin/validation-queue");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectionAction(intent: "propose" | "vote_invalid" | "vote_valid") {
    if (intent !== "vote_valid" && comments.trim().length < 8) {
      toast.error("Add a clear reason of at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/content/${recordId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, comments }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Rejection review action failed");
      toast.success(result.message || "Vote recorded.");
      router.push("/admin/validation-queue");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (rejectionProposal) return (
    <div className="space-y-5 rounded-xl border border-red-200 bg-red-50 p-6">
      <div>
        <h2 className="font-semibold text-red-900">Proposed cultural rejection</h2>
        <p className="mt-1 text-sm text-red-800">Proposed by {rejectionProposal.proposerName || "a cultural reviewer"}</p>
        <p className="mt-3 whitespace-pre-line text-sm text-stone-800">{rejectionProposal.reason}</p>
      </div>
      <p className="text-sm text-stone-700">Invalid votes: {rejectionProposal.invalidVotes} · Valid votes: {rejectionProposal.validVotes} · {rejectionProposal.threshold} invalid vote{rejectionProposal.threshold === 1 ? "" : "s"} needed from the other assigned cultural reviewers.</p>
      {!rejectionProposal.canVote ? <p className="text-sm font-medium text-stone-700">You proposed this review or are not assigned as an independent cultural reviewer, so you cannot vote on it.</p> : rejectionProposal.hasVoted ? <p className="text-sm font-medium text-stone-700">Your vote has been recorded.</p> : <>
        <textarea value={comments} onChange={(event) => setComments(event.target.value)} rows={3} placeholder="Reason for an invalid vote (required), or optional note for a valid vote" className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm" />
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={() => void rejectionAction("vote_invalid")} className="rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Vote that this is culturally invalid</button>
          <button type="button" disabled={busy} onClick={() => void rejectionAction("vote_valid")} className="rounded-lg bg-stone-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Vote that this is valid</button>
        </div>
      </>}
    </div>
  );

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
      {canAct ? <ValidationChecklist onChange={setChecks} /> : (
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          This item is waiting for a cultural expert. You can view it here, but you cannot complete the cultural review with this role.
        </p>
      )}

      {canAct && <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => void culturalDecision()}
            disabled={busy}
            className="px-4 py-3 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {busy ? "..." : "Approve & Send to Publisher"}
          </button>
          <button
            onClick={() => void requestRevision()}
            disabled={busy}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {busy ? "..." : "Request Editor Changes"}
          </button>
        </div>
        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="mb-2 text-xs text-stone-600">For content that may be culturally false or harmful, request an independent reviewer vote. It will not be rejected from one reviewer’s decision.</p>
          <button type="button" disabled={busy} onClick={() => void rejectionAction("propose")} className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50">Propose rejection for reviewer vote</button>
        </div>
      </div>}
    </div>
  );
}
