"use client";
import { InterfaceInput, InterfaceText } from "@/components/shared/interface-language";


import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EarlyPublishButton } from "@/components/admin/early-publish-button";

type ContentRecord = {
  id: string;
  title: string;
  status: string;
  validatorId: string | null;
  createdAt: string;
  editLanguageId: number;
  englishLanguageId: number | null;
  canModerate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCultureReview: boolean;
  canForward: boolean;
  canFinalReview: boolean;
  canPublish: boolean;
  canEarlyPublish: boolean;
  hasPublicVersion: boolean;
  earlyPublicationIssues?: string[];
  language: { code: string; nativeName: string };
  module: { code: string; baseName: string };
};

async function readApiResponse(response: Response) {
  const body = await response.text();
  if (!body) throw new Error(`The server returned no response (HTTP ${response.status}).`);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
  }
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-600",
  submitted: "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  needs_edit: "bg-purple-100 text-purple-700",
  curated: "bg-orange-100 text-orange-800",
  published: "bg-green-100 text-green-700",
  published_source: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export function ContentTable({
  records,
  canDelete,
  canBulkWorkflow,
}: {
  records: ContentRecord[];
  canDelete: boolean;
  canBulkWorkflow: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const selectedRecords = records.filter((record) => selected.includes(record.id));
  const selectedStatuses = new Set(selectedRecords.map((record) => record.status));
  const selectedStage = selectedStatuses.size === 1 ? [...selectedStatuses][0] : null;
  const canAdvanceSelection = !!selectedStage && selectedRecords.every((record) => {
    if (record.status === "submitted") return record.canCultureReview;
    if (["draft", "rejected", "curated"].includes(record.status)) return record.canModerate;
    if (record.status === "needs_edit") return record.canForward;
    if (record.status === "under_review") return record.canPublish;
    return false;
  });

  async function action(id: string, endpoint: string, successMessage: string) {
    setBusy(id);
    try {
      const response = await fetch(`/api/content/${id}/${endpoint}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "The action failed.");
      toast.success(<InterfaceText source={endpoint === "send-to-final-review" ? "Sent back to cultural review" : successMessage} />);
      router.refresh();
    } catch (error: any) {
      toast.error(<InterfaceText source={error.message || "The action failed."} />);
    } finally {
      setBusy(null);
    }
  }

  async function deleteSelected() {
    if (!selected.length || !selectedRecords.every((record) => record.canDelete)) return;
    if (!confirm(`Delete ${selected.length} selected uploads? Their content and history will be preserved in the audit log.`)) return;
    setBulkBusy(true);
    try {
      const response = await fetch("/api/content/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not delete the selected items.");
      toast.success(<InterfaceText source={`Deleted ${selected.length} items`} />);
      setSelected([]);
      router.refresh();
    } catch (error: any) {
      toast.error(<InterfaceText source={error.message || "Could not delete the selected items."} />);
    } finally {
      setBulkBusy(false);
    }
  }

  async function advanceSelected() {
    if (!selected.length || !selectedStage) return;
    if (selectedStage === "under_review" && !confirm(`Publish ${selected.length} selected items? Confirm that every item and its attached files have passed review and may be shared publicly.`)) return;
    if (selectedStage === "submitted" && !confirm(`Confirm that you have checked spelling, translation, grammar, pronunciation, examples and cultural accuracy for every one of the ${selected.length} selected items.`)) return;
    setBulkBusy(true);
    try {
      if (selectedStage === "submitted") {
        const response = await fetch("/api/content/bulk-validate", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recordIds: selected, checklist: { spelling: true, translation: true, grammar: true, pronunciation: true, examples: true, culture: true } }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Could not approve these items.");
        toast.success(<InterfaceText source={`Culturally approved ${result.count} items`} />);
      } else if (["draft", "rejected", "curated"].includes(selectedStage)) {
        const response = await fetch("/api/content/bulk-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordIds: selected }),
        });
        const result = await readApiResponse(response);
        if (!response.ok || !result.success) throw new Error(result.error || "Could not send these items to cultural review.");
        toast.success(<InterfaceText source={`Sent ${result.count} items to cultural review`} />);
      } else if (selectedStage === "under_review") {
        const response = await fetch("/api/content/bulk-publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordIds: selected }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Could not publish these items.");
        toast.success(<InterfaceText source={`Published ${result.count} items`} />);
      } else if (selectedStage === "needs_edit") {
        let completed = 0;
        for (const id of selected) {
          const response = await fetch(`/api/content/${id}/send-to-final-review`, { method: "POST" });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(`${completed} sent; ${result.error || "one item could not be sent"}`);
          completed += 1;
        }
        toast.success(<InterfaceText source={`Sent ${completed} items back to cultural review`} />);
      } else {
        throw new Error("Select items at the same workflow stage.");
      }
      setSelected([]);
      router.refresh();
    } catch (error: any) {
      toast.error(<InterfaceText source={error.message || "Could not move the selected items."} />);
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  if (records.length === 0) {
    return <div className="rounded-xl border border-stone-100 bg-white p-12 text-center text-stone-500"><InterfaceText source="No content found in this selection." /></div>;
  }

  const canSelect = canDelete || canBulkWorkflow || records.some(record => record.canEarlyPublish || record.canPublish);
  return (
    <div className="overflow-hidden rounded-xl border border-stone-100 bg-white shadow-xs">
      {canSelect && <p className="border-b border-stone-100 bg-amber-50 px-4 py-3 text-sm text-stone-700"><InterfaceText source="Select up to 100 items, then publish reviewed content or publish before review. Reviewed versions automatically replace earlier public versions when published." /></p>}
      {canSelect && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <InterfaceInput type="checkbox" disabled={bulkBusy} checked={selected.length > 0 && records.slice(0, 100).every(record => selected.includes(record.id))} onChange={(event) => setSelected(event.target.checked ? records.slice(0, 100).map((record) => record.id) : [])} aria-label="Select all visible content" />
          {selected.length ? `${selected.length} selected` : "Select up to 100 items"}
        </label>
        {records.some(record => record.canEarlyPublish) && <button type="button" disabled={bulkBusy} onClick={() => setSelected(records.filter(record => record.canEarlyPublish).slice(0, 100).map(record => record.id))} className="min-h-11 rounded-lg border border-amber-700 px-3 text-sm font-semibold text-amber-950 disabled:opacity-50"><InterfaceText source="Select items for publishing before review" /></button>}
        {records.some(record => record.status === "under_review" && record.canPublish) && <button type="button" disabled={bulkBusy} onClick={() => setSelected(records.filter(record => record.status === "under_review" && record.canPublish).slice(0, 100).map(record => record.id))} className="min-h-11 rounded-lg border border-green-700 px-3 text-sm font-semibold text-green-900 disabled:opacity-50"><InterfaceText source="Select reviewed items ready to publish" /></button>}
        {canDelete && <button type="button" disabled={bulkBusy} onClick={() => setSelected(records.filter(record => record.canDelete).slice(0, 100).map(record => record.id))} className="min-h-11 rounded-lg border px-3 text-sm disabled:opacity-50"><InterfaceText source="Select deletable uploads" /></button>}
        {selected.length > 0 && <div className="flex flex-wrap gap-2">
          {selectedRecords.some(record => record.canEarlyPublish && record.earlyPublicationIssues?.length) && <p role="status" className="w-full rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><InterfaceText source="Use Publish selected before review to confirm public-sharing permission for the selected uploads. Existing restrictions and active embargoes still apply." /></p>}
          <button type="button" disabled={bulkBusy} onClick={() => setSelected([])} className="min-h-11 px-3 text-sm underline disabled:opacity-50"><InterfaceText source="Clear selection" /></button>
          {!selectedRecords.every(record => record.canEarlyPublish) && !(selectedStage === "under_review" && selectedRecords.every(record => record.canPublish)) && <p role="status" className="w-full text-sm text-stone-600"><InterfaceText source="For publishing, select only items ready for review publication or only items eligible for publication before review." /></p>}
          {selectedRecords.every(record => record.canEarlyPublish) && <EarlyPublishButton recordIds={selected} disabled={bulkBusy} onBusyChange={setBulkBusy} onPublished={() => setSelected([])} />}
          {(canBulkWorkflow || selectedStage === "under_review") && canAdvanceSelection && selectedStage && ["draft", "rejected", "curated", "submitted", "needs_edit", "under_review"].includes(selectedStage) && <button type="button" onClick={() => void advanceSelected()} disabled={bulkBusy} className="rounded-lg bg-amber-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {bulkBusy ? "Working…" : selectedStage === "under_review" ? "Publish selected" : selectedStage === "submitted" ? "Approve editor review" : "Send selected to cultural review"}
          </button>}
          {canDelete && selectedRecords.every((record) => record.canDelete) && <button type="button" onClick={() => void deleteSelected()} disabled={bulkBusy} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"><InterfaceText source="Delete selected" /></button>}
        </div>}
      </div>}
      <div className="w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-stone-200 bg-stone-50">
            <tr>
              {canSelect && <th className="w-10 px-3 py-3" aria-label="Select" />}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"><InterfaceText source="Title" /></th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"><InterfaceText source="Module" /></th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"><InterfaceText source="Language" /></th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"><InterfaceText source="Status" /></th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500"><InterfaceText source="Next step" /></th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-stone-100 transition hover:bg-stone-50">
                {canSelect && <td className="px-3 py-3"><input type="checkbox" disabled={bulkBusy || selected.length >= 100 && !selected.includes(record.id)} checked={selected.includes(record.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, record.id] : current.filter((id) => id !== record.id))} aria-label={`Select ${record.title}`} /></td>}
                <td className="px-4 py-3">{record.canEdit && ["draft", "needs_edit", "rejected", "curated"].includes(record.status) ? <Link href={`/admin/content/${record.id}/edit?languageId=${record.editLanguageId}`} className="font-medium text-stone-800 hover:text-amber-700">{record.title}</Link> : <span className="font-medium text-stone-800">{record.title}</span>}
                  {record.canEarlyPublish && !!record.earlyPublicationIssues?.length && <details className="mt-2 max-w-md text-xs text-amber-950"><summary className="min-h-8 cursor-pointer font-semibold"><InterfaceText source="Public sharing settings need attention" /></summary><ul className="my-2 list-disc space-y-1 pl-4">{record.earlyPublicationIssues.map(issue => <li key={issue}><InterfaceText source={issue} /></li>)}</ul>{record.canEdit && ["draft", "needs_edit", "rejected", "curated"].includes(record.status) ? <Link href={`/admin/content/${record.id}/edit?languageId=${record.editLanguageId}#source-and-access`} className="inline-flex min-h-11 items-center font-semibold underline"><InterfaceText source="Set source and access" /></Link> : <p><InterfaceText source="Use Publish before review to confirm public sharing without waiting for content editing. Explicit restrictions must be resolved separately." /></p>}</details>}
                </td>
                <td className="px-4 py-3 text-stone-600">{record.module.baseName}</td>
                <td className="px-4 py-3 text-stone-600">{record.language.nativeName}</td>
                <td className="px-4 py-3"><span className={`inline-block rounded-full px-2 py-1 text-xs ${STATUS_STYLES[record.status] || STATUS_STYLES.draft}`}>{record.status === "published_source" ? "published" : record.status.replaceAll("_", " ")}</span></td>
                <td className="space-x-3 px-4 py-3 text-right">
                  {record.hasPublicVersion && <span className="text-xs text-green-800"><InterfaceText source="Public version available" /></span>}
                  {record.canEarlyPublish && <EarlyPublishButton recordId={record.id} />}
                  {(record.status === "submitted" || (record.status === "under_review" && !record.validatorId)) && record.canCultureReview && <Link href={`/admin/validation-queue/${record.id}`} className="text-xs font-medium text-amber-700 hover:underline"><InterfaceText source="Assess authenticity" /></Link>}
                  {record.status === "needs_edit" && record.canEdit && <><Link href={`/admin/content/${record.id}/edit?languageId=${record.editLanguageId}`} className="text-xs text-stone-600 hover:underline"><InterfaceText source="Edit" /></Link>{record.canForward && <button type="button" onClick={() => void action(record.id, "send-to-final-review", "Sent back to cultural review")} disabled={busy === record.id} className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-50"><InterfaceText source="Send to cultural review" /></button>}</>}
                  {record.englishLanguageId && record.englishLanguageId !== record.editLanguageId && (record.canModerate || record.canEdit) && ["draft", "needs_edit", "rejected", "curated"].includes(record.status) && <Link href={`/admin/content/${record.id}/edit?languageId=${record.englishLanguageId}`} className="text-xs text-blue-700 hover:underline"><InterfaceText source="English version" /></Link>}
                  {record.status === "under_review" && record.canFinalReview && <Link href={`/admin/review-queue/${record.id}`} className="text-xs font-medium text-green-700 hover:underline"><InterfaceText source="Final review" /></Link>}
                  {record.canModerate && ["draft", "rejected", "curated"].includes(record.status) && <button type="button" onClick={() => void action(record.id, "submit", "Sent to cultural review")} disabled={busy === record.id} className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-50"><InterfaceText source="Send to cultural review" /></button>}
                  {record.canDelete && <button type="button" onClick={async () => {
                    if (!confirm("Delete this item permanently?")) return;
                    setBusy(record.id);
                    try {
                      const response = await fetch(`/api/content/${record.id}`, { method: "DELETE" });
                      if (!response.ok) throw new Error("Could not delete this item.");
                      toast.success(<InterfaceText source={"Deleted"} />);
                      router.refresh();
                    } catch (error: any) { toast.error(<InterfaceText source={error.message || "Could not delete this item."} />); }
                    finally { setBusy(null); }
                  }} disabled={busy === record.id} className="text-xs text-stone-400 hover:text-red-600"><InterfaceText source="Delete" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
