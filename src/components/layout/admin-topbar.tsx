"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";

export function AdminTopbar({
  userEmail,
  userName,
  isSuperAdmin,
  notificationCount,
  onMenuClick,
}: {
  userEmail: string;
  userName: string | null;
  isSuperAdmin: boolean;
  notificationCount: number;
  onMenuClick: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-stone-200 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden text-2xl text-stone-700"
          aria-label="Open menu"
        >
          ☰
        </button>
        <Link
          href="/admin/dashboard"
          className="text-xl font-serif text-stone-800"
        >
          LuoLinguaAI
        </Link>
        {isSuperAdmin && (
          <span className="hidden md:inline text-xs uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
            Super Admin
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            className="text-xl text-stone-600 hover:text-amber-600 p-2 relative"
            aria-label="Notifications"
          >
            🔔
            {notificationCount > 0 && (
              <span className="absolute top-0 right-0 text-xs bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-stone-100"
          >
            <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-medium">
              {(userName || userEmail).charAt(0).toUpperCase()}
            </div>
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-stone-200 py-2 z-20">
                <div className="px-4 py-2 border-b border-stone-100">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {userName || "Admin"}
                  </p>
                  <p className="text-xs text-stone-500 truncate">
                    {userEmail}
                  </p>
                </div>
                <Link
                  href="/"
                  className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  View public site
                </Link>
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  My dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}