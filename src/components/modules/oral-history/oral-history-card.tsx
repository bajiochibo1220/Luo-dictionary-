import Link from "next/link";

type OralHistory = {
  id: string;
  title: string;
  summary?: string | null;
  tags: string[];
  data: {
    narrator?: string;
    community?: string;
    county?: string;
    recorded_date?: string;
    transcript?: string;
  };
};

export function OralHistoryCard({
  item,
  langCode,
}: {
  item: OralHistory;
  langCode: string;
}) {
  const d = item.data;
  const excerpt = (d.transcript || "").slice(0, 160);

  return (
    <Link
      href={`/${langCode}/sigana/${item.id}`}
      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-stone-100 hover:border-amber-300 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-xs uppercase tracking-wider text-amber-600">
            Oral History
          </span>
          {d.county && (
            <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
              {d.county}
            </span>
          )}
        </div>

        <h3 className="text-xl font-serif text-stone-800 mb-2 group-hover:text-amber-700 transition leading-snug">
          {item.title}
        </h3>

        {item.summary && (
          <p className="text-sm text-stone-600 mb-3 line-clamp-2">
            {item.summary}
          </p>
        )}

        {!item.summary && excerpt && (
          <p className="text-sm text-stone-500 mb-3 line-clamp-2 italic">
            {excerpt}...
          </p>
        )}

        <div className="pt-3 border-t border-stone-100 space-y-1 text-xs text-stone-500">
          {d.narrator && (
            <p>
              <span className="text-stone-400">Narrated by:</span>{" "}
              {d.narrator}
            </p>
          )}
          {d.community && (
            <p>
              <span className="text-stone-400">Community:</span>{" "}
              {d.community}
            </p>
          )}
        </div>

        {item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((t, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full"
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