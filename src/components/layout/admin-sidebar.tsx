"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; icon: string };
type NavSection = { title?: string; items: NavItem[] };
type Role = { role: string };

const DASHBOARD: NavItem = { label: "Dashboard", href: "/admin/dashboard", icon: "▦" };
const ROLE_ITEMS: Record<string, NavItem[]> = {
  uploader: [{ label: "Upload Content", href: "/admin/content", icon: "↑" }],
  cultural_expert: [
    { label: "Cultural Review", href: "/admin/validation-queue", icon: "C" },
    { label: "Review History", href: "/admin/review-history", icon: "H" },
  ],
  content_editor: [{ label: "Editor Queue", href: "/admin/editor-queue", icon: "E" }],
  publisher: [
    { label: "Publishing Queue", href: "/admin/review-queue", icon: "P" },
    { label: "Published History", href: "/admin/published-history", icon: "H" },
  ],
  language_admin: [
    { label: "Content", href: "/admin/content", icon: "C" },
    { label: "Cultural Review", href: "/admin/validation-queue", icon: "R" },
    { label: "Review History", href: "/admin/review-history", icon: "H" },
    { label: "Editor Queue", href: "/admin/editor-queue", icon: "E" },
    { label: "Publishing Queue", href: "/admin/review-queue", icon: "P" },
    { label: "Published History", href: "/admin/published-history", icon: "H" },
    { label: "Media", href: "/admin/media", icon: "M" },
    { label: "Users", href: "/admin/users", icon: "U" },
    { label: "Transcripts", href: "/admin/transcripts", icon: "T" },
    { label: "Translations", href: "/admin/translations", icon: "T" },
    { label: "Analytics", href: "/admin/analytics", icon: "A" },
    { label: "AI Monitoring", href: "/admin/ai-monitoring", icon: "AI" },
  ],
};

const SUPER_ADMIN_SECTIONS: NavSection[] = [
  { title: "Workflow", items: [DASHBOARD, { label: "Content", href: "/admin/content", icon: "▤" }, { label: "Cultural Review", href: "/admin/validation-queue", icon: "C" }, { label: "Review History", href: "/admin/review-history", icon: "H" }, { label: "Editor Queue", href: "/admin/editor-queue", icon: "E" }, { label: "Publishing Queue", href: "/admin/review-queue", icon: "P" }, { label: "Published History", href: "/admin/published-history", icon: "H" }] },
  { title: "Library", items: [{ label: "Media", href: "/admin/media", icon: "◉" }, { label: "Transcripts", href: "/admin/transcripts", icon: "T" }, { label: "Users", href: "/admin/users", icon: "●" }, { label: "Translations", href: "/admin/translations", icon: "⌘" }] },
  { title: "Insights", items: [{ label: "Analytics", href: "/admin/analytics", icon: "▲" }, { label: "AI Monitoring", href: "/admin/ai-monitoring", icon: "✦" }, { label: "Audit Logs", href: "/admin/audit-logs", icon: "◈" }] },
];

const SUPER_ADMIN_SECTION: NavSection = {
  title: "Administration",
  items: [
    { label: "Languages", href: "/super-admin/languages", icon: "⌘" },
    { label: "Admins", href: "/super-admin/admins", icon: "◉" },
    { label: "Backup", href: "/super-admin/backup", icon: "▣" },
    { label: "System", href: "/super-admin/system", icon: "⚙" },
  ],
};

export function AdminSidebar({ isSuperAdmin, roles, onNavigate }: { isSuperAdmin: boolean; roles: Role[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const roleSet = new Set(roles.map(({ role }) => role));
  const uniqueRoleItems = [...new Map([...roleSet].flatMap((role) => ROLE_ITEMS[role] ?? []).map((item) => [item.href, item])).values()];
  const sections: NavSection[] = isSuperAdmin
    ? SUPER_ADMIN_SECTIONS
    : [
        { title: "My Workspace", items: [DASHBOARD, ...uniqueRoleItems] },
      ];

  const renderSection = (section: NavSection, idx: number) => (
    <div key={`${section.title ?? "section"}-${idx}`} className="mb-6">
      {section.title && <p className="mb-2 px-4 text-xs uppercase tracking-wider text-amber-200/70">{section.title}</p>}
      <nav className="space-y-0.5">
        {section.items.map((item) => <Link key={item.href} href={item.href} onClick={onNavigate} className={`mx-2 flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition ${isActive(item.href) ? "border-l-2 border-amber-400 bg-black/25 text-amber-100" : "text-amber-50/80 hover:bg-black/15 hover:text-amber-50"}`}>
          <span className="w-5 text-center text-base">{item.icon}</span><span>{item.label}</span>
        </Link>)}
      </nav>
    </div>
  );

  return <div className="h-full overflow-y-auto bg-transparent py-4 text-amber-50">
    {sections.map(renderSection)}
    {isSuperAdmin && <div className="mt-8 border-t border-amber-100/15 pt-6">{renderSection(SUPER_ADMIN_SECTION, 999)}</div>}
  </div>;
}
