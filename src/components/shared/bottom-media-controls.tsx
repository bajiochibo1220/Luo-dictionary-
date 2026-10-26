"use client";
import { useEffect, useRef, type ReactNode } from "react";

export function BottomMediaControls({ children, className = "" }: { children: ReactNode; className?: string }) {
  const marker = useRef<HTMLDivElement>(null), dock = useRef<HTMLElement>(null);
  useEffect(() => {
    const position = () => {
      if (!marker.current || !dock.current) return;
      const bounds = marker.current.getBoundingClientRect(), left = Math.max(0, bounds.left);
      dock.current.style.left = `${left}px`;
      dock.current.style.width = `${Math.max(0, Math.min(bounds.width, window.innerWidth - left))}px`;
    };
    position();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    if (marker.current) observer?.observe(marker.current);
    window.addEventListener("resize", position);
    return () => { observer?.disconnect(); window.removeEventListener("resize", position); };
  }, []);
  return <><div ref={marker} className="h-0 w-full" aria-hidden="true" /><nav ref={dock} aria-label="Media filters" className={`library-media-dock ${className}`} data-bottom-controls>{children}</nav></>;
}
