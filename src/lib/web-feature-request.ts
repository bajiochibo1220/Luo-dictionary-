"use client";
export async function webFeatureRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, credentials: "same-origin", cache: "no-store", headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers }, signal: init?.signal ?? AbortSignal.timeout(40000) });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(body.error || "Service unavailable. Please retry.");
  return body.data;
}
