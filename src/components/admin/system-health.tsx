export function SystemHealth({
  database,
  storage,
  ai,
  backup,
}: {
  database: "healthy" | "warning" | "error";
  storage: "healthy" | "warning" | "error";
  ai: "healthy" | "warning" | "error";
  backup: "healthy" | "warning" | "error";
}) {
  const items = [
    { label: "Database", status: database },
    { label: "Storage", status: storage },
    { label: "AI API", status: ai },
    { label: "Backup", status: backup },
  ];

  const dotColor: Record<string, string> = {
    healthy: "bg-green-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
        System Health
      </h3>
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.label} className="flex items-center justify-between text-sm">
            <span className="text-stone-700">{it.label}</span>
            <span className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${dotColor[it.status]}`}
              />
              <span className="text-xs text-stone-500 capitalize">
                {it.status}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}