"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleError = searchParams.get("error");

  function startGoogleLogin() {
    document.cookie = `google-auth-intent=login; Max-Age=180; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    void signIn("google", { callbackUrl: "/dashboard" });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim().toLowerCase();
    const password = formData.get("password") as string;

    let result;
    try {
      result = await signIn("credentials", { email, password, redirect: false });
    } catch {
      setLoading(false);
      toast.error("Unable to log in right now. Please try again.");
      return;
    }

    if (result?.error) {
      setLoading(false);
      toast.error("Incorrect email or password");
      return;
    }

    // Decide where to send them based on their role
    try {
      const sessionRes = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      const session = await sessionRes.json();
      const user = session?.user as any;

      if (user?.isMasterSuperAdmin === true) {
        toast.success("Welcome back, Master Super Admin");
        router.push("/super-admin/dashboard");
        router.refresh();
        return;
      }

      const isSuperAdmin = user?.isSuperAdmin === true;
      const hasAdminRole = (user?.languageRoles ?? []).some((r: any) =>
        [
          "language_admin",
          "uploader",
          "publisher",
          "content_editor",
          "cultural_expert",
        ].includes(r.role)
      );

      if (isSuperAdmin || hasAdminRole) {
        toast.success("Welcome back, admin");
        router.push("/admin/dashboard");
      } else {
        toast.success("Welcome back");
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      // Fallback if session fetch fails
      router.push("/dashboard");
      router.refresh();
    }
  }

  function comingSoon(provider: string) {
    toast.info(`${provider} login is coming in Phase 2`);
  }

  return (
    <div className="space-y-4">
      {googleError && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
        {googleError === "GoogleAccountNotFound"
          ? <>We could not find an account for this Google email. <Link href="/register" className="font-semibold underline">Create an account to continue.</Link></>
          : googleError === "AccountSuspended"
          ? "This account is not available. Please contact an administrator."
          : "We could not sign you in with Google. Please try again or create an account."}
      </div>}
      <form onSubmit={onSubmit} className="space-y-3" autoComplete="off">
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="Email address"
          autoComplete="off"
          className="w-full px-4 py-4 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition text-[15px] placeholder:text-stone-400"
        />

        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            placeholder="Password"
            autoComplete="off"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-700 hover:bg-amber-800 text-white py-4 rounded-full font-semibold disabled:opacity-50 transition shadow-lg shadow-amber-700/20 text-[15px]"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => comingSoon("Password reset")}
          className="text-sm text-amber-800 hover:text-amber-900 font-medium"
        >
          Forgotten password?
        </button>
      </div>

      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-700/20" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#cfc09a] px-4 text-xs uppercase tracking-wider text-stone-600">
            or continue with
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
          onClick={startGoogleLogin}
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
          href="/register"
          className="inline-block w-full px-8 py-3 border-2 border-amber-800 text-amber-800 rounded-full font-semibold hover:bg-amber-800 hover:text-white transition text-[15px]"
        >
          Create new account
        </Link>
      </div>
      <nav aria-label="Legal and help links" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-stone-600 pt-2">
        <Link href="/terms" className="hover:underline">Terms</Link><Link href="/privacy" className="hover:underline">Privacy</Link><Link href="/about" className="hover:underline">About</Link><Link href="/" className="hover:underline">Home</Link>
      </nav>
    </div>
  );
}
