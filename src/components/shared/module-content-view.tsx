"use client";

import { useState, useMemo, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { CONTENT_FILTERS as FILTERS, CONTENT_VIEWS as VIEW_MODES, contributionHref } from "@/lib/app-navigation";
import { LayoutGrid, Image, Headphones, Video, FileText } from "lucide-react";
import type { ContentItem, MediaItem } from "@/lib/app-content";

const FILTER_ICONS = { all: LayoutGrid, image: Image, audio: Headphones, video: Video, transcript: FileText };

export type ModuleContentProps = {
  title: string;
  baseName: string;
  languageName: string;
  languageCode: string;
  languageId: number;
  moduleCode: string;
  items: ContentItem[];
  canContribute?: boolean;
  onSave?: (item: ContentItem) => void;
  continuation?: { records: string | null; dictionary: string | null };
};

export type AppLink = ComponentType<{ href: string; className?: string; children: ReactNode }>;

export function ModuleContentView({
  title,
  baseName,
  languageName,
  languageCode,
  languageId,
  moduleCode,
  items,
  canContribute = true,
  onSave,
  Link: NavigationLink,
}: ModuleContentProps & { Link: AppLink }) {
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState("feed");
  const [viewLanguageCode, setViewLanguageCode] = useState(languageCode);

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

  return (
    <div className="p-3 md:p-8">
      <div className="module-controls sticky top-0 z-20 -mx-3 mb-5 bg-[#b89a68] px-3 pt-2 shadow-sm md:-mx-8 md:px-8" data-sticky-controls>
      <header className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-800/60 font-semibold mb-1">
            {languageName} · {baseName}
          </p>
          <h2 className="font-serif text-2xl md:text-4xl text-stone-900 leading-tight">
            {title}
          </h2>
        </div>

        <label className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800">
          <span className="sr-only sm:not-sr-only">View language</span>
          <select value={viewLanguageCode} onChange={(event) => setViewLanguageCode(event.target.value)} className="rounded-lg border border-stone-800/20 bg-white/70 px-3 py-2">
            <option value={languageCode}>{languageName}</option>
            {languageCode !== "eng" && <option value="eng">English — {languageName} culture</option>}
          </select>
        </label>

        {moduleCode !== "all" && canContribute && <NavigationLink
          href={contributionHref(moduleCode)}
          className="inline-flex items-center gap-2 bg-[#6b4724] text-amber-50 px-5 py-2.5 rounded-full font-semibold shadow-lg hover:bg-[#5c3a1c] transition shrink-0 blink-contribute"
        >
          <span className="text-lg leading-none">+</span>
          Contribute
        </NavigationLink>}
      </header>

      {moduleCode === "all" && <div className="flex flex-nowrap gap-2 mb-3 overflow-x-auto">
        {[{ key: "all", label: "All content" }, ...categories.map(([key, label]) => ({ key, label }))].map((item) => (
          <button key={item.key} aria-pressed={category === item.key} onClick={() => setCategory(item.key)} className={`shrink-0 min-h-11 text-xs font-semibold px-4 py-1.5 rounded-full border ${category === item.key ? "bg-amber-800 text-white border-amber-800" : "bg-white/60 text-stone-800 border-stone-800/20"}`}>{item.label}</button>
        ))}
      </div>}

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 border-b border-stone-900/15">
        <div className="flex flex-nowrap gap-1" role="group" aria-label="Content type">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              title={f.label}
              aria-label={f.label}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`flex shrink-0 min-h-11 min-w-11 items-center justify-center gap-2 text-xs font-semibold px-2 sm:px-4 py-2 rounded-full border transition-colors ${
                filter === f.key
                  ? "bg-stone-900 text-amber-50 border-stone-900 shadow-md"
                  : "bg-black/5 backdrop-blur-sm text-stone-900 border-stone-800/25 hover:border-stone-900 hover:bg-black/10"
              }`}
            >
              {(() => { const Icon = FILTER_ICONS[f.key]; return <Icon size={18} aria-hidden="true" />; })()}
              <span className="sr-only sm:not-sr-only">{f.label}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 gap-1 bg-black/5 backdrop-blur-sm rounded-full p-1 border border-stone-900/15">
          {VIEW_MODES.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              title={v.label}
              aria-label={`${v.label} view`}
              aria-pressed={view === v.key}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-sm transition-all ${
                view === v.key
                  ? "bg-stone-900 text-amber-50 shadow-sm"
                  : "text-stone-800 hover:bg-black/10"
              }`}
            >
              {v.icon}
            </button>
          ))}
        </div>
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
            {canContribute && moduleCode !== "all"
              ? "Be the first to share something with the community. Your contribution will be reviewed and published."
              : "Published community content will appear here when it is available."}
          </p>

          {moduleCode !== "all" && canContribute && <NavigationLink
            href={contributionHref(moduleCode)}
            className="inline-flex items-center gap-2 bg-[#6b4724] text-amber-50 px-7 py-3 rounded-full text-sm font-semibold hover:bg-[#5c3a1c] transition shadow-lg blink-contribute"
          >
            <span className="text-lg leading-none">+</span>
            Add the first {title}
          </NavigationLink>}
        </div>
      ) : view === "feed" ? (
        <FeedView items={filteredItems} mediaForCard={mediaForCard} languageCode={languageCode} viewLanguageCode={viewLanguageCode} onSave={onSave} />
      ) : (
        <GridView items={filteredItems} mediaForCard={mediaForCard} onOpen={setSelectedItem} />
      )}

      {selectedItem && <ContentDialog item={selectedItem} onSave={onSave} languageCode={languageCode} onClose={() => setSelectedItem(null)} />}
    </div>
  );
}

function FeedView({ items, mediaForCard, languageCode, viewLanguageCode, onSave }: { items: ContentItem[]; mediaForCard: (i: ContentItem) => MediaItem[]; languageCode: string; viewLanguageCode: string; onSave?: (item: ContentItem) => void }) {
  return (
      <div className="space-y-4 md:space-y-8 max-w-6xl">
      {items.map((item) => (
        <FeedCard key={item.id} item={item} media={mediaForCard(item)} languageCode={languageCode} viewLanguageCode={viewLanguageCode} onSave={onSave} />
      ))}
    </div>
  );
}

function FeedCard({ item, media, languageCode, viewLanguageCode, onSave }: { item: ContentItem; media: MediaItem[]; languageCode: string; viewLanguageCode: string; onSave?: (item: ContentItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showEnglish, setShowEnglish] = useState(viewLanguageCode === "eng");
  useEffect(() => setShowEnglish(viewLanguageCode === "eng"), [viewLanguageCode]);
  const primary = media[0];
  const description = showEnglish ? item.englishSummary : expanded && item.bodyText ? item.bodyText : item.summary;
  return (
    <article className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-start">
      <div className="min-w-0 space-y-2 md:space-y-4">
        {media.map((asset) => (
          <div key={asset.id} className="w-full flex items-center justify-center bg-black/5 overflow-hidden rounded-lg">
            {asset.type === "image" && <img src={asset.url} alt={item.title} className="w-full max-h-[65vh] md:max-h-[500px] object-cover md:object-contain" />}
            {asset.type === "video" && <video src={asset.url} poster={asset.thumbnailUrl || undefined} controls className="w-full max-h-[65vh] md:max-h-[500px] object-cover md:object-contain" />}
            {asset.type === "audio" && <div className="w-full p-6"><p className="text-sm text-stone-800 mb-3">Audio recording{asset.format ? ` - ${asset.format}` : ""}</p><audio src={asset.url} controls className="w-full" /></div>}
            {(asset.type === "document" || asset.type === "transcript") && <a href={asset.url} target="_blank" rel="noreferrer" className="text-stone-900 underline">Open transcript or document</a>}
          </div>
        ))}
        {!primary && <div className="hidden md:block min-h-24" />}
      </div>
      <div className="min-w-0 py-1 md:py-4">
        {item.moduleName && <p className="text-[10px] uppercase tracking-[0.2em] text-amber-800 mb-2">{item.moduleName}</p>}
        <h3 className="font-serif text-2xl text-stone-900 mb-3 leading-snug underline underline-offset-4 decoration-stone-900/40">{item.title}</h3>
        {languageCode !== "eng" && (
          <button type="button" onClick={() => { setShowEnglish((value) => !value); setExpanded(true); }} aria-pressed={showEnglish} className="mb-3 block text-sm font-semibold text-amber-900 underline underline-offset-2">
            {showEnglish ? "View in original language" : "See this in English"}
          </button>
        )}
        {description && (
          <>
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="md:hidden mb-2 text-sm font-semibold text-amber-900 underline underline-offset-2"
            >
              {expanded ? "Hide description" : "See description"}
            </button>
            {expanded && <p className="md:hidden text-sm text-stone-800/80 leading-relaxed whitespace-pre-wrap">{description}</p>}
            <p className={`hidden md:block text-sm text-stone-800/80 leading-relaxed whitespace-pre-wrap ${expanded ? "" : "line-clamp-5"}`}>{description}</p>
            {(description.length > 240 || !!item.bodyText) && <button type="button" onClick={() => setExpanded((value) => !value)} className="hidden md:inline-block mt-2 text-sm font-semibold text-amber-900 underline underline-offset-2">{expanded ? "See less" : "See more"}</button>}
          </>
        )}
        {onSave && <button type="button" className="mt-3 min-h-11 rounded-full bg-amber-900 px-5 py-2 text-white" onClick={() => onSave(item)}>Save item</button>}
        {showEnglish && !item.englishSummary && <p className="text-sm text-stone-700 italic">An English description has not been added yet.</p>}
      </div>
    </article>
  );
}
function GridView({ items, mediaForCard, onOpen }: { items: ContentItem[]; mediaForCard: (i: ContentItem) => MediaItem[]; onOpen: (item: ContentItem) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const media = mediaForCard(item);
        const thumb = media.find((m) => m.type === "image" || m.type === "video");
        const icons = Array.from(new Set(media.map((m) => m.type)));
        return (
          <button type="button" onClick={() => onOpen(item)} aria-label={`Open ${item.title}`} key={item.id} className="text-left bg-black/5 backdrop-blur-sm rounded-xl border border-stone-900/10 overflow-hidden shadow-md hover:shadow-xl hover:border-amber-800/40 transition-all cursor-pointer group">
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
                    <span key={t} className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-xs">
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
          </button>
        );
      })}
    </div>
  );
}

function ContentDialog({ item, languageCode, onClose, onSave }: { item: ContentItem; languageCode: string; onClose: () => void; onSave?: (item: ContentItem) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const value = dialog.current; if (value && !value.open) value.showModal(); }, []);
  return <dialog ref={dialog} onClose={onClose} className="max-h-[90dvh] w-[min(95vw,60rem)] overflow-auto rounded-xl bg-[#e6d8bf] p-5 text-stone-900 backdrop:bg-black/60">
    <button type="button" autoFocus onClick={() => dialog.current?.close()} className="mb-4 min-h-11 rounded-full bg-amber-900 px-5 py-2 text-white">Close details</button>
    <FeedCard item={{ ...item, summary: item.bodyText || item.summary }} media={item.media} languageCode={languageCode} viewLanguageCode={languageCode} onSave={onSave} />
  </dialog>;
}
