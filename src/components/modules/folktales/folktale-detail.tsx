"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  tale: {
    id: string;
    title: string;
    data: {
      original?: string;
      translation?: string;
      moral?: string;
      characters?: string[];
      children_version?: string;
      teacher_notes?: string;
    };
    media: { id?: string; url: string; type: string; thumbnailUrl?: string | null }[];
    tags: string[];
  };
  langCode: string;
};

export function FolktaleDetail({ tale, langCode }: Props) {
  const d = tale.data;
  const [showChildren, setShowChildren] = useState(false);
  const [showTeacherNotes, setShowTeacherNotes] = useState(false);
  const audio = tale.media.find((m) => m.type === "audio");

  const primaryText = showChildren && d.children_version ? d.children_version : d.original || "";
  const secondaryText = showChildren ? "" : d.translation || "";

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/${langCode}/sigana/folktales`}
        className="inline-flex items-center text-sm text-stone-500 hover:text-amber-600 mb-6"
      >
        ← Back to Folktales
      </Link>

      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-amber-600">
          Folktale
        </span>
        <h1 className="text-4xl md:text-5xl font-serif text-stone-800 mt-2 mb-4">
          {tale.title}
        </h1>

        {d.characters && d.characters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs uppercase tracking-wider text-stone-400">
              Characters:
            </span>
            {d.characters.map((c, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 bg-stone-100 text-stone-700 rounded-full"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {d.children_version && (
          <button
            onClick={() => setShowChildren(!showChildren)}
            className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border transition ${
              showChildren
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white text-stone-600 border-stone-200 hover:border-amber-400"
            }`}
          >
            {showChildren ? "Children's Version ✓" : "Children's Version"}
          </button>
        )}
      </header>

      {audio && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 mb-8">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-3">
            Listen
          </p>
          <audio controls className="w-full" src={audio.url}>
            Your browser does not support audio.
          </audio>
        </div>
      )}

      {tale.media.filter((item) => item.type !== "audio").map((item, index) => (
        <div key={item.id ?? index} className="mb-5 bg-white rounded-xl border border-stone-100 p-5">
          {item.type === "image" ? <img src={item.url} alt={tale.title} className="w-full max-h-[32rem] object-contain rounded-lg" /> :
            item.type === "video" ? <video src={item.url} poster={item.thumbnailUrl ?? undefined} controls className="w-full max-h-[32rem] rounded-lg bg-stone-950" /> :
            <a href={item.url} target="_blank" rel="noreferrer" className="text-amber-800 underline">Open transcript or document</a>}
        </div>
      ))}

      <article className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 md:p-12 mb-8">
        <div className="prose prose-stone max-w-none">
          {primaryText.split("\n").filter((p) => p.trim()).map((p, i) => (
            <p key={i} className="text-lg leading-relaxed text-stone-800 mb-4">
              {p}
            </p>
          ))}
        </div>

        {secondaryText && (
          <div className="mt-10 pt-8 border-t border-stone-100">
            <p className="text-xs uppercase tracking-wider text-stone-400 mb-4">
              Translation
            </p>
            <div className="prose prose-stone max-w-none">
              {secondaryText.split("\n").filter((p) => p.trim()).map((p, i) => (
                <p key={i} className="leading-relaxed text-stone-600 mb-3">
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}
      </article>

      {d.moral && (
        <div className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-2xl border border-amber-100 p-8 mb-8">
          <p className="text-xs uppercase tracking-wider text-amber-700 mb-2">
            Moral Lesson
          </p>
          <p className="text-lg text-stone-800 italic leading-relaxed">
            &ldquo;{d.moral}&rdquo;
          </p>
        </div>
      )}

      {d.teacher_notes && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 mb-8">
          <button
            onClick={() => setShowTeacherNotes(!showTeacherNotes)}
            className="w-full p-6 text-left flex items-center justify-between"
          >
            <span className="text-xs uppercase tracking-wider text-stone-500">
              Teacher Notes
            </span>
            <span className="text-stone-400">{showTeacherNotes ? "−" : "+"}</span>
          </button>
          {showTeacherNotes && (
            <div className="px-6 pb-6 pt-2 border-t border-stone-100">
              <p className="text-stone-700 leading-relaxed whitespace-pre-line">
                {d.teacher_notes}
              </p>
            </div>
          )}
        </div>
      )}

      {tale.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tale.tags.map((t) => (
            <span
              key={t}
              className="text-xs px-3 py-1 bg-amber-50 text-amber-700 rounded-full"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
