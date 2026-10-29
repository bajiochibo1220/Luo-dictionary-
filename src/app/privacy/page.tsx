import { InterfaceText } from "@/components/shared/interface-language";
import Link from "next/link";
import { BackLink } from "@/components/layout/back-link";
import { getSystemSetting } from "@/lib/settings";
import { DEFAULT_PRIVACY } from "@/lib/legal-content";
import { LegalDocument } from "@/components/legal/legal-document";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const privacy = await getSystemSetting("privacy_content", DEFAULT_PRIVACY);
  return (
    <main className="min-h-screen bg-[#cfc09a] px-5 py-12 text-stone-900">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white/80 p-6 shadow-xs md:p-10">
        <BackLink />
        <p className="mt-8 text-xs uppercase tracking-[0.25em] text-amber-800"><InterfaceText source="Luo Heritage" /></p>
        <h1 className="mt-2 font-serif text-4xl"><InterfaceText source="Privacy Policy" /></h1>
        <nav className="mt-4 flex gap-4 text-sm"><Link href="/terms" className="text-amber-800 underline"><InterfaceText source="Terms and Conditions" /></Link><Link href="/" className="text-amber-800 underline"><InterfaceText source="Home" /></Link></nav>
        <LegalDocument content={privacy} />
        <a className="mt-6 inline-block text-xs underline text-amber-800" href="https://kenyalaw.org/kl/fileadmin/pdfdownloads/Acts/2019/TheDataProtectionAct__No24of2019.pdf"><InterfaceText source="Kenya Data Protection Act, 2019" /></a>
      </article>
    </main>
  );
}
