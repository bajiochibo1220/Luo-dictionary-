"use client";
import { InterfaceOption, InterfaceText } from "@/components/shared/interface-language";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
export function AccountRecoveryForm() {
  const params = useSearchParams(); const token = params.get("token");
  const [purpose, setPurpose] = useState(["verify", "delete"].includes(params.get("purpose") || "") ? params.get("purpose")! : "reset");
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <form className="mx-auto max-w-md space-y-5 rounded-xl bg-white p-6 text-stone-900" onSubmit={async event => {
    event.preventDefault(); const fields = new FormData(event.currentTarget); setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/auth/recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(token ? { action: "complete", purpose, token, ...(purpose === "reset" ? { password: fields.get("password") } : {}) } : { action: "request", purpose, email: fields.get("email") }), signal: AbortSignal.timeout(25000) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error); setMessage(body.message);
      if (token) history.replaceState(null, "", "/account-recovery");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to connect. Retry."); } finally { setBusy(false); }
  }}>
    <h1 className="font-serif text-3xl">{purpose === "delete" ? "Delete account" : purpose === "verify" ? "Verify email" : "Reset password"}</h1>
    {!token && <><label className="block"><InterfaceText source="Action" /><select className="w-full rounded border p-3" value={purpose} onChange={e => setPurpose(e.target.value)}><InterfaceOption value="reset">Reset password</InterfaceOption><InterfaceOption value="verify">Verify email</InterfaceOption><InterfaceOption value="delete">Delete account</InterfaceOption></select></label><label className="block"><InterfaceText source="Email" /><input name="email" type="email" autoComplete="email" required className="w-full rounded border p-3" /></label></>}
    {token && purpose === "reset" && <label className="block"><InterfaceText source="New password" /><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className="w-full rounded border p-3" /></label>}
    {purpose === "delete" && <p className="rounded border border-red-800 p-3"><InterfaceText source="Confirming the emailed link permanently removes your sign-in, profile, saved chats and personal progress. Required cultural-source, consent and audit evidence is retained under institutional policy." /></p>}
    {error && <p role="alert" className="text-red-800">{error}</p>}{message && <p role="status">{message}</p>}
    <button disabled={busy || !!message} className="min-h-11 rounded-full bg-amber-900 px-5 py-3 text-white disabled:opacity-50">{busy ? "Please wait…" : token ? "Confirm" : "Send email"}</button><Link href="/login" className="block min-h-11 underline"><InterfaceText source="Back to sign in" /></Link>
  </form>;
}
