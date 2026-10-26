import { InterfaceText } from "@/components/shared/interface-language";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/account-data";
import { NativeAuthorizationSchema } from "@/lib/native-auth-contract";
import { NativeSignInApproval } from "@/components/forms/native-sign-in-approval";

export const dynamic = "force-dynamic";
export const metadata = { title: "Continue to Luo Heritage", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function MobileAuthPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const input = NativeAuthorizationSchema.safeParse({ challenge: parameters.challenge, state: parameters.state });
  if (!input.success) return <div role="alert"><h1 className="font-serif text-3xl"><InterfaceText source="Start sign-in from the app" /></h1><p className="mt-3"><InterfaceText source="Open Luo Heritage on your phone and select Sign in again." /></p></div>;
  const account = await getCurrentAccount();
  if (!account) redirect(`/login?callbackUrl=${encodeURIComponent(`/mobile-auth?${new URLSearchParams(input.data)}`)}`);
  return <NativeSignInApproval name={account.name || account.email} authorization={input.data} />;
}
