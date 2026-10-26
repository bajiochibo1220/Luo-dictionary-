import { InterfaceText } from "@/components/shared/interface-language";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { nativeLoginReturn } from "@/lib/native-auth-contract";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const nativeReturn = nativeLoginReturn((await searchParams).callbackUrl);
  const session = await auth();
  if (session?.user?.id) redirect(nativeReturn || "/auth/continue");
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-stone-900 mb-2"><InterfaceText source="Welcome back" /></h1>
        <p className="text-sm text-stone-600"><InterfaceText source="Log in to continue your cultural journey" /></p>
      </div>

      <Suspense
        fallback={
          <div className="text-center py-8 text-stone-400 text-sm"><InterfaceText source="Loading..." /></div>
        }
      >
        <LoginForm />
      </Suspense>

      <div className="mt-12 pt-6 border-t border-stone-300/50 text-center">
        <p className="text-xs text-stone-600"><InterfaceText source="JOOUST · NRF · Free Forever" /></p>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-stone-500">
          <Link href="/" className="hover:text-amber-800 transition"><InterfaceText source="Home" /></Link>
          <span className="text-stone-400">·</span>
          <Link href="/about" className="hover:text-amber-800 transition"><InterfaceText source="Help" /></Link>
          <span className="text-stone-400">·</span>
          <Link href="/privacy" className="hover:text-amber-800 transition"><InterfaceText source="Privacy" /></Link>
        </div>
      </div>
    </div>
  );
}
