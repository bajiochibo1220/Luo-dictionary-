"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { InterfaceText } from "@/components/shared/interface-language";

export function PasswordResetForm() {
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setError(""); setMessage("");
    if (step === "code" && fields.get("password") !== fields.get("confirmation")) {
      setError("The passwords do not match."); return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(step === "email" ? { action: "request", email: email.trim() } : { action: "complete", email: email.trim(), code: fields.get("code"), password: fields.get("password") }),
        signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to reset your password. Please try again.");
      setMessage(result.message); setStep(step === "email" ? "code" : "done");
    } catch (reason) {
      setError(reason instanceof Error && reason.name !== "TimeoutError" ? reason.message : "The request timed out. Please try again.");
    } finally { setBusy(false); }
  }
  return <section className="space-y-5 text-stone-900">
    <header><h1 className="font-serif text-3xl"><InterfaceText source="Reset password" /></h1><p className="mt-2 text-sm"><InterfaceText source={step === "email" ? "Enter your account email to receive a password reset code." : step === "code" ? "Enter the six-digit code from your email, then choose a new password." : "Your password has been reset."} /></p></header>
    {step !== "done" && <ol aria-label="Password reset progress" className="flex flex-wrap gap-3 text-sm"><li aria-current={step === "email" ? "step" : undefined}><InterfaceText source="1. Send code" /></li><li aria-current={step === "code" ? "step" : undefined}><InterfaceText source="2. Reset password" /></li></ol>}
    {message && <p role="status" className="rounded-lg border border-green-800/25 bg-green-50 p-3 text-sm"><InterfaceText source={message} /></p>}
    {error && <p role="alert" className="rounded-lg border border-red-800/25 bg-red-50 p-3 text-sm text-red-900"><InterfaceText source={error} /></p>}
    {step === "done" ? <Link href="/login" className="inline-flex min-h-11 items-center rounded-full bg-amber-900 px-5 py-3 text-white"><InterfaceText source="Sign in" /></Link> : <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <label className="block text-sm font-medium"><InterfaceText source="Email" /><input name="email" type="email" autoComplete="email" maxLength={254} required readOnly={step === "code"} value={email} onChange={event => setEmail(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-stone-400 p-3 read-only:bg-stone-100" /></label>
        {step === "code" && <>
          <label className="block text-sm font-medium"><InterfaceText source="Reset code" /><input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus className="mt-1 min-h-11 w-full rounded-lg border border-stone-400 p-3 tracking-widest" /></label>
          <p id="reset-password-requirements" className="text-sm"><InterfaceText source="Use 12–128 characters for your new password." /></p>
          <label className="block text-sm font-medium"><InterfaceText source="New password" /><input name="password" type="password" autoComplete="new-password" aria-describedby="reset-password-requirements" minLength={12} maxLength={128} required className="mt-1 min-h-11 w-full rounded-lg border border-stone-400 p-3" /></label>
          <label className="block text-sm font-medium"><InterfaceText source="Confirm new password" /><input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className="mt-1 min-h-11 w-full rounded-lg border border-stone-400 p-3" /></label>
        </>}
        <button disabled={busy} className="min-h-11 w-full rounded-full bg-amber-900 px-5 py-3 font-semibold text-white disabled:opacity-50"><InterfaceText source={busy ? "Please wait…" : step === "email" ? "Send reset code" : "Reset password"} /></button>
        {step === "code" && <button type="button" onClick={() => { setStep("email"); setMessage(""); setError(""); }} className="min-h-11 text-sm font-semibold underline"><InterfaceText source="Request a new code or change email" /></button>}
      </fieldset>
    </form>}
  </section>;
}
