"use client";
import { InstallAppButton } from "@/components/pwa/app-installation";
import { InterfaceText } from "@/components/shared/interface-language";

import type { ComponentType, ReactNode } from "react";
import { NavigationIcon } from "./navigation-icon";
import { moduleHref } from "@/lib/app-navigation";

export type ModuleItem = {
  code: string;
  title: string;
  baseName: string;
};

export function AppSidebarView({ modules, pathname, activeModule, onNavigate, Link, staffHref, communityControls }: {
  staffHref?: string;
  communityControls?: ReactNode;
  modules: ModuleItem[];
  pathname: string;
  activeModule: string | null;
  onNavigate?: () => void;
  Link: ComponentType<{ href: string; className?: string; onClick?: () => void; children: ReactNode }>;
}) {
  const items = modules.filter(module => !["ai_tutor", "language_tutor", "tutor", "games", "learning", "cultural_calendar", "chatbot", "research"].includes(module.code));
  const primary = [
    ["/dashboard", "Discover"], ["/explore", "Browse the library"], ["/saved", "Saved words & items"],
  ];
  const more = [
    ["/learn", "Lessons, games & calendar"], ["/tutor", "AI language tutor"],
    ["/chatbot", "CULTURAL HERITAGE"], ["/research", "Research portal"],
    ["/places", "Cultural places map"], ["/knowledge", "Cultural connections"],
    ["/ai-tools", "AI media tools"], ["/courses", "Learning pathways"],
    ["/contribute", "Contribute & submissions"], ["/settings", "Settings"], ["/help", "Help & training"],
  ];
  const linkClass = "sidebar-link flex min-h-12 items-center gap-3 border-l-4 px-5 py-3 text-amber-50 transition-colors hover:bg-black/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200";

  return (
    <div className="flex flex-col h-full">
      {/* Header — taller on mobile to avoid close button overlap */}
      <div className="px-5 pt-5 md:pt-5 pb-3 border-b border-amber-100/15 min-h-[68px] flex items-end">
        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/70 font-medium"><InterfaceText source="Explore" /></p>
      </div>

      {communityControls}
      {/* Module list */}
      <nav aria-label="Public navigation" className="flex-1 overflow-y-auto py-2">
        {primary.map(([href, label]) => {
          const active = pathname === href && !(href === "/dashboard" && activeModule);
          return <Link key={href} href={href} onClick={onNavigate} className={`${linkClass} ${active ? "border-amber-400 bg-black/25 font-semibold" : "border-transparent"}`}><NavigationIcon href={href} /><span aria-current={active ? "page" : undefined}><InterfaceText source={label} /></span></Link>;
        })}
        <details key={`collections:${pathname}:${activeModule || ""}`} open={pathname === "/dashboard" && !!activeModule} className="border-t border-amber-100/15">
          <summary className="min-h-12 cursor-pointer px-5 py-3 font-semibold text-amber-50"><InterfaceText source="Collections" /></summary>
          {items.map(item => {
            const active = pathname === "/dashboard" && activeModule === item.code;
            return <Link key={item.code} href={moduleHref(item.code)} onClick={onNavigate} className={`${linkClass} ${active ? "border-amber-400 bg-black/25 font-semibold" : "border-transparent"}`}><NavigationIcon href={moduleHref(item.code)} /><span aria-current={active ? "page" : undefined}><InterfaceText source={item.baseName} /></span></Link>;
          })}
        </details>
        <details key={`more:${pathname}`} open={more.some(([href]) => pathname === href) || !!staffHref && pathname === staffHref} className="border-t border-amber-100/15">
          <summary className="min-h-12 cursor-pointer px-5 py-3 font-semibold text-amber-50"><InterfaceText source="More & settings" /></summary>
          {staffHref && <Link href={staffHref} onClick={onNavigate} className={`${linkClass} border-transparent`}><InterfaceText source="Staff content workspace" /></Link>}
          {more.map(([href, label]) => <Link key={href} href={href} onClick={onNavigate} className={`${linkClass} ${pathname === href ? "border-amber-400 bg-black/25 font-semibold" : "border-transparent"}`}><NavigationIcon href={href} /><span aria-current={pathname === href ? "page" : undefined}><InterfaceText source={label} /></span></Link>)}
        </details>
      </nav>
      <InstallAppButton />

    </div>
  );
}
