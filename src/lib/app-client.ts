import { z } from "zod";
import { AppBootstrapSchema, AppLibrarySchema } from "@/lib/app-contract";
import { AppAccountSchema, ConversationHistorySchema } from "@/lib/account-contract";

export function parseAppApiOrigin(value: string) {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Configure an HTTPS API origin, or localhost for development. Do not include credentials or a path.");
  }
  return url.origin;
}

export function createAppClient(options: { origin: string; fetch?: typeof fetch; accessToken?: () => string | null | Promise<string | null>; bootstrapTtlMs?: number }) {
  const origin = parseAppApiOrigin(options.origin);
  const transport = options.fetch ?? fetch;
  const bootstrapCache = new Map<string, { expires: number; value: z.infer<typeof AppBootstrapSchema> }>();
  const bootstrapTtl = Math.min(30000, Math.max(0, options.bootstrapTtlMs ?? 0));
  async function read<T>(path: string, schema: z.ZodType<T>, signal: AbortSignal, personal = false) {
    const accessToken = personal ? await options.accessToken?.() : null;
    signal.throwIfAborted();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await transport(new URL(path, origin), {
      signal, credentials: personal && !options.accessToken ? "same-origin" : "omit", cache: "no-store", headers,
    });
    const body = await response.json();
    if (!response.ok || body.success !== true) throw new Error(typeof body.error === "string" ? body.error : "The service is temporarily unavailable.");
    return schema.parse(body.data);
  }
  return {
    origin,
    async bootstrap(language: string, signal: AbortSignal) {
      signal.throwIfAborted();
      const cached = bootstrapCache.get(language);
      if (cached && cached.expires > Date.now()) return cached.value;
      const value = await read(`/api/v1/bootstrap?language=${encodeURIComponent(language)}`, AppBootstrapSchema, signal);
      if (bootstrapTtl && !signal.aborted) {
        if (bootstrapCache.size >= 8) bootstrapCache.delete(bootstrapCache.keys().next().value!);
        bootstrapCache.set(language, { expires: Date.now() + bootstrapTtl, value });
      }
      return value;
    },
    async library(language: string, moduleCode: string, signal: AbortSignal) {
      const result = await read(`/api/v1/library?language=${encodeURIComponent(language)}&module=${encodeURIComponent(moduleCode)}`, AppLibrarySchema, signal);
      return { ...result, items: result.items.map(item => ({ ...item, media: item.media.map(asset => ({ ...asset, url: new URL(asset.url, origin).href, thumbnailUrl: asset.thumbnailUrl ? new URL(asset.thumbnailUrl, origin).href : null })) })) };
    },
    // Web clients use their own cookie; native clients supply a device token.
    // Public reads never carry either credential.
    account: (signal: AbortSignal) => read("/api/v1/account", AppAccountSchema, signal, true),
    conversations: (archived: boolean, signal: AbortSignal) => read(`/api/v1/account/conversations?archived=${archived}`, ConversationHistorySchema, signal, true),
  };
}
