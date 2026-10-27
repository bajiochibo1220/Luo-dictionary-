import { NavigationIcon } from "@/components/shared/navigation-icon";
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
      className={`metric-card bg-white rounded-2xl border border-stone-100 ${accentClasses[accent]} p-5`}
    >
      <span className={`feature-icon tone-${accent === "amber" ? "gold" : accent === "green" ? "teal" : accent === "stone" ? "violet" : "blue"} mb-4`}><NavigationIcon href={/user|contributor/i.test(label) ? "/admin/users" : /language/i.test(label) ? "/super-admin/languages" : /AI/i.test(label) ? "/admin/ai-monitoring" : /media/i.test(label) ? "/admin/media" : "/admin/content"} /></span>
      <p className="text-xs uppercase tracking-wider text-stone-500 mb-2">
        {label}
      </p>
      <p className="text-3xl font-serif text-stone-800">{value}</p>
      {hint && <p className="text-xs text-stone-400 mt-2">{hint}</p>}
    </div>
  );
}
