"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes, type VideoHTMLAttributes } from "react";
import { responsiveMediaSources } from "@/lib/media-preview";

export function MediaImage({ src = "", alt = "", sizes = "(max-width: 767px) 100vw, 640px", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const original = src.split("?")[0];
  return <img loading="lazy" decoding="async" {...props} src={failed ? original : src}
    {...(!failed ? responsiveMediaSources(src) : {})} sizes={sizes} alt={alt}
    onError={event => { if (!failed && original !== src) setFailed(true); props.onError?.(event); }} />;
}

// Offscreen videos must not each fetch metadata and posters. Mount their sources
// shortly before they become visible, then let the browser stream byte ranges.
export function MediaVideo({ src, poster, ...props }: VideoHTMLAttributes<HTMLVideoElement>) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <video ref={ref} playsInline {...props} preload={visible ? "metadata" : "none"} src={visible ? src : undefined} poster={visible ? poster : undefined} />;
}
