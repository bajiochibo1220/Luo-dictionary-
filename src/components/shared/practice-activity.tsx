"use client";
import { transcribePractice } from "@/lib/tutor-client";
import { useState } from "react";
import { InterfaceText } from "./interface-language";
import { SpeechPractice } from "./speech-practice";
import type { FeatureRequest } from "./learning-hub";
export function PracticeActivity({ activity, languageId, languageCode, request }: { activity: { type: string; instruction: string }; languageId: number; languageCode: string; request: FeatureRequest; origin?: string }) {
  const [draft, setDraft] = useState(""); const [consent, setConsent] = useState(false);
  const [feedback, setFeedback] = useState(""); const [busy, setBusy] = useState(false);
  async function checkWriting() {
    setBusy(true); setFeedback("");
    try { const result = await request("/api/v1/tutor", { method: "POST", body: JSON.stringify({ mode: "writing", languageId, text: draft, consent, english: true, level: "beginner", history: [] }) }); setFeedback(result.text); }
    catch (reason) { setFeedback(reason instanceof Error ? reason.message : "Feedback is unavailable. Please retry."); }
    finally { setBusy(false); }
  }
  return <fieldset className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4"><legend className="font-semibold"><InterfaceText source={activity.type} /></legend><p>{activity.instruction}</p>
    {activity.type === "writing" && <><label className="block"><InterfaceText source="My writing practice" /><textarea className="mt-2 min-h-28 w-full rounded-lg border border-stone-400 bg-white p-3" value={draft} onChange={event => setDraft(event.target.value)} maxLength={4000} /></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><InterfaceText source="Allow AI processing of this practice text." /></label><button type="button" disabled={busy || !consent || draft.trim().length < 2} onClick={() => void checkWriting()} className="min-h-11 rounded-lg bg-amber-900 px-4 py-2 text-white disabled:opacity-50"><InterfaceText source={busy ? "Working..." : "Get writing feedback"} /></button>{feedback && <p role="status" className="whitespace-pre-wrap">{feedback}</p>}</>}
    {(activity.type === "speaking" || activity.type === "listening") && <SpeechPractice onTranscribeRecording={activity.type === "speaking" ? recording=>transcribePractice(request,languageId,recording) : undefined} languageCode={languageCode} text={activity.instruction} onTranscript={activity.type === "speaking" ? value => setDraft(value) : undefined} />}
    {activity.type === "speaking" && draft && <p><InterfaceText source="Dictated text: " />{draft}</p>}
  </fieldset>;
}
