"use client";
import { useCallback, useEffect, useState } from "react";
import type { FeatureRequest } from "./learning-hub";
export function AccountSettings({ request, onSignedOut, recoveryHref }: { request: FeatureRequest; onSignedOut: () => void; recoveryHref: string }) {
  const [data, setData] = useState<any>(null); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => { try { setData(await request("/api/v1/account/settings")); } catch (reason) { setError(reason instanceof Error ? reason.message : "Settings unavailable."); } }, [request]);
  useEffect(() => { void reload(); }, [reload]);
  async function act(input: unknown, logout = false) {
    setBusy(true); setError(""); setNotice("");
    try { await request("/api/v1/account/settings", { method: "POST", body: JSON.stringify(input) }); if (logout) onSignedOut(); else { await reload(); setNotice("Saved."); } }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save."); } finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-3xl space-y-5 p-5 text-stone-900"><h1 className="workspace-heading font-serif text-3xl">Account settings</h1>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <button className="min-h-11 underline" onClick={() => void reload()}>Refresh</button>
    {data && <><form className="space-y-4 rounded-xl bg-white/80 p-5" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); void act({ action: "profile", name: values.get("name"), profileTypes: values.getAll("profileTypes") }); }}>
      <label className="block">Name<input key={data.account.name} name="name" defaultValue={data.account.name || ""} minLength={2} maxLength={100} required className="block w-full rounded border p-3" /></label>
      <fieldset><legend>Interests</legend>{["community_member", "student", "teacher", "researcher", "contributor"].map(value => <label key={value} className="flex min-h-11 items-center gap-3"><input name="profileTypes" type="checkbox" value={value} defaultChecked={data.account.profileTypes.includes(value)} />{value.replaceAll("_", " ")}</label>)}</fieldset><p className="text-sm">Interests do not grant staff permissions.</p><button disabled={busy} className="min-h-11 rounded-full bg-amber-900 px-5 py-3 text-white">Save profile</button>
    </form><div className="space-y-3 rounded-xl bg-white/80 p-5"><h2 className="font-serif text-2xl">Device sessions</h2>{data.sessions.map((session: any) => <div key={session.id} className="flex flex-wrap items-center gap-3"><p>App session · expires {new Date(session.expires).toLocaleString()}</p><button disabled={busy} className="min-h-11 underline" onClick={() => void act({ action: "revoke", id: session.id })}>Revoke</button></div>)}<p className="text-sm">Browser sessions are revoked together using the button below.</p><button disabled={busy} onClick={() => void act({ action: "revoke-all" }, true)} className="min-h-11 rounded-full bg-red-900 px-5 py-3 text-white">Sign out all devices</button></div>
    <div className="space-y-3 rounded-xl bg-white/80 p-5"><h2 className="font-serif text-2xl">Notifications</h2>{data.notifications.length ? data.notifications.map((notification: any) => <div key={notification.id} className="border-b py-3"><p>{notification.message}</p>{!notification.read && <button disabled={busy} className="min-h-11 underline" onClick={() => void act({ action: "read-notification", id: notification.id })}>Mark read</button>}</div>) : <p>No notifications.</p>}</div></>}
    <div className="space-y-3 rounded-xl bg-white/80 p-5"><h2 className="font-serif text-2xl">Recovery, verification &amp; deletion</h2><p>Use an email confirmation link to verify your address, reset your password, or delete your account. Governed cultural contributions and required audit/consent evidence may be retained with restricted access.</p><a href={recoveryHref} className="block min-h-11 underline">Open account verification and recovery</a></div>
  </section>;
}
