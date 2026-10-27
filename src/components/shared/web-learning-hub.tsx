"use client";
import { useCallback } from "react";
import { LearningHub } from "./learning-hub";
export function WebLearningHub({ languageId, languageCode = "luo", userId, initialResourceId, initialKind }: { languageId: number; languageCode?: string; userId: string; initialResourceId?: string; initialKind?: string }) {
  const request = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(path, { ...init, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers }, signal: init?.signal ?? AbortSignal.timeout(40000) });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.error || "Service unavailable.");
    return body.data;
  }, []);
  return <LearningHub languageCode={languageCode} initialKind={initialKind} request={request} languageId={languageId} userId={userId} initialResourceId={initialResourceId} origin={typeof location === "undefined" ? "" : location.origin} />;
}
