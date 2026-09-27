"use client";

import Link from "next/link";

const TABS = [
  { key: "chatbot", label: "Chatbot" },
  { key: "embeddings", label: "Embeddings" },
  { key: "flagged", label: "Flagged" },
];

export function AiTabs({ active }: { active: string }) {
  return (
    <div className="mb-6 border-b border-stone-200">
      <div className="flex gap-4">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/ai-monitoring?tab=${t.key}`}
            className={`pb-3 text-sm uppercase tracking-wider transition ${
              active === t.key
                ? "text-amber-600 border-b-2 border-amber-600 font-medium"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}