"use client";
import { MediaImage } from "@/components/shared/media-preview";
import { SocialFeed, SocialFeedCard } from "./social-feed";
import { LibraryMediaGallery } from "./library-media-gallery";

import { InterfaceOption, InterfaceSelect, InterfaceText } from "@/components/shared/interface-language";


import { emitActivity } from "@/lib/activity-events";
import { ObjViewer } from "./obj-viewer";
import { StoryTour } from "./story-tour";
import { useState, useMemo, useEffect, useRef, useContext, createContext, type ComponentType, type ReactNode } from "react";
import { CONTENT_FILTERS as FILTERS, CONTENT_VIEWS as VIEW_MODES, contributionHref } from "@/lib/app-navigation";
import { LayoutGrid, List, Image, Headphones, Video, FileText, Plus, SlidersHorizontal } from "lucide-react";
import { BottomMediaControls } from "./bottom-media-controls";
import { PublicTranscriptReader } from "./public-transcript-reader";
import { CompleteItemDownload } from "./complete-item-download";
import { CollectionToolbar } from "./collection-toolbar";
import type { ContentItem, MediaItem } from "@/lib/app-content";

const DownloadOrigin = createContext("");
const FILTER_ICONS = { all: LayoutGrid, image: Image, audio: Headphones, video: Video, transcript: FileText };

