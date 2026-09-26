import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const languages = await prisma.language.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      nativeName: true,
      flagIcon: true,
    },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-stone-100">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        {/* Hero */}
        <header className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-serif text-stone-800 mb-4">
            LuoLinguaAI
          </h1>
          <p className="text-lg md:text-xl text-stone-600 max-w-2xl mx-auto">
            Preserving language. Celebrating culture. Empowering communities.
          </p>
          <p className="text-sm text-stone-500 mt-4 max-w-xl mx-auto">
            An AI-powered platform for the preservation, learning, and
            promotion of Dholuo language and Luo indigenous knowledge.
          </p>
        </header>

        {/* Language selection */}
        <section className="w-full max-w-4xl">
          <h2 className="text-2xl text-stone-700 text-center mb-8 font-serif">
            Choose your language
          </h2>

          {languages.length === 0 ? (
            <div className="text-center text-stone-500">
              <p>No languages are currently active.</p>
              <p className="text-sm mt-2">
                Ask a super admin to seed or activate a language.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {languages.map((lang) => (
                <Link
                  key={lang.id}
                  href={`/${lang.code}`}
                  className="group block p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-amber-400"
                >
                  <div className="text-5xl mb-4 text-center">
                    {lang.flagIcon || "🌍"}
                  </div>
                  <h3 className="text-2xl font-serif text-stone-800 mb-1 text-center group-hover:text-amber-700 transition">
                    {lang.nativeName}
                  </h3>
                  <p className="text-sm text-stone-500 text-center">
                    {lang.name}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-20 text-center text-xs text-stone-400">
          <p>
            © {new Date().getFullYear()} LuoLinguaAI · Jaramogi Oginga Odinga
            University of Science and Technology
          </p>
          <p className="mt-1">
            NRF Repository Namespace: JOOUST/NRF/LuoAI_Repository
          </p>
        </footer>
      </div>
    </main>
  );
}