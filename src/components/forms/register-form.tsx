"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

type Language = { id: number; code: string; name: string; nativeName: string };

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => setLanguages(data.data || []))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as string,
      languageId: Number(formData.get("languageId")),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      toast.error(data.error || "Registration failed");
      return;
    }

    toast.success("Account created. Signing in...");
    await signIn("credentials", {
      email: body.email,
      password: body.password,
      redirect: false,
    });
    router.push("/dashboard");
    router.refresh();
  }

  function comingSoon() {
    toast.info("Social signup is coming in Phase 2");
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          name="name"
          required
          minLength={2}
          placeholder="Full name"
          autoComplete="name"
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition text-sm placeholder:text-stone-400"
        />

        <input
          name="email"
          type="email"
          required
          placeholder="Email address"
          autoComplete="email"
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition text-sm placeholder:text-stone-400"
        />

        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition text-sm placeholder:text-stone-400 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-amber-600"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <select
          name="languageId"
          required
          defaultValue=""
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition text-sm text-stone-700"
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

        <select
          name="role"
          required
          defaultValue="registered"
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition text-sm text-stone-700"
        >
          <option value="registered">Community member</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="researcher">Researcher</option>
          <option value="contributor">Contributor</option>
          <option value="elder">Elder</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition shadow-lg shadow-amber-700/20"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-stone-400 tracking-wider">
            or sign up with
          </span>
        </div>
      </div>

      {/* Social buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={comingSoon}
          className="flex items-center justify-center gap-2 py-3 border border-stone-200 rounded-lg hover:bg-stone-50 transition text-sm font-medium text-stone-700"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={comingSoon}
          className="flex items-center justify-center gap-2 py-3 border border-stone-200 rounded-lg hover:bg-stone-50 transition text-sm font-medium text-stone-700"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X
        </button>
        <button
          type="button"
          onClick={comingSoon}
          className="flex items-center justify-center gap-2 py-3 border border-stone-200 rounded-lg hover:bg-stone-50 transition text-sm font-medium text-stone-700"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
          </svg>
          TikTok
        </button>
      </div>

      <p className="text-xs text-stone-400 text-center">
        By creating an account, you agree to help preserve Luo language and
        culture respectfully.
      </p>
    </div>
  );
}