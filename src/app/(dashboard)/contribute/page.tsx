import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BackLink } from "@/components/layout/back-link";

export default async function ContributeHubPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const languageRoles = (user.languageRoles ?? []) as any[];
  const primaryRole = languageRoles[0];
  const languageId = primaryRole?.languageId;
  const languageName = primaryRole?.languageName ?? "Dholuo";

  if (!languageId) {
    return (
      <div className="p-6 md:p-10 pt-20 md:pt-10">
        <BackLink href="/dashboard" label="Back" variant="on-sand" />
        <div className="mt-6 max-w-xl">
          <p className="font-serif text-2xl text-stone-900">
            You are not assigned to a language yet.
          </p>
        </div>
      </div>
    );
  }

  const modules = await prisma.module.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    include: {
      translations: { where: { languageId } },
      _count: {
        select: {
          culturalRecords: { where: { languageId, status: "published" } },
        },
      },
    },
  });

  return (
    <div className="p-6 md:p-10 pt-20 md:pt-10">
      <div className="mb-4">
        <BackLink href="/dashboard" label="Back to dashboard" variant="on-sand" />
      </div>

      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-800/60 font-semibold mb-1">
          {languageName} · Contribute
        </p>
        <h2 className="font-serif text-3xl md:text-4xl text-stone-900 leading-tight mb-2">
          What would you like to share?
        </h2>
        <p className="text-sm text-stone-800/70 max-w-2xl leading-relaxed">
          Pick a module below. Your contribution will be reviewed and
          published.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map((m) => {
          const title = m.translations[0]?.title ?? m.baseName;
          const count = m._count.culturalRecords;

          return (
            <Link
              key={m.id}
              href={`/contribute/${m.code}`}
              className="group relative bg-black/5 backdrop-blur rounded-2xl border border-stone-900/10 p-6 shadow-md hover:shadow-2xl hover:border-amber-800/50 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-inner">
                  <span className="text-2xl">{iconFor(m.code)}</span>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-amber-900/60 font-semibold">
                  {count} {count === 1 ? "entry" : "entries"}
                </span>
              </div>

              <h3 className="font-serif text-xl text-stone-900 mb-1 leading-tight group-hover:text-amber-900 transition">
                {title}
              </h3>
              <p className="text-[11px] uppercase tracking-widest text-stone-800/50 mb-4">
                {m.baseName}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-stone-900/10">
                <span className="text-xs font-semibold text-amber-900">
                  + Add contribution
                </span>
                <span className="w-8 h-8 rounded-full bg-black/5 group-hover:bg-amber-700 flex items-center justify-center text-stone-600 group-hover:text-white transition-all duration-300 group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function iconFor(code: string): string {
  const map: Record<string, string> = {
    dictionary: "📖",
    proverbs: "🗣️",
    riddles: "🧩",
    oral_histories: "📜",
    folktales: "📖",
    songs: "🎵",
    artifacts: "🏺",
    heritage_sites: "🗺️",
    cultural_calendar: "📅",
    audio_visual: "🎙️",
    chatbot: "💬",
    games: "🎮",
    learning: "🎓",
    ai_tutor: "🤖",
    research: "🔬",
  };
  return map[code] ?? "📎";
}