import Link from "next/link";

export function QuickActions() {
  const actions = [
    {
      label: "Add Language",
      href: "/super-admin/languages/new",
      icon: "＋",
    },
    { label: "Add Admin", href: "/super-admin/admins", icon: "◉" },
    { label: "Backup Now", href: "/super-admin/backup", icon: "▣" },
    { label: "View Reports", href: "/admin/analytics", icon: "▲" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:border-amber-400 hover:bg-amber-50 transition"
          >
            <span className="text-lg text-amber-600">{a.icon}</span>
            <span className="text-sm text-stone-700">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}