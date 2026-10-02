"use client";

import { useState } from "react";

export type TranscriptSegmentItem = {
  id: string;
  sourceId: string | null;
  text: string;
  speakerRole: string | null;
  sourceUri: string | null;
};

export function TranscriptSegments({ segments }: { segments: TranscriptSegmentItem[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const allExpanded = segments.length > 0 && expanded.size === segments.length;

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setExpanded(allExpanded ? new Set() : new Set(segments.map((segment) => segment.id)));
  }

  if (segments.length === 0) {
    return (
      <p className="rounded-xl border border-stone-900/10 bg-white/90 p-5 text-sm text-stone-600">
        No transcript text is available in this session.
      </p>
    );
  }

  return (
    <section>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={toggleAll}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-amber-50"
        >
          {allExpanded ? "Collapse all segments" : "Expand all segments"}
        </button>
      </div>
      <div className="space-y-3">
        {segments.map((segment, index) => {
          const isExpanded = expanded.has(segment.id);
          const label = [
            `Segment ${index + 1}`,
            segment.sourceId,
            segment.speakerRole,
          ].filter(Boolean).join(" · ");

          return (
            <section key={segment.id} className="overflow-hidden rounded-xl border border-stone-900/10 bg-white/90 shadow-sm">
              <h2>
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`transcript-${segment.id}`}
                  onClick={() => toggle(segment.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-stone-800 hover:bg-amber-50"
                >
                  <span>{label}</span>
                  <span aria-hidden="true" className="shrink-0 text-lg">{isExpanded ? "−" : "+"}</span>
                </button>
              </h2>
              {isExpanded && (
                <div id={`transcript-${segment.id}`} className="border-t border-stone-200 px-4 py-4">
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-stone-800">{segment.text}</p>
                  {segment.sourceUri && (
                    <p className="mt-4 break-all text-xs text-stone-500">Source: {segment.sourceUri}</p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
