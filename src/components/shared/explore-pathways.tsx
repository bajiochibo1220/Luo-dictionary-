"use client";
import { useEffect, useRef, useState } from "react";
import { AUDIENCE_PATHWAYS, MODULE_DIRECTORY } from "@/lib/audience-pathways";
import { PRD_SUBJECTS } from "@/lib/prd-content-catalog";
import { InterfaceOption, InterfaceText } from "./interface-language";
import { PaginatedLibrary } from "./paginated-library";
import type { AppLink, ModuleContentProps } from "./module-content-view";
import type { FeatureRequest } from "./learning-hub";
import { Compass, ArrowUpRight } from "lucide-react";
import { NavigationIcon } from "./navigation-icon";

export function ExplorePathways({ Link, request, languageCode, initialSubject = "" }: { Link: AppLink; request: FeatureRequest; languageCode: string; initialSubject?: string }) {
  const [audience, setAudience] = useState("");
  const subject = PRD_SUBJECTS.find(value => value === initialSubject) || "";
  const [content, setContent] = useState<ModuleContentProps | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const resultsRef = useRef<HTMLElement>(null);
  const pathway = AUDIENCE_PATHWAYS.find(item => item.id === audience);
  useEffect(() => {
    let active = true; setContent(null); setError("");
    if (subject) void request(`/api/v1/library?${new URLSearchParams({ language: languageCode, module: "subjects", subject })}`).then(result => { if (active) setContent(result); }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Collection unavailable. Please retry."); });
    return () => { active = false; };
  }, [subject, languageCode, request, retry]);
  useEffect(() => {
    if (content?.subject === subject && subject) resultsRef.current?.scrollIntoView({ block: "start" });
  }, [content, subject]);
  const card = "explore-module-card";
  return <section className="mx-auto max-w-5xl space-y-7 p-4 pb-24 text-stone-900 md:p-8" aria-labelledby="explore-title">
    <header className="dashboard-hero space-y-3"><span className="hero-eyebrow"><Compass size={16} aria-hidden="true" /><InterfaceText source="Find your connection" /></span><h1 id="explore-title" className="font-serif text-3xl md:text-4xl"><InterfaceText source="Start here" /></h1><p className="max-w-2xl text-sm leading-relaxed text-teal-50"><InterfaceText source="Explore language and heritage in a way that suits you. Public collections are open to browse; some tools and saved progress require sign-in." /></p></header>
    <div className="space-y-4 rounded-2xl border border-stone-300 bg-white/90 p-5">
      <label className="block space-y-2"><span className="font-semibold"><InterfaceText source="Find your starting point" /></span><select value={audience} onChange={event => setAudience(event.target.value)} className="min-h-12 w-full rounded-lg border border-stone-500 bg-white p-3"><InterfaceOption value="">Choose an audience</InterfaceOption>{AUDIENCE_PATHWAYS.map(item => <InterfaceOption key={item.id} value={item.id}>{item.label}</InterfaceOption>)}</select></label>
      {pathway && <div aria-live="polite" className="space-y-3"><h2 className="font-serif text-2xl"><InterfaceText source={pathway.label} /></h2><p><InterfaceText source={pathway.description} /></p><div className="grid gap-3 sm:grid-cols-3">{pathway.links.map(([label, href]) => <Link key={href} href={href} className={card}><InterfaceText source={label} /></Link>)}</div></div>}
    </div>
    <section aria-labelledby="modules-title" className="space-y-3"><h2 id="modules-title" className="font-serif text-2xl"><InterfaceText source="Explore all modules" /></h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{MODULE_DIRECTORY.map(([label, href], index) => <Link key={href} href={href} className={card}><span className={`feature-icon tone-${["teal", "gold", "violet", "rose", "blue"][index % 5]}`}><NavigationIcon href={href} /></span><span className="min-w-0 flex-1"><InterfaceText source={label} /></span><ArrowUpRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" /></Link>)}</div></section>
    <section id="subjects" aria-labelledby="subjects-title" className="space-y-3"><h2 id="subjects-title" className="font-serif text-2xl"><InterfaceText source="Cultural subjects" /></h2><p><InterfaceText source="Collections grow as authorized material is contributed and reviewed. A listed subject may not yet contain published records." /></p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{PRD_SUBJECTS.map(value => <Link key={value} href={`/explore?subject=${encodeURIComponent(value)}`} className={`${card} ${subject === value ? "ring-2 ring-amber-800" : ""}`}><InterfaceText source={value} /></Link>)}</div></section>
    {subject && <section ref={resultsRef} aria-label={subject} className="min-w-0 space-y-3"><h2 className="font-serif text-2xl"><InterfaceText source={subject} /></h2>{error ? <div role="alert"><p>{error}</p><button className="min-h-11 underline" onClick={() => setRetry(value => value + 1)}><InterfaceText source="Retry" /></button></div> : content ? <PaginatedLibrary key={`${languageCode}:${subject}`} initial={content} request={request} Link={Link} /> : <p role="status"><InterfaceText source="Loading..." /></p>}</section>}
  </section>;
}
