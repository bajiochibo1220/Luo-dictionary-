"use client";
import { InterfaceInput, InterfaceText } from "@/components/shared/interface-language";


import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

export function SharedAdminPasswordControl({ userId, email, own = false, transport = fetch, onSignInAgain }: { userId: string; email: string; own?: boolean; transport?: typeof fetch; onSignInAgain?: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false), [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState(""), [currentPassword, setCurrentPassword] = useState(""), [show, setShow] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  function close() { if (!busy) { setOpen(false); setPassword(""); setConfirmation(""); setCurrentPassword(""); setShow(false); setError(""); } }
  return <>
    <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-lg border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50"><InterfaceText source={own ? "Change my password" : "Change password"} /></button>
    <Dialog.Root open={open} onOpenChange={value => { if (value) setOpen(true); else close(); }}>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-stone-950/50" /><Dialog.Content lang="en" className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <Dialog.Title className="pr-8 text-xl font-semibold text-teal-950"><InterfaceText source={own ? "Change my password" : "Change account password"} /></Dialog.Title>
        <Dialog.Description className="text-sm leading-relaxed text-stone-600"><InterfaceText source="Set a new password for " />{email}<InterfaceText source=". Existing sessions will end and the account will need to sign in again." /></Dialog.Description>
        <Dialog.Close disabled={busy} aria-label="Close password form" className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-stone-100"><X size={20} /></Dialog.Close>
        <form className="space-y-4" onSubmit={async event => {
          event.preventDefault(); setError("");
          if (password !== confirmation) { setError("The new passwords do not match."); return; }
          setBusy(true);
          try {
            const response = await transport(`/api/super-admin/admins/${userId}/password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, ...(own ? { currentPassword } : {}) }) });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "Could not change this password.");
            setPassword(""); setConfirmation(""); setCurrentPassword(""); setOpen(false);
            toast.success(<InterfaceText source={"Password changed. Sign in with the new password."} />);
            if (result.signInAgain) { if (onSignInAgain) await onSignInAgain(); else window.location.assign("/login"); }
          } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not change this password."); }
          finally { setBusy(false); }
        }}>
          {own && <label className="block text-sm font-medium"><InterfaceText source="Current password" /><InterfaceInput aria-label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} maxLength={128} className="mt-1 block min-h-11 w-full rounded-lg border p-3" /><span className="text-xs font-normal text-stone-600"><InterfaceText source="Required if your account already has a password." /></span></label>}
          <label className="block text-sm font-medium"><InterfaceText source="New password" /><div className="relative mt-1"><InterfaceInput type={show ? "text" : "password"} aria-label="New password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="block min-h-11 w-full rounded-lg border p-3 pr-12" /><button type="button" onClick={() => setShow(value => !value)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-0 top-0 flex min-h-12 min-w-12 items-center justify-center">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><span className="text-xs font-normal text-stone-600"><InterfaceText source="Use 12–128 characters. A long, unique passphrase is best." /></span></label>
          <label className="block text-sm font-medium"><InterfaceText source="Confirm new password" /><InterfaceInput type={show ? "text" : "password"} aria-label="Confirm new password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border p-3" /></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={close} className="min-h-11 rounded-lg border px-4"><InterfaceText source="Cancel" /></button><button disabled={busy} className="min-h-11 rounded-lg bg-teal-800 px-4 font-semibold text-white disabled:opacity-50"><InterfaceText source={busy ? "Changing…" : "Change password"} /></button></div>
        </form>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  </>;
}
