"use client";

import { useState, useEffect, useCallback } from "react";
import { DictionaryCard } from "./dictionary-card";

type Entry = {
  id: string;
  dholuo: string;
  english: string;
  kiswahili?: string | null;
  pronunciation?: string | null;
  grammarClass?: string | null;
  audioUrl?: string | null;
};

export function DictionarySearch({
  initialEntries,
  langCode,
  emptyMessage,
}: {
  initialEntries: Entry[];
  langCode: string;
  emptyMessage: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Entry[]>(initialEntries);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/dictionary?lang=${langCode}&q=${encodeURIComponent(q)}`
        );
        const data = await res.json();
        setResults(data.data || []);
      } finally {
        setLoading(false);
      }
    },
    [langCode]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      search(query);
    }, 250);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div>
      <div className="relative mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Dholuo, English, or Kiswahili..."
          className="w-full px-6 py-4 text-lg border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white shadow-sm"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-amber-600">
            Searching...
          </span>
        )}
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">{emptyMessage}</p>
          {query && (
            <p className="text-sm mt-2">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((entry) => (
            <DictionaryCard
              key={entry.id}
              entry={entry}
              langCode={langCode}
            />
          ))}
        </div>
      )}
    </div>
  );
}