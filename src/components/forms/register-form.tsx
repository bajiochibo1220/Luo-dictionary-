"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";

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

  async function handleOAuth(provider: string, label: string) {
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (err: any) {
      toast.error(`${label} signup failed`);
    }
  }

  function comingSoon(provider: string) {
    toast.info(`${provider} is coming soon`);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          name="name"
          required
          minLength={2}
          placeholder="Full name"
          autoComplete="name"
          className="w-full px-4 py-4 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition text-[15px] placeholder:text-stone-400"
        />

        <input
          name="email"
          type="email"
          required
          placeholder="Email address"
          autoComplete="email"
          className="w-full px-4 py-4 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition text-[15px] placeholder:text-stone-400"
        />

        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            autoComplete="new-password"
            className="w-full px-4 py-4 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition text-[15px] placeholder:text-stone-400 pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-500 hover:text-amber-700"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <select
          name="languageId"
          required
          defaultValue=""
          className="w-full px-4 py-4 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition text-[15px] text-stone-700"
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
          className="w-full px-4 py-4 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition text-[15px] text-stone-700"
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
          className="w-full bg-amber-700 hover:bg-amber-800 text-white py-4 rounded-full font-semibold disabled:opacity-50 transition shadow-lg shadow-amber-700/20 text-[15px]"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-xs text-stone-700 text-center leading-relaxed pt-1">
        By creating an account you agree to help preserve Luo language and
        culture respectfully.
      </p>

      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-700/20" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#cfc09a] px-4 text-xs uppercase tracking-wider text-stone-600">
            or sign up with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => comingSoon("Apple")}
          className="flex items-center justify-center gap-2 py-3 bg-white border border-stone-300 rounded-full hover:bg-stone-50 transition text-sm font-medium text-stone-700"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Apple
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("google", "Google")}
          className="flex items-center justify-center gap-2 py-3 bg-white border border-stone-300 rounded-full hover:bg-stone-50 transition text-sm font-medium text-stone-700"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => comingSoon("Phone")}
          className="flex items-center justify-center gap-2 py-3 bg-white border border-stone-300 rounded-full hover:bg-stone-50 transition text-sm font-medium text-stone-700"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Phone
        </button>
        <button
          type="button"
          onClick={() => comingSoon("Microsoft")}
          className="flex items-center justify-center gap-2 py-3 bg-white border border-stone-300 rounded-full hover:bg-stone-50 transition text-sm font-medium text-stone-700"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#f25022" d="M0 0h11.5v11.5H0z" />
            <path fill="#7fba00" d="M12.5 0H24v11.5H12.5z" />
            <path fill="#00a4ef" d="M0 12.5h11.5V24H0z" />
            <path fill="#ffb900" d="M12.5 12.5H24V24H12.5z" />
          </svg>
          Microsoft
        </button>
      </div>

      <div className="pt-4 text-center">
        <Link
          href="/login"
          className="inline-block w-full px-8 py-3 border-2 border-stone-800 text-stone-800 rounded-full font-semibold hover:bg-stone-800 hover:text-white transition text-[15px]"
        >
          I already have an account
        </Link>
      </div>
    </div>
  );
}