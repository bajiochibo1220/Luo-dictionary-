"use client";

import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ArrowUpRight, Bookmark, BookOpen, Eye, EyeOff } from "lucide-react";
import type { ContentItem, MediaItem } from "@/lib/app-content";
import { InterfaceText } from "./interface-language";
import { CompleteItemDownload } from "./complete-item-download";
import { LibraryMediaGallery } from "./library-media-gallery";

type FeedLink = ComponentType<{ href: string; className?: string; children: ReactNode }>;

export function FeedDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <div className="social-card-description" data-expanded={expanded}>
    <p id={id} className="social-description-text">{text}</p>
    <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)} className="social-description-toggle"><InterfaceText source={expanded ? "less" : "more"} /></button>
  </div>;
}

/** Match the actual reading pane, including a resized sidebar or phone masthead. */
export function SocialFeed({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const feed = ref.current;
    if (!feed) return;
    let pane = feed.parentElement;
    while (pane && !/(auto|scroll)/.test(getComputedStyle(pane).overflowY)) pane = pane.parentElement;
    const scroller = pane || document.documentElement;
    const previous = scroller.style.scrollSnapType;
    scroller.style.scrollSnapType = "y proximity";
    const resize = () => {
      const height = pane?.clientHeight || window.visualViewport?.height || window.innerHeight;
      feed.style.setProperty("--social-feed-height", `${height}px`);
    };
    resize();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(scroller);
    window.visualViewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => { observer?.disconnect(); scroller.style.scrollSnapType = previous; window.visualViewport?.removeEventListener("resize", resize); window.removeEventListener("resize", resize); };
  }, []);
  return <div ref={ref} className={`social-feed ${className}`}>{children}</div>;
}

export function SocialFeedCard({ item, media = item.media, onOpen, onSave, saved = false, saveBusy = false, downloadOrigin, Link, categoryHref, joinPrompt, english = false, className = "" }: {
  item: ContentItem; media?: MediaItem[]; onOpen: () => void; onSave?: () => void;
  saved?: boolean; saveBusy?: boolean; downloadOrigin?: string; Link?: FeedLink;
  categoryHref?: string; joinPrompt?: ReactNode; english?: boolean; className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  const title = english ? item.englishTitle || item.title : item.title;
  const description = english ? item.englishSummary || item.englishBodyText : item.summary || item.bodyText || item.englishSummary;
  useEffect(() => {
    const card = ref.current;
    if (!card) return;
    const pause = () => card.querySelectorAll<HTMLMediaElement>("video,audio").forEach(player => player.pause());
    const visibility = () => { if (document.hidden) pause(); };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      if (entries.every(entry => entry.intersectionRatio < .5)) pause();
    }, { threshold: [0, .5] });
    observer?.observe(card);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", visibility); pause(); };
  }, []);
  function open() { ref.current?.querySelectorAll<HTMLMediaElement>("video,audio").forEach(player => player.pause()); onOpen(); }
  const category = <InterfaceText source={item.moduleName || "Community heritage"} />;
  return <article ref={ref} className={`social-feed-card ${media.length ? "has-media" : "is-text"} ${className}`} tabIndex={0} aria-label={title} data-details-hidden={hidden} onKeyDown={event => {
    if (event.target !== event.currentTarget || !["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(event.key)) return;
    const next = event.key === "ArrowDown" || event.key === "PageDown" ? event.currentTarget.nextElementSibling : event.currentTarget.previousElementSibling;
    if (next instanceof HTMLElement) { event.preventDefault(); next.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); next.focus({ preventScroll: true }); }
  }}>
    {media.length ? <LibraryMediaGallery item={item} media={media} immersive /> : <div className="social-text-stage"><BookOpen size={48} aria-hidden="true" /><p>{description || title}</p></div>}
    <button type="button" className="social-details-toggle" aria-label={hidden ? "Show details" : "Hide details"} aria-pressed={hidden} onClick={() => setHidden(value => !value)}>{hidden ? <Eye size={18} /> : <EyeOff size={18} />}<span className="sr-only"><InterfaceText source={hidden ? "Show details" : "Hide details"} /></span></button>
    {!hidden && <>
      <div className="social-card-caption">
        <div className="social-card-badges">{Link && categoryHref ? <Link href={categoryHref} className="social-category">{category}</Link> : <span className="social-category">{category}</span>}<span className={`social-review ${item.isProvisional ? "" : "is-published"}`}><InterfaceText source={item.isProvisional ? "Review in progress" : "Published"} /></span></div>
        <h2><button type="button" onClick={open}>{title}</button></h2>
        {!english && item.englishTitle && item.englishTitle !== item.title && <p className="social-english-title" lang="en" contentEditable={false}>{item.englishTitle}</p>}
        {joinPrompt}
        {description && <FeedDescription key={`${item.id}:${english}`} text={description} />}
      </div>
      <div className="social-card-actions">
        {onSave ? <button type="button" disabled={saved || saveBusy} onClick={onSave} aria-label={`${saved ? "Saved" : "Save"} ${title}`}><Bookmark size={25} aria-hidden="true" fill={saved ? "currentColor" : "none"} /><span><InterfaceText source={saved ? "Saved" : saveBusy ? "Saving..." : "Save"} /></span></button> : Link ? <Link href="/register" className="social-save-link"><Bookmark size={25} aria-hidden="true" /><span><InterfaceText source="Save" /></span></Link> : null}
        <CompleteItemDownload id={item.id} kind={item.kind || "cultural"} origin={downloadOrigin} compact />
        <button type="button" onClick={open} aria-label="Explore this item"><ArrowUpRight size={26} aria-hidden="true" /><span><InterfaceText source="Explore this item" /></span></button>
      </div>
    </>}
  </article>;
}
