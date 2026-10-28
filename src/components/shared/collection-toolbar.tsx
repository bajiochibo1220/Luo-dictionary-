"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Use spare masthead space on desktop; keep controls inline on small screens. */
export function CollectionToolbar({ children, onPlacementChange }: { children: ReactNode; onPlacementChange?: (inMasthead: boolean) => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const place = () => {
      const target = media.matches ? document.querySelector<HTMLElement>("[data-collection-toolbar-host]") : null;
      setHost(target); onPlacementChange?.(!!target);
    };
    place(); media.addEventListener("change", place);
    return () => { media.removeEventListener("change", place); };
  }, [onPlacementChange]);
  const controls = <div className="collection-search-controls" data-search-language-row>{children}</div>;
  return host ? createPortal(controls, host) : controls;
}
