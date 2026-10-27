"use client";
import { InterfaceText } from "@/components/shared/interface-language";
import { PartnerBranding } from "@/components/shared/partner-branding";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import { SidebarPanel, SidebarProvider, useSidebar } from "./sidebar-controls";

export function AdminShell({
  children,
  userEmail,
  userName,
  userImage,
  isSuperAdmin,
  isMasterSuperAdmin,
  roles,
  notificationCount,
  languages,
  selectedLanguageId,
  selectedCultureId,
}: {
  children: React.ReactNode;
  userEmail: string;
  userName: string | null;
  userImage: string | null;
  isSuperAdmin: boolean;
  isMasterSuperAdmin: boolean;
  roles: { role: string; languageId?: number }[];
  notificationCount: number;
  languages: { id: number; code: string; nativeName: string; isActive: boolean }[];
  selectedLanguageId: number | null;
  selectedCultureId: number | null;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const serverRoleSignature = useMemo(() => JSON.stringify({
    roles: [...roles].map(({ role, languageId }) => [role, languageId ?? null]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    isSuperAdmin,
    isMasterSuperAdmin,
  }), [roles, isSuperAdmin, isMasterSuperAdmin]);
  const currentUser = session?.user as { languageRoles?: { role: string; languageId?: number }[]; isSuperAdmin?: boolean; isMasterSuperAdmin?: boolean } | undefined;
  const clientRoleSignature = currentUser ? JSON.stringify({
    roles: [...(currentUser.languageRoles ?? [])].map(({ role, languageId }) => [role, languageId ?? null]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    isSuperAdmin: !!currentUser.isSuperAdmin,
    isMasterSuperAdmin: !!currentUser.isMasterSuperAdmin,
  }) : serverRoleSignature;

  useEffect(() => {
    if (clientRoleSignature !== serverRoleSignature) router.refresh();
  }, [clientRoleSignature, router, serverRoleSignature]);

  return (
    <SidebarProvider id="admin-sidebar" storageKey="luoheritage-admin-sidebar">
      <AdminWorkspace isSuperAdmin={isSuperAdmin} isMasterSuperAdmin={isMasterSuperAdmin} roles={roles} topbar={<AdminTopbar userEmail={userEmail} userName={userName} userImage={userImage} isSuperAdmin={isSuperAdmin} isMasterSuperAdmin={isMasterSuperAdmin} notificationCount={notificationCount} languages={languages} selectedLanguageId={selectedLanguageId} selectedCultureId={selectedCultureId} />}>
        {children}
      </AdminWorkspace>
    </SidebarProvider>
  );
}

function AdminWorkspace({ children, topbar, isSuperAdmin, isMasterSuperAdmin, roles }: { children: React.ReactNode; topbar: React.ReactNode; isSuperAdmin: boolean; isMasterSuperAdmin: boolean; roles: { role: string }[] }) {
  const sidebar = useSidebar();
  const closeMobile = sidebar?.closeMobile;
  const pathname = usePathname();
  useEffect(() => { closeMobile?.(); }, [pathname, closeMobile]);

  return <div className="heritage-app flex h-dvh overflow-hidden bg-[#b89a68]">
      <SidebarPanel width={256}>
        <div className="flex h-20 items-center border-b border-amber-100/15 px-5"><span className="font-serif text-lg text-amber-50"><InterfaceText source="Admin workspace" /></span></div>
        <div className="h-[calc(100%_-_5rem)]"><AdminSidebar isSuperAdmin={isSuperAdmin} isMasterSuperAdmin={isMasterSuperAdmin} roles={roles} onNavigate={closeMobile} /></div>
      </SidebarPanel>
      <div className="relative isolate flex min-w-0 flex-1 flex-col">
        <PartnerBranding />
        {topbar}
        <main className="heritage-canvas relative z-10 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-8">
          <div className="absolute inset-0 opacity-[0.10] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23fff2d3' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "60px 60px" }} />
          <div className="relative z-10 mx-auto w-full min-w-0 max-w-7xl">{children}</div>
        </main>
      </div>
    </div>;
}
