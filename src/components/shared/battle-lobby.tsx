"use client";
import { InterfaceInput } from "@/components/shared/interface-language";

import { useCallback, useEffect, useRef, useState } from "react";
import { InterfaceText } from "./interface-language";
import type { FeatureRequest } from "./learning-hub";
type Room = { id: string; code: string; title: string; host: boolean; status: string; submitted: boolean; deadline: string | null; players: {id: string; alias: string; score: number | null; submitted: boolean}[]; questions: {id: string; prompt: string; choices: string[]; answer?: number; explanation?: string}[] };
const button = "min-h-11 rounded-lg border border-stone-400 bg-white px-4 py-2 disabled:opacity-50";
export function BattleLobby({ request, resourceId }: { request: FeatureRequest; resourceId: string }) {
  const [room, setRoom] = useState<Room | null>(null); const [code, setCode] = useState("");
  const [answers, setAnswers] = useState<Record<string,number>>({}); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const epoch = useRef(0);
  useEffect(() => { const current = epoch; return () => { current.current++; }; }, []);
  const refresh = useCallback(async () => {
    if (!room?.id || document.visibilityState !== "visible") return;
    const expected = epoch.current;
    try { const data = await request(`/api/v1/games?room=${encodeURIComponent(room.id)}`); if (expected === epoch.current) { setRoom(data); setError(""); } }
    catch(reason) { if (expected === epoch.current) setError(reason instanceof Error ? reason.message : "Unable to refresh the challenge."); }
  }, [request, room?.id]);
  useEffect(() => { if (!room?.status || room.status === "finished") return; const timer = window.setInterval(() => void refresh(), 2500); return () => window.clearInterval(timer); }, [refresh, room?.status]);
  async function act(data: unknown) {
    const expected = epoch.current; setBusy(true); setError("");
    try { const result = await request("/api/v1/games", { method: "POST", body: JSON.stringify(data) }); if (expected === epoch.current) setRoom(result); }
    catch (reason) { if (expected === epoch.current) setError(reason instanceof Error ? reason.message : "Unable to continue the challenge."); }
    finally { if (expected === epoch.current) setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border border-amber-400 bg-amber-50 p-4"><h3 className="font-semibold"><InterfaceText source="Play with others" /></h3>
    {!room ? <div className="space-y-3"><button type="button" className={button} disabled={busy} onClick={() => void act({ action: "create", resourceId })}><InterfaceText source="Create a challenge" /></button><form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void act({ action: "join", resourceId, code }); }}><label><span className="sr-only"><InterfaceText source="Invitation code" /></span><InterfaceInput className="min-h-11 rounded-lg border border-stone-400 p-3 uppercase" placeholder="Invitation code" minLength={10} maxLength={10} pattern="[a-fA-F0-9]{10}" value={code} onChange={event => setCode(event.target.value)} required /></label><button className={button} disabled={busy}><InterfaceText source="Join challenge" /></button></form><p className="text-sm"><InterfaceText source="Up to eight signed-in players. Share the invitation code privately; public names are not displayed." /></p></div> : <>
      <p>{room.title} · <strong className="break-all font-mono">{room.code}</strong></p><p><InterfaceText source={room.status === "waiting" ? "Waiting for players" : room.status === "finished" ? "Challenge results" : "Challenge in progress"} /></p>
      <ul className="space-y-1">{room.players.map(player => <li key={player.id}>{player.alias} · {room.status === "finished" ? `${player.score}%` : player.submitted ? "✓" : "…"}</li>)}</ul>
      {room.host && room.status === "waiting" && <button type="button" className={button} disabled={busy || room.players.length < 2} onClick={() => void act({ action: "start", roomId: room.id })}><InterfaceText source="Start challenge" /></button>}
      {room.deadline && <p><InterfaceText source="Answering closes at: " />{new Date(room.deadline).toLocaleTimeString()}</p>}
      {room.status === "active" && !room.submitted && <form className="space-y-4" onSubmit={event => { event.preventDefault(); void act({ action: "submit", roomId: room.id, answers }); }}>{room.questions.map(question => <fieldset key={question.id}><legend className="font-semibold">{question.prompt}</legend>{question.choices.map((choice,index) => <label key={index} className="flex min-h-11 items-center gap-2"><input type="radio" name={`battle:${question.id}`} required checked={answers[question.id] === index} onChange={() => setAnswers(previous => ({ ...previous, [question.id]: index }))} />{choice}</label>)}</fieldset>)}<button className={button} disabled={busy}><InterfaceText source="Submit challenge answers" /></button></form>}
      {room.status === "finished" && <div>{room.questions.map(question => <p key={question.id}>{question.prompt}: {question.choices[question.answer ?? -1]} {question.explanation}</p>)}</div>}
      <div className="flex flex-wrap gap-3"><button type="button" className={button} disabled={busy} onClick={() => void refresh()}><InterfaceText source="Refresh" /></button><button type="button" className={button} disabled={busy} onClick={() => { epoch.current++; setRoom(null); setAnswers({}); setError(""); }}><InterfaceText source="Close challenge" /></button></div>
    </>}{error && <p role="alert">{error}</p>}
  </section>;
}
