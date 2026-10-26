"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** One dismissal behaviour for public, native and administrative account menus. */
export function DismissiblePopover({ open, onClose, children, className = "relative" }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const trigger = root.current?.querySelector<HTMLElement>('[aria-expanded="true"]');
    const pointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close.current(); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close.current(); trigger?.focus(); } };
    const navigate = () => close.current();
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", key);
    window.addEventListener("hashchange", navigate);
    window.addEventListener("popstate", navigate);
    return () => { document.removeEventListener("pointerdown", pointer, true); document.removeEventListener("keydown", key); window.removeEventListener("hashchange", navigate); window.removeEventListener("popstate", navigate); };
  }, [open]);
  return <div ref={root} className={className} onClickCapture={event => { if (open && (event.target as HTMLElement).closest("a[href]")) close.current(); }}>{children}</div>;
}

export function PopoverClose({ onClose, label = "Close account menu" }: { onClose: () => void; label?: string }) {
  return <div className="flex justify-end border-b border-stone-100 px-2"><button type="button" onClick={onClose} aria-label={label} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"><span>Close</span><X size={18} aria-hidden="true" /></button></div>;
}
