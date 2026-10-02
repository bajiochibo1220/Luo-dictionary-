"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { IdleSessionGuard } from "@/components/providers/idle-session-guard";

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <IdleSessionGuard />
      {children}
    </SessionProvider>
  );
}