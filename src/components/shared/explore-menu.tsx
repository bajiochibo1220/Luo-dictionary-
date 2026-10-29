"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";
import { InterfaceText } from "./interface-language";

/** A top-layer dialog stays outside the feed's clipping and sticky contexts. */
export function ExploreMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const close = () => dialog.current?.close();
  useEffect(() => {
    if (!open) return;
    const panel = dialog.current;
    panel?.showModal();
    const navigate = () => panel?.close();
    window.addEventListener("hashchange", navigate);
    window.addEventListener("popstate", navigate);
    return () => {
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("popstate", navigate);
    };
  }, [open]);
  return <div className="feed-explore-menu">
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><InterfaceText source="Explore" /></button>
    {open && <dialog ref={dialog} className="feed-explore-dialog" aria-labelledby={titleId} onClose={() => { setOpen(false); trigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="explore-dialog-panel">
        <header className="overlay-navigation">
          <button type="button" onClick={close}><ArrowLeft size={18} aria-hidden="true" /><InterfaceText source="Back" /></button>
          <h2 id={titleId}><InterfaceText source="Explore" /></h2>
          <button type="button" onClick={close} aria-label="Close Explore"><X size={22} aria-hidden="true" /></button>
        </header>
        <div className="explore-dialog-content" onClick={event => { if ((event.target as HTMLElement).closest("a[href],button")) close(); }}>{children}</div>
      </div>
    </dialog>}
  </div>;
}
