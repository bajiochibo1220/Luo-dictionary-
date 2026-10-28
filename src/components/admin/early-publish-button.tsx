"use client";
import { InterfaceText } from "@/components/shared/interface-language";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = { recordId?: string; recordIds?: string[]; disabled?: boolean; onBusyChange?: (busy: boolean) => void; onPublished?: () => void };
export function EarlyPublishButton({ recordId, recordIds, disabled, onBusyChange, onPublished }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const ids = recordIds ?? (recordId ? [recordId] : []);
  useEffect(() => { if (open && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [open]);
  return <>
    <button type="button" disabled={disabled || busy || !ids.length} className="min-h-11 rounded-lg border border-amber-700 px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50" onClick={() => { setError(""); setOpen(true); }}><InterfaceText source={recordIds ? "Publish selected before review" : "Publish before review"} /></button>
    {open && <dialog ref={dialog} aria-labelledby="early-publication-title" className="overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 text-left text-stone-900 shadow-xl backdrop:bg-black/50" style={{ width: "min(94vw, 38rem)", maxHeight: "90dvh" }} onCancel={event => { if (busy) event.preventDefault(); }} onClose={() => setOpen(false)}>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault(); if (busy) return;
        setBusy(true); onBusyChange?.(true); setError("");
        try {
          const endpoint = recordIds ? "/api/content/bulk-publish-before-review" : `/api/content/${encodeURIComponent(recordId!)}/publish-before-review`;
          const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(recordIds ? { recordIds: ids } : {}), overrideAccessRestrictions: true }) });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.error || "Publishing failed.");
          toast.success(<InterfaceText source={`Published ${result.count ?? 1} item(s). Review and editing can continue.`} />);
          dialog.current?.close(); onPublished?.(); router.refresh();
        } catch (reason) { setError(reason instanceof Error ? reason.message : "Publishing failed."); }
        finally { setBusy(false); onBusyChange?.(false); }
      }}>
        <div className="flex items-start justify-between gap-4"><h2 id="early-publication-title" className="font-serif text-xl"><InterfaceText source="Publish before review" /></h2><button type="button" aria-label="Close publishing dialog" disabled={busy} onClick={() => dialog.current?.close()} className="min-h-11 min-w-11 rounded-lg border">×</button></div>
        <p><InterfaceText source="Selected items:" /> {ids.length}</p>
        <p className="text-sm"><InterfaceText source="Publish the selected uploads and their attachments for everyone to see. Review and editing can continue. Publishing the reviewed version will replace this public version." /></p>
        <p className="text-xs text-stone-600"><InterfaceText source="Publishing overrides existing access restrictions and embargoes for these uploads and their attachments. Your publishing decision is recorded." /></p>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={() => dialog.current?.close()} className="min-h-11 rounded-lg border px-4"><InterfaceText source="Cancel" /></button><button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-amber-800 px-4 font-semibold text-white disabled:opacity-50"><InterfaceText source={busy ? "Publishing..." : "Publish now"} /></button></div>
      </form>
    </dialog>}
  </>;
}
