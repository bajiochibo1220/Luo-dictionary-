"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { InterfaceText } from "@/components/shared/interface-language";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type InstallWindow = Window & { __luoInstallPrompt?: InstallEvent | null; Capacitor?: { isNativePlatform?: () => boolean } };
const Installation = createContext<{ installed: boolean; available: boolean; help: boolean; notice: string; platform: "apple" | "other"; closeHelp: () => void; install: () => Promise<void> } | null>(null);

export function AppInstallationProvider({ children }: { children: ReactNode }) {
  const parent = useContext(Installation);
  return parent ? <>{children}</> : <InstallationOwner>{children}</InstallationOwner>;
}
function InstallationOwner({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const promptRef = useRef<InstallEvent | null>(null);
  const busy = useRef(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState("");
  const [platform, setPlatform] = useState<"apple" | "other">("other");
  useEffect(() => {
    const host = window as InstallWindow;
    const display = window.matchMedia("(display-mode: standalone)");
    const detect = () => setInstalled(display.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true || host.Capacitor?.isNativePlatform?.() === true);
    detect();
    setPlatform(/iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1 ? "apple" : "other");
    const capture = (value: Event) => {
      value.preventDefault();
      promptRef.current = value as InstallEvent;
      setEvent(value as InstallEvent);
    };
    if (host.__luoInstallPrompt) capture(host.__luoInstallPrompt);
    const complete = () => { setInstalled(true); setEvent(null); promptRef.current = null; host.__luoInstallPrompt = null; setHelp(false); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    display.addEventListener("change", detect);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", complete); display.removeEventListener("change", detect); };
  }, []);
  async function install() {
    if (busy.current) return;
    const pending = promptRef.current;
    setNotice("");
    if (!pending) { setHelp(true); return; }
    busy.current = true;
    promptRef.current = null;
    (window as InstallWindow).__luoInstallPrompt = null;
    setEvent(null);
    try {
      // Call prompt synchronously within the click gesture, before any await.
      const result = pending.prompt();
      await result;
      const choice = await pending.userChoice;
      setNotice(choice.outcome === "accepted" ? "" : "Installation was cancelled. You can try again from your browser menu.");
      setHelp(choice.outcome !== "accepted");
    } catch {
      setNotice("The install window could not open. Use your browser menu to install the app.");
      setHelp(true);
    } finally { busy.current = false; }
  }
  return <Installation.Provider value={{ installed, available: !!event, help, notice, platform, closeHelp: () => setHelp(false), install }}>
    {children}
  </Installation.Provider>;
}

export function InstallAppButton() {
  const installation = useContext(Installation);
  if (installation?.installed) return null;
  return <div data-app-install className="mx-2 shrink-0 border-b border-amber-100/20 py-2 text-amber-50">
    <button type="button" onClick={() => void installation?.install()} aria-expanded={installation?.help || false} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-semibold hover:bg-black/15"><Download size={18} aria-hidden="true" /><InterfaceText source="Install the app" /></button>
    {installation?.help && <div role="region" aria-label="App installation instructions" className="max-h-[40dvh] space-y-3 overflow-y-auto px-4 pb-3 text-xs leading-6">
      {installation.notice && <p role="status"><InterfaceText source={installation.notice} /></p>}
      {!window.isSecureContext ? <p><InterfaceText source="Open the secure HTTPS version of this site to install." /></p> : installation.platform === "apple" ? <p><InterfaceText source="On iPhone or iPad, open this site in Safari, tap Share, then Add to Home Screen." /></p> : <p><InterfaceText source="Open your browser menu and choose Install app or Add to Home screen when available. If the app is already installed, open it from your home screen or applications." /></p>}
      <button type="button" onClick={installation.closeHelp} className="min-h-11 underline"><InterfaceText source="Close" /></button>
    </div>}
  </div>;
}
