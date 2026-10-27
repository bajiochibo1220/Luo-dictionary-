"use client";
import { InterfaceButton, InterfaceText } from "@/components/shared/interface-language";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/layout/user-menu";
import { APP_NAME } from "@/lib/brand";
import { BrandMark } from "@/components/shared/brand-mark";
import { pairedLanguageNavigation } from "@/lib/app-navigation";
import { hasAnyAdminRole } from "@/lib/permissions";

const NAV_MODULES = [
  { code: "dictionary", path: "muma" },
  { code: "proverbs", path: "ngero" },
  { code: "riddles", path: "ngeche" },
  { code: "songs", path: "wende" },
  { code: "oral_histories", path: "sigana" },
  { code: "search", path: "search" },
];

function labelFor(code: string, t: (c: string) => string): string {
  if (code === "search") return "Search";
  return t(code);
}

export function Header() {
  const { language, t } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = hasAnyAdminRole(session);
  const { alternateHref, alternateLabel, cultureQuery } = pairedLanguageNavigation(language.code, pathname, searchParams.toString());

  return (
    <header className="institution-border bg-white border-b border-stone-200 sticky top-0 z-40">
      <div className="container mx-auto px-3 md:px-4 py-3 flex items-center justify-between gap-3">
        <Link href={`/${language.code}`} className="flex min-w-0 items-center gap-2">
          <BrandMark />
          <span className="truncate text-xl sm:text-2xl font-serif text-stone-800">
            {APP_NAME}
          </span>
          <span className="hidden md:inline text-xs text-amber-600 font-medium px-2 py-0.5 bg-amber-50 rounded-sm">
            {language.nativeName}
          </span>
        </Link>

        <nav className="hidden xl:flex items-center gap-6">
          <Link href="/help" className="text-sm text-stone-700 hover:text-amber-600"><InterfaceText source="Help & training"/></Link>
          {NAV_MODULES.map((mod) => (
            <Link
              key={mod.code}
              href={`/${language.code}/${mod.path}${cultureQuery}`}
              className="text-sm text-stone-700 hover:text-amber-600 transition"
            >
              {labelFor(mod.code, t)}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <Link
            href={alternateHref}
            className="hidden sm:inline-flex text-xs text-stone-500 hover:text-amber-600 border border-stone-200 rounded-sm px-2 py-1"
          >
            <InterfaceText source={alternateLabel} />
          </Link>

          {session?.user ? (
            <UserMenu
              userName={session.user.name ?? null}
              userEmail={session.user.email ?? ""}
              userImage={session.user.image ?? null}
              isAdmin={isAdmin}
              isSuperAdmin={!!(session.user.isSuperAdmin || session.user.isMasterSuperAdmin)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs text-stone-500 hover:text-amber-600"
              ><InterfaceText source="Sign in" /></Link>
            </div>
          )}

          <InterfaceButton
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="xl:hidden text-stone-700 text-xl"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            ☰
          </InterfaceButton>
        </div>
      </div>

      {menuOpen && (
        <nav className="xl:hidden bg-stone-50 border-t border-stone-200 px-4 py-3 flex flex-col gap-2">
          <Link href="/help" onClick={()=>setMenuOpen(false)} className="min-h-11 py-2 text-sm text-stone-700"><InterfaceText source="Help & training"/></Link>
          <Link href={alternateHref} onClick={() => setMenuOpen(false)} className="py-2 text-sm text-stone-700 hover:text-amber-600 sm:hidden"><InterfaceText source="Switch to " /><InterfaceText source={alternateLabel} /></Link>
          {NAV_MODULES.map((mod) => (
            <Link
              key={mod.code}
              href={`/${language.code}/${mod.path}${cultureQuery}`}
              onClick={() => setMenuOpen(false)}
              className="text-sm text-stone-700 hover:text-amber-600 py-1"
            >
              {labelFor(mod.code, t)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
