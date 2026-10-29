"use client";
import { useEffect, useRef } from "react";
import { InterfaceText } from "./interface-language";

/** Retain an accessible manual fallback while fetching the next page near the feed end. */
export function AutoLoadMore({ onLoad, busy, error = false }: { onLoad: () => Promise<void>; busy: boolean; error?: boolean }) {
  const marker = useRef<HTMLDivElement>(null);
  const locked = useRef(false);
  const load = async () => {
    if (busy || locked.current) return;
    locked.current = true;
    try { await onLoad(); } finally { locked.current = false; }
  };
  useEffect(() => {
    if (busy || error || !marker.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void load();
    }, { rootMargin: "600px" });
    observer.observe(marker.current);
    return () => observer.disconnect();
  });
  return <div ref={marker} className="feed-load-more"><button type="button" disabled={busy} onClick={() => void load()} className="min-h-11 rounded-full bg-teal-900 px-6 py-3 text-white disabled:opacity-50"><InterfaceText source={busy ? "Loading more..." : error ? "Try again" : "Load more"} /></button></div>;
}
