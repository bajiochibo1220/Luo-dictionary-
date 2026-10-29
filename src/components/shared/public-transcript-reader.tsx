"use client";
import { useEffect, useRef, useState } from "react";
import { InterfaceOption, InterfaceText } from "./interface-language";
import { PublicReadingSchema, type PublicReading } from "@/lib/reading-contract";
import { requestSignal } from "@/lib/api-request-timeout";

export function PublicTranscriptReader({ recordId, languageCode, origin = "", initial, defaultOpen = true }: { recordId: string; languageCode: string; origin?: string; initial?: PublicReading | null; defaultOpen?: boolean }) {
  const container = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(!!initial);
  const [reading, setReading] = useState<PublicReading | null>(initial || null);
  const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(defaultOpen);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  useEffect(() => setSelectedLanguage(null), [languageCode]);
  useEffect(() => {
    if (visible) return;
    const target = container.current;
    if (!target || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: "150px" });
    observer.observe(target); return () => observer.disconnect();
  }, [visible]);
  useEffect(() => {
    if (initial) { setReading(initial); return; }
    if (!visible || !open) return;
    const controller = new AbortController(); setReading(null); setError("");
    const endpoint = `/api/v1/reading?id=${encodeURIComponent(recordId)}`;
    void fetch(origin ? new URL(endpoint, origin).href : endpoint, { credentials: "omit", cache: "no-store", signal: requestSignal(controller.signal, 40000) }).then(async response => {
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error(result.error || "The transcript could not load. Please try again.");
      const data = PublicReadingSchema.parse(result.data);
      if (!controller.signal.aborted) setReading(data);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "The transcript could not load. Please try again."); });
    return () => controller.abort();
  }, [visible, recordId, origin, retry, initial, open]);
  const transcriptLanguage = selectedLanguage || (languageCode === "eng" ? "eng" : reading?.sourceLanguageCode || languageCode);
  const english = transcriptLanguage === "eng";
  const segments = reading?.transcripts.filter(segment => segment.languageCode === transcriptLanguage) || [];
  const bodyText = english ? reading?.englishText : transcriptLanguage === reading?.sourceLanguageCode ? reading.sourceText : "";
  const languageName = english ? "English" : transcriptLanguage === reading?.sourceLanguageCode ? reading.sourceLanguageName : transcriptLanguage;
  const downloadText = reading ? [reading.title, languageName, bodyText, ...segments.map(segment => `${segment.role ? segment.role + ": " : ""}${segment.text}`)].filter(Boolean).join("\n\n") : "";
  return <section ref={container} className={`public-transcript-reader ${open ? "is-open" : ""}`} aria-label="Full transcript">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-serif text-xl"><InterfaceText source="Full transcript and conversation" /></h4><button type="button" aria-expanded={open} className="min-h-11 text-sm font-semibold underline" onClick={() => { setVisible(true); setOpen(value => !value); }}><InterfaceText source={open ? "Hide transcript" : "Read full transcript"} /></button></div>
    {open && <>
      {!visible && <button type="button" className="min-h-11 underline" onClick={() => setVisible(true)}><InterfaceText source="Load full transcript" /></button>}
      {visible && !reading && !error && <p role="status"><InterfaceText source="Loading the complete conversation..." /></p>}
      {error && <div role="alert"><p>{error}</p><button type="button" className="min-h-11 underline" onClick={() => setRetry(value => value + 1)}><InterfaceText source="Try again" /></button></div>}
      {reading && <>
        <label className="block text-sm font-semibold"><InterfaceText source="Transcript language" /><select value={transcriptLanguage} onChange={event => setSelectedLanguage(event.target.value)} className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3">{[...new Set([reading.sourceLanguageCode, "eng", ...reading.transcripts.map(segment => segment.languageCode)])].map(code => <InterfaceOption key={code} value={code}>{code === "eng" ? "English" : code === reading.sourceLanguageCode ? reading.sourceLanguageName : code}</InterfaceOption>)}</select></label>
        <p className="text-sm text-stone-600">{languageName}{segments.length > 0 ? ` · ${segments.length} ` : ""}{segments.length > 0 && <InterfaceText source="transcript parts, in conversation order" />}</p>
        <div className="public-transcript-text" role="region" tabIndex={0} aria-label="Transcript text">
        {bodyText && <p className="whitespace-pre-wrap break-words text-sm leading-7">{bodyText}</p>}
        {segments.map(segment => <div key={segment.id} className="min-w-0 space-y-1 border-t border-teal-900/10 pt-3">{segment.role && <p className="text-xs font-semibold text-teal-900"><InterfaceText source={segment.role} /></p>}<p className="whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">{segment.text}</p></div>)}
        {!segments.length && !bodyText && <p className="text-sm"><InterfaceText source={english ? "An English transcript has not been uploaded for this item. The original conversation is available in its source language." : "No public transcript text is available for this item yet."} /></p>}
        </div>
        {english && !segments.length && !bodyText && reading.sourceLanguageCode !== "eng" && <button type="button" className="min-h-11 font-semibold underline" onClick={() => setSelectedLanguage(reading.sourceLanguageCode)}><InterfaceText source="Read the original conversation" /></button>}
        {(segments.length > 0 || bodyText) && <a className="inline-flex min-h-11 items-center rounded-lg border border-teal-900/30 px-3 text-sm font-semibold" href={`data:text/plain;charset=utf-8,${encodeURIComponent(downloadText)}`} download={`transcript-${recordId}-${transcriptLanguage}.txt`}><InterfaceText source="Download full transcript text" /></a>}
      </>}
    </>}
  </section>;
}
