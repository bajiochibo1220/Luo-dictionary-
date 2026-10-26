"use client";
import { InterfaceButton, InterfaceText } from "@/components/shared/interface-language";

import { NavigationLink as Link } from "./navigation-link";
import { DismissiblePopover, PopoverClose } from "@/components/shared/dismissible-popover";
import { accountDashboardHref } from "@/lib/app-navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";

export function UserMenu({
  userEmail,
  userName,
  userImage,
  isAdmin,
  isSuperAdmin = false,
}: {
  userEmail: string;
  userName: string | null;
  userImage: string | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dashboardHref = accountDashboardHref({ isAdmin, isSuperAdmin });

  return (
    <DismissiblePopover open={open} onClose={() => setOpen(false)}>
      <InterfaceButton
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Open account menu"
        aria-expanded={open}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-stone-100"
      >
        <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-medium overflow-hidden">
          {userImage ? <img src={userImage} alt="" className="w-full h-full object-cover" /> : (userName || userEmail).charAt(0).toUpperCase()}
        </div>
      </InterfaceButton>

      {open && (
        <>
          <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1rem)] max-h-[75dvh] overflow-y-auto bg-white rounded-lg shadow-lg border border-stone-200 py-2 z-20">
                <PopoverClose onClose={() => setOpen(false)} />
            <div className="px-4 py-2 border-b border-stone-100">
              <p className="text-sm font-medium text-stone-800 truncate">
                {userName || "User"}
              </p>
              <p className="text-xs text-stone-500 truncate">{userEmail}</p>
            </div>
            <Link
              href="/application"
              className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            ><InterfaceText source="Public site" /></Link>
            <Link
              href={dashboardHref}
              className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            ><InterfaceText source="My dashboard" /></Link>
            <Link href="/settings" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"><InterfaceText source="Settings & profile" /></Link>
            <button
              onClick={() => signOut({ redirectTo: "/login" })}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            ><InterfaceText source="Sign out" /></button>
          </div>
        </>
      )}
    </DismissiblePopover>
  );
}
