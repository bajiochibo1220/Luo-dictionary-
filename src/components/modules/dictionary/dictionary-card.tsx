"use client";

import Link from "next/link";

type Entry = {
  id: string;
  dholuo: string;
  english: string;
  kiswahili?: string | null;
  pronunciation?: string | null;
  grammarClass?: string | null;
  audioUrl?: string | null;
};

export function DictionaryCard({
  entry,
  langCode,
}: {
  entry: Entry;
  langCode: string;
}) {
  return (
    <Link
      href={`/${langCode}/muma/${entry.id}`}
      className="group block p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-stone-100 hover:border-amber-300"
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <h3 className="text-2xl font-serif text-stone-800 group-hover:text-amber-700 transition">
          {entry.dholuo}
        </h3>
        {entry.grammarClass && (
          <span className="text-xs uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-1 rounded">
            {entry.grammarClass}
          </span>
        )}
      </div>

      {entry.pronunciation && (
        <p className="text-xs text-stone-400 italic mb-3">
          /{entry.pronunciation}/
        </p>
      )}

      <p className="text-stone-600">{entry.english}</p>
      {entry.kiswahili && (
        <p className="text-stone-400 text-sm mt-1">
          Kiswahili: {entry.kiswahili}
        </p>
      )}
    </Link>
  );
}