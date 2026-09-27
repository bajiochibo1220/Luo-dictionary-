import { Suspense } from "react";
import Link from "next/link";
import { RegisterForm } from "@/components/forms/register-form";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-stone-900 mb-2">
          Get started
        </h1>
        <p className="text-sm text-stone-600">
          Create an account to join the community
        </p>
      </div>

      <Suspense
        fallback={
          <div className="text-center py-8 text-stone-400 text-sm">
            Loading...
          </div>
        }
      >
        <RegisterForm />
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