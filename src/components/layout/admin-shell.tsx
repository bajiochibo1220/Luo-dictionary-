"use client";

import { useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

export function AdminShell({
  children,
  userEmail,
  userName,
  isSuperAdmin,
  notificationCount,
}: {
  children: React.ReactNode;
  userEmail: string;
  userName: string | null;
  isSuperAdmin: boolean;
  notificationCount: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 w-64 bg-stone-900 z-20">
        <div className="h-16 flex items-center px-6 border-b border-stone-800">
          <span className="text-lg font-serif text-white">Admin</span>
        </div>
        <div className="h-[calc(100vh-4rem)]">
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
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-stone-900 z-50 md:hidden">
            <div className="h-16 flex items-center justify-between px-4 border-b border-stone-800">
              <span className="text-lg font-serif text-white">Admin</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="h-[calc(100vh-4rem)]">
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
          isSuperAdmin={isSuperAdmin}
          notificationCount={notificationCount}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}