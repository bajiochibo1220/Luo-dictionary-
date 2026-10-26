import { NativeSessionSchema, NATIVE_AUTH_CALLBACK, type NativeSession } from "@/lib/native-auth-contract";
import { parseAppApiOrigin } from "@/lib/app-client";
import { NativeStoredStateSchema, type PendingNativeLogin, type NativeSecureStorage, type NativeStoredState } from "@/lib/native-session-storage";

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type NativeSessionReason = "sign-in" | "restore" | "renew" | "sign-out";
// Framework-independent coordinator; native adapters provide OS-protected
// storage. Browser previews and isolated tests never persist credentials.
export function createNativeLoginClient(options: {
  origin: string;
  openBrowser: (url: string) => Promise<void>;
  fetch?: typeof fetch;
  onSession?: (session: NativeSession | null, reason: NativeSessionReason) => void;
  storage?: NativeSecureStorage;
  // Supplied only by the Android bridge. Native build constants, rather than
  // frontend environment variables, decide whether USB development is enabled.
  allowLocalUsbAuth?: () => Promise<boolean>;
}) {
  const origin = parseAppApiOrigin(options.origin);
  const transport = options.fetch ?? fetch;
  let pending: PendingNativeLogin | null = null;
  let session: NativeSession | null = null;
  let revocations: NativeSession[] = [];
  let generation = 0;
  let exchanging = false;
  let completedCallback: string | null = null;
  let initialization: Promise<void> | null = null;
  let renewal: Promise<string | null> | null = null;
  let revoking: Promise<void> | null = null;
  let writes = Promise.resolve();
  function setSession(value: NativeSession | null, reason: NativeSessionReason) { session = value; options.onSession?.(value, reason); }
  function persist() {
    const snapshot: NativeStoredState = { version: 1, origin, pending, session, revocations: [...revocations] };
    // Snapshot before queuing: late writes cannot restore an older identity.
    const value = JSON.stringify(snapshot);
    const write = writes.catch(() => {}).then(() => options.storage?.write(value));
    writes = write;
    return write;
  }
  async function allowedOrigin() {
    if (new URL(origin).protocol === "https:") return;
    const loopback = ["http://localhost:3000", "http://127.0.0.1:3000"].includes(origin);
    const enabled = loopback && await options.allowLocalUsbAuth?.().catch(() => false);
    if (!enabled) throw new Error("Sign-in is unavailable in this app build. Please update the app or contact support.");
  }
  function initialize() {
    if (!initialization) initialization = (async () => {
      if (!options.storage) return;
      await allowedOrigin();
      const value = await options.storage.read();
      if (!value) return;
      let saved;
      try { saved = NativeStoredStateSchema.parse(JSON.parse(value)); }
      catch { await persist(); return; }
      if (saved.origin !== origin) { await persist(); return; }
      const now = Date.now();
      pending = saved.pending && saved.pending.expires > now && saved.pending.expires <= now + 600000 ? saved.pending : null;
      revocations = saved.revocations.filter(item => Date.parse(item.refreshExpiresAt ?? item.expiresAt) > now);
      const restored = saved.session;
      if (restored && Date.parse(restored.refreshExpiresAt ?? restored.expiresAt) > now) setSession(restored, "restore");
      await persist();
    })().catch(error => { initialization = null; throw error; });
    return initialization;
  }
  async function revoke(value: NativeSession) {
    const response = await transport(new URL("/api/v1/native/revoke", origin), {
      method: "POST", credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${value.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(value.refreshToken ? { refreshToken: value.refreshToken } : {}),
    });
    if (!response.ok) throw new Error("Signed out in the app. Reconnect to finish server sign-out.");
  }
  async function flushRevocations() {
    if (revoking) return revoking;
    const work = (async () => {
      for (const value of [...revocations]) {
        await revoke(value);
        revocations = revocations.filter(item => item.accessToken !== value.accessToken);
        await persist();
      }
    })();
    revoking = work;
    try { await work; } finally { if (revoking === work) revoking = null; }
  }
  async function start(intent: "login" | "register" = "login") {
    if (exchanging) throw new Error("Sign-in is still connecting. Please wait a moment.");
    if (intent !== "login" && intent !== "register") throw new Error("Choose Sign in or Create account.");
    const current = ++generation;
    completedCallback = null;
    pending = null;
    await allowedOrigin();
    await initialize();
    pending = null;
    await flushRevocations();
    if (current !== generation) return;
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
    if (current !== generation) return;
    pending = { verifier, state, expires: Date.now() + 10 * 60 * 1000 };
    await persist();
    if (current !== generation) return;
    const approval = `/mobile-auth?${new URLSearchParams({ challenge, state })}`;
    const url = new URL(intent === "register" ? "/register" : "/login", origin);
    url.search = new URLSearchParams({ callbackUrl: approval }).toString();
    try { await options.openBrowser(url.href); }
    catch (error) { if (current === generation) { pending = null; await persist(); } throw error; }
  }
  async function acceptCallback(value: string) {
    let url;
    try { url = new URL(value); } catch { return false; }
    if (`${url.protocol}//${url.host}${url.pathname}` !== NATIVE_AUTH_CALLBACK || url.username || url.password || url.hash) return false;
    await initialize();
    if (!pending && session && completedCallback === url.href) return true;
    if (exchanging) return true;
    if (!pending || pending.expires <= Date.now()) throw new Error("Sign-in expired. Please start sign-in again from this app.");
    if (url.searchParams.getAll("state").length !== 1 || url.searchParams.get("state") !== pending.state
      || url.searchParams.getAll("code").length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get("code") ?? "")
      || [...url.searchParams.keys()].some(key => !["code", "state"].includes(key))) {
      throw new Error("The sign-in response could not be verified. Please start again from this app.");
    }
    const current = generation;
    const attempt = pending;
    pending = null; exchanging = true;
    try {
      await persist();
      const response = await transport(new URL("/api/v1/native/token", origin), {
        method: "POST", credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(40000),
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ code: url.searchParams.get("code"), verifier: attempt.verifier }),
      });
      const body = await response.json();
      if (!response.ok || body.success !== true) throw new Error(body.error || "Sign-in could not be completed. Please try again.");
      const parsed = NativeSessionSchema.safeParse(body.data);
      if (!parsed.success) throw new Error("The sign-in response could not be verified. Please sign in again.");
      const result = parsed.data;
      if (Date.parse(result.expiresAt) <= Date.now()) throw new Error("Sign-in expired. Please try again.");
      if (current === generation) {
        const previous = session;
        session = result;
        try { await persist(); }
        catch { session = null; await revoke(result); throw new Error("Protected login storage could not save your session. Please try again."); }
        if (current !== generation) await revoke(result);
        else {
          setSession(result, "sign-in");
          completedCallback = url.href;
          if (previous) { revocations.push(previous); await persist(); await flushRevocations(); }
        }
      } else await revoke(result);
      return true;
    } finally { exchanging = false; }
  }
  function accessToken() {
    return session && Date.parse(session.expiresAt) > Date.now() ? session.accessToken : null;
  }
  async function getAccessToken(): Promise<string | null> {
    await initialize();
    if (renewal) return renewal;
    if (!session) return null;
    if (Date.parse(session.expiresAt) > Date.now() + 60000) return session.accessToken;
    if (session.refreshExpiresAt && Date.parse(session.refreshExpiresAt) <= Date.now() + 60000 && accessToken()) return accessToken();
    if (!session.refreshToken) {
      if (accessToken()) return accessToken();
      setSession(null, "sign-out"); await persist(); return null;
    }
    if (Date.parse(session.refreshExpiresAt!) <= Date.now()) {
      setSession(null, "sign-out"); await persist(); throw new Error("Your session ended. Please sign in again.");
    }
    const current = generation;
    const previous = session;
    const work = (async () => {
      const response = await transport(new URL("/api/v1/native/refresh", origin), {
        method: "POST", credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(40000),
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refreshToken: previous.refreshToken }),
      });
      const body = await response.json();
      if (!response.ok || body.success !== true) {
        if ((response.status === 401 || response.status === 400) && current === generation) {
          setSession(null, "sign-out"); await persist();
        }
        throw new Error(body.error || "Session renewal cannot connect right now. Try again when online.");
      }
      const parsed = NativeSessionSchema.safeParse(body.data);
      if (!parsed.success) throw new Error("The renewed session could not be verified. Please sign in again.");
      const next = parsed.data;
      if (!next.refreshToken || Date.parse(next.expiresAt) <= Date.now() || Date.parse(next.refreshExpiresAt!) <= Date.now()
        || next.refreshToken.split(".")[0] !== previous.refreshToken!.split(".")[0]
        || next.refreshExpiresAt !== previous.refreshExpiresAt) throw new Error("The renewed session could not be verified. Please sign in again.");
      if (current !== generation) { await revoke(next); return null; }
      session = next;
      try { await persist(); }
      catch { session = null; setSession(null, "sign-out"); await revoke(next); throw new Error("Protected login storage could not save your session. Please sign in again."); }
      if (current !== generation) { await revoke(next); return null; }
      setSession(next, "renew"); return next.accessToken;
    })();
    renewal = work;
    try { return await work; } finally { if (renewal === work) renewal = null; }
  }
  async function signOut() {
    await initialize();
    ++generation; pending = null; completedCallback = null;
    const previous = session;
    setSession(null, "sign-out");
    if (previous) revocations.push(previous);
    // Save the signed-out state before network work. A failed server request
    // leaves only a revocation queue, which cannot restore personal access.
    try { await persist(); } catch {
      await flushRevocations().catch(() => {});
      throw new Error("Sign-out could not be saved on this phone. Reconnect and try again before closing the app.");
    }
    await flushRevocations();
  }
  async function resume() { await initialize(); await flushRevocations(); await getAccessToken(); }
  return { start, acceptCallback, accessToken, getAccessToken, initialize, resume, signOut };
}
