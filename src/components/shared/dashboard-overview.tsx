export function DashboardOverview({ languageName, name }: { languageName: string; name?: string | null }) {
  return (
    <div className="p-4 md:p-10">
      <header className="workspace-heading mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-800/60 font-semibold mb-2">{languageName} · Overview</p>
        <h2 className="font-serif text-4xl md:text-5xl text-stone-900 leading-tight mb-3">Welcome{name ? `, ${name.split(" ")[0]}` : ""}</h2>
        <div className="w-16 h-1 bg-amber-800/70 rounded-full" />
      </header>
      <div className="max-w-2xl space-y-4">
        <p className="text-lg md:text-xl text-stone-900/90 leading-relaxed font-serif">A public library of community language, culture and living memory.</p>
        <p className="text-base text-stone-800/80 leading-relaxed">
          Use the filter tabs at the top of each module to browse by{" "}
          <span className="font-semibold text-amber-900">images</span>,{" "}
          <span className="font-semibold text-amber-900">audio</span>,{" "}
          <span className="font-semibold text-amber-900">video</span>, or{" "}
          <span className="font-semibold text-amber-900">transcripts</span>.
        </p>
        <p className="text-base text-stone-800/80 leading-relaxed">Explore stories, traditions and recordings at your own pace. Switch between the community language and its English version, or download available files to keep learning offline.</p>
        <p className="text-base text-stone-800/80 leading-relaxed">Community language: <strong className="text-amber-900 font-semibold">{languageName}</strong></p>
      </div>
    </div>
  );
}
