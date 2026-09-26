"use client";

import Link from "next/link";
import { useState } from "react";

type Proverb = {
  id: string;
  title: string;
  data: {
    original_text: string;
    translation: string;
    meaning: string;
    interpretation?: string;
    context?: string;
  };
  tags: string[];
};

export function ProverbCard({
  proverb,
  langCode,
}: {
  proverb: Proverb;
  langCode: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const d = proverb.data;

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-stone-100 hover:border-amber-300 overflow-hidden">
      <div className="p-6">
        <p className="text-xl md:text-2xl font-serif text-stone-800 mb-3 leading-snug">
          &ldquo;{d.original_text}&rdquo;
        </p>

        <p className="text-sm text-stone-500 italic mb-4">
          {d.translation}
        </p>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs uppercase tracking-wider text-amber-600 hover:text-amber-700 font-medium"
        >
          {expanded ? "Hide meaning" : "Reveal meaning"}
        </button>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
            <p className="text-stone-700">
              <span className="text-xs uppercase tracking-wider text-stone-400 mr-2">
                Meaning:
              </span>
              {d.meaning}
            </p>
            {d.context && (
              <p className="text-sm text-stone-500">
                <span className="text-xs uppercase tracking-wider text-stone-400 mr-2">
                  Context:
                </span>
                {d.context}
              </p>
            )}
          </div>
        )}

        {proverb.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {proverb.tags.map((t, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/${langCode}/ngero/${proverb.id}`}
        className="block px-6 py-3 bg-stone-50 text-xs uppercase tracking-wider text-stone-500 hover:bg-amber-50 hover:text-amber-700 transition border-t border-stone-100"
      >
        Full story →
      </Link>
    </div>
  );
}