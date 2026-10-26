import { NextResponse } from "next/server";

// Bearer-only cross-origin access; browser cookies never become cross-origin
// credentials. This allowlist is separate from public-library configuration.
export function nativeApiHeaders(request?: Request) {
  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store", Vary: "Origin",
  };
  const origin = request?.headers.get("Origin");
  const allowed = ["capacitor://localhost", "https://localhost", "http://localhost", ...(process.env.APP_NATIVE_CLIENT_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean)];
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
  }
  return headers;
}

export function nativePreflight(request: Request) {
  const headers = nativeApiHeaders(request);
  return new NextResponse(null, { status: headers["Access-Control-Allow-Origin"] ? 204 : 403, headers });
}

export function sameOriginBrowserPost(request: Request) {
  if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") return false;
  try {
    const url = new URL(request.url);
    // Next/Auth.js can normalize request.url to AUTH_URL (for example
    // localhost), even when a browser reached the same server via 127.0.0.1.
    // Host is the destination actually addressed by the browser. Do not use
    // arbitrary X-Forwarded-Host values as an alternate allowed origin.
    const host = request.headers.get("Host");
    if (host && /[\\/\s?#@]/.test(host)) return false;
    const target = host ? new URL(`${url.protocol}//${host}`) : url;
    if (!["http:", "https:"].includes(target.protocol) || target.username || target.password || (host && (target.pathname !== "/" || target.search || target.hash))) return false;
    return request.headers.get("Origin") === target.origin;
  } catch { return false; }
}
