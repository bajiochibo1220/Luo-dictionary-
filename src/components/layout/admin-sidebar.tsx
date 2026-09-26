"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const LANGUAGE_ADMIN_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: "▦" },
      { label: "Content", href: "/admin/content", icon: "▤" },
      { label: "Review Queue", href: "/admin/review-queue", icon: "◉" },
      { label: "Validation Queue", href: "/admin/validation-queue", icon: "✓" },
    ],
  },
  {
    title: "Library",
    items: [
      { label: "Media", href: "/admin/media", icon: "◨" },
      { label: "Users", href: "/admin/users", icon: "◍" },
      { label: "Translations", href: "/admin/translations", icon: "⌘" },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", href: "/admin/analytics", icon: "▲" },
      { label: "AI Monitoring", href: "/admin/ai-monitoring", icon: "✦" },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: "◈" },
      { label: "Settings", href: "/admin/settings", icon: "⚙" },
    ],
  },
];

const SUPER_ADMIN_SECTION: NavSection = {
  title: "Super Admin",
  items: [
    { label: "Languages", href: "/super-admin/languages", icon: "⌘" },
    { label: "Admins", href: "/super-admin/admins", icon: "◉" },
    { label: "Backup", href: "/super-admin/backup", icon: "▣" },
    { label: "System", href: "/super-admin/system", icon: "⚙" },
  ],
};

export function AdminSidebar({
  isSuperAdmin,
  onNavigate,
}: {
  isSuperAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const renderSection = (section: NavSection, idx: number) => (
    <div key={idx} className="mb-6">
      {section.title && (
        <p className="px-4 mb-2 text-xs uppercase tracking-wider text-stone-500">
          {section.title}
        </p>
      )}
      <nav className="space-y-0.5">
        {section.items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition rounded-lg mx-2 ${
                active
                  ? "bg-amber-600/20 text-amber-300 border-l-2 border-amber-500"
                  : "text-stone-300 hover:bg-stone-800 hover:text-white"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="h-full bg-stone-900 text-stone-100 overflow-y-auto py-4">
      {LANGUAGE_ADMIN_SECTIONS.map(renderSection)}
      {isSuperAdmin && (
        <div className="mt-8 pt-6 border-t border-stone-800">
          {renderSection(SUPER_ADMIN_SECTION, 999)}
        </div>
      )}
    </div>
  );
}