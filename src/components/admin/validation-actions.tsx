"use client";
import { InterfaceText, InterfaceTextarea } from "@/components/shared/interface-language";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ValidationChecklist } from "./validation-checklist";

type RejectionProposal = { proposerName: string; reason: string; invalidVotes: number; validVotes: number; threshold: number; hasVoted: boolean; canVote: boolean };

export function ValidationActions({ recordId, canAct, rejectionProposal, canStartEdit = false, editOnly = false }: { recordId: string; canAct: boolean; canStartEdit?: boolean; editOnly?: boolean; rejectionProposal?: RejectionProposal | null }) {
  const router = useRouter();
  const [comments, setComments] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  async function startEditing() {
    setBusy(true);
    try {
      const response = await fetch(`/api/content/${recordId}/start-edit`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open editing.");
      router.push(`/admin/content/${recordId}/edit`);
      router.refresh();
    } catch (error) { toast.error(<InterfaceText source={error instanceof Error ? error.message : "Could not open editing."} />); }
    finally { setBusy(false); }
  }

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

      toast.success(<InterfaceText source={"Cultural review passed. The item is now in the publisher queue."} />);
      router.push("/admin/validation-queue");
      router.refresh();
    } catch (error) {
      toast.error(<InterfaceText source={error instanceof Error ? error.message : "Validation failed"} />);
    } finally {
      setBusy(false);
    }
  }

  async function rejectionAction(intent: "propose" | "vote_invalid" | "vote_valid") {
    if (intent !== "vote_valid" && comments.trim().length < 8) {
      toast.error(<InterfaceText source={"Add a clear reason of at least 8 characters."} />);
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
      toast.success(<InterfaceText source={result.message || "Vote recorded."} />);
      router.push("/admin/validation-queue");
      router.refresh();
    } catch (error) {
      toast.error(<InterfaceText source={error instanceof Error ? error.message : "Action failed"} />);
    } finally {
      setBusy(false);
    }
  }

  if (editOnly) return canAct && canStartEdit ? <button type="button" disabled={busy} onClick={() => void startEditing()} className="mb-4 min-h-11 rounded-lg bg-stone-800 px-4 text-white"><InterfaceText source="Review & edit both versions" /></button> : null;

  if (rejectionProposal) return (
    <div className="space-y-5 rounded-xl border border-red-200 bg-red-50 p-6">
      <div>
        <h2 className="font-semibold text-red-900"><InterfaceText source="Proposed cultural rejection" /></h2>
        <p className="mt-1 text-sm text-red-800"><InterfaceText source="Proposed by " />{rejectionProposal.proposerName || "an editor"}</p>
        <p className="mt-3 whitespace-pre-line text-sm text-stone-800">{rejectionProposal.reason}</p>
      </div>
      <p className="text-sm text-stone-700"><InterfaceText source="Invalid votes: " />{rejectionProposal.invalidVotes}<InterfaceText source=" · Valid votes: " />{rejectionProposal.validVotes} · {rejectionProposal.threshold}<InterfaceText source=" invalid vote" /><InterfaceText source={rejectionProposal.threshold === 1 ? "" : "s"} /><InterfaceText source=" needed from the other assigned editors." /></p>
      {!rejectionProposal.canVote ? <p className="text-sm font-medium text-stone-700"><InterfaceText source="You proposed this review or are not assigned as an independent editor, so you cannot vote on it." /></p> : rejectionProposal.hasVoted ? <p className="text-sm font-medium text-stone-700"><InterfaceText source="Your vote has been recorded." /></p> : <>
        <InterfaceTextarea value={comments} onChange={(event) => setComments(event.target.value)} rows={3} placeholder="Reason for an invalid vote (required), or optional note for a valid vote" className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm" />
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={() => void rejectionAction("vote_invalid")} className="rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><InterfaceText source="Vote that this is culturally invalid" /></button>
          <button type="button" disabled={busy} onClick={() => void rejectionAction("vote_valid")} className="rounded-lg bg-stone-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><InterfaceText source="Vote that this is valid" /></button>
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

      toast.success(<InterfaceText source={"Sent back for revision"} />);
      router.push("/admin/validation-queue");
      router.refresh();
    } catch {
      toast.error(<InterfaceText source={"Action failed"} />);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {canAct && canStartEdit && <button type="button" disabled={busy} onClick={() => void startEditing()} className="min-h-11 rounded-lg bg-stone-800 px-4 text-white"><InterfaceText source="Review & edit both versions" /></button>}
      {canAct ? <ValidationChecklist onChange={setChecks} /> : (
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><InterfaceText source="This item is waiting for an editor. You can view it here, but you cannot complete the cultural review with this role." /></p>
      )}

      {canAct && <div className="bg-white rounded-xl shadow-xs border border-stone-100 p-6">
        <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4"><InterfaceText source="Validator Notes" /></h2>
        <InterfaceTextarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          placeholder="Optional notes on language or cultural accuracy..."
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 mb-4"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => void culturalDecision()}
            disabled={busy || ["spelling", "translation", "grammar", "pronunciation", "examples", "culture"].some(key => !checks[key])}
            className="px-4 py-3 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <InterfaceText source={busy ? "..." : "Approve & Send to Publisher"} />
          </button>
          <button
            onClick={() => void requestRevision()}
            disabled={busy}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <InterfaceText source={busy ? "..." : "Request Editor Changes"} />
          </button>
        </div>
        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="mb-2 text-xs text-stone-600"><InterfaceText source="For content that may be culturally false or harmful, request an independent reviewer vote. It will not be rejected from one reviewer’s decision." /></p>
          <button type="button" disabled={busy} onClick={() => void rejectionAction("propose")} className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"><InterfaceText source="Propose rejection for reviewer vote" /></button>
        </div>
      </div>}
    </div>
  );
}
