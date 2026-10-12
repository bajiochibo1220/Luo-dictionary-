import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
export const metadata = {
  title: "Mobile Apps · Luo Heritage",
  description: "Install Luo Heritage on your phone from your browser.",
};

export default function MobileAppsPage() {
  return (
    <main className="min-h-screen bg-[#cfc09a] px-5 py-12 text-stone-900">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-900">Luo Heritage mobile</p>
        <h1 className="mt-3 font-serif text-4xl">Use Luo Heritage on your phone</h1>
        <p className="mt-3 max-w-2xl text-stone-700">
          Open an app page in Chrome on Android, then tap <strong>Install app</strong> or use the browser menu and choose <strong>Install app</strong> / <strong>Add to Home screen</strong>. The apps also continue to work in your browser.
        </p>
        <div className="mt-8 max-w-xl">
          <section className="rounded-2xl bg-[#b89a68] p-6 shadow-xs">
            <BrandMark className="h-20 w-20 shadow-lg" />
            <h2 className="mt-4 font-serif text-2xl">Luo Heritage</h2>
            <p className="mt-2 text-sm text-stone-700">Everyone signs in through the same page. Your account permissions take you to the public or administration area that you can access.</p>
            <Link href="/login" className="mt-5 inline-flex rounded-full bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-900">Open Luo Heritage</Link>
          </section>
        </div>
        <p className="mt-8 text-xs text-stone-600">
          App installation is provided by the phone browser. Administrative accounts are created by authorized Super Admins; public registration does not grant administrative access.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-amber-900 underline">Return to Luo Heritage</Link>
      </div>
    </main>
  );
}
