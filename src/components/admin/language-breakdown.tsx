export function LanguageBreakdown({
  languages,
}: {
  languages: {
    code: string;
    name: string;
    nativeName: string;
    isActive: boolean;
    recordCount: number;
    userCount: number;
  }[];
}) {
  const max = Math.max(...languages.map((l) => l.recordCount), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
        Languages
      </h3>
      <div className="space-y-4">
        {languages.map((l) => (
          <div key={l.code}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <span className="text-stone-800 font-medium">
                  {l.nativeName}
                </span>
                <span className="text-xs text-stone-400">({l.name})</span>
                {l.isActive ? (
                  <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                    Active
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded">
                    Inactive
                  </span>
                )}
              </span>
              <span className="text-stone-500 tabular-nums text-xs">
                {l.recordCount} records · {l.userCount} users
              </span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
                style={{ width: `${(l.recordCount / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}