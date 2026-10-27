"use client";
import { InterfaceOption } from "@/components/shared/interface-language";

import { useEffect, useState } from "react";
import type { LearningResourceView } from "@/lib/learning-contract";
import { GAME_LABELS, typedChoice } from "@/lib/game-contract";
import { InterfaceText } from "./interface-language";
const button = "min-h-11 rounded-lg border border-stone-400 bg-white px-4 py-3 text-left disabled:opacity-50";
export function GameBoard({ resource, answers, onAnswer, onReset, origin }: { origin: string; resource: LearningResourceView; answers: Record<string, number>; onAnswer: (id: string, answer: number) => void; onReset: () => void }) {
  const mode = resource.body.gameMode || "quiz";
  const [remaining, setRemaining] = useState(resource.body.timeLimit || 60);
  const [running, setRunning] = useState(false); const [stage, setStage] = useState(0);
  const [flipped, setFlipped] = useState<string[]>([]); const [matched, setMatched] = useState<string[]>([]);
  const [typed, setTyped] = useState<Record<string, string>>({}); const [moves, setMoves] = useState(0);
  useEffect(() => { if (!running || mode !== "vocabulary_race") return; const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [running, mode]);
  useEffect(() => {
    if (flipped.length !== 2) return;
    const [first, second] = flipped.map(value => [value.slice(0,value.lastIndexOf(":")),value.slice(value.lastIndexOf(":")+1)]);
    const equal = first[0] === second[0] && first[1] !== second[1];
    const timer = window.setTimeout(() => { if (equal) { setMatched(previous => [...previous, first[0]]); const question = resource.body.questions.find(q => q.id === first[0]); if (question) onAnswer(question.id, question.answer); } setFlipped([]); }, equal ? 400 : 1000);
    return () => window.clearTimeout(timer);
  }, [flipped, resource.body.questions, onAnswer]);
  const complete = resource.body.questions.every(q => Object.hasOwn(answers, q.id));
  const questions = mode === "treasure_hunt" || mode === "vocabulary_race" ? resource.body.questions.slice(stage, stage + 1) : resource.body.questions;
  function reset() { setRemaining(resource.body.timeLimit || 60); setRunning(false); setStage(0); setFlipped([]); setMatched([]); setTyped({}); setMoves(0); onReset(); }
  return <section className="space-y-4" aria-label="Interactive game">
    <header className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold"><InterfaceText source={GAME_LABELS[mode]} /></h3><button type="button" className={button} onClick={reset}><InterfaceText source="Restart game" /></button></header>
    {mode === "vocabulary_race" && <div className="flex items-center gap-4"><p role="timer"><InterfaceText source="Seconds remaining: " />{remaining}</p>{!running && <button type="button" className={button} onClick={() => setRunning(true)}><InterfaceText source="Start race" /></button>}{remaining === 0 && !complete && <p role="status"><InterfaceText source="Time finished. Restart to try again." /></p>}</div>}
    {mode === "memory" ? <><p><InterfaceText source="Turn two cards to match each phrase with its meaning." /> <InterfaceText source="Moves: " />{moves}</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[...resource.body.questions.map(q => ({ id: `${q.id}:prompt`, pair: q.id, text: q.prompt })), ...[...resource.body.questions].reverse().map(q => ({ id: `${q.id}:meaning`, pair: q.id, text: q.choices[q.answer] }))].map((card, index) => <button type="button" key={card.id} className={button + " min-h-24"} disabled={matched.includes(card.pair) || flipped.includes(card.id) || flipped.length === 2} aria-label={flipped.includes(card.id) || matched.includes(card.pair) ? card.text : `Card ${index + 1}`} onClick={() => { setFlipped(previous => [...previous, card.id]); setMoves(value => value + 1); }}>{flipped.includes(card.id) || matched.includes(card.pair) ? card.text : "?"}</button>)}</div></> : questions.map((question, index) => <fieldset key={question.id} className="space-y-3 rounded-lg border border-stone-300 p-4" disabled={mode === "vocabulary_race" && (!running || remaining === 0)}>
      <legend className="font-semibold">{mode === "treasure_hunt" ? `${stage + 1} / ${resource.body.questions.length}: ` : ""}{question.prompt}</legend>
      {question.imageId && <img src={`${origin.replace(/\/$/, "")}/api/media/${encodeURIComponent(question.imageId)}/file`} alt={question.prompt} className="max-h-72 max-w-full object-contain" loading="lazy" />}
      {mode === "word_puzzle" && <p className="break-words text-xl tracking-wider" aria-label="Puzzle letters">{question.letters}</p>}
      {mode === "word_puzzle" || mode === "story_completion" ? <label className="block"><InterfaceText source={mode === "story_completion" ? "Write the missing ending" : "Solve the word"} /><input className="mt-2 min-h-11 w-full rounded-lg border border-stone-400 p-3" maxLength={500} value={typed[question.id] || ""} onChange={event => { const value = event.target.value; setTyped(previous => ({ ...previous, [question.id]: value })); onAnswer(question.id, typedChoice(question.choices, value)); }} /></label> : mode === "proverbs" ? <label className="block"><InterfaceText source="Match the proverb to its meaning" /><select className="min-h-11 w-full rounded-lg border border-stone-400 p-3" value={answers[question.id] ?? ""} onChange={event => onAnswer(question.id, Number(event.target.value))}><InterfaceOption value="" disabled>—</InterfaceOption>{question.choices.map((choice, choiceIndex) => <InterfaceOption key={choiceIndex} value={choiceIndex}>{choice}</InterfaceOption>)}</select></label> : <div className="grid gap-2 sm:grid-cols-2">{question.choices.map((choice, choiceIndex) => <button type="button" key={choiceIndex} className={button + (answers[question.id] === choiceIndex ? " ring-2 ring-amber-700" : "")} aria-pressed={answers[question.id] === choiceIndex} onClick={() => { onAnswer(question.id, choiceIndex); if ((mode === "treasure_hunt" || mode === "vocabulary_race") && stage < resource.body.questions.length - 1) setStage(value => value + 1); }}>{choice}</button>)}</div>}
    </fieldset>)}
    <p role="status">{Object.keys(answers).length} / {resource.body.questions.length} <InterfaceText source="answered" />{complete && <span> · <InterfaceText source="Ready to check your answers" /></span>}</p>
  </section>;
}
