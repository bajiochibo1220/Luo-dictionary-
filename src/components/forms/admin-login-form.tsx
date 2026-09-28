"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AdminLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      toast.error("Invalid email or password");
      return;
    }

    try {
      const sessionRes = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      const session = await sessionRes.json();
      const user = session?.user as any;

      // ── This portal is for the SUPER ADMIN ONLY
      const isSuperAdmin = user?.isSuperAdmin === true;

      if (!isSuperAdmin) {
        await fetch("/api/auth/signout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callbackUrl: "/admin-login" }),
        });
        setLoading(false);
        toast.error(
          "This portal is reserved for the super admin. Use the public login instead."
        );
        return;
      }

      toast.success("Welcome, super admin");
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      toast.error("Could not verify admin access");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1.5 font-semibold">
          Super Admin Email
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@example.com"
          className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition text-[15px] text-stone-900 placeholder:text-stone-400"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1.5 font-semibold">
          Password
        </label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
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
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3.5 rounded-full font-semibold disabled:opacity-50 transition shadow-lg shadow-amber-700/20 text-[15px]"
      >
        {loading ? "Verifying..." : "Sign in to Admin Portal"}
      </button>

      <p className="text-xs text-stone-500 text-center pt-2 leading-relaxed">
        This portal is for the <strong>super admin</strong> only. Other
        administrators (moderators, editors, cultural experts, language
        admins) should sign in through the{" "}
        <a href="/" className="text-amber-800 hover:underline font-medium">
          public login page
        </a>
        .
      </p>
    </form>
  );
}