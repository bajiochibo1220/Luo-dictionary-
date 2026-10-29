"use client";
import { InterfaceText } from "@/components/shared/interface-language";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { SharedApplication } from "./application";
import { createAppClient } from "@/lib/app-client";
import { createChatTransport } from "@/lib/chat-transport";
import { webFeatureRequest } from "@/lib/web-feature-request";
import { offlinePut, offlineList, offlineDelete } from "@/lib/offline-learning";
import type { ApplicationAdapters, ApplicationSession } from "@/lib/application-adapters";
import type { NativeSessionReason } from "@/lib/native-login-client";

function browserAdapters(origin: string): ApplicationAdapters {
  const client = createAppClient({ origin, bootstrapTtlMs: 30000 });
  const subscribers = new Set<(session: ApplicationSession | null, reason: NativeSessionReason) => void>();
  const identityKey = `browser-identity:${origin}`;
  const logoutKey = `browser-logout:${origin}`;
  let current: ApplicationSession | null = null;
  const emit = (session: ApplicationSession | null, reason: NativeSessionReason) => { current = session; subscribers.forEach(callback => callback(session, reason)); };
  async function resume() {
    try {
      if ((await offlineList<boolean>(logoutKey).catch(() => [])).some(item => item.key === logoutKey)) {
        emit(null, "sign-out");
        await signOut({ redirect: false });
        await offlineDelete(logoutKey); await offlineDelete(identityKey); return;
      }
      const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Session service unavailable.");
      const session = await response.json();
      if (!session?.user?.id) { await offlineDelete(identityKey).catch(() => {}); emit(null, "sign-out"); return; }
      const identity = { accountId: session.user.id, expiresAt: session.expires };
      await offlinePut(identityKey, { accountId: identity.accountId, validUntil: Date.now() + 7 * 86400000 }).catch(() => {});
      emit(identity, current?.accountId === identity.accountId ? "renew" : "restore");
    } catch {
      if ((await offlineList<boolean>(logoutKey).catch(() => [])).some(item => item.key === logoutKey)) { emit(null, "sign-out"); return; }
      // This remembered ID can only scope queued offline work. It grants no
      // server permission; sync still requires a valid cookie and matching owner.
      const cached = (await offlineList<{ accountId: string; validUntil: number }>(identityKey).catch(() => [])).find(item => item.key === identityKey)?.value;
      if (cached && cached.validUntil > Date.now()) emit({ accountId: cached.accountId, expiresAt: new Date(Date.now() + 600000).toISOString() }, "restore");
      else emit(null, "sign-out");
    }
  }
  return {
    ...client, apiOrigin: origin, artwork: "/icons/luo-heritage-512.png", featureRequest: webFeatureRequest,
    featureFetch: fetch, chatRequest: createChatTransport({ origin }),
    bootstrap: async (language, signal) => {
      const key = `bootstrap:${origin}:${language}`;
      try { const value = await client.bootstrap(language, signal); await offlinePut(key, value).catch(() => {}); return value; }
      catch (error) { const cached = (await offlineList<any>(key).catch(() => [])).find(item => item.key === key); if (cached) return cached.value; throw error; }
    },
    nativeSession: {
      isNative: false, subscribe: callback => { subscribers.add(callback); return () => { subscribers.delete(callback); }; },
      resume, start: async intent => { location.href = intent === "register" ? "/register" : "/login"; },
      signOut: async () => { await offlinePut(logoutKey, true); await offlineDelete(identityKey).catch(() => {}); emit(null, "sign-out"); await signOut({ redirect: false }); await offlineDelete(logoutKey); },
      connect: async () => {
        await resume(); const refresh = () => { void resume(); };
        window.addEventListener("online", refresh); window.addEventListener("focus", refresh);
        const timer = window.setInterval(refresh, 180000);
        return () => { clearInterval(timer); window.removeEventListener("online", refresh); window.removeEventListener("focus", refresh); };
      },
    },
  };
}
function ReadyApplication({ origin }: { origin: string }) {
  const adapters = useMemo(() => browserAdapters(origin), [origin]);
  return <SharedApplication adapters={adapters} />;
}
export function WebApplication() {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(location.origin);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") void navigator.serviceWorker.register(`/application-sw.js?v=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_VERSION || "1")}`, { scope: "/application" }).catch(() => {});
  }, []);
  return origin ? <ReadyApplication origin={origin} /> : <p role="status" className="p-8"><InterfaceText source="Opening Luo Heritage…" /></p>;
}
