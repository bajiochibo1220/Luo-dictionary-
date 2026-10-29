"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Headphones } from "lucide-react";
import type { ContentItem, MediaItem } from "@/lib/app-content";
import { emitActivity } from "@/lib/activity-events";
import { InterfaceText } from "./interface-language";
import { MediaAudio, MediaImage, MediaVideo } from "./media-preview";

// Discovery, collections and item details share the same players and spacing.
// Every attachment remains available, including audio alongside a video.
export function LibraryMediaGallery({ item, media = item.media, onOpen, immersive = false }: { item: ContentItem; media?: MediaItem[]; onOpen?: () => void; immersive?: boolean }) {
  const gallery = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(active); activeRef.current = active;
  const signature = media.map(asset => asset.id).join(":");
  useEffect(() => { setActive(0); gallery.current?.scrollTo({ left: 0, behavior: "instant" }); }, [signature]);
  useEffect(() => {
    if (!immersive || !gallery.current) return;
    const slides = Array.from(gallery.current.children) as HTMLElement[];
    slides.forEach((slide, index) => {
      slide.inert = index !== active;
      if (index !== active) slide.querySelectorAll<HTMLMediaElement>("audio,video").forEach(player => player.pause());
    });
  }, [active, immersive, signature]);
  useEffect(() => {
    if (!immersive || !gallery.current || typeof ResizeObserver === "undefined") return;
    let previous = gallery.current.clientWidth;
    const observer = new ResizeObserver(() => {
      const node = gallery.current;
      if (node && node.clientWidth !== previous) { previous = node.clientWidth; node.scrollTo({ left: activeRef.current * node.clientWidth, behavior: "instant" }); }
    });
    observer.observe(gallery.current);
    return () => observer.disconnect();
  }, [immersive]);
  function move(index: number) {
    const node = gallery.current;
    node?.scrollTo({ left: index * node.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  if (!media.length) return null;
  const image = media.find(asset => asset.type === "image");
  const visualCount = media.filter(asset => asset.type === "image" || asset.type === "video").length;
  const content = <div ref={gallery} className={`public-media-gallery ${immersive ? "is-immersive" : ""}`} tabIndex={immersive ? 0 : undefined} onScroll={immersive ? event => { const node = event.currentTarget; setActive(Math.max(0, Math.min(media.length - 1, Math.round(node.scrollLeft / Math.max(1, node.clientWidth))))); } : undefined} onKeyDown={immersive ? event => { if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return; event.preventDefault(); move(Math.max(0, Math.min(media.length - 1, active + (event.key === "ArrowRight" ? 1 : -1)))); } : undefined} data-media-count={media.length} data-visual-count={visualCount} aria-label="Item media">
    {media.map((asset, index) => <div key={asset.id} className={`public-media-asset media-${asset.type}`} aria-hidden={immersive ? index !== active : undefined}>
      {asset.type === "image" && (onOpen ? <button type="button" className="public-media-image" onClick={onOpen} aria-label={`Open ${item.title}`}><MediaImage src={asset.url} alt={item.title} sizes={immersive ? "100vw" : "(max-width: 767px) 100vw, (max-width: 1199px) 65vw, 50vw"} /></button> : <MediaImage src={asset.url} alt={item.title} sizes={immersive ? "100vw" : "(max-width: 767px) 100vw, 65vw"} />)}
      {asset.type === "video" && <MediaVideo src={asset.url} poster={asset.thumbnailUrl || image?.thumbnailUrl || image?.url || undefined} controls aria-label={item.title} onPlay={() => emitActivity({ eventType: "video_play", recordId: item.id })} />}
      {asset.type === "audio" && <div className="public-media-audio"><p><Headphones size={16} aria-hidden="true" /><InterfaceText source="Audio recording" />{asset.format && <span>{asset.format}</span>}</p><MediaAudio src={asset.url} controls aria-label={item.title} preload="none" onPlay={() => emitActivity({ eventType: "audio_play", recordId: item.id })} /></div>}
      {!["image", "video", "audio"].includes(asset.type) && <a href={asset.url} target="_blank" rel="noreferrer" className="public-media-document"><FileText size={20} aria-hidden="true" /><InterfaceText source={asset.type === "document" || asset.type === "transcript" ? "Open transcript or document" : "Open attachment"} /></a>}
    </div>)}
  </div>;
  return immersive ? <div className="immersive-media">{content}{media.length > 1 && <><span className="social-media-count" aria-live="polite">{active + 1} / {media.length}</span><div className="social-media-paging"><button type="button" aria-label="Previous attachment" disabled={active === 0} onClick={() => move(active - 1)}><ChevronLeft size={22} /></button><button type="button" aria-label="Next attachment" disabled={active === media.length - 1} onClick={() => move(active + 1)}><ChevronRight size={22} /></button></div></>}</div> : content;
}
