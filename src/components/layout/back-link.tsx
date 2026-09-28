"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function BackLink({
  href,
  label = "Back",
  variant = "default",
}: {
  href?: string;
  label?: string;
  variant?: "default" | "on-dark" | "on-sand";
}) {
  const router = useRouter();

  const baseClasses =
    "inline-flex items-center gap-2 text-sm font-medium transition rounded-full px-3 py-1.5";

  const variants: Record<string, string> = {
    default: "text-stone-700 hover:text-amber-800 hover:bg-black/5",
    "on-dark": "text-amber-100/80 hover:text-amber-50 hover:bg-amber-100/10",
    "on-sand": "text-stone-800 hover:text-amber-900 hover:bg-black/5",
  };

  const className = `${baseClasses} ${variants[variant]}`;

  const Arrow = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {Arrow}
        {label}
      </Link>
    );
  }

  return (
    <button onClick={() => router.back()} className={className}>
      {Arrow}
      {label}
    </button>
  );
}