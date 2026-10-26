"use client";
import { publicApplicationReturn } from "@/lib/login-destination";
export function applicationReturnTarget() {
  try { return publicApplicationReturn(sessionStorage.getItem("application-return")); } catch { return null; }
}

export function authenticationContinueTarget() {
  const target = applicationReturnTarget();
  try { sessionStorage.removeItem("application-return"); } catch {}
  return target ? `/auth/continue?${new URLSearchParams({ returnTo: target })}` : "/auth/continue";
}
