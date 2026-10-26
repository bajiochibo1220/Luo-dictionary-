"use client";
import { InterfaceText } from "@/components/shared/interface-language";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function BackupActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function backupNow() {
    setBusy(true);
    try {
      const res = await fetch("/api/super-admin/backup", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");
      toast.success(<InterfaceText source={"Backup created"} />);
      router.refresh();
    } catch (e: any) {
      toast.error(<InterfaceText source={e.message || "Backup failed"} />);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={backupNow}
      disabled={busy}
      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
    >
      <InterfaceText source={busy ? "Backing up..." : "▣ Backup Now"} />
    </button>
  );
}