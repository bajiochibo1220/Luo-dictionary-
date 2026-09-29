"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";

export function UserMenu({
  userEmail,
  userName,
  userImage,
  isAdmin,
}: {
  userEmail: string;
  userName: string | null;
  userImage: string | null;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Open account menu"
        aria-expanded={open}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-stone-100"
      >
        <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-medium overflow-hidden">
          {userImage ? <img src={userImage} alt="" className="w-full h-full object-cover" /> : (userName || userEmail).charAt(0).toUpperCase()}
        </div>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-stone-200 py-2 z-20">
            <div className="px-4 py-2 border-b border-stone-100">
              <p className="text-sm font-medium text-stone-800 truncate">
                {userName || "User"}
              </p>
              <p className="text-xs text-stone-500 truncate">{userEmail}</p>
            </div>
            <Link
              href="/"
              className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Public site
            </Link>
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              My dashboard
            </Link>
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="block px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
              >
                Admin dashboard
              </Link>
            )}
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
  );
}
