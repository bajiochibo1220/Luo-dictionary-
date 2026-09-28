"use client";

import { useState, useMemo } from "react";
import { ContributeModal } from "./contribute-modal";

export type MediaItem = {
  id: string;
  type: string;
  url: string;
  thumbnailUrl?: string | null;
  format?: string | null;
};

export type ContentItem = {
  id: string;
  title: string;
  summary: string | null;
  media: MediaItem[];
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "image", label: "Images" },
  { key: "audio", label: "Audio" },
  { key: "video", label: "Video" },
  { key: "transcript", label: "Transcripts" },
];

const VIEW_MODES = [
  { key: "feed", label: "Feed", icon: "☰" },
  { key: "grid", label: "Grid", icon: "▦" },
];

export function ModuleContent({
  title,
  baseName,
  languageName,
  languageCode,
  languageId,
  moduleCode,
  items,
}: {
  title: string;
  baseName: string;
  languageName: string;
  languageCode: string;
  languageId: number;
  moduleCode: string;
  items: ContentItem[];
}) {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("feed");
  const [showContribute, setShowContribute] = useState(false);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "transcript") {
      return items.filter(
        (i) =>
          i.media.length === 0 ||
          i.media.some((m) => m.type === "document" || m.type === "transcript")
      );
    }
    return items.filter((i) => i.media.some((m) => m.type === filter));
  }, [items, filter]);

  const mediaForCard = (item: ContentItem): MediaItem[] => {
    if (filter === "all") return item.media;
    return item.media.filter((m) => m.type === filter);
  };

  // Default media type based on filter
  const defaultMediaType = filter === "all" ? "text" : filter;

  return (
    <div className="p-6 md:p-8">
      <header className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-800/60 font-medium mb-1">
            {languageName} · {baseName}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-stone-900 leading-tight">
            {title}
          </h2>
        </div>

        <button
          onClick={() => setShowContribute(true)}
          className="inline-flex items-center gap-2 bg-[#6b4724] text-amber-50 px-5 py-2.5 rounded-full font-semibold shadow-lg hover:bg-[#5c3a1c] transition flex-shrink-0 blink-contribute"
        >
          <span className="text-lg leading-none">+</span>
          Contribute
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-stone-900/15">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-all ${
                filter === f.key
                  ? "bg-stone-900 text-amber-50 border-stone-900 shadow-md"
                  : "bg-white/50 backdrop-blur text-stone-900 border-stone-800/25 hover:border-stone-900 hover:bg-white/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-1 bg-white/40 backdrop-blur rounded-full p-1 border border-stone-900/15">
          {VIEW_MODES.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              title={v.label}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                view === v.key
                  ? "bg-stone-900 text-amber-50 shadow"
                  : "text-stone-800 hover:bg-white/60"
              }`}
            >
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl bg-amber-50/90 backdrop-blur border border-stone-900/15 p-14 text-center shadow-lg">
          <p className="text-stone-900 font-serif text-2xl mb-3">
            No {title} entries yet
          </p>
          <p className="text-sm text-stone-800/70 mb-6">
            Be the first to contribute to this module
          </p>
          <button
            onClick={() => setShowContribute(true)}
            className="inline-block bg-stone-900 text-amber-50 px-7 py-3 rounded-full text-sm font-semibold hover:bg-amber-900 transition shadow-md"
          >
            + Add {title}
          </button>
        </div>
      ) : view === "feed" ? (
        <FeedView items={filteredItems} mediaForCard={mediaForCard} />
      ) : (
        <GridView items={filteredItems} mediaForCard={mediaForCard} />
      )}

      {showContribute && (
        <ContributeModal
          languageCode={languageCode}
          languageId={languageId}
          moduleCode={moduleCode}
          moduleName={title}
          defaultMediaType={defaultMediaType}
          onClose={() => setShowContribute(false)}
        />
      )}
    </div>
  );
}

function FeedView({ items, mediaForCard }: { items: ContentItem[]; mediaForCard: (i: ContentItem) => MediaItem[] }) {
  return (
    <div className="space-y-5 max-w-3xl">
      {items.map((item) => (
        <FeedCard key={item.id} item={item} media={mediaForCard(item)} />
      ))}
    </div>
  );
}

function FeedCard({ item, media }: { item: ContentItem; media: MediaItem[] }) {
  const primary = media[0];
  return (
    <article className="bg-amber-50/95 backdrop-blur rounded-2xl border border-stone-900/10 overflow-hidden shadow-lg hover:shadow-xl hover:border-amber-800/40 transition-all">
      {primary && (
        <div className="bg-stone-900 relative">
          {primary.type === "image" && (
            <img src={primary.url} alt={item.title} className="w-full max-h-[500px] object-contain bg-stone-950" />
          )}
          {primary.type === "video" && (
            <video src={primary.url} poster={primary.thumbnailUrl || undefined} controls className="w-full max-h-[500px] bg-stone-950" />
          )}
          {primary.type === "audio" && (
            <div className="p-8 flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-950">
              <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-2xl">🎵</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-100">Audio Recording</p>
                    <p className="text-xs text-amber-100/60">{primary.format || "audio"}</p>
                  </div>
                </div>
                <audio src={primary.url} controls className="w-full" />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="p-6">
        <h3 className="font-serif text-2xl text-stone-900 mb-2 leading-snug">{item.title}</h3>
        {item.summary && (
          <p className="text-sm text-stone-800/80 leading-relaxed mb-4">{item.summary}</p>
        )}
        {media.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-stone-900/10">
            {media.slice(1).map((m) => (
              <MediaChip key={m.id} media={m} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function MediaChip({ media }: { media: MediaItem }) {
  const icons: Record<string, string> = { image: "🖼️", audio: "🎵", video: "🎬", document: "📄" };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-stone-900/5 border border-stone-900/15 text-stone-800">
      <span>{icons[media.type] || "📎"}</span>
      <span className="capitalize">{media.type}</span>
    </span>
  );
}

function GridView({ items, mediaForCard }: { items: ContentItem[]; mediaForCard: (i: ContentItem) => MediaItem[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const media = mediaForCard(item);
        const thumb = media.find((m) => m.type === "image" || m.type === "video");
        const icons = Array.from(new Set(media.map((m) => m.type)));
        return (
          <div key={item.id} className="bg-amber-50/95 backdrop-blur rounded-xl border border-stone-900/10 overflow-hidden shadow-md hover:shadow-xl hover:border-amber-800/40 transition-all cursor-pointer group">
            <div className="aspect-square bg-stone-900 relative overflow-hidden">
              {thumb?.type === "image" && (
                <img src={thumb.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              )}
              {thumb?.type === "video" && thumb.thumbnailUrl && (
                <img src={thumb.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              )}
              {(!thumb || (thumb.type === "video" && !thumb.thumbnailUrl)) && (
                <div className="w-full h-full flex items-center justify-center text-5xl text-amber-200/30">
                  {thumb?.type === "video" ? "🎬" : "📎"}
                </div>
              )}
              {icons.length > 0 && (
                <div className="absolute top-2 right-2 flex gap-1">
                  {icons.map((t) => (
                    <span key={t} className="w-6 h-6 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-xs">
                      {t === "image" && "🖼️"}
                      {t === "audio" && "🎵"}
                      {t === "video" && "🎬"}
                      {t === "document" && "📄"}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="font-serif text-sm text-stone-900 line-clamp-2 leading-tight">{item.title}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}