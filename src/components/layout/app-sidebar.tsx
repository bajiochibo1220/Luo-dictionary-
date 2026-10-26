"use client";

import { NavigationLink } from "./navigation-link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSidebar } from "./sidebar-controls";
import { AppSidebarView, type ModuleItem } from "@/components/shared/app-sidebar-view";

export function AppSidebar({ modules, isStaff = false }: { modules: ModuleItem[]; isStaff?: boolean }) {
  return <AppSidebarView staffHref={isStaff ? "/auth/continue" : undefined} modules={modules} pathname={usePathname()} activeModule={useSearchParams().get("module")} onNavigate={useSidebar()?.closeMobile} Link={NavigationLink} />;
}
