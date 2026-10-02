import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [defaultLanguage, languages] = await Promise.all([
    prisma.language.findFirst({
      where: { isActive: true, isDefault: true },
      select: { code: true },
    }),
    prisma.language.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }],
      select: { code: true },
    }),
  ]);

  const language = defaultLanguage ?? languages[0];
  if (language) redirect(`/${language.code}`);

  return (
    <main className="grid min-h-screen place-items-center bg-[#b89a68] px-5 py-12 text-center text-stone-900">
      <section className="max-w-xl rounded-3xl border border-white/50 bg-white/85 p-8 shadow-xl md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-800">JOOUST · NRF</p>
        <h1 className="mt-3 font-serif text-4xl">LuoLinguaAI</h1>
        <p className="mt-4 text-stone-600">The public language collection is being prepared. Sign in to continue to your account.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="rounded-full bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white">Sign in</Link>
          <Link href="/register" className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700">Join the community</Link>
        </div>
      </section>
    </main>
  );
}
