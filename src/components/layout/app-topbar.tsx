"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";

export function AppTopbar({
  userInitial,
  userName,
  userEmail,
  userImage,
  isAdmin,
  languageCode,
  stats,
}: {
  userInitial: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  isAdmin: boolean;
  languageCode: string;
  stats: { uploads: number; approved: number; pending: number };
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="bg-[#5c3a1c] border-b border-black/30 flex items-center justify-between px-6 py-3 shadow-lg relative z-30">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg ring-1 ring-amber-200/30 flex-shrink-0">
          <span className="text-stone-900 font-serif text-lg font-bold">L</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-lg md:text-xl text-amber-50 leading-tight truncate">
            Luo Dictionary
          </h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/60 hidden sm:block">
            LuoLinguaAI
          </p>
        </div>
      </div>

      {/* Middle: Stats (hidden on small screens) */}
      <div className="hidden lg:flex items-center gap-6">
        <StatPill label="Uploads" value={stats.uploads} />
        <StatPill label="Approved" value={stats.approved} accent="green" />
        <StatPill label="Pending" value={stats.pending} accent="amber" />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Link
          href={`/${languageCode}/search`}
          className="hidden md:inline-flex items-center gap-2 text-sm text-amber-100/80 hover:text-amber-50 transition font-medium px-3 py-1.5 rounded-full hover:bg-amber-100/10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          Search
        </Link>

        <Link
          href="/chatbot"
          className="hidden md:inline-flex items-center gap-2 text-sm text-amber-100/80 hover:text-amber-50 transition font-medium px-3 py-1.5 rounded-full hover:bg-amber-100/10"
        >
          <span>💬</span>
          Chat
        </Link>

        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="text-xs bg-amber-400 text-stone-900 px-3 py-1.5 rounded-full hover:bg-amber-300 transition font-semibold shadow"
          >
            Admin
          </Link>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-label="Open account menu"
            aria-expanded={profileOpen}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-900 font-serif text-base font-bold shadow-lg ring-1 ring-amber-200/30"
          >
            {userImage ? <img src={userImage} alt="" className="w-full h-full rounded-full object-cover" /> : userInitial}
          </button>
          {profileOpen && (
            <>
              <button
                type="button"
                aria-label="Close account menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-20">
                <div className="px-4 py-3 border-b border-stone-100">
                  <p className="text-sm font-semibold text-stone-800 truncate">{userName || "Account"}</p>
                  <p className="text-xs text-stone-500 truncate">{userEmail}</p>
                </div>
                <Link href="/dashboard" onClick={() => setProfileOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">My dashboard</Link>
                <Link href="/profile" onClick={() => setProfileOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">Profile options</Link>
                {isAdmin && <Link href="/admin/dashboard" onClick={() => setProfileOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">Admin dashboard</Link>}
                <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function StatPill({
  label,
  value,
  accent = "stone",
}: {
  label: string;
  value: number;
  accent?: "stone" | "green" | "amber";
}) {
  const colors: Record<string, string> = {
    stone: "text-amber-50",
    green: "text-green-300",
    amber: "text-amber-300",
  };
  return (
    <div className="text-center">
      <p className={`font-serif text-2xl leading-none ${colors[accent]}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/50 mt-0.5">
        {label}
      </p>
    </div>
  );
}
