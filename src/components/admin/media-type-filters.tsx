"use client";
import { LayoutGrid, Image, Headphones, Video, FileText } from "lucide-react";
import { NavigationLink } from "@/components/layout/navigation-link";
import { BottomMediaControls } from "@/components/shared/bottom-media-controls";

export function MediaTypeFilters({ type, moduleCode }: { type?: string; moduleCode?: string }) {
  const filters = [{ type: "", label: "All", Icon: LayoutGrid }, { type: "image", label: "Images", Icon: Image }, { type: "audio", label: "Audio", Icon: Headphones }, { type: "video", label: "Video", Icon: Video }, { type: "document", label: "Transcripts", Icon: FileText }];
  return <BottomMediaControls className="media-dock-five"><div className="media-filter-buttons" role="group" aria-label="Content type">{filters.map(filter => {
    const query = new URLSearchParams({ ...(moduleCode ? { module: moduleCode } : {}), ...(filter.type ? { type: filter.type } : {}) });
    const selected = filter.type ? filter.type === type || filter.type === "document" && type === "transcript" : !type;
    return <NavigationLink key={filter.type} href={`/admin/media${query.toString() ? `?${query}` : ""}`} aria-label={filter.label} aria-current={selected ? "page" : undefined} className={`media-filter-button ${selected ? "is-active" : ""}`}><filter.Icon size={20} aria-hidden="true" /><span>{filter.label}</span></NavigationLink>;
  })}</div></BottomMediaControls>;
}
