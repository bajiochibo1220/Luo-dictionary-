import Link from "next/link";

const INSTRUMENT_ICONS: Record<string, string> = {
  nyatiti: "🎵",
  orutu: "🎻",
  oporo: "🎺",
  asili: "🪘",
  bul: "🪘",
  tung: "🪘",
  drum: "🥁",
  voice: "🎤",
};

function getIcon(instrument: string): string {
  const key = instrument.toLowerCase();
  for (const [k, v] of Object.entries(INSTRUMENT_ICONS)) {
    if (key.includes(k)) return v;
  }
  return "🎶";
}

type Song = {
  id: string;
  title: string;
  tags: string[];
  data: {
    lyrics?: string;
    translation?: string;
    meaning?: string;
    instruments?: string;
    cultural_context?: string;
  };
};

export function SongCard({
  song,
  langCode,
}: {
  song: Song;
  langCode: string;
}) {
  const d = song.data;
  const instruments = (d.instruments || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <Link
      href={`/${langCode}/wende/${song.id}`}
      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-stone-100 hover:border-amber-300 overflow-hidden"
    >
      <div className="p-6">
        <span className="text-xs uppercase tracking-wider text-amber-600">
          Song
        </span>

        <h3 className="text-xl font-serif text-stone-800 mt-2 mb-3 group-hover:text-amber-700 transition leading-snug">
          {song.title}
        </h3>

        {d.meaning && (
          <p className="text-sm text-stone-600 mb-4 line-clamp-2">
            {d.meaning}
          </p>
        )}

        {instruments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {instruments.slice(0, 3).map((inst, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full"
              >
                <span>{getIcon(inst)}</span>
                {inst}
              </span>
            ))}
          </div>
        )}

        {song.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {song.tags.slice(0, 3).map((t, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}