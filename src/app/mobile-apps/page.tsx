import Link from "next/link";

export const metadata = {
  title: "Mobile Apps · LuoLinguaAI",
  description: "Install LuoLinguaAI and LuoLinguaAI Super Admin on your phone from your browser.",
};

export default function MobileAppsPage() {
  return (
    <main className="min-h-screen bg-[#cfc09a] px-5 py-12 text-stone-900">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-900">LuoLinguaAI mobile</p>
        <h1 className="mt-3 font-serif text-4xl">Choose your app</h1>
        <p className="mt-3 max-w-2xl text-stone-700">
          Open an app page in Chrome on Android, then tap <strong>Install app</strong> or use the browser menu and choose <strong>Install app</strong> / <strong>Add to Home screen</strong>. The apps also continue to work in your browser.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <section className="rounded-2xl bg-[#b89a68] p-6 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 font-serif text-3xl font-bold">L</div>
            <h2 className="mt-4 font-serif text-2xl">LuoLinguaAI</h2>
            <p className="mt-2 text-sm text-stone-700">For the public and language administrators. Accounts created here remain public accounts unless a Super Admin separately grants them an admin role.</p>
            <a href="/login" className="mt-5 inline-flex rounded-full bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-900">Open public app</a>
          </section>
          <section className="rounded-2xl bg-[#5c3a1c] p-6 text-amber-50 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-3xl">✓</div>
            <h2 className="mt-4 font-serif text-2xl">LuoLinguaAI Super Admin</h2>
            <p className="mt-2 text-sm text-amber-100/80">A separate, secure sign-in entry for Super Admin accounts.</p>
            <a href="/admin-login" className="mt-5 inline-flex rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400">Open Super Admin app</a>
          </section>
        </div>
        <p className="mt-8 text-xs text-stone-600">
          App installation is provided by the phone browser. Super Admins can create other administrator accounts after signing in; public sign-up does not grant administrative access.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-amber-900 underline">Return to LuoLinguaAI</Link>
      </div>
    </main>
  );
}
