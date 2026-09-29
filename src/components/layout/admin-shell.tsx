"use client";

import { useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

export function AdminShell({
  children,
  userEmail,
  userName,
  userImage,
  isSuperAdmin,
  notificationCount,
}: {
  children: React.ReactNode;
  userEmail: string;
  userName: string | null;
  userImage: string | null;
  isSuperAdmin: boolean;
  notificationCount: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#b89a68]">
      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 w-64 bg-[#6b4724] text-amber-50 z-20 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23fbe8c4' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "60px 60px" }} />
        <div className="relative h-16 flex items-center px-6 border-b border-amber-100/15">
          <span className="text-lg font-serif text-amber-50">Admin</span>
        </div>
        <div className="relative h-[calc(100vh-4rem)]">
          <AdminSidebar isSuperAdmin={isSuperAdmin} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#6b4724] text-amber-50 z-50 md:hidden overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23fbe8c4' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "60px 60px" }} />
            <div className="relative h-16 flex items-center justify-between px-4 border-b border-amber-100/15">
              <span className="text-lg font-serif text-amber-50">Admin</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close admin menu"
                className="text-amber-100 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="relative h-[calc(100vh-4rem)]">
              <AdminSidebar
                isSuperAdmin={isSuperAdmin}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </aside>
        </>
      )}

      {/* Main */}
      <div className="md:ml-64">
        <AdminTopbar
          userEmail={userEmail}
          userName={userName}
          userImage={userImage}
          isSuperAdmin={isSuperAdmin}
          notificationCount={notificationCount}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#b89a68] p-4 md:p-8">
          <div className="absolute inset-0 opacity-[0.10] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23fff2d3' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "60px 60px" }} />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
