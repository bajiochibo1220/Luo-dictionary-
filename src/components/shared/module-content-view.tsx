"use client";
import { MediaAudio, MediaImage, MediaVideo } from "@/components/shared/media-preview";

import { InterfaceOption, InterfaceSelect, InterfaceText } from "@/components/shared/interface-language";


import { emitActivity } from "@/lib/activity-events";
import { ObjViewer } from "./obj-viewer";
import { StoryTour } from "./story-tour";
import { useState, useMemo, useEffect, useRef, useContext, createContext, type ComponentType, type ReactNode } from "react";
import { CONTENT_FILTERS as FILTERS, CONTENT_VIEWS as VIEW_MODES, contributionHref } from "@/lib/app-navigation";
import { LayoutGrid, List, Image, Headphones, Video, FileText, Plus } from "lucide-react";
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
    <DownloadOrigin.Provider value={downloadOrigin || ""}><div className="library-page" data-toolbar-in-masthead={toolbarInMasthead} data-all-content={moduleCode === "all"}>
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
      <BottomMediaControls>
        <div className="media-filter-buttons" role="group" aria-label="Content type">
          {FILTERS.map(f => { const Icon = FILTER_ICONS[f.key]; return <button key={f.key} type="button" title={f.label} aria-label={f.label} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={`media-filter-button ${filter === f.key ? "is-active" : ""}`}><Icon size={20} aria-hidden="true" /><span>{f.label}</span></button>; })}
        </div>
        {VIEW_MODES.filter(mode => mode.key !== view).map(mode => <button key={mode.key} type="button" title={mode.label} aria-label={`${mode.label} view`} onClick={() => setView(mode.key)} className="media-filter-button">{mode.key === "grid" ? <LayoutGrid size={20} aria-hidden="true" /> : <List size={20} aria-hidden="true" />}<span><InterfaceText source={mode.label} /></span></button>)}
      </BottomMediaControls>

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
        <FeedView items={filteredItems} mediaForCard={mediaForCard} languageCode={languageCode} viewLanguageCode={viewLanguageCode} onSave={onSave} />
      ) : (
        <GridView viewLanguageCode={viewLanguageCode} items={filteredItems} mediaForCard={mediaForCard} onOpen={item => { emitActivity({eventType:"view",recordId:item.id}); setSelectedItem(item); }} />
      )}

      {selectedItem && <ContentDialog viewLanguageCode={viewLanguageCode} item={selectedItem} onSave={onSave} languageCode={languageCode} onClose={() => setSelectedItem(null)} />}
    </div></DownloadOrigin.Provider>
  );
}

function FeedView({ items, mediaForCard, languageCode, viewLanguageCode, onSave }: { items: ContentItem[]; mediaForCard: (i: ContentItem) => MediaItem[]; languageCode: string; viewLanguageCode: string; onSave?: (item: ContentItem) => void }) {
  return (
      <div className="library-feed space-y-3 px-2">
      {items.map((item) => (
        <FeedCard key={item.id} item={item} media={mediaForCard(item)} languageCode={languageCode} viewLanguageCode={viewLanguageCode} onSave={onSave} />
      ))}
    </div>
  );
}

