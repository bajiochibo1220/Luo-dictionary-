"use client";

import Link from "next/link";

export function FloatingChatbot() {
  return (
    <Link
      href="/chatbot"
      className="fixed bottom-6 right-6 z-40 group"
      aria-label="Open AI chatbot"
    >
      <div className="relative">
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-amber-400 opacity-40 animate-ping" />
        {/* Button */}
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 shadow-2xl shadow-amber-900/40 flex items-center justify-center transition-transform group-hover:scale-110 ring-4 ring-amber-100/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        {/* Label on hover */}
        <span className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap bg-stone-900 text-amber-50 text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none">
          Ask the AI
        </span>
      </div>
    </Link>
  );
}