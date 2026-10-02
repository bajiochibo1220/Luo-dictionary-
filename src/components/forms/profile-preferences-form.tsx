"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const OPTIONS = [
  ["community_member", "Community member"],
  ["student", "Student"],
  ["researcher", "Researcher"],
  ["contributor", "Contributor"],
  ["teacher", "Teacher"],
] as const;

export function ProfilePreferencesForm({ initialTypes }: { initialTypes: string[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialTypes);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileTypes: selected }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not save your profile options.");
      toast.success("Profile options saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile options.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="max-w-2xl rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="font-serif text-2xl text-stone-800">Profile options</h1>
      <p className="mt-2 text-sm text-stone-600">Choose every option that describes how you use LuoLinguaAI. You can change these selections whenever you like.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(([value, label]) => (
          <label key={value} className="flex items-center gap-3 rounded-lg border border-stone-200 p-3 text-sm text-stone-700">
            <input type="checkbox" checked={selected.includes(value)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))} />
            {label}
          </label>
        ))}
      </div>
      <button type="button" onClick={() => void save()} disabled={saving} className="mt-5 rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {saving ? "Saving…" : "Save profile options"}
      </button>
    </section>
  );
}
