"use client";

import Link from "next/link";

export function EnglishVersionLink({ langCode, href }: { langCode: string; href: string }) {
  if (langCode === "eng") return null;
  const englishHref = `${href.replace(`/${langCode}/`, "/eng/")}?culture=${encodeURIComponent(langCode)}`;
  return (
    <Link href={englishHref} className="inline-block text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950">
      See this in English
    </Link>
  );
}
