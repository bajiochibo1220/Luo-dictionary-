"use client";
import { InterfaceText } from "@/components/shared/interface-language";

export function TranscriptViewer({ text }: { text: string }) {
  if (!text) {
    return (
      <div className="text-sm text-stone-400 italic py-8 text-center"><InterfaceText source="No transcript available yet" /></div>
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