"use client";
import { InterfaceInput, InterfaceText } from "@/components/shared/interface-language";
import { authenticationContinueTarget } from "@/lib/application-return";

import { Eye, EyeOff, LogIn } from "lucide-react";
import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { nativeLoginReturn, nativeAuthHref, nativeReturnCookie } from "@/lib/native-auth-contract";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleError = searchParams.get("error");
  const nativeReturn = nativeLoginReturn(searchParams.get("callbackUrl"));
  const registrationHref = nativeAuthHref("register", nativeReturn);

  function startGoogleLogin() {
    document.cookie = nativeReturnCookie(nativeReturn, window.location.protocol === "https:");
    document.cookie = `google-auth-intent=login; Max-Age=180; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    void signIn("google", { callbackUrl: nativeReturn || authenticationContinueTarget() });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || submitting.current) return;
    submitting.current = true;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim().toLowerCase();
    const password = formData.get("password") as string;

    let result;
    try {
      result = await signIn("credentials", { email, password, redirect: false });
    } catch {
      submitting.current = false;
      setLoading(false);
      toast.error(<InterfaceText source={"Unable to log in right now. Please try again."} />);
      return;
    }

    if (!result || result.error || !result.ok) {
      submitting.current = false;
      setLoading(false);
      toast.error(<InterfaceText source={"Incorrect email or password"} />);
      return;
    }

    if (nativeReturn) {
      router.push(nativeReturn);
      router.refresh();
      return;
    }

    window.location.assign(authenticationContinueTarget());
  }

  return (
    <div className="space-y-4">
      <Link href="/application#/dashboard" className="block min-h-11 text-center font-semibold underline"><InterfaceText source="Browse the public library" /></Link>
      {googleError && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
        {googleError === "GoogleAccountNotFound"
          ? <><InterfaceText source="We could not find an account for this Google email. " /><Link href={registrationHref} className="font-semibold underline"><InterfaceText source="Create an account to continue." /></Link></>
          : googleError === "AccountSuspended"
          ? "This account is not available. Please contact an administrator."
          : "We could not sign you in with Google. Please try again or create an account."}
      </div>}
      <form onSubmit={onSubmit} className="space-y-3" autoComplete="on">
        <InterfaceInput
          id="email"
          name="email"
          type="email"
          required
          placeholder="Email address"
          aria-label="Email address"
          autoComplete="username"
          className="w-full px-4 py-4 bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-transparent transition text-[15px] placeholder:text-stone-400"
        />

        <div className="relative">
          <InterfaceInput
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            placeholder="Password"
            aria-label="Password"
            autoComplete="current-password"
            className="w-full px-4 py-4 bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-transparent transition text-[15px] placeholder:text-stone-400 pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-stone-500 hover:text-teal-800"
          >
            {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full bg-amber-700 hover:bg-amber-800 text-white py-4 rounded-full font-semibold disabled:opacity-50 transition shadow-lg shadow-amber-700/20 text-[15px]"
        >
          <LogIn size={19} aria-hidden="true" /><InterfaceText source={loading ? "Logging in..." : "Log in"} />
        </button>
      </form>

      <div className="text-center">
        <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-medium text-amber-800 hover:text-amber-900"><InterfaceText source="Forgotten password?" /></Link>
      </div>

      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-700/20" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#cfc09a] px-4 text-xs uppercase tracking-wider text-stone-600"><InterfaceText source="or continue with" /></span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
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
          </svg><InterfaceText source="Google" /></button>
      </div>

      <div className="pt-4 text-center">
        <Link
          href={registrationHref}
          className="inline-block w-full px-8 py-3 border-2 border-amber-800 text-amber-800 rounded-full font-semibold hover:bg-amber-800 hover:text-white transition text-[15px]"
        ><InterfaceText source="Create new account" /></Link>
      </div>
      <nav aria-label="Legal and help links" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-stone-600 pt-2">
        <Link href="/help" className="hover:underline"><InterfaceText source="Help" /></Link>
        <Link href="/terms" className="hover:underline"><InterfaceText source="Terms" /></Link><Link href="/privacy" className="hover:underline"><InterfaceText source="Privacy" /></Link><Link href="/about" className="hover:underline"><InterfaceText source="About" /></Link><Link href="/" className="hover:underline"><InterfaceText source="Home" /></Link>
      </nav>
    </div>
  );
}
