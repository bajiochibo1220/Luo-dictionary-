export function RecentActivity({
  entries,
}: {
  entries: {
    id: number;
    action: string;
    entityType: string;
    userName: string;
    createdAt: string;
  }[];
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
        Recent Activity
      </h3>

      {entries.length === 0 ? (
        <p className="text-sm text-stone-400 py-4">
          No activity recorded yet
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start gap-3 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-stone-700">
                  <span className="font-medium">{e.userName}</span>{" "}
                  <span className="text-stone-500">{e.action}</span>{" "}
                  <span className="text-stone-400">{e.entityType}</span>
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {e.createdAt}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}