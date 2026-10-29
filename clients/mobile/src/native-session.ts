import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { createNativeLoginClient } from "@/lib/native-login-client";
import type { NativeSession } from "@/lib/native-auth-contract";
import type { NativeSessionReason } from "@/lib/native-login-client";

const DevelopmentConnection = registerPlugin<{ canUseUsbAuth: () => Promise<{ enabled: boolean }> }>("DevelopmentConnection");
const SecureAuthStorage = registerPlugin<{
  read: () => Promise<{ value: string | null }>;
  write: (options: { value: string }) => Promise<void>;
}>("SecureAuthStorage");

export function createNativeSession(origin: string) {
  const listeners = new Set<(session: NativeSession | null, reason: NativeSessionReason) => void>();
  const login = createNativeLoginClient({
    storage: Capacitor.isNativePlatform() ? {
      read: async () => (await SecureAuthStorage.read()).value,
      write: async value => { await SecureAuthStorage.write({ value }); },
    } : undefined,
    allowLocalUsbAuth: async () => {
      if (Capacitor.getPlatform() !== "android") return false;
      return (await DevelopmentConnection.canUseUsbAuth()).enabled === true;
    },
    origin, openBrowser: async url => {
      if (!Capacitor.isNativePlatform()) throw new Error("Use Sign in on the web for this browser preview. Native sign-in is available in the installed app.");
      try {
        const response = await fetch(new URL("/api/v1/bootstrap", origin), { credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(40000) });
        const body = await response.json();
        if (!response.ok || body.success !== true || body.data?.apiVersion !== 1) throw new Error("Unavailable");
      } catch {
        throw new Error("Sign-in cannot connect right now. Check your connection and try again.");
      }
      await Browser.open({ url });
    },
    onSession: (session, reason) => listeners.forEach(listener => listener(session, reason)),
  });
  async function connect(onError: (message: string) => void) {
    if (!Capacitor.isNativePlatform()) {
      // Preview has no native credential store, but must still finish startup.
      listeners.forEach(listener => listener(null, "restore"));
      return () => {};
    }
    async function handle(url: string) {
      try { if (await login.acceptCallback(url)) await Browser.close().catch(() => {}); }
      catch (error) { onError(error instanceof Error ? error.message : "Sign-in could not be completed."); }
    }
    const listener = await App.addListener("appUrlOpen", event => { void handle(event.url); });
    const reconnect = () => { void login.resume().catch(error => onError(error instanceof Error ? error.message : "Login could not reconnect.")); };
    const lifecycle = await App.addListener("appStateChange", event => {
      if (event.isActive) reconnect();
    });
    window.addEventListener("online", reconnect);
    // Continue processing sign-out work even after the account UI is cleared.
    // Empty/valid sessions make no network request on these periodic checks.
    const interval = window.setInterval(reconnect, 60000);
    try {
      await login.initialize();
      const launch = await App.getLaunchUrl();
      if (launch?.url) await handle(launch.url);
      await login.resume();
      if (!login.accessToken()) listeners.forEach(listener => listener(null, "restore"));
    } catch (error) {
      // An unavailable origin/store must not leave a fresh install on Opening.
      // Keep an existing valid session during a temporary reconnection failure.
      if (!login.accessToken()) listeners.forEach(listener => listener(null, "restore"));
      onError(error instanceof Error ? error.message : "The app return link could not be read. Please sign in again.");
    }
    return () => { void listener.remove(); void lifecycle.remove(); window.removeEventListener("online", reconnect); window.clearInterval(interval); };
  }
  return { ...login, connect, isNative: Capacitor.isNativePlatform(), subscribe: (listener: (session: NativeSession | null, reason: NativeSessionReason) => void) => {
    listeners.add(listener); return () => { listeners.delete(listener); };
  } };
}