export type ModuleContentProps = {
  title: string;
  baseName: string;
  languageName: string;
  languageCode: string;
  languageId: number;
  moduleCode: string;
  subject?: string;
  categories?: { code: string; name: string }[];
  downloadOrigin?: string;
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
  downloadOrigin,
  searchControls,
  categories: availableCategories,
  selectedCategory,
  onCategoryChange,
  categoryBusy = false,
  Link: NavigationLink,
}: ModuleContentProps & { Link: AppLink; searchControls?: ReactNode; selectedCategory?: string; onCategoryChange?: (category: string) => void; categoryBusy?: boolean }) {
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [filter, setFilter] = useState("all");
  const [localCategory, setCategory] = useState("all");
  const category = selectedCategory ?? localCategory;
  const [view, setView] = useState("feed");
  const [viewLanguageCode, setViewLanguageCode] = useState(languageCode);
  const [toolbarInMasthead, setToolbarInMasthead] = useState(false);
  useEffect(() => { setViewLanguageCode(languageCode); }, [languageCode]);

  const filteredItems = useMemo(() => {
    const byCategory = moduleCode !== "all" || category === "all"
      ? items
      : items.filter((item) => item.moduleCode === category);
    if (filter === "all") return byCategory;
    if (filter === "transcript") {
      return byCategory.filter(
        (i) =>
          (i.transcriptCount || 0) > 0 || !!i.bodyText || i.media.length === 0 ||
          i.media.some((m) => m.type === "document" || m.type === "transcript")
      );
    }
    return byCategory.filter((i) => i.media.some((m) => m.type === filter));
  }, [items, filter, category, moduleCode]);

  const categories = availableCategories?.map(item => [item.code, item.name]) ?? Array.from(new Map(items.filter((item) => item.moduleCode).map((item) => [item.moduleCode!, item.moduleName || item.moduleCode!])).entries());

  const mediaForCard = (item: ContentItem): MediaItem[] => {
    if (filter === "all") return item.media;
    return item.media.filter((m) => filter === "transcript" ? ["document", "transcript"].includes(m.type) : m.type === filter);
  };

  return (
    <DownloadOrigin.Provider value={downloadOrigin || ""}><div className="library-page" data-social-feed={view === "feed"} data-toolbar-in-masthead={toolbarInMasthead} data-all-content={moduleCode === "all"}>
      <details className="collection-feed-tools" open={view !== "feed"}><summary><SlidersHorizontal size={18} aria-hidden="true" /><InterfaceText source="Browse & search" /></summary><div className="collection-control-panel">
      <div className="module-controls sticky top-0 z-20 mb-2 bg-[#eee5d5] px-2 py-1 shadow-sm" data-sticky-controls>
      <CollectionToolbar onPlacementChange={setToolbarInMasthead}>
        {searchControls && <div className="min-w-0 flex-1">{searchControls}</div>}
        <label className="shrink-0"><span className="sr-only"><InterfaceText source="Content language" /></span><InterfaceSelect aria-label="Content language" value={viewLanguageCode} onChange={event => setViewLanguageCode(event.target.value)} className="min-h-11 w-24 rounded-lg border border-stone-400 bg-white px-2 text-base sm:w-36">
          <InterfaceOption value={languageCode}>{languageName}</InterfaceOption>
          {languageCode !== "eng" && <InterfaceOption value="eng">English</InterfaceOption>}
        </InterfaceSelect></label>
      </CollectionToolbar>
      <header className="collection-title-row flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2"><h2 className="truncate font-serif text-lg text-stone-900 sm:text-2xl" title={title}><InterfaceText source={baseName} /></h2><span className="truncate text-xs text-stone-700" title={baseName}>{languageName}</span></div>
        {moduleCode !== "all" && canContribute && <NavigationLink href={contributionHref(moduleCode)} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-amber-950 hover:bg-white/60"><Plus size={18} aria-hidden="true" /><span><InterfaceText source="Contribute" /></span></NavigationLink>}
      </header>
      {moduleCode === "all" && <div aria-label="Content areas" className="flex flex-nowrap gap-2 overflow-x-auto">
        {[{ key: "all", label: "All content" }, ...categories.map(([key, label]) => ({ key, label }))].map((item) => (
          <button key={item.key} type="button" disabled={categoryBusy} aria-pressed={category === item.key} onClick={() => onCategoryChange ? onCategoryChange(item.key) : setCategory(item.key)} className={`shrink-0 min-h-11 text-xs font-semibold px-4 py-1.5 rounded-full border disabled:opacity-50 ${category === item.key ? "bg-amber-800 text-white border-amber-800" : "bg-white/60 text-stone-800 border-stone-800/20"}`}><InterfaceText source={item.label} /></button>
        ))}
      </div>}

      </div>
      <BottomMediaControls inline={view === "feed"}>
        <div className="media-filter-buttons" role="group" aria-label="Content type">
          {FILTERS.map(f => { const Icon = FILTER_ICONS[f.key]; return <button key={f.key} type="button" title={f.label} aria-label={f.label} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={`media-filter-button ${filter === f.key ? "is-active" : ""}`}><Icon size={20} aria-hidden="true" /><span>{f.label}</span></button>; })}
        </div>
        {VIEW_MODES.filter(mode => mode.key !== view).map(mode => <button key={mode.key} type="button" title={mode.label} aria-label={`${mode.label} view`} onClick={() => setView(mode.key)} className="media-filter-button">{mode.key === "grid" ? <LayoutGrid size={20} aria-hidden="true" /> : <List size={20} aria-hidden="true" />}<span><InterfaceText source={mode.label} /></span></button>)}
      </BottomMediaControls>
      </div></details>

      {filteredItems.length === 0 ? (
        <div className="px-4 py-8 md:py-14 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-800/15 flex items-center justify-center mb-6 ring-1 ring-amber-900/20">
            <span className="text-2xl opacity-70">📖</span>
          </div>

          <h3 className="font-serif text-xl md:text-3xl text-stone-900 mb-3 leading-tight"><InterfaceText source="No matching entries" /></h3>
          <p className="text-base text-stone-800/70 mb-8 leading-relaxed">
            <InterfaceText source={canContribute && moduleCode !== "all"
              ? "Be the first to share something with the community. Your contribution will be reviewed and published."
              : "Published community content will appear here when it is available."} />
          </p>

        </div>
      ) : view === "feed" ? (
        <FeedView items={filteredItems} mediaForCard={mediaForCard} languageCode={languageCode} viewLanguageCode={viewLanguageCode} onSave={onSave} Link={NavigationLink} onOpen={item => { emitActivity({ eventType: "view", recordId: item.id }); setSelectedItem(item); }} />
      ) : (
        <GridView viewLanguageCode={viewLanguageCode} items={filteredItems} mediaForCard={mediaForCard} onOpen={item => { emitActivity({eventType:"view",recordId:item.id}); setSelectedItem(item); }} />
      )}

      {selectedItem && <ContentDialog key={selectedItem.id} viewLanguageCode={viewLanguageCode} item={selectedItem} items={items} onRelated={setSelectedItem} onSave={onSave} languageCode={languageCode} onClose={() => setSelectedItem(null)} />}
    </div></DownloadOrigin.Provider>
  );
}

function FeedView({ items, mediaForCard, viewLanguageCode, onSave, onOpen, Link }: { items: ContentItem[]; mediaForCard: (i: ContentItem) => MediaItem[]; languageCode: string; viewLanguageCode: string; onSave?: (item: ContentItem) => void; onOpen: (item: ContentItem) => void; Link: AppLink }) {
  const downloadOrigin = useContext(DownloadOrigin);
  return <SocialFeed className="library-feed">{items.map(item => <SocialFeedCard key={item.id} item={item} media={mediaForCard(item)} english={viewLanguageCode === "eng"} downloadOrigin={downloadOrigin} onOpen={() => onOpen(item)} onSave={onSave ? () => onSave(item) : undefined} Link={Link} className="library-feed-card" />)}</SocialFeed>;
}

function FeedCard({ item, media, languageCode, viewLanguageCode, onSave, onOpen, detail = false }: { item: ContentItem; media: MediaItem[]; languageCode: string; viewLanguageCode: string; onSave?: (item: ContentItem) => void; onOpen?: () => void; detail?: boolean }) {
  const downloadOrigin = useContext(DownloadOrigin);
  const hasLinkedTranscripts = (item.transcriptCount || 0) > 0;
  const [expanded, setExpanded] = useState(detail);
  const [showEnglish, setShowEnglish] = useState(viewLanguageCode === "eng");
  useEffect(() => setShowEnglish(viewLanguageCode === "eng"), [viewLanguageCode]);
  const description = showEnglish ? (expanded ? item.englishBodyText || item.englishSummary : item.englishSummary || item.englishBodyText) : expanded ? item.bodyText || item.summary : item.summary || item.bodyText;
  const overview = showEnglish ? item.englishSummary : item.summary;
  return (
    <article className={`library-feed-card ${media.length ? "has-media" : ""} ${detail ? "is-detail" : ""}`}>
      <LibraryMediaGallery item={item} media={media} onOpen={onOpen} />
      <div className="library-item-details">
        <div className="library-item-heading"><h3 title={showEnglish ? item.englishTitle || item.title : item.title}>{onOpen ? <button type="button" onClick={onOpen}>{showEnglish ? item.englishTitle || item.title : item.title}</button> : showEnglish ? item.englishTitle || item.title : item.title}</h3>{item.moduleName && <span className="library-item-category"><InterfaceText source={item.moduleName} /></span>}</div>
        <div className="library-item-actions">
          {onOpen && <button type="button" onClick={onOpen}><InterfaceText source="Explore this item" /></button>}
          {onSave && <button type="button" onClick={() => onSave(item)}><InterfaceText source="Save item" /></button>}
          {item.isProvisional && <span className="discovery-review-label" title="Published before review. Review and editing are in progress."><InterfaceText source="Review in progress" /></span>}
          {!detail && <CompleteItemDownload id={item.id} kind={item.kind || "cultural"} origin={downloadOrigin} compact />}
          {languageCode !== "eng" && (detail || item.englishBodyText || item.englishSummary) && <button type="button" onClick={() => { setShowEnglish((value) => !value); }} aria-pressed={showEnglish}>
            <InterfaceText source={showEnglish ? "View in original language" : "See this in English"} />
          </button>}
        </div>
        {!showEnglish && !detail && item.englishTitle && <p className="discovery-english-title" lang="en" contentEditable={false}>{item.englishTitle}</p>}
        {detail && overview && overview !== description && <p className="text-sm leading-relaxed whitespace-pre-wrap">{overview}</p>}
        {description && <div className={`library-item-description ${expanded ? "is-expanded" : ""} space-y-2`}><p className={`text-sm text-stone-800 leading-relaxed whitespace-pre-wrap ${expanded ? "" : "line-clamp-3"}`}>{description}</p>{!detail && (description.length > 180 || !!item.bodyText || !!item.englishBodyText) && <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="min-h-11 text-sm font-semibold text-amber-900 underline"><InterfaceText source={expanded ? "Read less" : "Read more"} /></button>}</div>}
        {!showEnglish && languageCode !== "eng" && (detail || item.englishBodyText || item.englishSummary) && (!hasLinkedTranscripts || item.englishBodyText || item.englishSummary) && <div lang="en" translate="no" contentEditable={false} className="library-english-preview space-y-1 border-t border-stone-200 pt-2 text-xs text-stone-700">
          <p className="text-xs font-semibold uppercase tracking-wide"><InterfaceText source="English" /></p>
          {detail && item.englishTitle && <p className="font-serif text-lg">{item.englishTitle}</p>}
          {item.englishBodyText || item.englishSummary ? <p className={`whitespace-pre-wrap leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>{expanded ? item.englishBodyText || item.englishSummary : item.englishSummary || item.englishBodyText}</p> : <p className="italic"><InterfaceText source="An English description has not been added yet." /></p>}
        </div>}
        <div className="library-item-resources">
        {hasLinkedTranscripts && <PublicTranscriptReader key={item.id} recordId={item.id} languageCode={showEnglish ? "eng" : languageCode} origin={downloadOrigin} defaultOpen={detail} />}
        {(media.length > 0 || description && !hasLinkedTranscripts) && <details className="library-file-downloads"><summary><InterfaceText source="Download files" /> ({media.length + (description && !hasLinkedTranscripts ? 1 : 0)})</summary><div>{media.map(asset => <a key={asset.id} href={`${asset.url}${asset.url.includes("?") ? "&" : "?"}download=1`} download className="inline-flex min-h-11 items-center text-sm font-semibold underline"><InterfaceText source="Download " />{asset.type}</a>)}</div>
        {description && !hasLinkedTranscripts && <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(`${showEnglish ? item.englishTitle || item.title : item.title}\n\n${showEnglish ? item.englishBodyText || item.englishSummary || "" : item.bodyText || item.summary || ""}`)}`} download={`heritage-${item.id}-${showEnglish ? "english" : languageCode}.txt`} className="inline-flex min-h-11 items-center text-sm font-semibold underline"><InterfaceText source="Download text / transcript" /></a>}
        </details>}
        </div>
        {detail && <CompleteItemDownload id={item.id} kind={item.kind || "cultural"} origin={downloadOrigin} />}
        {detail && (item.moduleCode === "folktales" || item.moduleCode === "heritage_sites") && <StoryTour item={item} text={showEnglish ? item.englishBodyText || item.englishSummary || "" : item.bodyText || item.summary || ""} />}
        {detail && item.moduleCode === "artifacts" && item.media.filter(asset => asset.format === "obj").map(asset => <ObjViewer key={asset.id} address={asset.url} />)}
        {showEnglish && !hasLinkedTranscripts && !item.englishBodyText && !item.englishSummary && <p className="text-sm text-stone-700 italic"><InterfaceText source="An English description has not been added yet." /></p>}
      </div>
    </article>
  );
}
function GridView({ items, mediaForCard, onOpen, viewLanguageCode }: { viewLanguageCode: string; items: ContentItem[]; mediaForCard: (i: ContentItem) => MediaItem[]; onOpen: (item: ContentItem) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-2">
      {items.map((item) => {
        const media = mediaForCard(item);
        const thumb = media.find((m) => m.type === "image" || m.type === "video");
        const icons = Array.from(new Set(media.map((m) => m.type)));
        return (
          <button type="button" onClick={() => onOpen(item)} aria-label={`Open ${item.title}`} key={item.id} className="text-left bg-black/5 backdrop-blur-sm rounded-xl border border-stone-900/10 overflow-hidden shadow-md hover:shadow-xl hover:border-amber-800/40 transition-all cursor-pointer group">
            <div className="aspect-square bg-black relative overflow-hidden">
              {thumb?.type === "image" && (
                <MediaImage src={thumb.thumbnailUrl || thumb.url} sizes="(max-width: 767px) 50vw, 25vw" alt={item.title} className="w-full h-full object-contain" />
              )}
              {thumb?.type === "video" && thumb.thumbnailUrl && (
                <MediaImage src={thumb.thumbnailUrl} sizes="(max-width: 767px) 50vw, 25vw" alt={item.title} className="w-full h-full object-contain" />
              )}
              {(!thumb || (thumb.type === "video" && !thumb.thumbnailUrl)) && (
                <div className="w-full h-full flex items-center justify-center text-5xl text-amber-200/30">
                  <InterfaceText source={thumb?.type === "video" ? "🎬" : "📎"} />
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
              <p className="font-serif text-sm text-stone-900 line-clamp-2 leading-tight">{viewLanguageCode === "eng" ? item.englishTitle || item.title : item.title}</p>
              {item.isProvisional && <p className="mt-1 text-xs text-amber-900"><InterfaceText source="Review in progress" /></p>}
              {viewLanguageCode !== "eng" && item.englishTitle && <p lang="en" translate="no" contentEditable={false} className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-700">{item.englishTitle}</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function LibraryItemDialog({ downloadOrigin, ...props }: Parameters<typeof ContentDialog>[0] & { downloadOrigin?: string }) {
  return <DownloadOrigin.Provider value={downloadOrigin || ""}><ContentDialog {...props} /></DownloadOrigin.Provider>;
}

function ContentDialog({ item, languageCode, onClose, onSave, viewLanguageCode, items = [], onRelated }: { viewLanguageCode: string; item: ContentItem; languageCode: string; onClose: () => void; onSave?: (item: ContentItem) => void; items?: ContentItem[]; onRelated?: (item: ContentItem) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const related = items.filter(candidate => candidate.id !== item.id && candidate.moduleCode === item.moduleCode).slice(0, 4);
  useEffect(() => { const value = dialog.current; if (value && !value.open) value.showModal(); }, []);
  return <dialog ref={dialog} onClose={onClose} className="library-content-dialog max-h-[90dvh] w-[min(96vw,90rem)] overflow-auto rounded-xl bg-[#f4f7f8] p-3 text-stone-900 backdrop:bg-black/60">
    <button type="button" autoFocus onClick={() => dialog.current?.close()} className="mb-4 min-h-11 rounded-full bg-amber-900 px-5 py-2 text-white"><InterfaceText source="Close details" /></button>
    <FeedCard item={item} media={item.media} languageCode={languageCode} viewLanguageCode={viewLanguageCode} onSave={onSave} detail />
    {onRelated && related.length > 0 && <nav aria-label="More from this collection" className="mt-4 rounded-xl border border-stone-300 bg-white p-4"><h3 className="font-semibold"><InterfaceText source="More from this collection" /></h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{related.map(candidate => <button type="button" key={candidate.id} onClick={() => onRelated(candidate)} className="min-h-11 rounded-lg border border-stone-200 p-3 text-left underline">{viewLanguageCode === "eng" ? candidate.englishTitle || candidate.title : candidate.title}</button>)}</div></nav>}
  </dialog>;
}
