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
  moduleCode?: string;
  moduleName?: string;
  createdAt?: string;
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
  const [category, setCategory] = useState("all");
  const [view, setView] = useState("feed");
  const [showContribute, setShowContribute] = useState(false);

  const filteredItems = useMemo(() => {
    const byCategory = moduleCode !== "all" || category === "all"
      ? items
      : items.filter((item) => item.moduleCode === category);
    if (filter === "all") return byCategory;
    if (filter === "transcript") {
      return byCategory.filter(
        (i) =>
          i.media.length === 0 ||
          i.media.some((m) => m.type === "document" || m.type === "transcript")
      );
    }
    return byCategory.filter((i) => i.media.some((m) => m.type === filter));
  }, [items, filter, category, moduleCode]);

  const categories = Array.from(new Map(items.filter((item) => item.moduleCode).map((item) => [item.moduleCode!, item.moduleName || item.moduleCode!])).entries());

  const mediaForCard = (item: ContentItem): MediaItem[] => {
    if (filter === "all") return item.media;
    return item.media.filter((m) => m.type === filter);
  };

  const defaultMediaType = filter === "all" ? "text" : filter;

  return (
    <div className="p-6 md:p-8 pt-20 md:pt-8">
      <header className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-800/60 font-semibold mb-1">
            {languageName} · {baseName}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-stone-900 leading-tight">
            {title}
          </h2>
        </div>

        {moduleCode !== "all" && <button
          onClick={() => setShowContribute(true)}
          className="inline-flex items-center gap-2 bg-[#6b4724] text-amber-50 px-5 py-2.5 rounded-full font-semibold shadow-lg hover:bg-[#5c3a1c] transition flex-shrink-0 blink-contribute"
        >
          <span className="text-lg leading-none">+</span>
          Contribute
        </button>}
      </header>

      {moduleCode === "all" && <div className="flex flex-wrap gap-2 mb-4">
        {[{ key: "all", label: "All content" }, ...categories.map(([key, label]) => ({ key, label }))].map((item) => (
          <button key={item.key} onClick={() => setCategory(item.key)} className={`text-xs font-semibold px-4 py-1.5 rounded-full border ${category === item.key ? "bg-amber-800 text-white border-amber-800" : "bg-white/60 text-stone-800 border-stone-800/20"}`}>{item.label}</button>
        ))}
      </div>}

      <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-stone-900/15">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-all ${
                filter === f.key
                  ? "bg-stone-900 text-amber-50 border-stone-900 shadow-md"
                  : "bg-black/5 backdrop-blur text-stone-900 border-stone-800/25 hover:border-stone-900 hover:bg-black/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-1 bg-black/5 backdrop-blur rounded-full p-1 border border-stone-900/15">
          {VIEW_MODES.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              title={v.label}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                view === v.key
                  ? "bg-stone-900 text-amber-50 shadow"
                  : "text-stone-800 hover:bg-black/10"
              }`}
            >
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-20 md:py-28 text-center max-w-xl mx-auto">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-800/15 flex items-center justify-center mb-6 ring-1 ring-amber-900/20">
            <span className="text-4xl opacity-70">📖</span>
          </div>

          <h3 className="font-serif text-3xl md:text-4xl text-stone-900 mb-3 leading-tight">
            No {title} entries yet
          </h3>
          <p className="text-base text-stone-800/70 mb-8 leading-relaxed">
            Be the first to share something with the community. Your
            contribution will be reviewed and published.
          </p>

          {moduleCode !== "all" && <button
            onClick={() => setShowContribute(true)}
            className="inline-flex items-center gap-2 bg-[#6b4724] text-amber-50 px-7 py-3 rounded-full text-sm font-semibold hover:bg-[#5c3a1c] transition shadow-lg blink-contribute"
          >
            <span className="text-lg leading-none">+</span>
            Add the first {title}
          </button>}
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
    <article className="bg-black/5 backdrop-blur rounded-2xl border border-stone-900/10 overflow-hidden shadow-lg hover:shadow-xl hover:border-amber-800/40 transition-all">
      {primary && (
      <div className="bg-[#b89a68] relative">
          {primary.type === "image" && (
            <img src={primary.url} alt={item.title} className="w-full max-h-[500px] object-contain bg-[#b89a68]" />
          )}
          {primary.type === "video" && (
            <video src={primary.url} poster={primary.thumbnailUrl || undefined} controls className="w-full max-h-[500px] bg-[#b89a68]" />
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
      {primary && (primary.type === "document" || primary.type === "transcript") && <a href={primary.url} target="_blank" rel="noreferrer" className="block p-5 bg-stone-900 text-amber-100 underline">Open transcript or document</a>}
      {media.slice(1).map((asset) => (
        <div key={asset.id} className="bg-[#b89a68]">
          {asset.type === "image" && <img src={asset.url} alt={item.title} className="w-full max-h-[500px] object-contain bg-[#b89a68]" />}
          {asset.type === "video" && <video src={asset.url} poster={asset.thumbnailUrl || undefined} controls className="w-full max-h-[500px] bg-[#b89a68]" />}
          {asset.type === "audio" && <div className="p-6 bg-gradient-to-br from-stone-800 to-stone-950"><p className="text-sm text-amber-100 mb-3">Audio recording{asset.format ? ` · ${asset.format}` : ""}</p><audio src={asset.url} controls className="w-full" /></div>}
          {(asset.type === "document" || asset.type === "transcript") && <a href={asset.url} target="_blank" rel="noreferrer" className="block p-5 text-amber-100 underline">Open transcript or document</a>}
        </div>
      ))}
      <div className="p-6">
        {item.moduleName && <p className="text-[10px] uppercase tracking-[0.2em] text-amber-800 mb-2">{item.moduleName}</p>}
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
    <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-black/5 border border-stone-900/15 text-stone-800">
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
          <div key={item.id} className="bg-black/5 backdrop-blur rounded-xl border border-stone-900/10 overflow-hidden shadow-md hover:shadow-xl hover:border-amber-800/40 transition-all cursor-pointer group">
            <div className="aspect-square bg-[#b89a68] relative overflow-hidden">
              {thumb?.type === "image" && (
                <img src={thumb.url} alt={item.title} className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500" />
              )}
              {thumb?.type === "video" && thumb.thumbnailUrl && (
                <img src={thumb.thumbnailUrl} alt={item.title} className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500" />
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
