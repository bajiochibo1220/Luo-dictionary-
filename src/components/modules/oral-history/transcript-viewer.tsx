"use client";

export function TranscriptViewer({ text }: { text: string }) {
  if (!text) {
    return (
      <div className="text-sm text-stone-400 italic py-8 text-center">
        No transcript available yet
      </div>
    );
  }

  const paragraphs = text.split("\n").filter((p) => p.trim());

  return (
    <div className="prose prose-stone max-w-none">
      <div className="space-y-4 text-stone-700 leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}