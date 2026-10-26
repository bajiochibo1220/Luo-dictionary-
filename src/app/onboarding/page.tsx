"use client";
import { InterfaceOption, InterfaceText } from "@/components/shared/interface-language";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  DateOfBirthPicker,
  DateOfBirth,
} from "@/components/forms/date-of-birth-picker";

type Language = { id: number; code: string; name: string; nativeName: string };

export default function OnboardingPage() {
  const { update } = useSession();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languageId, setLanguageId] = useState<number | null>(null);
  const [role, setRole] = useState("registered");
  const [dob, setDob] = useState<DateOfBirth>({
    day: null,
    month: null,
    year: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        setLanguages(data.data || []);
        if (data.data?.length > 0) setLanguageId(data.data[0].id);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!languageId) {
      toast.error(<InterfaceText source={"Please select a language"} />);
      return;
    }
    if (!dob.day || !dob.month || !dob.year) {
      toast.error(<InterfaceText source={"Please enter your full date of birth"} />);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageId, role, dateOfBirth: dob }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");

      await fetch("/api/auth/session", { cache: "no-store" });
      await update();

      toast.success(<InterfaceText source={"Welcome to Luo Heritage"} />);
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(<InterfaceText source={err.message || "Onboarding failed"} />);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#cfc09a] flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%234a2110' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-stone-900/10 border border-stone-200 p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-600 to-amber-800 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-serif text-2xl font-bold">L</span>
          </div>
          <h1 className="font-serif text-2xl text-stone-900 mb-2"><InterfaceText source="Welcome to Luo Heritage" /></h1>
          <p className="text-sm text-stone-600"><InterfaceText source="Just a few details before we continue" /></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2"><InterfaceText source="Which language would you like to explore?" /></label>
            <select
              value={languageId ?? ""}
              onChange={(e) => setLanguageId(Number(e.target.value))}
              required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition text-[15px]"
            >
              <InterfaceOption value="" disabled>
                Select your language
              </InterfaceOption>
              {languages.map((l) => (
                <InterfaceOption key={l.id} value={l.id}>
                  {l.nativeName} ({l.name})
                </InterfaceOption>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2"><InterfaceText source="How would you describe yourself?" /></label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition text-[15px]"
            >
              <InterfaceOption value="registered">Community member</InterfaceOption>
              <InterfaceOption value="student">Student</InterfaceOption>
              <InterfaceOption value="teacher">Teacher</InterfaceOption>
              <InterfaceOption value="researcher">Researcher</InterfaceOption>
              <InterfaceOption value="contributor">Contributor</InterfaceOption>
              <InterfaceOption value="elder">Elder</InterfaceOption>
            </select>
          </div>

          <DateOfBirthPicker
            value={dob}
            onChange={setDob}
            label="Date of birth"
            helpText="Age helps moderators assess the authenticity of cultural contributions. Elders typically carry traditional knowledge that younger contributors may not."
          />

          <button
            type="submit"
            disabled={loading || !languageId}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3 rounded-full font-semibold disabled:opacity-50 transition shadow-lg shadow-amber-700/20 mt-4"
          >
            <InterfaceText source={loading ? "Setting up..." : "Continue to dashboard"} />
          </button>
        </form>

        <p className="text-xs text-stone-500 text-center mt-6"><InterfaceText source="You can change this later in your profile settings." /></p>
      </div>
    </div>
  );
}