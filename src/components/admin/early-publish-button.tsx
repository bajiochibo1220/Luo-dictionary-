"use client";
import { InterfaceText } from "@/components/shared/interface-language";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function EarlyPublishButton({ recordId }: { recordId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-amber-700 px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50" onClick={async () => {
    if (!confirm("Publish the uploaded version while review continues? Confirm that it and its attached files may be shared publicly. The reviewed version will replace it when published.")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/content/${recordId}/publish-before-review`, { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Publishing failed.");
      toast.success(<InterfaceText source={"Published. Review and editing can continue."} />);
      router.refresh();
    } catch (error) { toast.error(<InterfaceText source={error instanceof Error ? error.message : "Publishing failed."} />); }
    finally { setBusy(false); }
  }}><InterfaceText source={busy ? "Publishing…" : "Publish before review"} /></button>;
}
