import { redirect } from "next/navigation";
import { nativeLoginReturn, nativeAuthHref } from "@/lib/native-auth-contract";
export default async function Page({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const params = await searchParams;
  redirect(nativeAuthHref("login", nativeLoginReturn(params.callbackUrl)));
}
