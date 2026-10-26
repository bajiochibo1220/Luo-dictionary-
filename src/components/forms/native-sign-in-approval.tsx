"use client";

import { useState } from "react";
import { NATIVE_AUTH_CALLBACK } from "@/lib/native-auth-contract";

export function NativeSignInApproval({ name, authorization }: { name: string; authorization: { challenge: string; state: string } }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [callback, setCallback] = useState("");
  async function approve() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/v1/native/authorize", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(authorization),
        signal: AbortSignal.timeout(40000),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || "Unable to continue. Please try again.");
      const target = new URL(body.data.callback);
      if (`${target.protocol}//${target.host}${target.pathname}` !== NATIVE_AUTH_CALLBACK) throw new Error("The app return address could not be verified.");
      setCallback(target.href);
      window.location.assign(target.href);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to continue."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <h1 className="font-serif text-3xl">Continue to Luo Heritage</h1>
    <p>Signed in as <strong>{name}</strong>.</p>
    <p>Continue only if you started sign-in from the Luo Heritage app. Your account and saved history will be the same as on the web.</p>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {callback ? <a href={callback} className="block rounded-full bg-amber-700 px-6 py-4 text-center font-semibold text-white">Return to app</a>
      : <button type="button" onClick={approve} disabled={busy} className="w-full rounded-full bg-amber-700 px-6 py-4 font-semibold text-white disabled:opacity-50">{busy ? "Connecting…" : "Continue to app"}</button>}
    <a href="/dashboard" className="block text-center text-amber-900 underline">Stay on the web</a>
  </div>;
}
