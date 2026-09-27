import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="w-full">
      {/* Brand */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-900/20 mb-4">
            <span className="text-white font-serif text-2xl font-bold">L</span>
          </div>
          <p className="font-serif text-2xl text-stone-900">LuoLinguaAI</p>
        </Link>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-stone-900/5 border border-stone-100 p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-medium text-stone-900 mb-1">
            Sign in to LuoLinguaAI
          </h1>
          <p className="text-sm text-stone-500">
            Continue to your cultural journey
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
      </div>

      {/* Footer link */}
      <p className="text-center mt-6 text-sm text-stone-500">
        New to LuoLinguaAI?{" "}
        <Link
          href="/register"
          className="text-amber-700 hover:text-amber-800 font-medium"
        >
          Create an account
        </Link>
      </p>

      <p className="text-center mt-8 text-[10px] text-stone-400 font-mono uppercase tracking-wider">
        JOOUST · NRF · Free Forever
      </p>
    </div>
  );
}