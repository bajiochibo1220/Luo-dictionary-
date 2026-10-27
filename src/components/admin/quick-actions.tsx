import { InterfaceText } from "@/components/shared/interface-language";
import Link from "next/link";
import { NavigationIcon } from "@/components/shared/navigation-icon";

export function QuickActions({ canBackup = false }: { canBackup?: boolean }) {
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
    <div className="bg-white rounded-xl shadow-xs border border-stone-100 p-6">
      <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-4"><InterfaceText source="Quick Actions" /></h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.filter(action => action.href !== "/super-admin/backup" || canBackup).map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:border-amber-400 hover:bg-amber-50 transition"
          >
            <span className="feature-icon tone-teal"><NavigationIcon href={a.href} /></span>
            <span className="text-sm text-stone-700">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
