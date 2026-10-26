"use client";
import { InterfaceText } from "@/components/shared/interface-language";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { checkAppVersion } from "@/lib/app-update";

type UpdateStatus = "idle" | "checking" | "current" | "available" | "error";
type AppUpdates = {
  status: UpdateStatus;
  noticeVisible: boolean;
  checkForUpdates: (manual?: boolean) => Promise<void>;
};
const AppUpdatesContext = createContext<AppUpdates | null>(null);
export const useAppUpdates = () => useContext(AppUpdatesContext);

export function AppUpdatesProvider({ children, currentVersion }: { children: React.ReactNode; currentVersion: string }) {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const pending = useRef<Promise<void> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const manualRequested = useRef(false);

  const checkForUpdates = useCallback((manual = false): Promise<void> => {
    if (manual) {
      manualRequested.current = true;
      setStatus("checking");
    }
    if (pending.current) return pending.current;
    if (!navigator.onLine) {
      if (manual) setStatus("error");
      manualRequested.current = false;
      return Promise.resolve();
    }
    const requestController = new AbortController();
    controller.current = requestController;
    const timer = window.setTimeout(() => requestController.abort(), 10_000);
    pending.current = (async () => {
      try {
        const result = await checkAppVersion(currentVersion, requestController.signal);
        if (!mounted.current) return;
        if (manualRequested.current) setDismissedVersion(null);
        setAvailableVersion(result.available ? result.version : null);
        setStatus(result.available ? "available" : "current");
      } catch {
        // A failed background check never interrupts work or claims an update exists.
        if (manualRequested.current && mounted.current) setStatus("error");
      } finally {
        window.clearTimeout(timer);
        pending.current = null;
        manualRequested.current = false;
      }
    })();
    return pending.current;
  }, [currentVersion]);

  useEffect(() => {
    mounted.current = true;
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void checkForUpdates();
    };
    // Let the initial page settle; this small check needs no database read.
    const initial = window.setTimeout(checkWhenVisible, 5_000);
    const interval = window.setInterval(checkWhenVisible, 60_000);
    document.addEventListener("visibilitychange", checkWhenVisible);
    window.addEventListener("focus", checkWhenVisible);
    window.addEventListener("online", checkWhenVisible);
    return () => {
      mounted.current = false;
      controller.current?.abort();
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkWhenVisible);
      window.removeEventListener("focus", checkWhenVisible);
      window.removeEventListener("online", checkWhenVisible);
    };
  }, [checkForUpdates]);

  const noticeVisible = availableVersion !== null && availableVersion !== dismissedVersion;
  return <AppUpdatesContext.Provider value={{ status, noticeVisible, checkForUpdates }}>
    {children}
    {noticeVisible && <section aria-label="App update" aria-live="polite" className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[110] mx-auto max-w-lg rounded-2xl border border-amber-200 bg-[#fff5df] p-4 text-stone-900 shadow-2xl">
      <div className="flex items-start gap-3">
        <RefreshCw size={22} className="mt-0.5 shrink-0 text-amber-800" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold"><InterfaceText source="Update available" /></p>
          <p className="mt-1 text-sm text-stone-700"><InterfaceText source="A new version of Luo Heritage is ready. Save any unfinished work before updating." /></p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={() => setDismissedVersion(availableVersion)} className="rounded-full px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-amber-800"><InterfaceText source="Later" /></button>
        <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"><InterfaceText source="Update now" /></button>
      </div>
    </section>}
  </AppUpdatesContext.Provider>;
}

export function CheckAppUpdates() {
  const updates = useAppUpdates();
  if (!updates) return null;
  const messages: Record<UpdateStatus, string> = {
    idle: "Check whether a newer version is available.",
    checking: "Checking for updates…",
    current: "You’re using the latest version.",
    available: "An update is available. Save your work, then select Update now.",
    error: "Couldn’t check for updates. Check your connection and try again.",
  };
  return <div className="mt-4">
    <button type="button" disabled={updates.status === "checking"} onClick={() => void updates.checkForUpdates(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800">
      <RefreshCw size={16} className={updates.status === "checking" ? "animate-spin" : ""} aria-hidden="true" />
      <InterfaceText source={updates.status === "checking" ? "Checking…" : "Check for updates"} />
    </button>
    <p role="status" className="mt-3 text-sm text-stone-700">{messages[updates.status]}</p>
  </div>;
}
