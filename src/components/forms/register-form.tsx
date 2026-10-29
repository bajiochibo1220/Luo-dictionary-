"use client";
import { InterfaceButton, InterfaceInput, InterfaceOption, InterfaceSelect, InterfaceText } from "@/components/shared/interface-language";

import { authenticationContinueTarget } from "@/lib/application-return";

import Link from "next/link";

import { Eye, EyeOff } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { nativeLoginReturn, nativeAuthHref, nativeReturnCookie } from "@/lib/native-auth-contract";
import {
  DateOfBirthPicker,
  DateOfBirth,
} from "./date-of-birth-picker";

type Language = { id: number; code: string; name: string; nativeName: string; isActive?: boolean };

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nativeReturn = nativeLoginReturn(searchParams.get("callbackUrl"));
  const loginHref = nativeAuthHref("login", nativeReturn);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [dob, setDob] = useState<DateOfBirth>({
    day: null,
    month: null,
    year: null,
  });

  const [languagesError, setLanguagesError] = useState("");
  const [languageAttempt, setLanguageAttempt] = useState(0);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  useEffect(() => {
    let active = true; const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLanguagesError(""); setLoadingLanguages(true);
    void fetch("/api/languages", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (!Array.isArray(result.data)) throw new Error();
      const available = result.data.filter((item: Language) => item.code !== "eng" && item.isActive !== false);
      if (!available.length) throw new Error();
      if (active) setLanguages(available);
    }).catch(() => { if (active) { setLanguages([]); setLanguagesError("Community languages could not load. Please retry."); } })
      .finally(() => { clearTimeout(timeout); if (active) setLoadingLanguages(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [languageAttempt]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || submitting.current) return;

    if (!dob.day || !dob.month || !dob.year) {
      toast.error(<InterfaceText source={"Please enter your full date of birth"} />);
      return;
    }

    submitting.current = true;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      email: (formData.get("email") as string).trim().toLowerCase(),
      password: formData.get("password") as string,
      dateOfBirth: { day: dob.day, month: dob.month, year: dob.year },
      interests: formData.getAll("interests") as string[],
      languageId: Number(formData.get("languageId")),
      acceptedTerms: formData.get("acceptedTerms") === "on",
    };

    let data: any;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(40000),
      });
      data = await res.json();
      if (!res.ok) data = { success: false, error: typeof data?.error === "string" ? data.error : "Registration failed" };
    } catch {
      submitting.current = false;
      setLoading(false);
      toast.error(<InterfaceText source={"Unable to create your account right now. Please try again."} />);
      return;
    }
    if (data?.success !== true) {
      submitting.current = false;
      setLoading(false);
      toast.error(<InterfaceText source={typeof data?.error === "string" ? data.error : "Registration failed"} />);
      return;
    }

    if (data.data?.status === "pending") {
      toast.success(<InterfaceText source={"Account created. It is awaiting approval before you can continue."} />);
      router.push(nativeAuthHref("login", nativeReturn, { registered: "pending" }));
      return;
    }

    toast.success(<InterfaceText source={"Account created. Signing in..."} />);
    let signInResult;
    try {
      signInResult = await signIn("credentials", { email: body.email, password: body.password, redirect: false });
    } catch {
      toast.error(<InterfaceText source={"Account created, but sign in could not connect. Please log in with your email and password."} />);
      router.push(loginHref); router.refresh(); return;
    }
    if (!signInResult || signInResult.error || !signInResult.ok) {
      toast.error(<InterfaceText source={"Account created, but sign in failed. Please log in with your email and password."} />);
      router.push(loginHref);
      router.refresh();
      return;
    }
    window.location.assign(nativeReturn || authenticationContinueTarget());
  }

  function startGoogleSignup() {
    document.cookie = nativeReturnCookie(nativeReturn, window.location.protocol === "https:");
    document.cookie = `google-auth-intent=register; Max-Age=180; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    void signIn("google", { callbackUrl: nativeReturn || authenticationContinueTarget() });
  }

  return (
    <div className="space-y-4">
      <Link href="/application#/dashboard" className="block min-h-11 text-center font-semibold underline"><InterfaceText source="Browse the public library" /></Link>
      <form onSubmit={onSubmit} className="space-y-3">
        <InterfaceInput
          name="name"
          required
          minLength={2}
          placeholder="Full name" aria-label="Full name"
          autoComplete="name"
          className="w-full px-4 py-3.5 bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-[15px] placeholder:text-stone-400"
        />

        <InterfaceInput
          name="email"
          type="email"
          required
          placeholder="Email address" aria-label="Email address"
          autoComplete="email"
          className="w-full px-4 py-3.5 bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-[15px] placeholder:text-stone-400"
        />

        <DateOfBirthPicker
          value={dob}
          onChange={setDob}
          label="Date of birth"
          helpText="Used to help moderators assess the authenticity of cultural contributions."
        />

        <div className="relative">
          <InterfaceInput
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder="Password (min 8 characters)" aria-label="Password"
            autoComplete="new-password" maxLength={72}
            className="w-full px-4 py-3.5 bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-[15px] placeholder:text-stone-400 pr-16"
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

        <InterfaceSelect
          name="languageId"
          aria-label="Choose your community language"
          required
          defaultValue=""
          className="w-full px-4 py-3.5 bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-[15px] text-stone-700"
        >
          <InterfaceOption value="" disabled>
            Select your language
          </InterfaceOption>
          {languages.map((l) => (
            <InterfaceOption key={l.id} value={l.id}>
              {l.nativeName} ({l.name})
            </InterfaceOption>
          ))}
        </InterfaceSelect>

        {languagesError && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800"><InterfaceText source={languagesError} /><button type="button" className="ml-2 min-h-11 font-semibold underline" onClick={() => setLanguageAttempt(value => value + 1)}><InterfaceText source="Retry loading languages" /></button></div>}
        <fieldset className="rounded-xl border border-stone-300 bg-white p-4">
          <legend className="px-1 text-sm font-medium text-stone-700"><InterfaceText source="How do you plan to use Luo Heritage? (Choose any)" /></legend>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-stone-700">
            {["Student", "Researcher", "Contributor", "Teacher", "Community member"].map((interest) => (
              <label key={interest} className="flex items-center gap-2"><input type="checkbox" name="interests" value={interest.toLowerCase().replaceAll(" ", "_")} /><InterfaceText source={interest} /></label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading || loadingLanguages || !languages.length}
          className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3.5 rounded-full font-semibold disabled:opacity-50 transition shadow-lg text-[15px]"
        >
          <InterfaceText source={loading ? "Creating account..." : "Create account"} />
        </button>

        <label className="flex items-start gap-2 text-xs text-stone-700 leading-relaxed pt-2">
          <input type="checkbox" name="acceptedTerms" required checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 accent-amber-700" />
          <span><InterfaceText source="I accept the " /><a className="font-semibold underline" href="/terms" target="_blank"><InterfaceText source="Terms of Service" /></a><InterfaceText source=" and " /><a className="font-semibold underline" href="/privacy" target="_blank"><InterfaceText source="Privacy Policy" /></a><InterfaceText source=", and agree to contribute respectfully." /></span>
        </label>
      </form>

      <div className="relative py-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-300/60" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#cfc09a] px-3 text-xs uppercase tracking-wider text-stone-500"><InterfaceText source="or" /></span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <InterfaceButton
          type="button"
          onClick={startGoogleSignup}
          aria-label="Continue with Google"
          disabled={!acceptedTerms}
          className="flex items-center justify-center py-3 bg-white border border-stone-300 rounded-full hover:bg-stone-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="ml-2"><InterfaceText source="Continue with Google" /></span>
        </InterfaceButton>
      </div>

      <nav aria-label="Legal and help links" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-stone-600 pt-2">
        <a href="/terms" className="hover:underline"><InterfaceText source="Terms" /></a><a href="/privacy" className="hover:underline"><InterfaceText source="Privacy" /></a><a href="/about" className="hover:underline"><InterfaceText source="About" /></a><Link href="/" className="hover:underline"><InterfaceText source="Home" /></Link>
      </nav>
      <p className="text-center text-sm text-stone-700"><InterfaceText source="Already have an account? " /><Link href={loginHref} className="font-semibold text-amber-800 underline"><InterfaceText source="Sign in" /></Link></p>
    </div>
  );
}
