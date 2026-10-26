"use client";
import { InterfaceText } from "@/components/shared/interface-language";
import { applicationReturnTarget } from "@/lib/application-return";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { nativeLoginReturn } from "@/lib/native-auth-contract";
import Link from "next/link";
export function PhoneLoginForm() {
  const [phone, setPhone] = useState(""); const [code, setCode] = useState(""); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const params = useSearchParams(); const callbackUrl = nativeLoginReturn(params.get("callbackUrl")) || applicationReturnTarget() || "/auth/continue";
  async function send() {
    setBusy(true); setError("");
    try { const response = await fetch("/api/auth/phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", purpose: "login", phone }), signal: AbortSignal.timeout(20000) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setNotice(result.data.message); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Cannot connect."); } finally { setBusy(false); }
  }
  return <form className="space-y-5 rounded-xl bg-white p-6 text-stone-900" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); try { const result = await signIn("phone", { phone, code, redirect: false }); if (result?.error) throw new Error("Invalid or expired code."); location.href = callbackUrl; } catch (reason) { setError(reason instanceof Error ? reason.message : "Cannot sign in."); } finally { setBusy(false); } }}>
    <h1 className="font-serif text-3xl"><InterfaceText source="Sign in by phone" /></h1><p><InterfaceText source="First link a phone from your account settings after signing in with email or a supported provider." /></p>
    <label className="block"><InterfaceText source="Phone (international format)" /><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required pattern="\+[1-9][0-9]{7,14}" className="block w-full rounded border p-3" /></label><button type="button" disabled={busy} onClick={() => void send()} className="min-h-11 underline"><InterfaceText source="Send code" /></button>
    <label className="block"><InterfaceText source="Six-digit code" /><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} pattern="[0-9]{6}" required className="block w-full rounded border p-3" /></label>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}<button disabled={busy} className="min-h-11 rounded-full bg-amber-900 px-5 py-3 text-white"><InterfaceText source="Sign in" /></button><Link href="/login" className="block underline"><InterfaceText source="Back to email sign in" /></Link>
  </form>;
}
