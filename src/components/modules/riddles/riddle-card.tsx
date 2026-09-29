"use client";

import Link from "next/link";
import { useState } from "react";
import { EnglishVersionLink } from "@/components/layout/english-version-link";

type Riddle = {
  id: string;
  title: string;
  data: {
    question: string;
    answer: string;
    answer_translation?: string;
    translation?: string;
    context?: string;
  };
  media?: { id: string; type: string; url: string; thumbnailUrl?: string | null }[];
};

export function RiddleCard({
  riddle,
  langCode,
}: {
  riddle: Riddle;
  langCode: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const d = riddle.data;

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-stone-100 overflow-hidden">
      <div className="p-6">
        <EnglishVersionLink langCode={langCode} href={`/${langCode}/ngeche/${riddle.id}`} />
        {(riddle.media ?? []).map((item) => item.type === "image" ? (
          <img key={item.id} src={item.url} alt={riddle.title} className="my-3 max-h-64 w-full rounded-lg object-contain" />
        ) : item.type === "video" ? (
          <video key={item.id} src={item.url} poster={item.thumbnailUrl ?? undefined} controls className="my-3 max-h-64 w-full rounded-lg bg-stone-950" />
        ) : item.type === "audio" ? (
          <audio key={item.id} src={item.url} controls className="my-3 w-full" />
        ) : null)}
        <p className="text-xs uppercase tracking-wider text-amber-600 mb-3">
          Riddle
        </p>
        <p className="text-xl md:text-2xl font-serif text-stone-800 mb-2 leading-snug">
          {d.question}
        </p>
        {d.translation && (
          <p className="text-sm text-stone-500 italic mb-4">{d.translation}</p>
        )}

        <button
          onClick={() => setRevealed(!revealed)}
          className="mt-4 w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm uppercase tracking-wider font-medium transition"
        >
          {revealed ? "Hide Answer" : "Reveal Answer"}
        </button>

        {revealed && (
          <div className="mt-4 p-4 bg-gradient-to-br from-amber-50 to-stone-50 rounded-lg border border-amber-100 animate-in fade-in slide-in-from-top-2">
            <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
              Answer
            </p>
            <p className="text-2xl font-serif text-amber-700 mb-1">
              {d.answer}
            </p>
            {d.answer_translation && (
              <p className="text-sm text-stone-500">{d.answer_translation}</p>
            )}
          </div>
        )}
      </div>

      <Link
        href={`/${langCode}/ngeche/${riddle.id}`}
        className="block px-6 py-3 bg-stone-50 text-xs uppercase tracking-wider text-stone-500 hover:bg-amber-50 hover:text-amber-700 transition border-t border-stone-100"
      >
        Full details →
      </Link>
    </div>
  );
}
