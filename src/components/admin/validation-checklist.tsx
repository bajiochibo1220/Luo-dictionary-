"use client";

import { useState } from "react";

const CHECKS = [
  { key: "spelling", label: "Spelling is correct" },
  { key: "translation", label: "English version matches the Indigenous-language content" },
  { key: "grammar", label: "Grammar classification is correct" },
  { key: "pronunciation", label: "Pronunciation is correct" },
  { key: "examples", label: "Example sentences are natural" },
  { key: "culture", label: "Cultural context is accurate" },
];

export function ValidationChecklist({
  onChange,
}: {
  onChange?: (checks: Record<string, boolean>) => void;
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    const next = { ...checks, [key]: !checks[key] };
    setChecks(next);
    onChange?.(next);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <h2 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
        Validation Checklist
      </h2>
      <ul className="space-y-3">
        {CHECKS.map((c) => (
          <li key={c.key}>
            <label className="flex items-center gap-3 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={!!checks[c.key]}
                onChange={() => toggle(c.key)}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <span className="text-stone-700">{c.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
