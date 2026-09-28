"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Language = { id: number; code: string; name: string; nativeName: string };

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languageId, setLanguageId] = useState<number | null>(null);
  const [role, setRole] = useState("registered");
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
      toast.error("Please select a language");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageId, role }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed");
      }

      // Force JWT refresh so middleware sees the new role
      await fetch("/api/auth/session", { cache: "no-store" });
      await update();

      toast.success("Welcome to LuoLinguaAI");
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err.message || "Onboarding failed");
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-serif text-2xl font-bold">L</span>
          </div>
          <h1 className="font-serif text-2xl text-stone-900 mb-2">
            Welcome to LuoLinguaAI
          </h1>
          <p className="text-sm text-stone-600">
            Tell us a bit about yourself so we can personalize your journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Which language would you like to explore?
            </label>
            <select
              value={languageId ?? ""}
              onChange={(e) => setLanguageId(Number(e.target.value))}
              required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition text-[15px]"
            >
              <option value="" disabled>
                Select your language
              </option>
              {languages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              How would you describe yourself?
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition text-[15px]"
            >
              <option value="registered">Community member</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="researcher">Researcher</option>
              <option value="contributor">Contributor</option>
              <option value="elder">Elder</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !languageId}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3 rounded-full font-semibold disabled:opacity-50 transition shadow-lg shadow-amber-700/20 mt-4"
          >
            {loading ? "Setting up..." : "Continue to dashboard"}
          </button>
        </form>

        <p className="text-xs text-stone-500 text-center mt-6">
          You can change these later in your profile settings.
        </p>
      </div>
    </div>
  );
}