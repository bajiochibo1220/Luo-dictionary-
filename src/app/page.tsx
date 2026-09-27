import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="h-screen bg-[#f4efe5] relative overflow-hidden flex flex-col">
      {/* Cultural pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23783408' stroke-width='1'/%3E%3Ccircle cx='30' cy='30' r='6' fill='none' stroke='%23783408' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Warm glows */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-300/40 via-orange-200/30 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-stone-300/40 via-amber-200/40 to-transparent blur-3xl pointer-events-none" />

      {/* TOP BAR */}
      <header className="relative z-20 px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-900/20">
            <span className="text-white font-serif text-lg font-bold">L</span>
          </div>
          <div>
            <p className="font-serif text-lg text-stone-900 leading-tight">
              LuoLinguaAI
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
              JOOUST · NRF
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="text-sm text-stone-700 hover:text-amber-700 px-4 py-2 transition"
        >
          Sign in
        </Link>
      </header>

      {/* CENTER HERO — no scroll */}
      <section className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur border border-amber-200/60 shadow-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs uppercase tracking-[0.15em] text-amber-800 font-medium">
              Preserving Kenya&apos;s Indigenous Languages
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-stone-900 leading-[1.02] tracking-tight mb-8">
            The Dholuo language,
            <br />
            <span className="italic bg-gradient-to-r from-amber-700 via-orange-700 to-amber-800 bg-clip-text text-transparent">
              alive and speaking.
            </span>
          </h1>

          {/* Statement */}
          <p className="text-base md:text-lg text-stone-600 max-w-xl mx-auto leading-relaxed mb-10">
            An AI-powered home for the Dholuo language and Luo indigenous
            knowledge — built for elders, learners, and the generations
            still to come.
          </p>

          {/* Two CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-stone-900 text-white px-10 py-4 rounded-full font-medium hover:bg-amber-700 transition shadow-xl shadow-stone-900/20"
            >
              Create an account
              <span>→</span>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-medium text-stone-800 bg-white/80 backdrop-blur border border-stone-200 hover:border-amber-300 hover:bg-white transition shadow-sm"
            >
              Sign in
            </Link>
          </div>

          <p className="text-xs text-stone-500 mt-8">
            Free forever · Built with the Luo community
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 px-6 md:px-12 py-6 text-center">
        <p className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">
          © {new Date().getFullYear()} LuoLinguaAI · JOOUST/NRF/LuoAI_Repository
        </p>
      </footer>
    </main>
  );
}