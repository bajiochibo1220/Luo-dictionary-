"use client";
import { usePathname } from "next/navigation";
import { InterfaceLanguageProvider } from "./interface-language";
import type { ReactNode } from "react";

export function WebInterfaceLanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const forceEnglish = /^\/(?:admin|super-admin)(?:\/|$)/.test(pathname || "") || pathname === "/admin-login";
  return <InterfaceLanguageProvider forceEnglish={forceEnglish}>{children}</InterfaceLanguageProvider>;
}
