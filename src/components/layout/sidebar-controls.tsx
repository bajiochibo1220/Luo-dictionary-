"use client";
import { InterfaceButton, InterfaceText } from "@/components/shared/interface-language";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

type SidebarState = {
  id: string;
  desktopCollapsed: boolean;
  mobileOpen: boolean;
  isMobile: boolean;
  toggleDesktop: () => void;
  openMobile: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarState | null>(null);
export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children, id, storageKey }: { children: React.ReactNode; id: string; storageKey: string }) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    try { setDesktopCollapsed(localStorage.getItem(storageKey) === "collapsed"); } catch { /* Storage may be disabled. */ }
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => { setIsMobile(media.matches); if (!media.matches) setMobileOpen(false); };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [storageKey]);

  const toggleDesktop = () => {
    const collapsed = !desktopCollapsed;
    setDesktopCollapsed(collapsed);
    try { localStorage.setItem(storageKey, collapsed ? "collapsed" : "expanded"); } catch { /* Toggling still works without storage. */ }
  };

  return <SidebarContext.Provider value={{ id, desktopCollapsed, mobileOpen, isMobile, toggleDesktop, openMobile, closeMobile }}>{children}</SidebarContext.Provider>;
}

export function SidebarToggle() {
  const sidebar = useSidebar();
  if (!sidebar) return null;
  const buttonStyle = "h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-100/15 text-amber-50 hover:bg-amber-100/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 transition-colors";
  return <>
    <InterfaceButton type="button" onClick={sidebar.openMobile} aria-label="Open menu" aria-controls={sidebar.id} aria-expanded={sidebar.mobileOpen} className={`inline-flex md:hidden ${buttonStyle}`}><Menu size={22} aria-hidden="true" /></InterfaceButton>
    <button type="button" onClick={sidebar.toggleDesktop} aria-label={sidebar.desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebar.desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-controls={sidebar.id} aria-expanded={!sidebar.desktopCollapsed} className={`hidden md:inline-flex ${buttonStyle}`}>
      {sidebar.desktopCollapsed ? <PanelLeftOpen size={22} aria-hidden="true" /> : <PanelLeftClose size={22} aria-hidden="true" />}
    </button>
  </>;
}

export function SidebarPanel({ children, width }: { children: React.ReactNode; width: number }) {
  const sidebar = useSidebar();
  const panel = useRef<HTMLElement>(null);
  const mobileOpen = sidebar?.mobileOpen ?? false;
  const isMobile = sidebar?.isMobile ?? false;
  const desktopCollapsed = sidebar?.desktopCollapsed ?? false;
  const closeMobile = sidebar?.closeMobile;

  useEffect(() => {
    if (panel.current) panel.current.inert = isMobile ? !mobileOpen : desktopCollapsed;
  }, [isMobile, mobileOpen, desktopCollapsed]);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => [...(panel.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select, input, [tabindex="0"]') ?? [])].filter(element => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeMobile?.(); }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0], last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); panel.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isMobile, mobileOpen, closeMobile]);

  return <>
    {mobileOpen && <InterfaceButton type="button" aria-label="Dismiss navigation menu" tabIndex={-1} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden" onClick={closeMobile} />}
    <aside ref={panel} id={sidebar?.id} aria-label="Navigation" role={isMobile && mobileOpen ? "dialog" : undefined} aria-modal={isMobile && mobileOpen ? true : undefined} aria-hidden={isMobile ? !mobileOpen : desktopCollapsed} tabIndex={-1}
      style={{ width, maxWidth: "calc(100vw - 3rem)" }}
      className={`heritage-sidebar fixed inset-y-0 left-0 z-50 shrink-0 overflow-hidden bg-[#6b4724] text-amber-50 shadow-xl transition-transform duration-300 motion-reduce:transition-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${desktopCollapsed ? "md:hidden" : "md:relative md:translate-x-0 md:z-20"}`}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23fbe8c4' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "60px 60px" }} />
      <div className="relative h-full">{children}</div>
      <InterfaceButton type="button" onClick={closeMobile} aria-label="Close menu" className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-xl bg-black/20 text-amber-100 hover:bg-black/40 focus-visible:outline-2 focus-visible:outline-amber-300 md:hidden"><X size={22} aria-hidden="true" /></InterfaceButton>
    </aside>
  </>;
}
