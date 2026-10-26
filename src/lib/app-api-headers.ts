// These endpoints return public DTOs and never accept credentials. Native
// WebView origins are explicit; browser development origins must be configured.
export function appApiHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store", "CDN-Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store", "Vary": "Origin",
  };
  const allowed = new Set([
    "capacitor://localhost", "https://localhost", "http://localhost",
    ...(process.env.NODE_ENV !== "production" ? ["http://127.0.0.1:4173", "http://localhost:4173", "http://127.0.0.1:5173", "http://localhost:5173"] : []),
    ...(process.env.APP_PUBLIC_CLIENT_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean),
  ]);
  if (origin && allowed.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
  }
  return headers;
}
