import { Suspense } from "react";
import { AccountRecoveryForm } from "@/components/forms/account-recovery-form";
export const metadata = { title: "Account recovery", referrer: "no-referrer" };
export default function Page() { return <Suspense fallback={<p>Loading…</p>}><AccountRecoveryForm /></Suspense>; }
