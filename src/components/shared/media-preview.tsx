"use client";

import { useEffect, useRef, useState, type AudioHTMLAttributes, type ImgHTMLAttributes, type SyntheticEvent, type VideoHTMLAttributes } from "react";
import { originalMediaSource, responsiveMediaSources } from "@/lib/media-preview";
import { InterfaceText } from "./interface-language";

function pauseOtherMedia(event: SyntheticEvent<HTMLMediaElement>) {
  document.querySelectorAll<HTMLMediaElement>("audio, video").forEach(media => {
    if (media !== event.currentTarget && !media.paused) media.pause();
  });
}

export function MediaAudio(props: AudioHTMLAttributes<HTMLAudioElement>) {
  const ref = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);
  const [fallbackFor, setFallbackFor] = useState<string | null>(null);
  useEffect(() => setFailed(false), [props.src]);
  return <div className="w-full min-w-0"><audio {...props} ref={ref} src={fallbackFor === props.src ? originalMediaSource(props.src) || props.src : props.src} preload={props.preload ?? "none"}
    onPlay={event => { pauseOtherMedia(event); props.onPlay?.(event); }}
    onError={event => { if (fallbackFor !== props.src && originalMediaSource(props.src)) { setFallbackFor(props.src!); return; } setFailed(true); props.onError?.(event); }} />
    {failed && <p role="alert" className="mt-2 text-sm text-red-900"><InterfaceText source="Audio could not load. Check your connection or try the original download." /> <button type="button" className="min-h-11 underline" onClick={() => { setFailed(false); ref.current?.load(); }}><InterfaceText source="Try again" /></button></p>}
  </div>;
}

export function MediaImage({ src = "", alt = "", sizes = "(max-width: 767px) 100vw, 640px", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [fallbackFor, setFallbackFor] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { setFallbackFor(null); setUnavailable(false); }, [src]);
  const original = originalMediaSource(src) || src;
  const fallback = fallbackFor === src;
  return <><img loading="lazy" decoding="async" {...props} style={{ objectFit: "contain", backgroundColor: "#000", ...props.style }} src={fallback ? original : src}
    {...(!fallback ? responsiveMediaSources(src) : {})} sizes={sizes} alt={alt}
    onLoad={event => { setUnavailable(false); props.onLoad?.(event); }}
    onError={event => {
      if (!fallback && original !== src) { setFallbackFor(src); return; }
      setUnavailable(true); props.onError?.(event);
    }} />
    {unavailable && !props.onError && <span role="alert" className="media-image-error"><InterfaceText source="This image could not load. Check your connection or open the item to download the original." /></span>}
  </>;
}

// Offscreen videos must not each fetch metadata and posters. Mount their sources
// shortly before they become visible, then let the browser stream byte ranges.
export function MediaVideo({ src, poster, ...props }: VideoHTMLAttributes<HTMLVideoElement>) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fallbackFor, setFallbackFor] = useState<string | null>(null);
  useEffect(() => setFailed(false), [src]);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div className="w-full min-w-0"><video ref={ref} playsInline {...props} style={{ objectFit: "contain", backgroundColor: "#000", ...props.style }}
    onError={event => { if (fallbackFor !== src && originalMediaSource(src)) { setFallbackFor(src!); return; } setFailed(true); props.onError?.(event); }}
    onPlay={event => { pauseOtherMedia(event); props.onPlay?.(event); }} preload={visible ? "metadata" : "none"} src={visible ? fallbackFor === src ? originalMediaSource(src) || src : src : undefined} poster={visible ? poster : undefined} />
    {failed && <p role="alert" className="mt-2 text-sm text-red-900"><InterfaceText source="Video could not load. Check your connection or try the original download." /> <button type="button" className="min-h-11 underline" onClick={() => { setFailed(false); ref.current?.load(); }}><InterfaceText source="Try again" /></button></p>}
  </div>;
}
