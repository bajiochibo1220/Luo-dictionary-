"use client";
import { useEffect, useRef, useState } from "react";

import { TUTOR_MODES, type TutorResponse } from "@/lib/tutor-contract";
import type { FeatureRequest } from "./learning-hub";
import { InterfaceOption, InterfaceText } from "./interface-language";
import { SpeechPractice } from "./speech-practice";
const field = "block min-h-11 w-full rounded-lg border border-stone-400 bg-white p-3";
const button = "min-h-11 rounded-full bg-amber-900 px-5 py-2 font-semibold text-white disabled:opacity-50";
const labels = { conversation: "Guided conversation", translation: "Translate", grammar: "Grammar practice", writing: "Writing assistant", story: "Create a practice story", vocabulary: "Vocabulary quiz" };
export function TutorWorkspace({ request, languageId, languageCode = "luo" }: { request: FeatureRequest; languageId: number; languageCode?: string }) {
  const [mode, setMode] = useState<typeof TUTOR_MODES[number]>("conversation");
  const [text, setText] = useState(""); const [level, setLevel] = useState("beginner");
  const [english, setEnglish] = useState(true); const [consent, setConsent] = useState(false);
  const [response, setResponse] = useState<TutorResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(() => { const current = generation; generation.current++; setResponse(null); setHistory([]); setAnswers({}); setError(""); setBusy(false); return () => { current.current++; }; }, [languageId]);
  async function submit(grade = false) {
    const expected = generation.current; setBusy(true); setError("");
    try {
      const data = grade ? { mode: "grade", attemptId: response?.attemptId, answers, consent } : mode === "vocabulary" ? { mode, languageId, consent } : { mode, languageId, text, english, level, consent, history: history.slice(-6) };
      const result: TutorResponse = await request("/api/v1/tutor", { method: "POST", body: JSON.stringify(data) });
      if (expected !== generation.current) return;
      setResponse(previous => grade ? { ...previous, ...result } : result);
      if (!grade && result.text) setHistory(previous => [...previous, { role: "user", content: text.slice(0, 3000) }, { role: "assistant", content: result.text!.slice(0, 3000) }].slice(-6) as typeof history);
    } catch (reason) { if (expected === generation.current) setError(reason instanceof Error ? reason.message : "Practice could not complete. Please retry."); }
    finally { if (expected === generation.current) setBusy(false); }
  }
  return <section className="mx-auto max-w-3xl space-y-5 p-5 text-stone-900 md:p-8">
    <header><h1 className="font-serif text-3xl"><InterfaceText source="AI language tutor" /></h1><p className="mt-2"><InterfaceText source="Practise at your own pace. Generated suggestions are learning aids and need fluent-speaker review." /></p></header>
    <form className="space-y-4 rounded-xl bg-white/95 p-5" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label className="block"><InterfaceText source="Practice mode" /><select className={field} value={mode} disabled={busy} onChange={event => { generation.current++; setMode(event.target.value as typeof mode); setResponse(null); setAnswers({}); setHistory([]); }}>{TUTOR_MODES.map(value => <InterfaceOption key={value} value={value}>{labels[value]}</InterfaceOption>)}</select></label>
      {mode !== "vocabulary" && <><div className="grid gap-3 sm:grid-cols-2"><label><InterfaceText source="Level" /><select className={field} value={level} onChange={event => setLevel(event.target.value)}>{["beginner", "intermediate", "advanced"].map(value => <InterfaceOption key={value}>{value}</InterfaceOption>)}</select></label><label><InterfaceText source="Explanation language" /><select className={field} value={english ? "english" : "local"} onChange={event => setEnglish(event.target.value === "english")}><InterfaceOption value="english">English</InterfaceOption><InterfaceOption value="local">Community language</InterfaceOption></select></label></div><label className="block"><InterfaceText source="Your practice text or question" /><textarea className={field} rows={4} value={text} onChange={event => setText(event.target.value)} minLength={2} maxLength={4000} required /></label></>}
      <label className="flex gap-3"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span className="text-sm"><InterfaceText source="I allow my practice text to be processed by the configured AI service. I will not include private, restricted or sacred material." /></span></label>
      <div className="flex flex-wrap gap-3"><button className={button} disabled={busy || !consent}><InterfaceText source={busy ? "Working..." : mode === "vocabulary" ? "Start a vocabulary quiz" : "Practise with tutor"} /></button><button className="min-h-11 px-3 underline" type="button" disabled={busy} onClick={() => { generation.current++; setHistory([]); setResponse(null); setAnswers({}); setText(""); }}><InterfaceText source="Clear practice" /></button></div>
    </form>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-900">{error}</p>}
    {response?.text && <article className="space-y-3 rounded-xl bg-white p-5"><h2 className="font-semibold"><InterfaceText source="Tutor feedback" /></h2><p className="whitespace-pre-wrap">{response.text}</p>{!!response.sources?.length && <div><h3 className="font-semibold"><InterfaceText source="Reviewed reference material" /></h3><ul>{response.sources.map(source => <li key={source.id}>{source.title}</li>)}</ul></div>}</article>}
    {response?.questions && <form className="space-y-4 rounded-xl bg-white p-5" onSubmit={event => { event.preventDefault(); void submit(true); }}>{response.questions.map(question => <fieldset key={question.id} className="space-y-2"><legend className="font-semibold">{question.prompt}</legend>{question.choices.map((choice, index) => <label key={index} className="flex min-h-11 items-center gap-3"><input type="radio" name={question.id} required checked={answers[question.id] === index} onChange={() => setAnswers(previous => ({ ...previous, [question.id]: index }))} />{choice}</label>)}{response.results?.find(item => item.id === question.id) && <p>{response.results.find(item => item.id === question.id)?.explanation}</p>}</fieldset>)}<button className={button} disabled={busy || !consent}><InterfaceText source="Check my answers" /></button>{response.score !== undefined && <p role="status"><InterfaceText source="Your score: " />{response.score}%</p>}</form>}
    <SpeechPractice languageCode={languageCode} playbackLanguageCode={response?.text && english ? "eng" : languageCode} text={response?.text || text} onTranscript={value => setText(previous => [previous, value].filter(Boolean).join(" ").slice(0, 4000))} />
  </section>;
}
