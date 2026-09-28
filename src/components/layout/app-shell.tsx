"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const MIN_WIDTH = 220;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 280;

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved width
  useEffect(() => {
    const saved = localStorage.getItem("luolinguaai-sidebar-width");
    if (saved) {
      const n = Number(saved);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) setWidth(n);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("luolinguaai-sidebar-width", String(width));
  }, [width]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [children]);

  const onMouseDown = useCallback(() => setDragging(true), []);

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, e.clientX - rect.left)
      );
      setWidth(newWidth);
    };

    const onMouseUp = () => setDragging(false);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  return (
    <div
      ref={containerRef}
      className="flex flex-1 min-h-0 relative overflow-hidden"
    >
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        style={{ width: `${width}px` }}
        className={`bg-[#6b4724] overflow-hidden shadow-xl z-50
          fixed md:relative inset-y-0 left-0
          transition-transform duration-300 ease-out
          md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          flex-shrink-0`}
      >
        {/* Diamond pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23fbe8c4' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Close button on mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/30 backdrop-blur text-amber-100 hover:bg-black/50 flex items-center justify-center text-lg"
          aria-label="Close menu"
        >
          ✕
        </button>

        <div className="relative h-full overflow-y-auto overscroll-contain">
          {sidebar}
        </div>
      </aside>

      {/* Drag handle — desktop only */}
      <div
        onMouseDown={onMouseDown}
        className={`hidden md:block w-1 flex-shrink-0 cursor-col-resize transition-colors relative z-20 ${
          dragging ? "bg-amber-400" : "bg-black/30 hover:bg-amber-400/70"
        }`}
        title="Drag to resize"
      >
        <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 min-w-0 relative bg-[#b89a68] overflow-hidden">
        {/* Diamond pattern on content */}
        <div
          className="absolute inset-0 opacity-[0.10] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23fff2d3' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Mobile hamburger — floating top-left of content */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed top-4 left-4 z-30 w-11 h-11 rounded-full bg-[#6b4724] text-amber-50 shadow-2xl shadow-black/40 flex items-center justify-center ring-2 ring-amber-300/40"
          aria-label="Open menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="relative h-full overflow-y-auto overscroll-contain">
          {children}
        </div>
      </main>
    </div>
  );
}