"use client";
import { FileText, Headphones, Image, LayoutGrid, Video } from "lucide-react";
import { CONTENT_FILTERS } from "@/lib/app-navigation";
import { InterfaceText } from "./interface-language";
const icons = { all: LayoutGrid, image: Image, audio: Headphones, video: Video, transcript: FileText };
export function FeedMediaFilters({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="media-filter-buttons" role="group" aria-label="Content type">{CONTENT_FILTERS.map(filter => {
    const Icon = icons[filter.key];
    return <button key={filter.key} type="button" aria-label={filter.label} aria-pressed={value === filter.key} onClick={() => onChange(filter.key)} className={`media-filter-button ${value === filter.key ? "is-active" : ""}`}><Icon size={18} aria-hidden="true" /><span><InterfaceText source={filter.label} /></span></button>;
  })}</div>;
}
