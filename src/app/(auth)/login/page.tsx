import { InterfaceText } from "@/components/shared/interface-language";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
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

    </div>
  );
}
