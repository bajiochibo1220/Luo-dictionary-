import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-stone-900 mb-2">
          Welcome back
        </h1>
        <p className="text-sm text-stone-600">
          Log in to continue your cultural journey
        </p>
      </div>

      <Suspense
        fallback={
          <div className="text-center py-8 text-stone-400 text-sm">
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>

      <div className="mt-12 pt-6 border-t border-stone-300/50 text-center">
        <p className="text-xs text-stone-600">JOOUST · NRF · Free Forever</p>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-stone-500">
          <Link href="/" className="hover:text-amber-800 transition">
            Home
          </Link>
          <span className="text-stone-400">·</span>
          <a href="#" className="hover:text-amber-800 transition">
            Help
          </a>
          <span className="text-stone-400">·</span>
          <a href="#" className="hover:text-amber-800 transition">
            Privacy
          </a>
        </div>
      </div>
    </div>
  );
}