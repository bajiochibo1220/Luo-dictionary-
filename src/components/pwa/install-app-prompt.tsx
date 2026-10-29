"use client";
import { InterfaceButton, InterfaceText } from "@/components/shared/interface-language";

import { useEffect, useState } from "react";
import { useAppUpdates } from "./app-updates";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppPrompt() {
  const updates = useAppUpdates();
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);
    try { setDismissed(sessionStorage.getItem("heritage-install-dismissed") === "true"); } catch {}
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    setReady(false);
    if (!installEvent) return;
    const timer = window.setTimeout(() => setReady(true), 20000);
    return () => window.clearTimeout(timer);
  }, [installEvent]);

  if (isInstalled || dismissed || !ready || !installEvent || updates?.noticeVisible) return null;

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem("heritage-install-dismissed", "true"); } catch {}
  }

  async function install() {
    if (!installEvent) return;
    // A browser installation event can only be used once, even after dismissal.
    const event = installEvent;
    setInstallEvent(null);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "dismissed") dismiss();
    } catch { dismiss(); }
  }

  return (
    <div className="fixed bottom-20 left-1/2 z-[100] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center rounded-full bg-amber-800 text-white shadow-xl ring-1 ring-amber-200/50">
    <button
      type="button"
      onClick={() => void install()}
      className="min-h-11 rounded-full px-4 py-3 text-sm font-semibold hover:bg-amber-900"
    ><InterfaceText source="Install Luo Heritage app" /></button>
    <InterfaceButton type="button" onClick={dismiss} aria-label="Dismiss installation prompt" className="min-h-11 min-w-11 rounded-full text-xl hover:bg-amber-900">&times;</InterfaceButton>
    </div>
  );
}
