"use client";

import Link from "next/link";
import { useState } from "react";
import { EnglishVersionLink } from "@/components/layout/english-version-link";

type Proverb = {
  id: string;
  title: string;
  data: {
    original_text: string;
    translation: string;
    meaning: string;
    interpretation?: string;
    context?: string;
    description?: string;
    transcript?: string;
  };
  tags: string[];
  media?: { id: string; type: string; url: string; thumbnailUrl?: string | null }[];
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
  const media = proverb.media ?? [];
  const original = d.original_text || proverb.title;
  const translation = d.translation || d.description || d.transcript || "";
  const meaning = d.meaning || d.description || "";

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-stone-100 hover:border-amber-300 overflow-hidden">
      <div className="p-6">
        {media.map((item) => item.type === "image" ? (
          <img key={item.id} src={item.url} alt={proverb.title} className="w-full max-h-72 object-contain rounded-lg mb-4 bg-stone-100" />
        ) : item.type === "video" ? (
          <video key={item.id} src={item.url} poster={item.thumbnailUrl ?? undefined} controls className="w-full max-h-72 rounded-lg mb-4 bg-stone-950" />
        ) : item.type === "audio" ? (
          <audio key={item.id} src={item.url} controls className="w-full mb-4" />
        ) : null)}
        <EnglishVersionLink langCode={langCode} href={`/${langCode}/ngero/${proverb.id}`} />
        <p className="text-xl md:text-2xl font-serif text-stone-800 mb-3 leading-snug">
          &ldquo;{original}&rdquo;
        </p>

        {translation && <p className="text-sm text-stone-500 italic mb-4">{translation}</p>}

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
              {meaning || "No meaning provided yet."}
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
