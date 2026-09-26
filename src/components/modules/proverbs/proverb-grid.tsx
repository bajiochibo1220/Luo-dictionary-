"use client";

import { useState, useEffect, useCallback } from "react";
import { ProverbCard } from "./proverb-card";

type Proverb = {
  id: string;
  title: string;
  data: any;
  tags: string[];
};

export function ProverbGrid({
  initialProverbs,
  langCode,
  allThemes,
}: {
  initialProverbs: Proverb[];
  langCode: string;
  allThemes: string[];
}) {
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState("");
  const [proverbs, setProverbs] = useState<Proverb[]>(initialProverbs);
  const [loading, setLoading] = useState(false);

  const fetchProverbs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ lang: langCode });
      if (query) params.set("q", query);
      if (theme) params.set("theme", theme);
      const res = await fetch(`/api/proverbs?${params.toString()}`);
      const data = await res.json();
      setProverbs(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [langCode, query, theme]);

  useEffect(() => {
    const t = setTimeout(fetchProverbs, 250);
    return () => clearTimeout(t);
  }, [fetchProverbs]);

  return (
    <div>
      {/* Filters */}
      <div className="mb-8 space-y-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search proverbs..."
          className="w-full px-6 py-4 text-lg border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
        />

        {allThemes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTheme("")}
              className={`text-xs px-3 py-1.5 rounded-full transition ${
                theme === ""
                  ? "bg-amber-600 text-white"
                  : "bg-white text-stone-600 border border-stone-200 hover:border-amber-400"
              }`}
            >
              All
            </button>
            {allThemes.map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`text-xs px-3 py-1.5 rounded-full transition ${
                  theme === t
                    ? "bg-amber-600 text-white"
                    : "bg-white text-stone-600 border border-stone-200 hover:border-amber-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <p className="text-sm text-amber-600 mb-4 text-center">Loading...</p>
      )}

      {proverbs.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No proverbs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proverbs.map((p) => (
            <ProverbCard key={p.id} proverb={p} langCode={langCode} />
          ))}
        </div>
      )}
    </div>
  );
}