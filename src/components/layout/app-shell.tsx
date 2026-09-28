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
  const containerRef = useRef<HTMLDivElement>(null);

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
      {/* SIDEBAR — deep warm cocoa, own scroll */}
      <aside
        style={{ width: `${width}px` }}
        className="flex-shrink-0 relative bg-[#6b4724] overflow-hidden shadow-xl z-10"
      >
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23fbe8c4' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative h-full overflow-y-auto overscroll-contain">
          {sidebar}
        </div>
      </aside>

      {/* DRAG HANDLE */}
      <div
        onMouseDown={onMouseDown}
        className={`w-1 flex-shrink-0 cursor-col-resize transition-colors relative z-20 ${
          dragging ? "bg-amber-400" : "bg-black/30 hover:bg-amber-400/70"
        }`}
        title="Drag to resize"
      >
        <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
      </div>

      {/* CONTENT — rich sandstone, own scroll */}
      <main className="flex-1 min-w-0 relative bg-[#b89a68] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.10] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23fff2d3' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative h-full overflow-y-auto overscroll-contain">
          {children}
        </div>
      </main>
    </div>
  );
}