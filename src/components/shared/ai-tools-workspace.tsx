"use client";
import { useEffect, useRef, useState } from "react";
import type { FeatureRequest } from "./learning-hub";
import { InterfaceOption, InterfaceText } from "./interface-language";
import { AccountRequired } from "./account-required";
type Sources = { capabilities?: Partial<Record<keyof typeof labels, boolean>>; assets: {id: string; type: string; title: string}[]; stories: {id: string; title: string}[] };
const labels = { ocr: "Read text from an image", transcribe: "Transcribe audio", describe: "Describe an image", illustrate: "Illustrate a folktale" };
export function AiToolsWorkspace({ request, languageId, signedIn = true, onSignIn }: { request: FeatureRequest; languageId: number; signedIn?: boolean; onSignIn?: () => void }) {
  const [task, setTask] = useState<keyof typeof labels>("ocr"); const [sourceId, setSourceId] = useState(""); const [consent, setConsent] = useState(false);
  const [sources, setSources] = useState<Sources>({ assets: [], stories: [] }); const [result, setResult] = useState<{ text: string; image?: string } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  const epoch = useRef(0);
  const inFlight = useRef(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const generation = epoch; const current = ++generation.current; inFlight.current = false; setResult(null); setSources({assets:[],stories:[]}); setSourceId(""); setConsent(false); setBusy(false); setError(""); setLoading(signedIn); if (signedIn) void request(`/api/v1/ai-tools?languageId=${languageId}`).then(data => { if (current === generation.current) setSources(data); }).catch(reason => { if (current === generation.current) setError(reason instanceof Error ? reason.message : "Unable to load reviewed sources."); }).finally(() => { if (current === generation.current) setLoading(false); }); return () => { generation.current++; }; }, [languageId, request, retry, signedIn]);
  const choices = task === "illustrate" ? sources.stories : sources.assets.filter(asset => asset.type === (task === "transcribe" ? "audio" : "image"));
  async function run() {
    if (!signedIn || inFlight.current || loading || !sourceId || !consent || sources.capabilities?.[task] === false) return;
    inFlight.current = true;
    const current = epoch.current; setBusy(true); setError(""); setResult(null);
    try { const data = await request("/api/v1/ai-tools", { method: "POST", body: JSON.stringify({ task, consent, ...(task === "illustrate" ? { recordId: sourceId } : { assetId: sourceId }) }) }); if (current === epoch.current) setResult(data); }
    catch(reason) { if (current === epoch.current) setError(reason instanceof Error ? reason.message : "Processing could not complete. Please retry."); }
    finally { if (current === epoch.current) { inFlight.current = false; setBusy(false); } }
  }
  function downloadText() { if (!result?.text) return; const address = URL.createObjectURL(new Blob([result.text], { type: "text/plain;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = address; anchor.download = `ai-${task}-draft.txt`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(address), 1000); }
  if (!signedIn) return <AccountRequired onSignIn={onSignIn} message="Sign in to create AI media drafts from approved public sources." />;
  return <section className="mx-auto max-w-3xl space-y-5 p-5 text-stone-900 md:p-8"><header><h1 className="font-serif text-3xl"><InterfaceText source="AI media tools" /></h1><p className="mt-2"><InterfaceText source="Create reviewable drafts from approved public sources. Results are not automatically published or treated as verified cultural knowledge." /></p></header>
    <p className="text-sm text-stone-600"><InterfaceText source="Image reading and descriptions use the selected AI service. Audio transcription and image generation are currently unavailable." /></p>
    <form className="space-y-4 rounded-xl bg-white p-5" onSubmit={event => { event.preventDefault(); void run(); }}><label className="block"><InterfaceText source="Tool" /><select className="mt-2 min-h-11 w-full rounded-lg border border-stone-400 p-3" value={task} disabled={busy} onChange={event => { setTask(event.target.value as typeof task); setSourceId(""); setResult(null); setConsent(false); setError(""); }}>{Object.entries(labels).map(([value,label]) => <InterfaceOption value={value} key={value} disabled={sources.capabilities?.[value as keyof typeof labels] === false}>{label}</InterfaceOption>)}</select></label>
      <label className="block"><InterfaceText source="Reviewed source" /><select className="mt-2 min-h-11 w-full rounded-lg border border-stone-400 p-3" required disabled={busy || loading} value={sourceId} onChange={event => { setSourceId(event.target.value); setResult(null); setConsent(false); setError(""); }}><InterfaceOption value="">Choose a source</InterfaceOption>{choices.map(item => <InterfaceOption key={item.id} value={item.id}>{item.title}</InterfaceOption>)}</select></label>{loading && <p role="status"><InterfaceText source="Loading approved sources..." /></p>}{!loading && !error && !choices.length && <p><InterfaceText source="No suitable approved sources are available yet. Add and review authentic material before using this tool." /></p>}
      <label className="flex gap-3"><input type="checkbox" required disabled={busy || loading} checked={consent} onChange={event => setConsent(event.target.checked)} /><InterfaceText source="Allow the configured AI service to process this approved source and create a draft." /></label><button className="min-h-11 rounded-full bg-amber-900 px-5 py-2 text-white disabled:opacity-50" disabled={busy || loading || !sourceId || !consent || sources.capabilities?.[task] === false}><InterfaceText source={busy ? "Processing..." : "Create AI draft"} /></button>
    </form>{error && <div role="alert" className="rounded-lg bg-red-50 p-4"><p>{error}</p><button className="min-h-11 underline" onClick={() => setRetry(value => value+1)}><InterfaceText source="Reload sources" /></button></div>}
    {result && <article className="space-y-3 rounded-xl bg-white p-5"><h2 className="font-semibold"><InterfaceText source="AI draft — fluent and cultural review required" /></h2>{result.text && <><p className="whitespace-pre-wrap">{result.text}</p><button type="button" className="min-h-11 underline" onClick={downloadText}><InterfaceText source="Download draft text" /></button></>}{result.image && <figure><img src={result.image} alt="AI-generated story illustration, pending review" className="max-h-96 max-w-full object-contain" /><figcaption><InterfaceText source="AI-generated educational illustration. Not documentary evidence." /></figcaption><a className="inline-block min-h-11 py-2 underline" href={result.image} download="ai-story-illustration.png"><InterfaceText source="Download illustration" /></a></figure>}</article>}
  </section>;
}
