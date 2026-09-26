"use client";

import { createContext, useContext } from "react";

export type LanguageInfo = {
  id: number;
  code: string;
  name: string;
  nativeName: string;
};

type LanguageContextType = {
  language: LanguageInfo;
  moduleTitles: Record<string, string>;
  t: (moduleCode: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  language,
  moduleTitles,
  children,
}: {
  language: LanguageInfo;
  moduleTitles: Record<string, string>;
  children: React.ReactNode;
}) {
  const t = (moduleCode: string) => {
    if (moduleTitles[moduleCode]) return moduleTitles[moduleCode];

    // Fallback: convert "oral_histories" -> "Oral Histories"
    return moduleCode
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <LanguageContext.Provider value={{ language, moduleTitles, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}