"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession, signOut } from "next-auth/react";

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
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href={`/${language.code}`} className="flex items-center gap-2">
          <span className="text-2xl font-serif text-stone-800">
            LuoLinguaAI
          </span>
          <span className="hidden md:inline text-xs text-amber-600 font-medium px-2 py-0.5 bg-amber-50 rounded">
            {language.nativeName}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_MODULES.map((mod) => (
            <Link
              key={mod.code}
              href={`/${language.code}/${mod.path}`}
              className="text-sm text-stone-700 hover:text-amber-600 transition"
            >
              {labelFor(mod.code, t)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs text-stone-500 hover:text-amber-600 border border-stone-200 rounded px-2 py-1"
          >
            🌐 Switch
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-xs text-stone-500">
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-xs text-stone-500 hover:text-red-600"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs text-stone-500 hover:text-amber-600"
              >
                Sign in
              </Link>
            </div>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-stone-700 text-xl"
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden bg-stone-50 border-t border-stone-200 px-4 py-3 flex flex-col gap-2">
          {NAV_MODULES.map((mod) => (
            <Link
              key={mod.code}
              href={`/${language.code}/${mod.path}`}
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