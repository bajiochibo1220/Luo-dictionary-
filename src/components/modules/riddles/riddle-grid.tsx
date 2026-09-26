"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RiddleCard } from "./riddle-card";

type Riddle = {
  id: string;
  title: string;
  data: any;
};

export function RiddleGrid({
  initialRiddles,
  langCode,
}: {
  initialRiddles: Riddle[];
  langCode: string;
}) {
  const [query, setQuery] = useState("");
  const [riddles, setRiddles] = useState<Riddle[]>(initialRiddles);
  const [loading, setLoading] = useState(false);

  const fetchRiddles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ lang: langCode });
      if (query) params.set("q", query);
      const res = await fetch(`/api/riddles?${params.toString()}`);
      const data = await res.json();
      setRiddles(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [langCode, query]);

  useEffect(() => {
    const t = setTimeout(fetchRiddles, 250);
    return () => clearTimeout(t);
  }, [fetchRiddles]);

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search riddles..."
          className="flex-1 px-6 py-4 text-lg border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
        />
        <Link
          href={`/${langCode}/ngeche/quiz`}
          className="inline-flex items-center justify-center px-6 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm uppercase tracking-wider font-medium transition"
        >
          Play Quiz
        </Link>
      </div>

      {loading && (
        <p className="text-sm text-amber-600 mb-4 text-center">Loading...</p>
      )}

      {riddles.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No riddles found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {riddles.map((r) => (
            <RiddleCard key={r.id} riddle={r} langCode={langCode} />
          ))}
        </div>
      )}
    </div>
  );
}