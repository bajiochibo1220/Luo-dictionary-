import { z } from "zod";

// This development callback must match both native projects. A permanent app
// identity and claimed HTTPS links are reviewed before store distribution.
export const NATIVE_AUTH_CALLBACK = "org.jooust.luoheritage.dev://auth/callback";
export const NativeAuthorizationSchema = z.object({
  challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  state: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
}).strict();
export const NativeExchangeSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
}).strict();
export const NativeSessionSchema = z.object({
  accountId: z.string().min(1).max(128).optional(),
  accessToken: z.string().regex(/^lh_native_(?:[A-Za-z0-9_-]{22}\.)?[A-Za-z0-9_-]{43}$/),
  expiresAt: z.string().datetime(),
  refreshToken: z.string().regex(/^lh_refresh_[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/).optional(),
  refreshExpiresAt: z.string().datetime().optional(),
}).refine(value => Boolean(value.refreshToken) === Boolean(value.refreshExpiresAt), "Incomplete renewal credentials")
  .refine(value => !value.refreshToken || (value.accessToken.slice("lh_native_".length).split(".")[0] === value.refreshToken.slice("lh_refresh_".length).split(".")[0]
    && Date.parse(value.expiresAt) <= Date.parse(value.refreshExpiresAt!)), "Invalid device renewal context");
export const NativeRefreshSchema = z.object({
  refreshToken: z.string().regex(/^lh_refresh_[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/),
}).strict();
export type NativeSession = z.infer<typeof NativeSessionSchema>;
export const NATIVE_RETURN_COOKIE = "native-auth-return";

// Login returns are restricted to this one validated internal screen. An
// arbitrary callbackUrl must never override the normal role-based destination.
export function nativeLoginReturn(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://client.invalid");
    if (url.origin !== "https://client.invalid" || url.pathname !== "/mobile-auth" || url.hash) return null;
    if ([...url.searchParams.keys()].some(key => !["challenge", "state"].includes(key))) return null;
    if (url.searchParams.getAll("challenge").length !== 1 || url.searchParams.getAll("state").length !== 1) return null;
    const parsed = NativeAuthorizationSchema.safeParse({ challenge: url.searchParams.get("challenge"), state: url.searchParams.get("state") });
    return parsed.success ? `/mobile-auth?${new URLSearchParams(parsed.data)}` : null;
  } catch { return null; }
}

export function nativeAuthHref(page: "login" | "register", value: unknown, status: { error?: string; registered?: string } = {}) {
  const parameters = new URLSearchParams();
  const destination = nativeLoginReturn(value);
  if (destination) parameters.set("callbackUrl", destination);
  if (status.error) parameters.set("error", status.error);
  if (status.registered) parameters.set("registered", status.registered);
  return `/${page}${parameters.size ? `?${parameters}` : ""}`;
}

// This short-lived cookie carries only the public challenge/return context
// across Google's new-account/error pages. It contains no session or verifier.
export function nativeReturnCookie(value: unknown, secure: boolean) {
  const destination = nativeLoginReturn(value);
  return `${NATIVE_RETURN_COOKIE}=${encodeURIComponent(destination || "")}; Max-Age=${destination ? 600 : 0}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function nativeReturnFromCookie(value: unknown) {
  if (typeof value !== "string" || value.length > 1024) return null;
  try { return nativeLoginReturn(decodeURIComponent(value)); } catch { return null; }
}
