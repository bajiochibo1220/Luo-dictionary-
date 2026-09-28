"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import {
  DateOfBirthPicker,
  DateOfBirth,
} from "./date-of-birth-picker";

type Language = { id: number; code: string; name: string; nativeName: string };

export function AdminRegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [dob, setDob] = useState<DateOfBirth>({
    day: null,
    month: null,
    year: null,
  });

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => setLanguages(data.data || []))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!dob.day || !dob.month || !dob.year) {
      toast.error("Please enter your full date of birth");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      dateOfBirth: { day: dob.day, month: dob.month, year: dob.year },
      role: "registered",
      languageId: Number(formData.get("languageId")),
    };

    const res = await fetch("/api/auth/admin-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      toast.error(data.error || "Setup failed");
      return;
    }

    toast.success("Super admin account created. Signing in...");

    await signIn("credentials", {
      email: body.email,
      password: body.password,
      redirect: false,
    });

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        name="name"
        required
        minLength={2}
        placeholder="Full name"
        className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition text-[15px] text-stone-900 placeholder:text-stone-400"
      />

      <input
        name="email"
        type="email"
        required
        placeholder="Email address"
        className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition text-[15px] text-stone-900 placeholder:text-stone-400"
      />

      <div className="relative">
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition text-[15px] text-stone-900 placeholder:text-stone-400 pr-16"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-500 hover:text-amber-700"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>

      <DateOfBirthPicker
        value={dob}
        onChange={setDob}
        label="Date of birth"
        helpText="Must be 18 or older to hold a super admin account."
      />

      <select
        name="languageId"
        required
        defaultValue=""
        className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition text-[15px] text-stone-800"
      >
        <option value="" disabled>
          Select primary language
        </option>
        {languages.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nativeName} ({l.name})
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3.5 rounded-full font-semibold disabled:opacity-50 transition shadow-lg shadow-amber-700/20 text-[15px] mt-2"
      >
        {loading ? "Creating..." : "Create super admin account"}
      </button>

      <p className="text-xs text-stone-500 text-center pt-2 leading-relaxed">
        This page can only be used once. After you create the super admin, the
        setup locks and all other admins must be created from inside the
        dashboard.
      </p>
    </form>
  );
}