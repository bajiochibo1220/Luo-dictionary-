"use client";
import { InterfaceText } from "@/components/shared/interface-language";

import type { ComponentType, ReactNode } from "react";
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
  const items = [
    { code: "", title: "Explore heritage", baseName: "Public library" },
    ...modules.filter(module=>!["ai_tutor","games","learning","cultural_calendar"].includes(module.code)),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header — taller on mobile to avoid close button overlap */}
      <div className="px-5 pt-5 md:pt-5 pb-3 border-b border-amber-100/15 min-h-[68px] flex items-end">
        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/70 font-medium"><InterfaceText source="Modules" /></p>
      </div>

      {communityControls}
      {/* Module list */}
      <nav className="flex-1 overflow-y-auto py-2">
        {staffHref && <Link href={staffHref} onClick={onNavigate} className="flex min-h-12 items-center px-5 py-3 font-semibold text-amber-50 hover:bg-black/15"><InterfaceText source="Staff content workspace" /></Link>}
        <Link href="/places" onClick={onNavigate} className="flex min-h-12 items-center px-5 py-3 font-semibold text-amber-50 hover:bg-black/15"><InterfaceText source="Cultural places map" /></Link>
        <Link href="/knowledge" onClick={onNavigate} className="flex min-h-12 items-center px-5 py-3 font-semibold text-amber-50 hover:bg-black/15"><InterfaceText source="Cultural connections" /></Link>
        <Link href="/ai-tools" onClick={onNavigate} className="flex min-h-12 items-center px-5 py-3 font-semibold text-amber-50 hover:bg-black/15"><InterfaceText source="AI media tools" /></Link>
        <Link href="/tutor" onClick={onNavigate} className="flex min-h-12 items-center px-5 py-3 font-semibold text-amber-50 hover:bg-black/15"><InterfaceText source="AI language tutor" /></Link>
        <Link href="/learn" onClick={onNavigate} className="flex min-h-12 items-center px-5 py-3 font-semibold text-amber-50 hover:bg-black/15"><InterfaceText source="Lessons, games & calendar" /></Link>
        <Link href="/courses" onClick={onNavigate} className="flex min-h-12 items-center px-5 py-3 font-semibold text-amber-50 hover:bg-black/15"><InterfaceText source="Explore at your own pace" /></Link>
        <Link href="/settings" onClick={onNavigate} className="flex min-h-12 items-center px-5 py-3 font-semibold text-amber-50 hover:bg-black/15"><InterfaceText source="Settings" /></Link>
        <Link href="/contribute" onClick={onNavigate} className="flex min-h-12 items-center px-5 py-3 font-semibold text-amber-50 hover:bg-black/15"><InterfaceText source="Contribute & submissions" /></Link>
        <Link href="/saved" onClick={onNavigate} className="flex min-h-12 items-center px-5 py-3 font-semibold text-amber-50 hover:bg-black/15"><InterfaceText source="Saved words & items" /></Link>
        <Link href="/help" onClick={onNavigate} className="flex min-h-12 items-center px-5 py-3 font-semibold text-amber-50 hover:bg-black/15" ><InterfaceText source="Help & training" /></Link>
        {items.map((item) => {
          const isActive = item.code === "chatbot" ? pathname === "/chatbot" :
            (pathname === "/dashboard" && item.code === "" && !activeModule) ||
            (pathname === "/dashboard" && item.code !== "" && activeModule === item.code);
          const href = moduleHref(item.code);

          return (
            <Link
              key={item.code || "overview"}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-5 py-3 transition-all relative border-l-4 ${
                isActive
                  ? "bg-black/25 border-amber-400"
                  : "border-transparent hover:bg-black/15"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`font-serif truncate leading-tight ${
                    isActive
                      ? "text-amber-100 text-[17px] font-semibold"
                      : "text-amber-50/90 text-[16px]"
                  }`}
                >
                  <InterfaceText source={item.baseName} />
                </p>
              </div>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
