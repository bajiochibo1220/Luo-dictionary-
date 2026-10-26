"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { InterfaceText } from "@/components/shared/interface-language";
import Link from "next/link";

export function MaintenanceNotice({ message }: { message: string }) {
  const router = useRouter();
  useEffect(() => {
    const retry = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(retry, 30_000);
    window.addEventListener("focus", retry);
    document.addEventListener("visibilitychange", retry);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", retry);
      document.removeEventListener("visibilitychange", retry);
    };
  }, [router]);
  return <main className="min-h-screen flex items-center justify-center p-8 bg-stone-50">
    <div className="max-w-xl"><h1 className="text-3xl font-serif mb-4"><InterfaceText source="Library maintenance" /></h1>
      <p className="mb-6">{message}</p>
      <div className="flex flex-wrap items-center gap-5">
        <button type="button" onClick={() => router.refresh()} className="rounded-lg bg-stone-900 px-4 py-3 text-white"><InterfaceText source="Try again" /></button>
        <Link href="/login" className="underline"><InterfaceText source="Administrator sign in" /></Link>
      </div></div>
  </main>;
}
