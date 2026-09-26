export function ContributorList({
  contributors,
}: {
  contributors: { name: string; count: number; email: string }[];
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
        Recent Contributors
      </h3>

      {contributors.length === 0 ? (
        <p className="text-sm text-stone-400 py-4">
          No contributions yet
        </p>
      ) : (
        <ul className="space-y-3">
          {contributors.map((c, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-medium">
                {(c.name || c.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-800 truncate">
                  {c.name || "Anonymous"}
                </p>
                <p className="text-xs text-stone-400 truncate">{c.email}</p>
              </div>
              <span className="text-sm text-stone-500 tabular-nums">
                {c.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}