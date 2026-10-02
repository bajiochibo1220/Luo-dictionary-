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
  meaning?: string | null;
  audioUrl?: string | null;
  media?: { id: string; type: string; url: string; thumbnailUrl?: string | null }[];
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialEntries.length);

  const search = useCallback(
    async (q: string, nextPage = 1) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/dictionary?lang=${langCode}&q=${encodeURIComponent(q)}&page=${nextPage}&limit=50`
        );
        const data = await res.json();
        const nextResults = data.data || [];
        setResults((current) => nextPage === 1 ? nextResults : [...current, ...nextResults]);
        setPage(nextPage);
        setTotal(data.meta?.total ?? nextResults.length);
      } finally {
        setLoading(false);
      }
    },
    [langCode]
  );

  useEffect(() => {
    const t = setTimeout(() => search(query, 1), 250);
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
      {results.length < total && <div className="mt-8 text-center">
        <button type="button" onClick={() => search(query, page + 1)} disabled={loading} className="rounded-full border border-amber-800 px-5 py-3 text-sm font-semibold text-amber-900 disabled:opacity-50">
          {loading ? "Loading..." : "Show more entries"}
        </button>
      </div>}
    </div>
  );
}
