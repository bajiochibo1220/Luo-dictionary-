"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function EnglishVersionLink({ langCode, href }: { langCode: string; href: string }) {
  const [culture, setCulture] = useState<string | null>(null);
  useEffect(() => {
    if (langCode === "eng") setCulture(new URLSearchParams(window.location.search).get("culture"));
  }, [langCode]);
  const isEnglish = langCode === "eng";
  if (isEnglish && (!culture || culture === "eng")) return null;
  const cultureLabel = culture === "luo" ? "Dholuo" : culture === "kik" ? "Gikuyu" : culture?.toUpperCase();
  const targetHref = isEnglish
    ? href.replace("/eng/", `/${culture}/`)
    : `${href.replace(`/${langCode}/`, "/eng/")}?culture=${encodeURIComponent(langCode)}`;
  return (
    <Link href={targetHref} className="inline-block text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950">
      {isEnglish ? `See this in ${cultureLabel}` : "See this in English"}
    </Link>
  );
}
