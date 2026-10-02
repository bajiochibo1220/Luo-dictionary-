"use client";

import Link from "next/link";
import { EnglishVersionLink } from "@/components/layout/english-version-link";

type Entry = {
  id: string;
  dholuo: string;
  english: string;
  kiswahili?: string | null;
  pronunciation?: string | null;
  grammarClass?: string | null;
  meaning?: string | null;
  audioUrl?: string | null;
  media?: { id: string; type: string; url: string; thumbnailUrl?: string | null }[];
};

export function DictionaryCard({
  entry,
  langCode,
}: {
  entry: Entry;
  langCode: string;
}) {
  return (
    <div className="group p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-stone-100 hover:border-amber-300">
      <Link href={`/${langCode}/muma/${entry.id}`} className="block">
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
      {entry.meaning && <p className="mt-2 text-sm text-stone-500">{entry.meaning}</p>}
      {(entry.media ?? []).map((item) => item.type === "image" ? (
        <img key={item.id} src={item.url} alt={entry.dholuo} className="mt-3 max-h-40 w-full object-cover rounded-lg" />
      ) : item.type === "audio" ? (
        <audio key={item.id} src={item.url} controls className="mt-3 w-full" />
      ) : item.type === "video" ? (
        <video key={item.id} src={item.url} poster={item.thumbnailUrl ?? undefined} controls className="mt-3 max-h-48 w-full rounded-lg" />
      ) : null)}
      {entry.kiswahili && (
        <p className="text-stone-400 text-sm mt-1">
          Kiswahili: {entry.kiswahili}
        </p>
      )}
      </Link>
      <div className="mt-3"><EnglishVersionLink langCode={langCode} href={`/${langCode}/muma/${entry.id}`} /></div>
    </div>
  );
}
