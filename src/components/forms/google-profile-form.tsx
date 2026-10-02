"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DateOfBirthPicker, type DateOfBirth } from "./date-of-birth-picker";

type Language = { id: number; code: string; name: string; nativeName: string };

export function GoogleProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languageId, setLanguageId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<DateOfBirth>({ day: null, month: null, year: null });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/languages").then((response) => response.json()).then((result) => setLanguages(result.data ?? [])).catch(() => {});
  }, []);

  async function completeRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/google-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, languageId: Number(languageId), dateOfBirth, acceptedTerms, interests }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not finish account setup");
      await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      toast.success("Your account is ready.");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not finish account setup");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={completeRegistration} className="space-y-4">
      <label className="block text-sm font-medium text-stone-700">Full name
        <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3" />
      </label>
      <DateOfBirthPicker value={dateOfBirth} onChange={setDateOfBirth} helpText="Used to help moderators assess cultural contributions." />
      <label className="block text-sm font-medium text-stone-700">Your language
        <select value={languageId} onChange={(event) => setLanguageId(event.target.value)} required className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3">
          <option value="">Choose a language</option>
          {languages.map((language) => <option key={language.id} value={language.id}>{language.nativeName} ({language.name})</option>)}
        </select>
      </label>
      <fieldset className="rounded-xl border border-stone-300 bg-white p-4">
        <legend className="px-1 text-sm font-medium text-stone-700">How do you plan to use LuoLinguaAI? (Choose any)</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-stone-700">
          {["Student", "Researcher", "Contributor", "Teacher", "Community member"].map((value) => {
            const key = value.toLowerCase().replaceAll(" ", "_");
            return <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={interests.includes(key)} onChange={(event) => setInterests((previous) => event.target.checked ? [...previous, key] : previous.filter((item) => item !== key))} />{value}</label>;
          })}
        </div>
      </fieldset>
      <label className="flex items-start gap-2 text-xs leading-relaxed text-stone-700">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} required className="mt-0.5 accent-amber-700" />
        <span>I accept the <a className="font-semibold underline" href="/terms" target="_blank">Terms of Service</a> and <a className="font-semibold underline" href="/privacy" target="_blank">Privacy Policy</a>.</span>
      </label>
      <button type="submit" disabled={loading || !acceptedTerms} className="w-full rounded-full bg-amber-700 px-5 py-3 font-semibold text-white disabled:opacity-50">
        {loading ? "Finishing account setup..." : "Finish creating account"}
      </button>
    </form>
  );
}
