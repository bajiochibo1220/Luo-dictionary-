"use client";

import { createContext, forwardRef, useContext, useEffect, useMemo, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { defaultInterfaceCatalog, mergeInterfaceCatalog, normalizeInterfaceText, translateInterfaceText, type InterfaceCatalog } from "@/lib/interface-copy";

type Language = { code: string; nativeName: string };
type InterfaceState = { community: string; local: boolean; lockedEnglish?: boolean; languages: Language[]; select: (community: string, local: boolean) => void; t: (source: string, local?: boolean) => string };
const Identity = { community: "luo", local: false, languages: [{ code: "luo", nativeName: "Dholuo" }], select: () => {}, t: (source: string) => source };
const InterfaceContext = createContext<InterfaceState>(Identity);
export const useInterfaceLanguage = () => useContext(InterfaceContext);

export function InterfaceLanguageProvider({ children, transport = fetch, forceEnglish = false }: { children: ReactNode; transport?: typeof fetch; forceEnglish?: boolean }) {
  const [selection, setSelection] = useState({ community: "luo", local: true });
  const [languages, setLanguages] = useState<Language[]>(Identity.languages);
  const [catalog, setCatalog] = useState<InterfaceCatalog>(defaultInterfaceCatalog("luo"));
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem("heritage-interface") || "null"); if (value && /^[a-z]{2,8}(?:-[a-z0-9]+)?$/.test(value.community)) setSelection({ community: value.community, local: true }); } catch {}
    let active = true;
    transport("/api/languages").then(response => response.json()).then(result => { if (active && Array.isArray(result.data)) setLanguages(result.data.filter((language: Language) => language.code !== "eng")); }).catch(() => {});
    return () => { active = false; };
  }, [transport]);
  useEffect(() => {
    let active = true;
    setCatalog(defaultInterfaceCatalog(selection.community));
    const refresh = () => { void transport(`/api/interface-copy?community=${encodeURIComponent(selection.community)}`, { cache: "no-store" }).then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(result => { if (active && result.data?.catalog && typeof result.data.catalog === "object") setCatalog(mergeInterfaceCatalog(selection.community, JSON.stringify(result.data.catalog))); }).catch(() => {}); };
    refresh(); window.addEventListener("interface-copy-updated", refresh);
    const refreshVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    const timer = window.setInterval(refreshVisible, 60000);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("interface-copy-updated", refresh); window.removeEventListener("focus", refreshVisible); document.removeEventListener("visibilitychange", refreshVisible); };
  }, [selection.community, forceEnglish, transport]);
  useEffect(() => { document.documentElement.lang = !forceEnglish && Object.values(catalog).some(entry => entry.local?.trim()) ? selection.community : "en"; }, [catalog, forceEnglish, selection.community]);
  const value = useMemo<InterfaceState>(() => ({ ...selection, local: !forceEnglish, lockedEnglish: forceEnglish, languages, select: (community) => { const next = { community, local: true }; setSelection(next); try { localStorage.setItem("heritage-interface", JSON.stringify(next)); } catch {} }, t: (source, local = !forceEnglish) => translateInterfaceText(catalog, source, forceEnglish ? false : local) }), [selection, languages, catalog, forceEnglish]);
  return <InterfaceContext.Provider value={value}>{children}</InterfaceContext.Provider>;
}

export function InterfaceText({ source }: { source: string }) {
  const { t, local, community } = useInterfaceLanguage();
  const translated = t(source);
  const english = t(source, false);
  if (!local) return <>{english}</>;
  if (translated.trim() === english.trim()) return <span lang="en">{english}</span>;
  const leading = source.match(/^\s+/)?.[0] || "";
  const trailing = source.match(/\s+$/)?.[0] || "";
  return <>{leading}<span className="interface-text-pair" translate="no"><span lang={community}>{translated.trim()}</span><span lang="en" className="interface-english" contentEditable={false}>{english.trim()}</span></span>{trailing}</>;
}
export function InterfaceLanguageSelector() {
  const { community, lockedEnglish, languages, select } = useInterfaceLanguage();
  if (lockedEnglish) return <span className="px-2 text-xs font-medium">English</span>;
  return <label className="inline-flex min-w-0 items-center"><span className="sr-only"><InterfaceText source="Community language" /></span><select aria-label="Community language" value={community} onChange={event => select(event.target.value, true)} className="min-h-11 max-w-36 rounded-lg border border-stone-400 bg-white px-2 text-sm text-stone-900">
    {languages.map(language => <option key={language.code} value={language.code}>{language.nativeName}</option>)}
  </select></label>;
}

// Only authored interface strings are passed to these controls. Input values,
// submitted data, culture records and source-language transcripts stay intact.
function useTranslatedAttributes<P extends { placeholder?: string; title?: string; "aria-label"?: string; alt?: string }>(props: P): P {
  const { t } = useInterfaceLanguage();
  const paired = (source: string) => { const local = t(source), english = t(source, false); return local.trim() === english.trim() ? english : `${local} (${english})`; };
  return { ...props, ...(props.placeholder ? { placeholder: paired(props.placeholder) } : {}), ...(props.title ? { title: paired(props.title) } : {}), ...(props["aria-label"] ? { "aria-label": paired(props["aria-label"]) } : {}), ...(props.alt ? { alt: paired(props.alt) } : {}) };
}
export const InterfaceInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>((props, ref) => <input {...useTranslatedAttributes(props)} ref={ref} />);
InterfaceInput.displayName = "InterfaceInput";
export const InterfaceTextarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>((props, ref) => <textarea {...useTranslatedAttributes(props)} ref={ref} />);
InterfaceTextarea.displayName = "InterfaceTextarea";
export const InterfaceSelect = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select">>((props, ref) => <select {...useTranslatedAttributes(props)} ref={ref} />);
InterfaceSelect.displayName = "InterfaceSelect";
export const InterfaceButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>((props, ref) => <button {...useTranslatedAttributes(props)} ref={ref} />);
InterfaceButton.displayName = "InterfaceButton";
export const InterfaceOption = forwardRef<HTMLOptionElement, ComponentPropsWithoutRef<"option">>(({ children, ...props }, ref) => { const { t } = useInterfaceLanguage(); const english = typeof children === "string" ? t(children, false) : children; const local = typeof children === "string" ? t(children) : children; return <option {...props} ref={ref}>{local !== english ? `${local} · ${english}` : english}</option>; });
InterfaceOption.displayName = "InterfaceOption";

export function EnglishInterface({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const parent = useInterfaceLanguage();
  const value = useMemo(() => ({ ...parent, local: false, lockedEnglish: true, t: (source: string) => parent.t(source, false) }), [parent]);
  return <InterfaceContext.Provider value={enabled ? value : parent}><div lang={enabled ? "en" : undefined} className="contents">{children}</div></InterfaceContext.Provider>;
}

export { normalizeInterfaceText };
