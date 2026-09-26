import Link from "next/link";

type Folktale = {
  id: string;
  title: string;
  tags: string[];
  data: {
    original?: string;
    translation?: string;
    moral?: string;
    characters?: string[];
  };
};

export function FolktaleCard({
  tale,
  langCode,
}: {
  tale: Folktale;
  langCode: string;
}) {
  const d = tale.data;
  const preview = (d.translation || d.original || "").slice(0, 140);

  return (
    <Link
      href={`/${langCode}/sigana/folktales/${tale.id}`}
      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-stone-100 hover:border-amber-300 overflow-hidden"
    >
      <div className="p-6">
        <span className="text-xs uppercase tracking-wider text-amber-600">
          Folktale
        </span>

        <h3 className="text-xl font-serif text-stone-800 mt-2 mb-3 group-hover:text-amber-700 transition leading-snug">
          {tale.title}
        </h3>

        {preview && (
          <p className="text-sm text-stone-600 mb-4 line-clamp-3">
            {preview}...
          </p>
        )}

        {d.moral && (
          <div className="mt-3 p-3 bg-amber-50 rounded-lg border-l-4 border-amber-400">
            <p className="text-xs uppercase tracking-wider text-amber-700 mb-1">
              Moral
            </p>
            <p className="text-sm text-stone-700 italic line-clamp-2">
              {d.moral}
            </p>
          </div>
        )}

        {d.characters && d.characters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {d.characters.slice(0, 4).map((c, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}