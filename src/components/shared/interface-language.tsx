"use client";

import { createContext, forwardRef, useContext, useEffect, useMemo, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { defaultInterfaceCatalog, normalizeInterfaceText, translateInterfaceText, type InterfaceCatalog } from "@/lib/interface-copy";

type Language = { code: string; nativeName: string };
type InterfaceState = { community: string; local: boolean; languages: Language[]; select: (community: string, local: boolean) => void; t: (source: string, local?: boolean) => string };
const Identity = { community: "luo", local: false, languages: [{ code: "luo", nativeName: "Dholuo" }], select: () => {}, t: (source: string) => source };
const InterfaceContext = createContext<InterfaceState>(Identity);
export const useInterfaceLanguage = () => useContext(InterfaceContext);

export function InterfaceLanguageProvider({ children, transport = fetch }: { children: ReactNode; transport?: typeof fetch }) {
  const [selection, setSelection] = useState({ community: "luo", local: false });
  const [languages, setLanguages] = useState<Language[]>(Identity.languages);
  const [catalog, setCatalog] = useState<InterfaceCatalog>(defaultInterfaceCatalog("luo"));
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem("heritage-interface") || "null"); if (value && /^[a-z]{2,8}(?:-[a-z0-9]+)?$/.test(value.community) && typeof value.local === "boolean") setSelection(value); } catch {}
    let active = true;
    transport("/api/languages").then(response => response.json()).then(result => { if (active && Array.isArray(result.data)) setLanguages(result.data.filter((language: Language) => language.code !== "eng")); }).catch(() => {});
    return () => { active = false; };
  }, [transport]);
  useEffect(() => {
    let active = true;
    setCatalog(defaultInterfaceCatalog(selection.community));
    const refresh = () => { void transport(`/api/interface-copy?community=${encodeURIComponent(selection.community)}`).then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(result => { if (active && result.data?.catalog && typeof result.data.catalog === "object") setCatalog(result.data.catalog); }).catch(() => {}); };
    refresh(); window.addEventListener("interface-copy-updated", refresh);
    document.documentElement.lang = selection.local ? selection.community : "en";
    return () => { active = false; window.removeEventListener("interface-copy-updated", refresh); };
  }, [selection.community, selection.local, transport]);
  const value = useMemo<InterfaceState>(() => ({ ...selection, languages, select: (community, local) => { const next = { community, local }; setSelection(next); try { localStorage.setItem("heritage-interface", JSON.stringify(next)); } catch {} }, t: (source, local = selection.local) => translateInterfaceText(catalog, source, local) }), [selection, languages, catalog]);
  return <InterfaceContext.Provider value={value}>{children}</InterfaceContext.Provider>;
}

export function InterfaceText({ source }: { source: string }) { return <>{useInterfaceLanguage().t(source)}</>; }
export function InterfaceLanguageSelector() {
  const { community, local, languages, select } = useInterfaceLanguage();
  return <label className="inline-flex min-w-0 items-center"><span className="sr-only"><InterfaceText source="Interface language" /></span><select aria-label="Interface language" value={`${community}:${local ? "local" : "eng"}`} onChange={event => { const [code, variant] = event.target.value.split(":"); select(code, variant === "local"); }} className="min-h-11 max-w-36 rounded-lg border border-stone-400 bg-white px-2 text-sm text-stone-900">
    {languages.flatMap(language => [<option key={`${language.code}:local`} value={`${language.code}:local`}>{language.nativeName}</option>, <option key={`${language.code}:eng`} value={`${language.code}:eng`}>{languages.length === 1 ? "English" : `${language.nativeName} · English`}</option>])}
  </select></label>;
}

// Only authored interface strings are passed to these controls. Input values,
// submitted data, culture records and source-language transcripts stay intact.
function useTranslatedAttributes<P extends { placeholder?: string; title?: string; "aria-label"?: string; alt?: string }>(props: P): P {
  const { t } = useInterfaceLanguage();
  return { ...props, ...(props.placeholder ? { placeholder: t(props.placeholder) } : {}), ...(props.title ? { title: t(props.title) } : {}), ...(props["aria-label"] ? { "aria-label": t(props["aria-label"]) } : {}), ...(props.alt ? { alt: t(props.alt) } : {}) };
}
export const InterfaceInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>((props, ref) => <input {...useTranslatedAttributes(props)} ref={ref} />);
InterfaceInput.displayName = "InterfaceInput";
export const InterfaceTextarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>((props, ref) => <textarea {...useTranslatedAttributes(props)} ref={ref} />);
InterfaceTextarea.displayName = "InterfaceTextarea";
export const InterfaceSelect = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select">>((props, ref) => <select {...useTranslatedAttributes(props)} ref={ref} />);
InterfaceSelect.displayName = "InterfaceSelect";
export const InterfaceButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>((props, ref) => <button {...useTranslatedAttributes(props)} ref={ref} />);
InterfaceButton.displayName = "InterfaceButton";
export const InterfaceOption = forwardRef<HTMLOptionElement, ComponentPropsWithoutRef<"option">>(({ children, ...props }, ref) => { const { t } = useInterfaceLanguage(); return <option {...props} ref={ref}>{typeof children === "string" ? t(children) : children}</option>; });
InterfaceOption.displayName = "InterfaceOption";

export { normalizeInterfaceText };
