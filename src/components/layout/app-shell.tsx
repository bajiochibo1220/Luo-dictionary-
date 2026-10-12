"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SidebarPanel, useSidebar } from "./sidebar-controls";

const MIN_WIDTH = 220;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 280;

export function AppShell({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [storageReady, setStorageReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useSidebar();
  const closeMobile = controls?.closeMobile;
  const pathname = usePathname();
  const activeModule = useSearchParams().get("module") || "";

  useEffect(() => { closeMobile?.(); }, [pathname, activeModule, closeMobile]);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("luolinguaai-sidebar-width"));
      if (saved >= MIN_WIDTH && saved <= MAX_WIDTH) setWidth(saved);
    } catch { /* Resizing remains available when storage is disabled. */ }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem("luolinguaai-sidebar-width", String(width)); } catch { /* Optional preference. */ }
  }, [width, storageReady]);

  const onMouseDown = useCallback(() => setDragging(true), []);
  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (container) setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX - container.getBoundingClientRect().left)));
    };
    const onMouseUp = () => setDragging(false);
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [dragging]);

  return <div ref={containerRef} className="relative flex flex-1 min-h-0 overflow-hidden">
    <SidebarPanel width={width}>{sidebar}</SidebarPanel>
    {!controls?.desktopCollapsed && <div onMouseDown={onMouseDown} role="separator" aria-label="Resize sidebar" aria-orientation="vertical" aria-valuemin={MIN_WIDTH} aria-valuemax={MAX_WIDTH} aria-valuenow={width} tabIndex={0}
      onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        setWidth(current => event.key === "Home" ? MIN_WIDTH : event.key === "End" ? MAX_WIDTH : Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, current + (event.key === "ArrowRight" ? 16 : -16))));
      }}
      className={`relative z-20 hidden w-1 shrink-0 cursor-col-resize transition-colors focus-visible:bg-amber-400 md:block ${dragging ? "bg-amber-400" : "bg-black/30 hover:bg-amber-400/70"}`} title="Drag to resize, or use the arrow keys">
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </div>}
    <main className="relative min-w-0 flex-1 overflow-hidden bg-[#b89a68]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23fff2d3' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "60px 60px" }} />
      <div className="relative h-full overflow-y-auto overscroll-contain">{children}</div>
    </main>
  </div>;
}
