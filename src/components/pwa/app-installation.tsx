"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { InterfaceText } from "@/components/shared/interface-language";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const Installation = createContext<{ installed: boolean; available: boolean; install: () => Promise<void> } | null>(null);

export function AppInstallationProvider({ children }: { children: ReactNode }) {
  const parent = useContext(Installation);
  return parent ? <>{children}</> : <InstallationOwner>{children}</InstallationOwner>;
}
function InstallationOwner({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const prompt = (value: Event) => { value.preventDefault(); setEvent(value as InstallEvent); };
    const complete = () => { setInstalled(true); setEvent(null); };
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", complete);
    return () => { window.removeEventListener("beforeinstallprompt", prompt); window.removeEventListener("appinstalled", complete); };
  }, []);
  async function install() {
    if (!event) return;
    setEvent(null); // The browser event can be used only once.
    try { await event.prompt(); await event.userChoice; } catch { /* Browser installation remains available from its menu. */ }
  }
  return <Installation.Provider value={{ installed, available: !!event, install }}>{children}</Installation.Provider>;
}

export function InstallAppButton() {
  const installation = useContext(Installation);
  if (installation?.installed) return null;
  return <div className="mx-2 border-t border-amber-100/20 py-3 text-amber-50">
    {installation?.available ? <button type="button" onClick={() => void installation.install()} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-left text-sm hover:bg-black/15"><Download size={18} aria-hidden="true" /><InterfaceText source="Install the app" /></button> : <details>
      <summary className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-4 text-sm hover:bg-black/15"><Download size={18} aria-hidden="true" /><InterfaceText source="Install the app" /></summary>
      <p className="px-4 pb-3 text-xs leading-6"><InterfaceText source="On iPhone or iPad, open this site in Safari, tap Share, then Add to Home Screen. On Android or desktop, use your browser menu and choose Install app or Add to Home screen when available." /></p>
    </details>}
  </div>;
}
