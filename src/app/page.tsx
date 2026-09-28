import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/components/forms/login-form";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-stone-900 mb-2">
          Welcome to LuoLinguaAI
        </h1>
        <p className="text-sm text-stone-700">
          Log in or create an account to begin
        </p>
      </div>

      <Suspense
        fallback={
          <div className="text-center py-8 text-stone-500 text-sm">
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>

      <div className="mt-12 pt-6 border-t border-stone-700/20 text-center">
        <p className="text-xs text-stone-700">JOOUST · NRF · Free Forever</p>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-stone-700">
          <a href="#" className="hover:text-amber-900 transition">
            Help
          </a>
          <span className="text-stone-500">·</span>
          <a href="#" className="hover:text-amber-900 transition">
            Privacy
          </a>
          <span className="text-stone-500">·</span>
          <Link
            href="/admin-login"
            className="hover:text-amber-900 transition font-semibold"
          >
            Super Admin
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}