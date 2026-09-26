export function StatCard({
  label,
  value,
  hint,
  accent = "amber",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "amber" | "green" | "blue" | "stone";
}) {
  const accentClasses: Record<string, string> = {
    amber: "border-l-amber-500",
    green: "border-l-green-500",
    blue: "border-l-blue-500",
    stone: "border-l-stone-400",
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-stone-100 border-l-4 ${accentClasses[accent]} p-5`}
    >
      <p className="text-xs uppercase tracking-wider text-stone-500 mb-1">
        {label}
      </p>
      <p className="text-3xl font-serif text-stone-800">{value}</p>
      {hint && <p className="text-xs text-stone-400 mt-2">{hint}</p>}
    </div>
  );
}