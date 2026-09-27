"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

type Result = {
  id: string;
  title: string;
  module: string;
  moduleCode: string;
  similarity: number;
  excerpt: string;
};

const SUGGESTED = [
  "respect for elders",
  "how children are named",
  "fishing traditions",
  "unity and community",
];

export function SemanticSearch({ langCode }: { langCode: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, languageCode: langCode }),
        });
        const data = await res.json();
        if (data.success) {
          setResults(data.data || []);
          setSearched(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [langCode]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (query) search(query);
      else {
        setResults([]);
        setSearched(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div>
      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what you're looking for in natural language..."
          className="w-full px-6 py-4 text-lg border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-amber-600">
            Searching...
          </span>
        )}
      </div>

      {!searched && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-stone-500 mb-4">
            Try one of these:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="text-sm px-4 py-2 bg-white border border-stone-200 hover:border-amber-400 rounded-full text-stone-600 transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {searched && results.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <p>No matching content found</p>
          <p className="text-sm mt-2">
            Try rephrasing or asking about another topic
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">
            {results.length} result{results.length === 1 ? "" : "s"} by relevance
          </p>
          {results.map((r) => {
            const pct = Math.round(r.similarity * 100);
            return (
              <div
                key={r.id}
                className="bg-white rounded-xl shadow-sm border border-stone-100 hover:border-amber-300 transition p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs uppercase tracking-wider text-amber-600">
                        {r.module}
                      </span>
                      <span className="text-xs text-stone-400">
                        · {pct}% match
                      </span>
                    </div>
                    <Link
                      href={`/${langCode}/${mapModuleToPath(r.moduleCode)}/${r.id}`}
                      className="font-serif text-lg text-stone-800 hover:text-amber-700 transition"
                    >
                      {r.title}
                    </Link>
                  </div>
                </div>

                <p className="text-sm text-stone-600 line-clamp-2 mb-2">
                  {r.excerpt}
                </p>

                <button
                  onClick={() =>
                    setExpanded(expanded === r.id ? null : r.id)
                  }
                  className="text-xs text-amber-600 hover:underline"
                >
                  {expanded === r.id ? "Hide" : "Why this result?"}
                </button>

                {expanded === r.id && (
                  <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-500 space-y-1">
                    <p>
                      <strong>Similarity score:</strong>{" "}
                      {r.similarity.toFixed(3)}
                    </p>
                    <p>
                      <strong>Matched content:</strong>
                    </p>
                    <pre className="bg-stone-50 p-2 rounded text-xs whitespace-pre-wrap max-h-32 overflow-auto">
                      {r.excerpt}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function mapModuleToPath(code: string): string {
  const map: Record<string, string> = {
    dictionary: "muma",
    proverbs: "ngero",
    riddles: "ngeche",
    oral_histories: "sigana",
    folktales: "sigana/folktales",
    songs: "wende",
    artifacts: "gik-luo",
    heritage_sites: "piny-luo",
  };
  return map[code] || code;
}