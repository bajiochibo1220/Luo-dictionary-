"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bookmark, BookOpen, Search } from "lucide-react";
import type { AppLibrary } from "@/lib/app-contract";
import type { ContentItem, MediaItem } from "@/lib/app-content";
import { contributionHref, moduleHref } from "@/lib/app-navigation";
import { emitActivity } from "@/lib/activity-events";
import { InterfaceText } from "./interface-language";
import { LibraryItemDialog, type AppLink } from "./module-content-view";
import { SocialFeed, SocialFeedCard } from "./social-feed";
import { AutoLoadMore } from "./auto-load-more";
import { BottomMediaControls } from "./bottom-media-controls";
import { FeedMediaFilters } from "./feed-media-filters";
import { NavigationIcon } from "./navigation-icon";
import type { FeatureRequest } from "./learning-hub";

// Give each available content area a turn without inventing recommendations.
export function mixDiscoveryItems(items: ContentItem[]) {
  const groups = new Map<string, ContentItem[]>();
  for (const item of items) {
    const key = item.moduleCode || "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  // Start with a visual collection when available; retain chronological order
  // inside each collection and keep every text-only record in the rotation.
  const ordered = [...groups.values()].sort((a, b) => Number(b[0].media.length > 0) - Number(a[0].media.length > 0));
  const mixed: ContentItem[] = [];
  for (let index = 0; mixed.length < items.length; index++) {
    for (const group of ordered) if (group[index]) mixed.push(group[index]);
  }
  return mixed;
}

type Props = { request: FeatureRequest; languageCode: string; languageName?: string; signedIn?: boolean; downloadOrigin?: string; Link: AppLink; onRegister?: () => void };

export function DiscoveryFeed({ request, languageCode, languageName = "Dholuo", signedIn = false, downloadOrigin, Link, onRegister }: Props) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [retry, setRetry] = useState(0);
  const [library, setLibrary] = useState<AppLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [joinItem, setJoinItem] = useState("");
  const [saveBusy, setSaveBusy] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [saveError, setSaveError] = useState("");
  const [categories, setCategories] = useState<{ code: string; name: string }[]>([]);
  const [filter, setFilter] = useState("all");
  const epoch = useRef(0);
  const moreController = useRef<AbortController | null>(null);

  useEffect(() => {
    const generation = ++epoch.current;
    const controller = new AbortController();
    moreController.current?.abort(); moreController.current = null;
    setLoading(true); setMoreBusy(false); setError(""); setLibrary(null); setSelected(null); setJoinItem("");
    const params = new URLSearchParams({ language: languageCode, module: "discover", category, q: search });
    void request(`/api/v1/library?${params}`, { signal: controller.signal }).then((value: AppLibrary) => {
      if (generation !== epoch.current) return;
      setLibrary({ ...value, items: mixDiscoveryItems(value.items) });
      setCategories(value.categories || []);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "The collection could not load. Please try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); moreController.current?.abort(); };
  }, [request, languageCode, category, search, retry]);

  // Community changes must not leave another community's category or saved state behind.
  useEffect(() => { setCategory("all"); setQuery(""); setSearch(""); setCategories([]); }, [languageCode]);
  useEffect(() => { setSaved([]); setJoinItem(""); }, [signedIn, languageCode]);

  async function loadMore() {
    if (!library || loading || moreController.current) return;
    const generation = epoch.current;
    const controller = new AbortController(); moreController.current = controller;
    setMoreBusy(true); setError("");
    const params = new URLSearchParams({ language: languageCode, module: "discover", category, q: search, records: library.continuation?.records || "end", dictionary: library.continuation?.dictionary || "end" });
    try {
      const next: AppLibrary = await request(`/api/v1/library?${params}`, { signal: controller.signal });
      if (generation === epoch.current && !controller.signal.aborted) setLibrary(current => current && ({ ...next, items: [...current.items, ...mixDiscoveryItems(next.items).filter(item => !current.items.some(existing => existing.id === item.id))] }));
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "More content could not load. Please try again."); }
    finally { if (moreController.current === controller) { moreController.current = null; setMoreBusy(false); } }
  }

  async function save(item: ContentItem) {
    if (!signedIn) { setJoinItem(item.id); return; }
    if (saveBusy) return;
    setSaveBusy(item.id); setSaveError("");
    try { await request("/api/v1/saved", { method: "POST", body: JSON.stringify({ action: "save", kind: item.kind || "cultural", resourceId: item.id }) }); setSaved(current => [...current, item.id]); }
    catch (reason) { setSaveError(reason instanceof Error ? reason.message : "This item could not be saved."); }
    finally { setSaveBusy(""); }
  }

  const visibleItems = library?.items.filter(item => filter === "all" || (filter === "transcript" ? (item.transcriptCount || 0) > 0 || !!item.bodyText || item.media.length === 0 || item.media.some(asset => ["document", "transcript"].includes(asset.type)) : item.media.some(asset => asset.type === filter))) || [];
  const join = onRegister ? <button type="button" onClick={onRegister} className="discovery-join"><InterfaceText source="Create an account" /><ArrowUpRight size={16} aria-hidden="true" /></button> : <Link href="/register" className="discovery-join"><InterfaceText source="Create an account" /><ArrowUpRight size={16} aria-hidden="true" /></Link>;
  return <section className="discovery-page discovery-social" aria-labelledby="discovery-title">
    <header className="discovery-heading"><div><p className="discovery-eyebrow"><InterfaceText source="LIVING CULTURE" /> <span aria-hidden="true">/</span> {languageName}</p><h1 id="discovery-title"><InterfaceText source="Discover living heritage." /></h1><p><InterfaceText source="Listen, watch and read from the community." /></p></div><Link href="/explore" className="discovery-browse"><InterfaceText source="Browse the library" /><ArrowUpRight size={17} aria-hidden="true" /></Link></header>
    <div className="feed-search-bar discovery-search-bar">
      <form role="search" className="discovery-search" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); if (query.trim()) emitActivity({ eventType: "search", query: query.trim() }); }}><label><span className="sr-only"><InterfaceText source="Search cultural content" /></span><input type="search" placeholder="Find a story, word or tradition" value={query} maxLength={200} onChange={event => setQuery(event.target.value)} /></label><button type="submit" aria-label="Search cultural content"><Search size={18} aria-hidden="true" /></button></form>
      <details className="feed-explore-menu"><summary><InterfaceText source="Explore" /></summary><div><nav aria-label="Discover content areas">{[{ code: "all", name: "Discover" }, ...categories].map(item => <button key={item.code} type="button" aria-pressed={category === item.code} onClick={event => { setCategory(item.code); setError(""); event.currentTarget.closest("details")?.removeAttribute("open"); }}><InterfaceText source={item.name} /></button>)}</nav><nav aria-label="More heritage experiences"><h2><InterfaceText source="Follow your curiosity" /></h2>{[["/explore", "All collections"], ["/learn", "Learn the language"], ["/places", "Explore cultural places"], ["/contribute", "Share your heritage"]].map(([href, label]) => <Link key={href} href={href}><NavigationIcon href={href} size={18} /><InterfaceText source={label} /></Link>)}</nav></div></details>
      <Link href={category === "all" ? "/contribute" : contributionHref(category)} className="feed-contribute"><InterfaceText source="Contribute" /></Link>
    </div>
    <BottomMediaControls className="media-dock-five"><FeedMediaFilters value={filter} onChange={setFilter} /></BottomMediaControls>
    <div className="discovery-layout"><SocialFeed className="discovery-stream">
      {error && <div role="alert" className="discovery-message"><p>{error}</p><button type="button" onClick={() => library ? void loadMore() : setRetry(value => value + 1)}><InterfaceText source="Try again" /></button></div>}
      {saveError && <p role="alert" className="discovery-message">{saveError}</p>}
      {loading && <div role="status" aria-label="Loading cultural content" className="discovery-loading"><div className="discovery-placeholder" /><p><InterfaceText source="Bringing the collection to you..." /></p></div>}
      {!loading && library?.items.length === 0 && <div className="discovery-message"><BookOpen size={28} aria-hidden="true" /><h2><InterfaceText source="There is more to discover." /></h2><p><InterfaceText source="No published items match this selection yet. Try another content area or clear your search." /></p><button type="button" onClick={() => { setCategory("all"); setQuery(""); setSearch(""); }}><InterfaceText source="Show all heritage" /></button><Link href="/explore" className="discovery-browse"><InterfaceText source="Browse the library" /></Link></div>}
      {!loading && library && visibleItems.length === 0 && library.items.length > 0 && <p role="status" className="feed-end-note"><InterfaceText source="No matching entries" /></p>}
      {visibleItems.map(item => <DiscoveryCard key={item.id} media={filter === "all" ? item.media : item.media.filter(asset => filter === "transcript" ? ["document", "transcript"].includes(asset.type) : asset.type === filter)} item={item} downloadOrigin={downloadOrigin} saved={saved.includes(item.id)} saveBusy={saveBusy === item.id} Link={Link} onOpen={() => { emitActivity({ eventType: "view", recordId: item.id }); setSelected(item); }} onSave={() => void save(item)} joinPrompt={joinItem === item.id ? <div className="discovery-save-prompt"><p><InterfaceText source="Keep your favourites with a free account." /></p>{join}</div> : undefined} />)}
      {(library?.continuation?.records || library?.continuation?.dictionary) ? <AutoLoadMore onLoad={loadMore} busy={loading || moreBusy} error={!!error} /> : library && !loading && <p className="feed-end-note"><InterfaceText source="You have reached the end of this collection." /></p>}
    </SocialFeed></div>
    {selected && <LibraryItemDialog key={`${languageCode}:${selected.id}`} item={selected} items={library?.items} onRelated={setSelected} languageCode={languageCode} viewLanguageCode={languageCode} downloadOrigin={downloadOrigin} onClose={() => setSelected(null)} onSave={signedIn ? item => void save(item) : undefined} />}
  </section>;
}

export function DiscoveryCard({ item, media, onOpen, onSave, saved, saveBusy, Link, joinPrompt, downloadOrigin }: { item: ContentItem; media?: MediaItem[]; onOpen: () => void; onSave: () => void; saved: boolean; saveBusy: boolean; Link: AppLink; joinPrompt?: React.ReactNode; downloadOrigin?: string }) {
  return <SocialFeedCard item={item} media={media} onOpen={onOpen} onSave={onSave} saved={saved} saveBusy={saveBusy} Link={Link} categoryHref={moduleHref(item.moduleCode || "")} joinPrompt={joinPrompt} downloadOrigin={downloadOrigin} className="discovery-card" />;
}
