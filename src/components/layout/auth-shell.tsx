export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT — form */}
      <main className="relative flex-1 flex items-center justify-center px-6 py-12 lg:px-16 bg-[#cfc09a] overflow-hidden">
        {/* Diamond pattern */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%234a2110' stroke-width='1'/%3E%3Ccircle cx='30' cy='30' r='6' fill='none' stroke='%234a2110' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Warm glows */}
        <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] rounded-full bg-amber-200/50 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-[300px] h-[300px] rounded-full bg-orange-200/40 blur-3xl pointer-events-none" />

        {/* Mobile logo */}
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2 z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
            <span className="text-white font-serif text-sm font-bold">L</span>
          </div>
          <p className="font-serif text-lg text-stone-900">LuoLinguaAI</p>
        </div>

        <div className="relative w-full max-w-md">{children}</div>
      </main>

      {/* RIGHT — brand story */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#3d1a0a] via-[#6b3416] to-[#8f4e1f] text-white">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='white' stroke-width='1'/%3E%3Ccircle cx='30' cy='30' r='6' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-amber-400/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center">
              <span className="text-white font-serif text-2xl font-bold">L</span>
            </div>
            <div>
              <p className="font-serif text-2xl leading-tight">LuoLinguaAI</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/70">
                JOOUST · NRF
              </p>
            </div>
          </div>

          <div className="max-w-lg">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300 font-medium mb-6">
              Preserving Kenya&apos;s Indigenous Languages
            </p>

            <h1 className="font-serif text-5xl leading-[1.05] mb-8">
              Every language
              <br />
              carries a
              <span className="italic text-amber-300"> universe.</span>
            </h1>

            <p className="text-lg text-amber-50/80 leading-relaxed mb-10">
              Join the community preserving the Dholuo language and Luo
              indigenous knowledge — for elders, learners, and every
              generation still to come.
            </p>

            <div className="space-y-4">
              <FeatureRow icon="📖" title="Living Dictionary" text="Words, examples, audio, and grammar" />
              <FeatureRow icon="🗣️" title="Elder Contributions" text="Direct from the Luo community" />
              <FeatureRow icon="✨" title="AI Cultural Assistant" text="Answers grounded in curated content" />
              <FeatureRow icon="🌍" title="Replicable for All Kenya" text="One platform, many languages" />
            </div>
          </div>

          <div>
            <div className="w-16 h-0.5 bg-amber-400 mb-4" />
            <p className="text-sm text-amber-200/60 max-w-md leading-relaxed italic">
              &ldquo;A people without the knowledge of their past history,
              origin and culture is like a tree without roots.&rdquo;
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center text-lg flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-amber-100/70 mt-0.5">{text}</p>
      </div>
    </div>
  );
}