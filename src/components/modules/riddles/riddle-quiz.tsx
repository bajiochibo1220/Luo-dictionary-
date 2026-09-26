"use client";

import { useState } from "react";
import Link from "next/link";

type Riddle = {
  id: string;
  data: {
    question: string;
    answer: string;
    answer_translation?: string;
    translation?: string;
  };
};

export function RiddleQuiz({
  riddles,
  langCode,
}: {
  riddles: Riddle[];
  langCode: string;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);

  if (riddles.length === 0) {
    return (
      <div className="text-center py-16 text-stone-400">
        <p className="text-lg">No riddles available for quiz</p>
        <Link
          href={`/${langCode}/ngeche`}
          className="inline-block mt-4 text-amber-600 hover:underline"
        >
          ← Back to riddles
        </Link>
      </div>
    );
  }

  if (finished) {
    const total = score.correct + score.wrong;
    const pct = total === 0 ? 0 : Math.round((score.correct / total) * 100);
    return (
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-4xl font-serif text-stone-800 mb-4">
          Quiz Complete
        </h2>
        <p className="text-6xl font-serif text-amber-600 mb-6">{pct}%</p>
        <p className="text-stone-600 mb-8">
          {score.correct} correct · {score.wrong} wrong
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setIndex(0);
              setRevealed(false);
              setScore({ correct: 0, wrong: 0 });
              setFinished(false);
            }}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm uppercase tracking-wider font-medium"
          >
            Play Again
          </button>
          <Link
            href={`/${langCode}/ngeche`}
            className="px-6 py-3 bg-white border border-stone-200 hover:border-amber-400 text-stone-700 rounded-lg text-sm uppercase tracking-wider font-medium"
          >
            Back to List
          </Link>
        </div>
      </div>
    );
  }

  const current = riddles[index];
  const d = current.data;

  const handleAnswer = (correct: boolean) => {
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    setRevealed(false);
    if (index + 1 >= riddles.length) {
      setFinished(true);
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 text-sm text-stone-500">
        <span>
          Riddle {index + 1} of {riddles.length}
        </span>
        <span>
          Score: <span className="text-green-600">{score.correct}</span> ·{" "}
          <span className="text-red-500">{score.wrong}</span>
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 md:p-12 text-center">
        <p className="text-xs uppercase tracking-wider text-amber-600 mb-4">
          Riddle
        </p>
        <p className="text-2xl md:text-3xl font-serif text-stone-800 mb-6 leading-snug">
          {d.question}
        </p>
        {d.translation && (
          <p className="text-sm text-stone-500 italic mb-8">{d.translation}</p>
        )}

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm uppercase tracking-wider font-medium transition"
          >
            Reveal Answer
          </button>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-amber-50 to-stone-50 rounded-xl border border-amber-100">
              <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">
                Answer
              </p>
              <p className="text-3xl font-serif text-amber-700 mb-1">
                {d.answer}
              </p>
              {d.answer_translation && (
                <p className="text-sm text-stone-500">
                  {d.answer_translation}
                </p>
              )}
            </div>

            <p className="text-sm text-stone-500">
              Did you get it right?
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => handleAnswer(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm uppercase tracking-wider font-medium"
              >
                Yes
              </button>
              <button
                onClick={() => handleAnswer(false)}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm uppercase tracking-wider font-medium"
              >
                No
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link
          href={`/${langCode}/ngeche`}
          className="text-sm text-stone-500 hover:text-amber-600"
        >
          ← Exit quiz
        </Link>
      </div>
    </div>
  );
}