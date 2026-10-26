"use client";
export function applicationReturnTarget() {
  try { const target = sessionStorage.getItem("application-return"); return target === "/application" || target?.startsWith("/application#/") ? target : null; } catch { return null; }
}