function FeedCard({ item, media, languageCode, viewLanguageCode, onSave }: { item: ContentItem; media: MediaItem[]; languageCode: string; viewLanguageCode: string; onSave?: (item: ContentItem) => void }) {
  const downloadOrigin = useContext(DownloadOrigin);
  const hasLinkedTranscripts = (item.transcriptCount || 0) > 0;
  const [expanded, setExpanded] = useState(true);
  const [showEnglish, setShowEnglish] = useState(viewLanguageCode === "eng");
  useEffect(() => setShowEnglish(viewLanguageCode === "eng"), [viewLanguageCode]);
  const description = showEnglish ? (expanded ? item.englishBodyText || item.englishSummary : item.englishSummary) : expanded && item.bodyText ? item.bodyText : item.summary;
  return (
    <article className={`library-feed-card ${media.length ? "has-media" : ""} grid grid-cols-1 gap-3 items-start rounded-xl border border-stone-900/10 bg-white/85 p-3 shadow-sm`}>
      {media.length > 0 && <div className="min-w-0 space-y-2 md:space-y-4">
        {media.map((asset) => (
          <div key={asset.id} className="w-full flex items-center justify-center bg-black/5 overflow-hidden rounded-lg">
            {asset.type === "image" && <MediaImage loading="lazy" src={asset.thumbnailUrl || asset.url} alt={item.title} className="library-media-preview w-full object-contain" />}
            {asset.type === "video" && <MediaVideo onPlay={()=>emitActivity({eventType:"video_play",recordId:item.id})} preload="none" src={asset.url} poster={asset.thumbnailUrl || undefined} controls className="library-media-preview w-full object-contain" />}
            {asset.type === "audio" && <div className="w-full p-6"><p className="text-sm text-stone-800 mb-3"><InterfaceText source="Audio recording" />{asset.format ? ` - ${asset.format}` : ""}</p><MediaAudio onPlay={()=>emitActivity({eventType:"audio_play",recordId:item.id})} preload="none" src={asset.url} controls className="w-full" /></div>}
            {(asset.type === "document" || asset.type === "transcript") && <a href={asset.url} target="_blank" rel="noreferrer" className="text-stone-900 underline"><InterfaceText source="Open transcript or document" /></a>}
          </div>
        ))}
      </div>}
      <div className="min-w-0">
        {item.moduleName && <p className="text-[10px] uppercase tracking-[0.2em] text-amber-800 mb-2">{item.moduleName}</p>}
        <h3 className="font-serif text-2xl text-stone-900 mb-3 leading-snug ">{showEnglish ? item.englishTitle || item.title : item.title}</h3>
        {item.isProvisional && <p className="mb-3 rounded-lg bg-amber-100 p-2 text-xs text-amber-950"><InterfaceText source="Published before review. Review and editing are in progress." /></p>}
        {languageCode !== "eng" && (
          <button type="button" onClick={() => { setShowEnglish((value) => !value); setExpanded(true); }} aria-pressed={showEnglish} className="mb-3 block text-sm font-semibold text-amber-900 underline underline-offset-2">
            <InterfaceText source={showEnglish ? "View in original language" : "See this in English"} />
          </button>
        )}
        {description && <div className="space-y-2"><p className={`text-sm text-stone-800 leading-relaxed whitespace-pre-wrap ${expanded ? "" : "line-clamp-3"}`}>{description}</p>{(description.length > 180 || !!item.bodyText || !!item.englishBodyText) && <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="min-h-11 text-sm font-semibold text-amber-900 underline"><InterfaceText source={expanded ? "Read less" : "Read more"} /></button>}</div>}
        {!showEnglish && languageCode !== "eng" && (!hasLinkedTranscripts || item.englishBodyText || item.englishSummary) && <div lang="en" translate="no" contentEditable={false} className="mt-4 space-y-2 border-t border-stone-300 pt-3 text-sm text-stone-700">
          <p className="text-xs font-semibold uppercase tracking-wide"><InterfaceText source="English" /></p>
          {item.englishTitle && <p className="font-serif text-lg">{item.englishTitle}</p>}
          {item.englishBodyText || item.englishSummary ? <p className={`whitespace-pre-wrap leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>{expanded ? item.englishBodyText || item.englishSummary : item.englishSummary || item.englishBodyText}</p> : <p className="italic"><InterfaceText source="An English description has not been added yet." /></p>}
        </div>}
        {hasLinkedTranscripts && <PublicTranscriptReader key={item.id} recordId={item.id} languageCode={showEnglish ? "eng" : languageCode} origin={downloadOrigin} />}
        <CompleteItemDownload id={item.id} kind={item.kind || "cultural"} origin={downloadOrigin} />
        {media.length > 0 && <div className="mt-3 flex flex-wrap gap-3">{media.map(asset => <a key={asset.id} href={`${asset.url}${asset.url.includes("?") ? "&" : "?"}download=1`} download className="inline-flex min-h-11 items-center text-sm font-semibold underline"><InterfaceText source="Download " />{asset.type}</a>)}</div>}
        {description && !hasLinkedTranscripts && <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(`${showEnglish ? item.englishTitle || item.title : item.title}\n\n${showEnglish ? item.englishBodyText || item.englishSummary || "" : item.bodyText || item.summary || ""}`)}`} download={`heritage-${item.id}-${showEnglish ? "english" : languageCode}.txt`} className="mt-3 flex min-h-11 w-fit items-center rounded-lg border border-stone-400 px-3 text-sm font-semibold"><InterfaceText source="Download text / transcript" /></a>}
        {(item.moduleCode === "folktales" || item.moduleCode === "heritage_sites") && <StoryTour item={item} text={showEnglish ? item.englishBodyText || item.englishSummary || "" : item.bodyText || item.summary || ""} />}
        {item.moduleCode === "artifacts" && item.media.filter(asset => asset.format === "obj").map(asset => <ObjViewer key={asset.id} address={asset.url} />)}
        {onSave && <button type="button" className="mt-3 min-h-11 rounded-lg bg-amber-900 px-4 py-2 text-sm text-white" onClick={() => onSave(item)}><InterfaceText source="Save item" /></button>}
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
            <div className="aspect-square bg-[#b89a68] relative overflow-hidden">
              {thumb?.type === "image" && (
                <MediaImage src={thumb.thumbnailUrl || thumb.url} sizes="(max-width: 767px) 50vw, 25vw" alt={item.title} className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500" />
              )}
              {thumb?.type === "video" && thumb.thumbnailUrl && (
                <MediaImage src={thumb.thumbnailUrl} sizes="(max-width: 767px) 50vw, 25vw" alt={item.title} className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500" />
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

function ContentDialog({ item, languageCode, onClose, onSave, viewLanguageCode }: { viewLanguageCode: string; item: ContentItem; languageCode: string; onClose: () => void; onSave?: (item: ContentItem) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const value = dialog.current; if (value && !value.open) value.showModal(); }, []);
  return <dialog ref={dialog} onClose={onClose} className="library-content-dialog max-h-[90dvh] w-[min(95vw,60rem)] overflow-auto rounded-xl bg-[#e6d8bf] p-5 text-stone-900 backdrop:bg-black/60">
    <button type="button" autoFocus onClick={() => dialog.current?.close()} className="mb-4 min-h-11 rounded-full bg-amber-900 px-5 py-2 text-white"><InterfaceText source="Close details" /></button>
    <FeedCard item={{ ...item, summary: item.bodyText || item.summary }} media={item.media} languageCode={languageCode} viewLanguageCode={viewLanguageCode} onSave={onSave} />
  </dialog>;
}
