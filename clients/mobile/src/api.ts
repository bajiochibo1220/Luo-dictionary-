import { createAppClient } from "@/lib/app-client";
import { createNativeSession } from "./native-session";
import { createChatTransport } from "@/lib/chat-transport";
import { apiRequestTimeout } from "@/lib/api-request-timeout";

const configuredOrigin = import.meta.env.VITE_API_ORIGIN || "http://localhost:3000";
export const nativeSession = createNativeSession(configuredOrigin);
// Reuse public navigation metadata briefly while switching modules. Cultural
// records, personal history and credentials are never cached here.
const client = createAppClient({ origin: configuredOrigin, accessToken: nativeSession.getAccessToken, bootstrapTtlMs: 30000 });
export const apiOrigin = client.origin;
export const bootstrap = client.bootstrap;
export const library = client.library;
export const account = client.account;
export const conversations = client.conversations;
export const chatRequest = createChatTransport({ origin: apiOrigin, accessToken: nativeSession.getAccessToken });

export const featureFetch: typeof fetch = async (input, init) => {
  const path = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(path, apiOrigin);
  if (url.origin !== apiOrigin || !url.pathname.startsWith("/api/")) throw new Error("Refusing to send account credentials outside the application API.");
  const token = /^\/api\/v1\/(?:library|bootstrap)(?:\?|$)/.test(path) ? null : await nativeSession.getAccessToken();
  const headers = new Headers(init?.headers);
  if (typeof init?.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`); else headers.delete("Authorization");
  return fetch(url, { ...init, credentials: "omit", cache: "no-store", headers, signal: init?.signal ?? AbortSignal.timeout(apiRequestTimeout(url.href, init?.method)) });
};
export async function featureRequest(path: string, init?: RequestInit) {
  const response = await featureFetch(path, init);
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || "Service unavailable. Please retry.");
  if (path.startsWith("/api/v1/library?") && Array.isArray(result.data?.items)) {
    result.data.items = result.data.items.map((item: any) => ({ ...item, media: item.media.map((asset: any) => ({ ...asset, url: new URL(asset.url, apiOrigin).href, thumbnailUrl: asset.thumbnailUrl ? new URL(asset.thumbnailUrl, apiOrigin).href : null })) }));
  }
  return result.data;
}
