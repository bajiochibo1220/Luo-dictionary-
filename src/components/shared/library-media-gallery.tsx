"use client";

import { FileText, Headphones } from "lucide-react";
import type { ContentItem, MediaItem } from "@/lib/app-content";
import { emitActivity } from "@/lib/activity-events";
import { InterfaceText } from "./interface-language";
import { MediaAudio, MediaImage, MediaVideo } from "./media-preview";

// Discovery, collections and item details share the same players and spacing.
// Every attachment remains available, including audio alongside a video.
export function LibraryMediaGallery({ item, media = item.media, onOpen }: { item: ContentItem; media?: MediaItem[]; onOpen?: () => void }) {
  if (!media.length) return null;
  const image = media.find(asset => asset.type === "image");
  const visualCount = media.filter(asset => asset.type === "image" || asset.type === "video").length;
  return <div className="public-media-gallery" data-media-count={media.length} data-visual-count={visualCount} aria-label="Item media">
    {media.map(asset => <div key={asset.id} className={`public-media-asset media-${asset.type}`}>
      {asset.type === "image" && (onOpen ? <button type="button" className="public-media-image" onClick={onOpen} aria-label={`Open ${item.title}`}><MediaImage src={asset.thumbnailUrl || asset.url} alt={item.title} sizes="(max-width: 767px) 100vw, (max-width: 1199px) 65vw, 50vw" /></button> : <MediaImage src={asset.thumbnailUrl || asset.url} alt={item.title} sizes="(max-width: 767px) 100vw, 65vw" />)}
      {asset.type === "video" && <MediaVideo src={asset.url} poster={asset.thumbnailUrl || image?.thumbnailUrl || image?.url || undefined} controls aria-label={item.title} onPlay={() => emitActivity({ eventType: "video_play", recordId: item.id })} />}
      {asset.type === "audio" && <div className="public-media-audio"><p><Headphones size={16} aria-hidden="true" /><InterfaceText source="Audio recording" />{asset.format && <span>{asset.format}</span>}</p><MediaAudio src={asset.url} controls aria-label={item.title} preload="none" onPlay={() => emitActivity({ eventType: "audio_play", recordId: item.id })} /></div>}
      {(asset.type === "document" || asset.type === "transcript") && <a href={asset.url} target="_blank" rel="noreferrer" className="public-media-document"><FileText size={20} aria-hidden="true" /><InterfaceText source="Open transcript or document" /></a>}
    </div>)}
  </div>;
}
