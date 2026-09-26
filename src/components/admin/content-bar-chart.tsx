export function ContentBarChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);

  if (data.length === 0) {
    return (
      <p className="text-sm text-stone-400 text-center py-8">
        No content yet
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={d.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-stone-700">{d.label}</span>
              <span className="text-stone-500 tabular-nums">{d.count}</span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}